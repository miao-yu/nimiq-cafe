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
        `SELECT address, snapshot_date, liquid, staked, inactive, retired, validator, nim_usd
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

module.exports = {
    canonical,
    touchAccount,
    getBundleAddresses,
    linkAddress,
    unlinkAddress,
    getSnapshots,
    writeSnapshot,
    getSnapshotTargets,
};
