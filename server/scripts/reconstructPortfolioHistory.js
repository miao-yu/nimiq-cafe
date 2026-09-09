// Backfills value-over-time by walking today's balances backwards.
//
// storePortfolioSnapshots.js can only record days it was running for, so a new
// address starts with an empty chart and waits a year for a full one. This
// derives the missing days instead: today's balance from the node, transfers
// and fees from the Nimiq Hub, compounded rewards from the restake events
// already backfilled by backfillPortfolioRewards.js, and the closing NIM price
// from our own nimiq.price table.
//
// Cron (nightly, after the rewards backfill at 00:40):
//   55 0 * * * cd /var/www/nimiq-cafe-prod/server && node scripts/reconstructPortfolioHistory.js >> /var/www/logs/portfolio.log 2>&1
//
// Runs once per address and then never again -- reconstruction only fills the
// past, and the past does not change. Ordinary snapshots take over from today.
//
// It is cheap for the same reason the rewards backfill is not: one Hub request
// per address, ~6 KB, because restakes are not transactions. The restakes it
// needs were already fetched last cron, so this adds no load on Nimiq Watch at
// all. The same politeness rules apply anyway -- serial, paused, capped.

const mysql = require('mysql2/promise');
const { poolCredentials } = require('../db-config');
const portfolio = require('../portfolio');
const nimiqhub = require('../nimiqhub');
const { reconstructHistory } = require('../reconstruct');

const HISTORY_DAYS = Number(process.env.PORTFOLIO_RECONSTRUCT_DAYS || 365);
const MAX_ADDRESSES = Number(process.env.PORTFOLIO_RECONSTRUCT_MAX || 20);
const DELAY_MS = Number(process.env.PORTFOLIO_RECONSTRUCT_DELAY_MS || 2000);
const BUDGET_MS = Number(process.env.PORTFOLIO_RECONSTRUCT_BUDGET_MS || 15 * 60 * 1000);

const JSON_RPC_URL = process.env.NIMIQ_RPC_URL || 'http://127.0.0.1:8648';
const RPC_TIMEOUT_MS = Number(process.env.RPC_TIMEOUT_MS || 30000);

const sleep = (ms) => new Promise((done) => { setTimeout(done, ms); });

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

async function reconstructOne(pool, address, prices) {
    const [account, staker] = await Promise.all([
        rpc('getAccountByAddress', [address]),
        rpc('getStakerByAddress', [address]).catch(() => null),
    ]);

    if (!account) {
        return { written: 0, skipped: 'no account on chain' };
    }

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
        truncated,
        underflows: rows.filter((row) => row.underflow).length,
        priced: rows.filter((row) => row.nimUsd !== null).length,
    };
}

async function main() {
    const pool = mysql.createPool(poolCredentials({ waitForConnections: true, connectionLimit: 2 }));
    const deadline = Date.now() + BUDGET_MS;

    let done = 0;
    let failed = 0;

    try {
        const candidates = await portfolio.getReconstructCandidates(pool, MAX_ADDRESSES);
        console.log(`reconstructPortfolioHistory: ${candidates.length} address(es) due`);

        if (!candidates.length) {
            return;
        }

        // Fetched once for the whole run rather than per address.
        const prices = await portfolio.getDailyPrices(pool, HISTORY_DAYS);
        console.log(`reconstructPortfolioHistory: ${Object.keys(prices).length} day(s) of price history`);

        for (const { address } of candidates) {
            if (Date.now() > deadline) {
                console.log('reconstructPortfolioHistory: out of budget, the rest wait for tomorrow');
                break;
            }

            try {
                const result = await reconstructOne(pool, address, prices);

                if (result.skipped) {
                    console.log(`  ${address}: skipped -- ${result.skipped}`);
                } else {
                    done += 1;
                    console.log(`  ${address}: ${result.written} day(s), ${result.priced} priced`
                        + `${result.truncated ? ', TRUNCATED transaction list' : ''}`
                        + `${result.underflows ? `, ${result.underflows} underflow(s)` : ''}`);
                }
            } catch (error) {
                failed += 1;
                console.error(`  ${address}: ${error.message}`);
            }

            await sleep(DELAY_MS);
        }

        console.log(`reconstructPortfolioHistory: ${done} done, ${failed} failed`);
    } finally {
        await pool.end();
    }
}

main().catch((error) => {
    console.error('reconstructPortfolioHistory failed:', error.message);
    process.exit(1);
});
