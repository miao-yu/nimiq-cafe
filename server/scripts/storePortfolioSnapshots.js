// Records one balance snapshot per signed-in address per day.
//
// The chain answers "what is this address worth now" and nothing else -- there
// is no historical balance to query later. So the value-over-time chart on
// /portfolio can only ever show days this script has already run for, which is
// why it shipped before the page did.
//
// Cron (daily, shortly after midnight UTC so snapshot_date lines up with the
// day being described):
//   5 0 * * * cd /var/www/nimiq-cafe-prod/server && node scripts/storePortfolioSnapshots.js >> /var/www/logs/portfolio.log 2>&1
//
// Re-running the same day overwrites rather than duplicating, so a failed run
// is safe to repeat.

const mysql = require('mysql2/promise');
const { poolCredentials } = require('../db-config');
const { getSnapshotTargets, writeSnapshot } = require('../portfolio');

const JSON_RPC_URL = process.env.NIMIQ_RPC_URL || 'http://127.0.0.1:8648';
const RPC_TIMEOUT_MS = Number(process.env.RPC_TIMEOUT_MS || 30000);
// The node is local, but a few hundred addresses served one at a time is still
// slow enough to be worth overlapping. Small enough not to bother the node.
const CONCURRENCY = 5;

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

async function snapshotFor(address, nimUsd) {
    // A staker record is absent for anyone who has never staked; that is a
    // zero, not a failure.
    const [account, staker] = await Promise.all([
        rpc('getAccountByAddress', [address]),
        rpc('getStakerByAddress', [address]).catch(() => null),
    ]);

    if (!account) {
        return null;
    }

    return {
        address,
        liquid: account.balance || 0,
        staked: staker ? staker.balance || 0 : 0,
        inactive: staker ? staker.inactiveBalance || 0 : 0,
        retired: staker ? staker.retiredBalance || 0 : 0,
        validator: staker ? staker.delegation || null : null,
        nimUsd,
    };
}

async function main() {
    const pool = mysql.createPool(poolCredentials({
        waitForConnections: true,
        connectionLimit: CONCURRENCY + 1,
    }));

    try {
        const [priceRows] = await pool.query(
            'SELECT price FROM nimiq.price ORDER BY id DESC LIMIT 1'
        );
        const nimUsd = priceRows.length ? priceRows[0].price : null;
        if (nimUsd === null) {
            // Worth recording the balances anyway -- the fiat column is the
            // only thing that suffers, and it can be joined from elsewhere.
            console.warn('storePortfolioSnapshots: no NIM price available');
        }

        const addresses = await getSnapshotTargets(pool);
        console.log(`storePortfolioSnapshots: ${addresses.length} address(es)`);

        let written = 0;
        let skipped = 0;

        for (let i = 0; i < addresses.length; i += CONCURRENCY) {
            const batch = addresses.slice(i, i + CONCURRENCY);
            const results = await Promise.all(
                batch.map((address) =>
                    snapshotFor(address, nimUsd).catch((error) => {
                        console.error(`  ${address}: ${error.message}`);
                        return null;
                    })
                )
            );

            for (const snapshot of results) {
                if (!snapshot) {
                    skipped += 1;
                    continue;
                }
                await writeSnapshot(pool, snapshot);
                written += 1;
            }
        }

        console.log(`storePortfolioSnapshots: wrote ${written}, skipped ${skipped}`);
    } finally {
        await pool.end();
    }
}

main().catch((error) => {
    console.error('storePortfolioSnapshots failed:', error.message);
    process.exit(1);
});
