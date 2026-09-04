// Database credentials, read from server/.env.
//
// These used to be hardcoded in app.js and in every script under scripts/.
// They are centralised here so there is one place to rotate them, and so that
// a missing .env fails with a clear message instead of a MySQL "access denied".
//
// dotenv is loaded from an absolute path because the cron entries that run the
// scripts do not set a working directory, so a bare config() would look for
// .env next to the cron's cwd and silently find nothing.

const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

/**
 * Reads a required variable, or throws naming the variable that is missing.
 */
function required(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(
            `${name} is not set. Copy server/.env.example to server/.env and fill it in.`
        );
    }
    return value;
}

const DB_HOST = process.env.DB_HOST ?? '127.0.0.1';

// Two separate MySQL accounts with different grants. Which one a given script
// uses is not arbitrary -- swapping them will fail on the grants -- so they
// stay as two distinct credential sets rather than being merged into one.

/** Credentials for the `pool` account. `extra` adds/overrides fields. */
function poolCredentials(extra = {}) {
    return {
        host: DB_HOST,
        user: process.env.DB_POOL_USER ?? 'pool',
        password: required('DB_POOL_PASSWORD'),
        ...extra,
    };
}

/** Credentials for the `nimiq` account. `extra` adds/overrides fields. */
function nimiqCredentials(extra = {}) {
    return {
        host: DB_HOST,
        user: process.env.DB_NIMIQ_USER ?? 'nimiq',
        password: required('DB_NIMIQ_PASSWORD'),
        ...extra,
    };
}

module.exports = { required, poolCredentials, nimiqCredentials };
