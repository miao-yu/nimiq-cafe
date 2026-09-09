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

    const written = await portfolio.writeRewards(pool, address, finished);
    await portfolio.markBackfillSuccess(pool, address, syncedThrough());

    return { written, ms: Date.now() - started, first: !syncedTo };
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

    const written = await portfolio.writeReconstructed(pool, address, rows);
    await portfolio.markReconstructed(pool, address, truncated);

    return {
        written,
        ms: Date.now() - started,
        truncated,
        underflows: rows.filter((row) => row.underflow).length,
        priced: rows.filter((row) => row.nimUsd !== null).length,
    };
}

module.exports = { backfillRewards, reconstructPast, rpc, daysAgo, syncedThrough };
