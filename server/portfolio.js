// Portfolio storage: which addresses have signed in, how they are bundled, and
// the daily balance history the value-over-time chart reads.
//
// Everything is keyed on address. There is deliberately no user table -- an
// address proves itself by signing, which is the only identity this app has.

const { randomBytes } = require('crypto');

// Not only the bundle table any more: this is the registry of every address we
// track, which getSnapshotTargets reads and where the backfill state lives.
const BUNDLE_TABLE = 'pool.portfolio_accounts';
const WATCHLIST_TABLE = 'pool.portfolio_watchlist';
const SNAPSHOT_TABLE = 'pool.portfolio_snapshots';

/**
 * How many addresses one account may follow.
 *
 * This is the real guard now that adding one costs nothing. Each new address
 * fires a Nimiq Watch backfill and a Hub transaction fetch on arrival, then
 * nightly cron work for good -- an unbounded list would let one person point a
 * lot of load at services that are not ours.
 */
const MAX_WATCHED = 20;

/** Addresses are stored and compared in the canonical spaced upper-case form. */
function canonical(address) {
    return String(address).trim().toUpperCase();
}

/**
 * Register an address as active, creating its bundle on first sight.
 *
 * Called at sign-in and again on every authenticated portfolio read, because
 * sign-in alone is not enough: tokens last 30 days, so anyone holding one from
 * before this table existed would never have been registered -- no bundle to
 * link addresses into, and nothing for the snapshot cron to record.
 *
 * Idempotent, so calling it on every read only moves last_seen.
 */
async function touchAccount(pool, address) {
    const key = canonical(address);
    await pool.query(
        `INSERT INTO ${BUNDLE_TABLE} (address, bundle_id, first_seen, last_seen)
         VALUES (?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE last_seen = NOW()`,
        [key, randomBytes(16).toString('hex')]
    );
}

/**
 * Every address this portfolio covers: the signed-in one first, then the ones
 * it follows, oldest first.
 *
 * Directional, and that is the point. Following an address proves nothing about
 * who controls it, so it must never work in reverse -- if B is on A's list,
 * signing in as B shows B's portfolio and nothing of A's. The bundle this
 * replaced was symmetric, which was only safe while adding required a signature
 * from the address being added.
 */
async function getPortfolioAddresses(pool, address) {
    const owner = canonical(address);

    const [rows] = await pool.query(
        `SELECT watched_address FROM ${WATCHLIST_TABLE}
         WHERE owner_address = ? ORDER BY added_at ASC`,
        [owner]
    );

    return [owner, ...rows.map((row) => row.watched_address).filter((a) => a !== owner)];
}

/**
 * Follow another address. No signature required.
 *
 * Balances and rewards are public chain data, and this page only reads them, so
 * proving control bought friction rather than safety -- unlocking a wallet per
 * address, on a phone, to look at numbers anyone can already look up. What it
 * did buy was a natural limit on how many addresses one account could add, so
 * MAX_WATCHED takes that job instead.
 *
 * Nothing here grants the watched address anything. It does not learn it is
 * being watched, and its own portfolio is unaffected.
 */
async function addWatchedAddress(pool, address, candidate) {
    const owner = canonical(address);
    const key = canonical(candidate);

    if (owner === key) {
        return { ok: false, reason: 'same-address' };
    }

    const [counted] = await pool.query(
        `SELECT COUNT(*) AS n FROM ${WATCHLIST_TABLE} WHERE owner_address = ?`,
        [owner]
    );
    if (counted[0].n >= MAX_WATCHED) {
        return { ok: false, reason: 'too-many' };
    }

    const [existing] = await pool.query(
        `SELECT 1 FROM ${WATCHLIST_TABLE} WHERE owner_address = ? AND watched_address = ?`,
        [owner, key]
    );
    if (existing.length) {
        return { ok: false, reason: 'already-watched' };
    }

    await pool.query(
        `INSERT INTO ${WATCHLIST_TABLE} (owner_address, watched_address, added_at)
         VALUES (?, ?, NOW())`,
        [owner, key]
    );

    // Registers it for daily snapshots and reward backfill. Idempotent, so an
    // address several people follow is still only tracked once.
    await touchAccount(pool, key);

    return { ok: true };
}

/**
 * Stop following `target`. Only the list entry goes; the address itself stays
 * registered, keeps its snapshot history, and is untouched for anyone else
 * following it.
 *
 * Removing yourself is refused: the signed-in address is the account, not an
 * entry in its own list.
 */
async function removeWatchedAddress(pool, address, target) {
    const owner = canonical(address);
    const key = canonical(target);

    if (owner === key) {
        return { ok: false, reason: 'cannot-remove-self' };
    }

    const [result] = await pool.query(
        `DELETE FROM ${WATCHLIST_TABLE} WHERE owner_address = ? AND watched_address = ?`,
        [owner, key]
    );

    if (!result.affectedRows) {
        return { ok: false, reason: 'not-watched' };
    }

    return { ok: true };
}

