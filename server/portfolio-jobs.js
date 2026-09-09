// The per-address half of the portfolio history jobs, shared by the nightly
// crons and by the warm-up that runs when somebody signs in.
//
// Both paths do exactly the same work; they differ only in what selects the
// addresses and how many are allowed at once. Keeping the work here rather than
// in the cron scripts is what stops the two drifting apart.

const nimiqwatch = require('./nimiqwatch');
const nimiqhub = require('./nimiqhub');
const portfolio = require('./portfolio');
const { reconstructHistory } = require('./reconstruct');

const BACKFILL_DAYS = Number(process.env.PORTFOLIO_BACKFILL_DAYS || 365);
const HISTORY_DAYS = Number(process.env.PORTFOLIO_RECONSTRUCT_DAYS || 365);

// Re-fetch a little of what we already have: the boundary day is usually
// incomplete when it is first seen.
const OVERLAP_DAYS = 2;

const JSON_RPC_URL = process.env.NIMIQ_RPC_URL || 'http://127.0.0.1:8648';
const RPC_TIMEOUT_MS = Number(process.env.RPC_TIMEOUT_MS || 30000);

function daysAgo(days) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - days);
    date.setUTCHours(0, 0, 0, 0);
    return date;
}

/** Yesterday: today is still accruing, so it is not a finished day to claim. */
function syncedThrough() {
    return daysAgo(1).toISOString().slice(0, 10);
}

async function rpc(method, params) {
    const res = await fetch(JSON_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
        signal: AbortSignal.timeout(RPC_TIMEOUT_MS),
    });
    const body = await res.json();
    return body.result ? body.result.data : null;
}

/**
 * Fetch and store this address's reward history.
 *
 * `syncedTo` narrows the request to what is missing: the first run asks for a
 * year, every run after asks for a couple of days.
 */
async function backfillRewards(pool, address, syncedTo) {
    // Stamped first. A process killed mid-request must still back off, or a
    // reliably-failing address gets retried on every pass.
    await portfolio.markBackfillAttempt(pool, address);

    const from = syncedTo
        ? new Date(new Date(`${String(syncedTo).slice(0, 10)}T00:00:00Z`).getTime()
            - OVERLAP_DAYS * 24 * 60 * 60 * 1000)
        : daysAgo(BACKFILL_DAYS);

    const started = Date.now();
    const rows = await nimiqwatch.dailyRewards(address, from, new Date());

    // Today is partial; storing it would freeze half a day in place until the
    // overlap happens to correct it.
    const today = new Date().toISOString().slice(0, 10);
    const finished = rows.filter((row) => row.date < today);

    let written = await portfolio.writeRewards(pool, address, finished);

    // Only when Nimiq Watch found nothing, and only on a first backfill.
    //
    // Nothing restaked is exactly what a payout staker looks like, and they are
    // the ones this rescues. A restaker already has their year from the fetch
    // above, in about a second -- making them wait ~60s for the archive to say
    // the same thing would undo the point of warming up on sign-in. The archive
    // does not change, so there is no reason to repeat it nightly either.
    let fromLedger = 0;
    if (!syncedTo && finished.length === 0) {
        const own = await backfillFromOwnLedger(pool, address).catch((error) => {
            console.error(`own-ledger backfill failed for ${address}: ${error.message}`);
            return { written: 0 };
        });
        fromLedger = own.written;
        written += fromLedger;
    }

    await portfolio.markBackfillSuccess(pool, address, syncedThrough());

    return { written, fromLedger, ms: Date.now() - started, first: !syncedTo };
}

/**
 * Derive this address's past balances from today's.
 *
 * Depends on the rewards above already being stored: the restakes it subtracts
 * are read back from pool.portfolio_rewards rather than fetched again.
 */
