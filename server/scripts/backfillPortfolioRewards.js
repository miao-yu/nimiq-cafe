// Backfills per-staker reward history from Nimiq Watch, for the stakers whose
// validator is not ours.
//
// pool.staker_rewards only knows people staking here. Anyone staking elsewhere
// had no reward history on /portfolio at all, which is why that slot showed a
// conversion pitch instead of a chart. This fills it.
//
// Cron (nightly, after the balance snapshot at 00:25):
//   40 0 * * * cd /var/www/nimiq-cafe-prod/server && node scripts/backfillPortfolioRewards.js >> /var/www/logs/portfolio.log 2>&1
//
// --- On not flooding a service that is not ours -------------------------------
//
// Measured cost of one request (2026-09-08, a large staker):
//   365 days  ->  7.2s, 4.6 MB      first backfill for an address
//     2 days  ->  0.9s,  90 KB      every night after that
//
// So the expensive case is one-off per address and the steady state is cheap.
// The run is therefore deliberately dull:
//
//   * serial, never concurrent -- one request in flight at a time, always;
//   * a fixed pause between addresses, so a burst of new sign-ups cannot turn
//     into a burst of requests;
//   * a cap on addresses per run, so the work spreads across nights instead of
//     arriving all at once;
//   * a wall-clock budget, so a night of slow responses ends early rather than
//     running into the morning;
//   * exponential backoff per address on failure, so a permanently broken one
//     is retried tomorrow, then in two days, then four -- not every night;
//   * the attempt is stamped *before* the request, so a crash still backs off.
//
// The intent is that Nimiq Watch cannot tell we are here. If that ever stops
// being true, lower MAX_ADDRESSES or raise DELAY_MS -- both are env vars.

const mysql = require('mysql2/promise');
const { poolCredentials } = require('../db-config');
const portfolio = require('../portfolio');
const nimiqwatch = require('../nimiqwatch');

// How much history a first backfill asks for. A year is what the range selector
// on /portfolio goes out to, so fetching more would be data nobody can see.
const BACKFILL_DAYS = Number(process.env.PORTFOLIO_BACKFILL_DAYS || 365);

// Addresses per run. At ~7s for a first backfill this is a couple of minutes of
// work; raising it mostly buys a faster catch-up on a backlog we do not have.
const MAX_ADDRESSES = Number(process.env.PORTFOLIO_BACKFILL_MAX || 20);

// Pause between addresses. Nothing depends on the run finishing quickly.
const DELAY_MS = Number(process.env.PORTFOLIO_BACKFILL_DELAY_MS || 3000);

// Stop starting new addresses after this. The one in flight still finishes.
const BUDGET_MS = Number(process.env.PORTFOLIO_BACKFILL_BUDGET_MS || 15 * 60 * 1000);

// Re-fetch a little of what we already have. The boundary day is usually
// incomplete when it is first fetched, and a day is cheap.
const OVERLAP_DAYS = 2;

const sleep = (ms) => new Promise((done) => { setTimeout(done, ms); });

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

async function backfillOne(pool, candidate) {
    const { address, rewards_synced_to: syncedTo } = candidate;

    // Stamped first. A process killed mid-request must still back off, or a
    // reliably-failing address gets retried every single night.
    await portfolio.markBackfillAttempt(pool, address);

    const from = syncedTo
        ? new Date(new Date(`${String(syncedTo).slice(0, 10)}T00:00:00Z`).getTime()
            - OVERLAP_DAYS * 24 * 60 * 60 * 1000)
        : daysAgo(BACKFILL_DAYS);

    const started = Date.now();
    const rows = await nimiqwatch.dailyRewards(address, from, new Date());
    const fetched = Date.now() - started;

    // Today is partial; storing it would freeze a half day in place until the
    // overlap happens to correct it.
    const today = new Date().toISOString().slice(0, 10);
    const finished = rows.filter((row) => row.date < today);

    const written = await portfolio.writeRewards(pool, address, finished);
    await portfolio.markBackfillSuccess(pool, address, syncedThrough());

    return { written, fetched, first: !syncedTo };
}

async function main() {
    const pool = mysql.createPool(poolCredentials({ waitForConnections: true, connectionLimit: 2 }));
    const deadline = Date.now() + BUDGET_MS;

    let done = 0;
    let failed = 0;
    let rows = 0;

    try {
        const candidates = await portfolio.getBackfillCandidates(pool, MAX_ADDRESSES);
        console.log(`backfillPortfolioRewards: ${candidates.length} address(es) due`);

        for (const candidate of candidates) {
            if (Date.now() > deadline) {
                console.log('backfillPortfolioRewards: out of budget, the rest wait for tomorrow');
                break;
            }

            try {
                const result = await backfillOne(pool, candidate);
                rows += result.written;
                done += 1;
                console.log(`  ${candidate.address}: ${result.written} day(s)`
                    + `${result.first ? ' [first backfill]' : ''} in ${result.fetched}ms`);
            } catch (error) {
                failed += 1;
                await portfolio.markBackfillFailure(pool, candidate.address).catch(() => {});
                console.error(`  ${candidate.address}: ${error.message}`);
            }

            await sleep(DELAY_MS);
        }

        console.log(`backfillPortfolioRewards: ${done} done, ${failed} failed, ${rows} day-rows written`);
    } finally {
        await pool.end();
    }
}

main().catch((error) => {
    console.error('backfillPortfolioRewards failed:', error.message);
    process.exit(1);
});