/** Daily history for a set of addresses, oldest first. */
async function getSnapshots(pool, addresses, days = 90) {
    if (!addresses.length) {
        return [];
    }

    const [rows] = await pool.query(
        `SELECT address, snapshot_date, liquid, staked, inactive, retired, validator, nim_usd,
                reconstructed
         FROM ${SNAPSHOT_TABLE}
         WHERE address IN (?) AND snapshot_date >= CURDATE() - INTERVAL ? DAY
         ORDER BY snapshot_date ASC`,
        [addresses, days]
    );
    return rows;
}

/** Upsert today's snapshot. Re-running the cron the same day overwrites. */
async function writeSnapshot(pool, snapshot) {
    await pool.query(
        `INSERT INTO ${SNAPSHOT_TABLE}
           (address, snapshot_date, liquid, staked, inactive, retired, validator, nim_usd)
         VALUES (?, CURDATE(), ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           liquid = VALUES(liquid), staked = VALUES(staked),
           inactive = VALUES(inactive), retired = VALUES(retired),
           validator = VALUES(validator), nim_usd = VALUES(nim_usd)`,
        [
            canonical(snapshot.address),
            snapshot.liquid, snapshot.staked, snapshot.inactive,
            snapshot.retired, snapshot.validator, snapshot.nimUsd,
        ]
    );
}

/** Addresses eligible for a snapshot: everyone who has ever signed in. */
async function getSnapshotTargets(pool) {
    const [rows] = await pool.query(`SELECT address FROM ${BUNDLE_TABLE}`);
    return rows.map((row) => row.address);
}

const REWARDS_TABLE = 'pool.portfolio_rewards';

/** Upsert backfilled daily rewards. Re-running a day overwrites it. */
async function writeRewards(pool, address, rows) {
    if (!rows.length) {
        return 0;
    }

    const key = canonical(address);
    const values = rows.map((row) => [key, row.date, row.validator, row.rewards]);

    // One statement rather than a row at a time: a year is ~360 rows per
    // validator and the round trips dominate otherwise.
    await pool.query(
        `INSERT INTO ${REWARDS_TABLE} (address, reward_date, validator, rewards)
         VALUES ?
         ON DUPLICATE KEY UPDATE rewards = VALUES(rewards)`,
        [values]
    );

    return rows.length;
}

/**
 * Addresses due a backfill, neediest first.
 *
 * Never-synced addresses come before stale ones, so somebody who just signed in
 * is not stuck behind a queue of routine top-ups. Failures back off by doubling
 * hours, capped, so a permanently broken address cannot occupy the run forever.
 */
async function getBackfillCandidates(pool, limit) {
    const [rows] = await pool.query(
        `SELECT address, rewards_synced_to, rewards_failures
         FROM ${BUNDLE_TABLE}
         WHERE (rewards_synced_to IS NULL OR rewards_synced_to < CURDATE())
           AND (
             rewards_attempted_at IS NULL
             OR rewards_attempted_at < NOW() - INTERVAL LEAST(POW(2, rewards_failures), 168) HOUR
           )
         ORDER BY (rewards_synced_to IS NOT NULL), rewards_synced_to ASC, first_seen ASC
         LIMIT ?`,
        [limit]
    );
    return rows;
}

/** Stamped before the request, so a crashed run still backs off. */
async function markBackfillAttempt(pool, address) {
    await pool.query(
        `UPDATE ${BUNDLE_TABLE} SET rewards_attempted_at = NOW() WHERE address = ?`,
        [canonical(address)]
    );
}

async function markBackfillSuccess(pool, address, syncedTo) {
    await pool.query(
        `UPDATE ${BUNDLE_TABLE}
         SET rewards_synced_to = ?, rewards_synced_at = NOW(), rewards_failures = 0
         WHERE address = ?`,
        [syncedTo, canonical(address)]
    );
}

async function markBackfillFailure(pool, address) {
    await pool.query(
        `UPDATE ${BUNDLE_TABLE}
         SET rewards_failures = LEAST(rewards_failures + 1, 10)
         WHERE address = ?`,
        [canonical(address)]
    );
}

/** Backfilled rewards for a set of addresses, oldest first. */
async function getExternalRewards(pool, addresses, days) {
    if (!addresses.length) {
        return [];
    }

    const [rows] = await pool.query(
        `SELECT address, reward_date, validator, rewards
         FROM ${REWARDS_TABLE}
         WHERE address IN (?) AND reward_date >= CURDATE() - INTERVAL ? DAY
         ORDER BY reward_date ASC`,
        [addresses, days]
    );
    return rows;
}

/**
 * Whether the page should say it is still gathering history.
 *
 * Pending means at least one address has never completed a backfill -- the
 * chart would be empty or partial through no fault of the data.
 */