async function reconstructPast(pool, address, prices) {
    const [account, staker] = await Promise.all([
        rpc('getAccountByAddress', [address]),
        rpc('getStakerByAddress', [address]).catch(() => null),
    ]);

    if (!account) {
        return { written: 0, skipped: 'no account on chain' };
    }

    const started = Date.now();
    const { transactions, truncated } = await nimiqhub.fetchTransactions(address);
    const restakesByDate = await portfolio.getRestakesByDate(pool, address, HISTORY_DAYS);

    const days = reconstructHistory({
        address,
        current: {
            liquid: account.balance || 0,
            staked: staker ? staker.balance || 0 : 0,
            inactive: staker ? staker.inactiveBalance || 0 : 0,
            retired: staker ? staker.retiredBalance || 0 : 0,
        },
        transactions,
        restakesByDate,
        days: HISTORY_DAYS,
    });

    // A day with no recorded price is still worth storing: the balance is real,
    // and the chart carries the previous price forward rather than dropping it.
    const rows = days.map((day) => ({
        ...day,
        validator: staker ? staker.delegation || null : null,
        nimUsd: prices[day.date] === undefined ? null : prices[day.date],
    }));

    // A truncated list means the oldest movements are missing, so the walk
    // drifts further the further back it goes. For a staker paid every few
    // minutes the 500 transactions available cover about five days of a
    // two-year history -- reconstructing a year from that would produce a
    // confident, wrong chart. An empty chart is the honest outcome.
    const written = truncated ? 0 : await portfolio.writeReconstructed(pool, address, rows);
    await portfolio.markReconstructed(pool, address, truncated);

    return {
        written,
        ms: Date.now() - started,
        truncated,
        underflows: rows.filter((row) => row.underflow).length,
        priced: rows.filter((row) => row.nimUsd !== null).length,
    };
}

/**
 * Fill the same daily table from our own ledger.
 *
 * Nimiq Watch only knows about restakes. A staker taking rewards as payouts
 * restakes nothing, so it returns an empty year for them and their chart stops
 * at whatever pool.staker_rewards still holds -- about a month, since that
 * table is rotated into pool.staker_rewards_archive.
 *
 * The archive has the full history and is simply too slow to read per request:
 * a year is ~460k individual rewards and 64 seconds. Read once here, in the
 * background, it becomes 360 pre-aggregated rows that the page reads in 2ms.
 *
 * Runs for every address we have a ledger for, not just payout ones. A staker
 * who switched between restaking and payouts has both kinds of history, and
 * writing ours last means it wins on any day both describe -- the ledger is
 * what actually paid.
 */
async function backfillFromOwnLedger(pool, address, days = BACKFILL_DAYS) {
    const started = Date.now();

    const [rows] = await pool.query(
        `SELECT DATE(created_at) AS reward_date, SUM(rewards) AS rewards
         FROM (
             SELECT created_at, rewards FROM pool.staker_rewards
             WHERE staker = ? AND created_at >= CURDATE() - INTERVAL ? DAY AND created_at < CURDATE()
             UNION ALL
             SELECT created_at, rewards FROM pool.staker_rewards_archive
             WHERE staker = ? AND created_at >= CURDATE() - INTERVAL ? DAY AND created_at < CURDATE()
         ) AS combined
         GROUP BY reward_date`,
        [address, days, address, days]
    );

    if (!rows.length) {
        return { written: 0, ms: Date.now() - started };
    }

    const validator = process.env.VALIDATOR_ADDRESS
        || 'NQ83 4MVH 53Q4 AL3B Q097 55GJ LUQ3 GSF0 85B7';

    const written = await portfolio.writeRewards(pool, address, rows.map((row) => ({
        date: row.reward_date instanceof Date
            ? row.reward_date.toISOString().slice(0, 10)
            : String(row.reward_date).slice(0, 10),
        validator,
        rewards: Number(row.rewards) || 0,
    })));

    return { written, ms: Date.now() - started };
}

module.exports = {
    backfillRewards,
    backfillFromOwnLedger,
    reconstructPast,
    rpc,
    daysAgo,
    syncedThrough,
};
