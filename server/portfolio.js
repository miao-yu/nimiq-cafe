// Portfolio storage: which addresses have signed in, how they are bundled, and
// the daily balance history the value-over-time chart reads.
//
// Everything is keyed on address. There is deliberately no user table -- an
// address proves itself by signing, which is the only identity this app has.

const { randomBytes } = require('crypto');

const BUNDLE_TABLE = 'pool.portfolio_accounts';
const SNAPSHOT_TABLE = 'pool.portfolio_snapshots';

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

/** Every address that signs in gets a bundle, so this should not return null. */
async function getBundleId(pool, address) {
    const [rows] = await pool.query(
        `SELECT bundle_id FROM ${BUNDLE_TABLE} WHERE address = ?`,
        [canonical(address)]
    );
    return rows.length ? rows[0].bundle_id : null;
}

/**
 * All addresses the signed-in address may see, itself included. Membership is
 * symmetric: signing in with any member shows the whole bundle.
 */
async function getBundleAddresses(pool, address) {
    const key = canonical(address);
    const bundleId = await getBundleId(pool, key);
    if (!bundleId) {
        return [key];
    }

    const [rows] = await pool.query(
        `SELECT address, first_seen FROM ${BUNDLE_TABLE}
         WHERE bundle_id = ? ORDER BY first_seen ASC`,
        [bundleId]
    );
    return rows.map((row) => row.address);
}

/**
 * Add `candidate` to the bundle `address` belongs to. The caller must already
 * have proved control of `candidate` by signing a challenge with it.
 *
 * An address that is already in a different bundle is refused rather than
 * merged. Merging looks harmless and is not: bundles are symmetric, so folding
 * {C,D} into {A,B} silently hands C and D a view of A. Unlink first.
 */
async function linkAddress(pool, address, candidate) {
    const owner = canonical(address);
    const key = canonical(candidate);

    if (owner === key) {
        return { ok: false, reason: 'same-address' };
    }

    const bundleId = await getBundleId(pool, owner);
    if (!bundleId) {
        return { ok: false, reason: 'unknown-owner' };
    }

    const existing = await getBundleId(pool, key);
    if (existing === bundleId) {
        return { ok: false, reason: 'already-linked' };
    }
    if (existing) {
        // It has its own history elsewhere. Refuse rather than merge.
        const [siblings] = await pool.query(
            `SELECT COUNT(*) AS n FROM ${BUNDLE_TABLE} WHERE bundle_id = ?`,
            [existing]
        );
        if (siblings[0].n > 1) {
            return { ok: false, reason: 'in-another-bundle' };
        }
        // A lone address is safe to move: nothing else can see it.
        await pool.query(
            `UPDATE ${BUNDLE_TABLE} SET bundle_id = ?, last_seen = NOW() WHERE address = ?`,
            [bundleId, key]
        );
        return { ok: true };
    }

    await pool.query(
        `INSERT INTO ${BUNDLE_TABLE} (address, bundle_id, first_seen, last_seen)
         VALUES (?, ?, NOW(), NOW())`,
        [key, bundleId]
    );
    return { ok: true };
}

/**
 * Remove `target` from the caller's bundle, giving it a fresh bundle of its own
 * rather than deleting it -- its snapshot history stays, and it can still sign
 * in by itself.
 *
 * Removing yourself is refused: it would leave the session holding a token for
 * an address outside the bundle it is looking at.
 */
async function unlinkAddress(pool, address, target) {
    const owner = canonical(address);
    const key = canonical(target);

    if (owner === key) {
        return { ok: false, reason: 'cannot-remove-self' };
    }

    const bundleId = await getBundleId(pool, owner);
    const targetBundle = await getBundleId(pool, key);
    if (!bundleId || bundleId !== targetBundle) {
        return { ok: false, reason: 'not-in-bundle' };
    }

    await pool.query(
        `UPDATE ${BUNDLE_TABLE} SET bundle_id = ? WHERE address = ?`,
        [randomBytes(16).toString('hex'), key]
    );
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
    getBundleAddresses,
    linkAddress,
    unlinkAddress,
    getSnapshots,
    writeSnapshot,
    getSnapshotTargets,
};