async function getBackfillState(pool, addresses) {
    if (!addresses.length) {
        return { pending: false, syncedTo: null };
    }

    const [rows] = await pool.query(
        `SELECT MIN(rewards_synced_to) AS synced_to,
                SUM(rewards_synced_to IS NULL) AS never_synced,
                SUM(history_reconstructed_at IS NULL) AS never_reconstructed,
                SUM(history_truncated) AS truncated
         FROM ${BUNDLE_TABLE} WHERE address IN (?)`,
        [addresses]
    );

    const row = rows[0] || {};
    return {
        // The two jobs finish at different moments and drive different charts,
        // so the page is told about them separately rather than being given one
        // flag that is true for whichever is slower.
        pending: Number(row.never_synced || 0) > 0,
        historyPending: Number(row.never_reconstructed || 0) > 0,
        // The transaction list came back at its limit, so the balance walk was
        // refused. In practice this means an address paid in many small
        // transfers -- a staker on payouts rather than restaking -- which is
        // also why it has no restake history to chart.
        historyTruncated: Number(row.truncated || 0) > 0,
        syncedTo: row.synced_to ? String(row.synced_to).slice(0, 10) : null,
    };
}

/** Restakes already backfilled for one address, as { 'YYYY-MM-DD': luna }. */
async function getRestakesByDate(pool, address, days) {
    const [rows] = await pool.query(
        `SELECT reward_date, SUM(rewards) AS rewards
         FROM ${REWARDS_TABLE}
         WHERE address = ? AND reward_date >= CURDATE() - INTERVAL ? DAY
         GROUP BY reward_date`,
        [canonical(address), days]
    );

    const out = {};
    rows.forEach((row) => {
        const date = row.reward_date instanceof Date
            ? row.reward_date.toISOString().slice(0, 10)
            : String(row.reward_date).slice(0, 10);
        out[date] = Number(row.rewards) || 0;
    });
    return out;
}

/**
 * The last price recorded each day, as { 'YYYY-MM-DD': usd }.
 *
 * Last rather than average: a value chart is a series of closing balances, so
 * closing prices are the consistent thing to multiply them by.
 */
async function getDailyPrices(pool, days) {
    const [rows] = await pool.query(
        `SELECT DATE(created_at) AS d,
                SUBSTRING_INDEX(GROUP_CONCAT(price ORDER BY created_at DESC), ',', 1) AS price
         FROM nimiq.price
         WHERE created_at >= CURDATE() - INTERVAL ? DAY
         GROUP BY d`,
        [days]
    );

    const out = {};
    rows.forEach((row) => {
        const date = row.d instanceof Date ? row.d.toISOString().slice(0, 10) : String(row.d).slice(0, 10);
        out[date] = Number(row.price);
    });
    return out;
}

/**
 * Write reconstructed days.
 *
 * INSERT IGNORE, never an upsert: a day already recorded live is an
 * observation, and a derivation must not overwrite one.
 */
async function writeReconstructed(pool, address, rows) {
    if (!rows.length) {
        return 0;
    }

    const key = canonical(address);
    const values = rows.map((row) => [
        key, row.date, row.liquid, row.staked, 0, 0, row.validator || null,
        row.nimUsd === null || row.nimUsd === undefined ? null : row.nimUsd,
        1, row.underflow ? 1 : 0,
    ]);

    await pool.query(
        `INSERT IGNORE INTO ${SNAPSHOT_TABLE}
           (address, snapshot_date, liquid, staked, inactive, retired, validator,
            nim_usd, reconstructed, underflow)
         VALUES ?`,
        [values]
    );

    return rows.length;
}

/** Addresses whose history has never been reconstructed. */
async function getReconstructCandidates(pool, limit) {
    const [rows] = await pool.query(
        `SELECT address FROM ${BUNDLE_TABLE}
         WHERE history_reconstructed_at IS NULL
           AND rewards_synced_to IS NOT NULL
         ORDER BY first_seen ASC
         LIMIT ?`,
        [limit]
    );
    return rows;
}

async function markReconstructed(pool, address, truncated) {
    await pool.query(
        `UPDATE ${BUNDLE_TABLE}
         SET history_reconstructed_at = NOW(), history_truncated = ?
         WHERE address = ?`,
        [truncated ? 1 : 0, canonical(address)]
    );
}

module.exports = {
    canonical,
    getRestakesByDate,
    getDailyPrices,
    writeReconstructed,
    getReconstructCandidates,
    markReconstructed,
    writeRewards,
    getBackfillCandidates,
    markBackfillAttempt,
    markBackfillSuccess,
    markBackfillFailure,
    getExternalRewards,
    getBackfillState,
    touchAccount,
    getPortfolioAddresses,
    addWatchedAddress,
    removeWatchedAddress,
    MAX_WATCHED,
    getSnapshots,
    writeSnapshot,
    getSnapshotTargets,
};
