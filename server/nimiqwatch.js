// Client for the one Nimiq Watch endpoint we depend on for reward history.
//
//   GET /api/v2/staker/<ADDRESS>/events/restake-grouped?from=<ISO>&to=<ISO>
//
// It is what the Nimiq Wallet itself uses -- see nimiq/wallet,
// src/config/config.mainnet.ts (`staking.stakeEventsEndpoint`) and
// src/network.ts -- and it answers for a staker with *any* validator, which is
// the whole reason it is here: pool.staker_rewards only knows our own stakers.
//
// Measured against a large staker on 2026-09-08:
//
//     7 days   0.9s     90 KB      667 events
//    30 days   1.2s    382 KB    2,828 events
//    90 days   2.9s    1.1 MB    8,164 events
//   365 days   7.2s    4.6 MB   33,947 events  -> 360 daily rows
//
// So a year is one request rather than a loop, and the daily rows it collapses
// to are orders of magnitude smaller than the events they came from. That shape
// is why the backfill fetches wide and stores narrow.

const ENDPOINT = process.env.NIMIQ_WATCH_EVENTS_URL
    || 'https://v2.nimiqwatch.com/api/v2/staker/ADDRESS/events/restake-grouped';

// A year of events takes ~7s; allow generously for a slow day without letting a
// hung request hold a nightly run open indefinitely.
const TIMEOUT_MS = Number(process.env.NIMIQ_WATCH_TIMEOUT_MS || 120000);

// Nimiq PoS genesis. Nothing was restaked before it, so no range starts earlier.
const GENESIS = new Date('2024-11-19T16:00:00.000Z');

/** The API wants `+` where the address has spaces. */
function encodeAddress(address) {
    return String(address).trim().replace(/\s+/g, '+');
}

/**
 * Restake events for one staker between two dates.
 *
 * Returns the raw 15-minute buckets. Callers almost always want dailyRewards()
 * instead; this stays separate so a caller wanting finer grain than a day is
 * not forced to fetch twice.
 */
async function fetchRestakeEvents(address, from, to) {
    const start = from < GENESIS ? GENESIS : from;
    const url = ENDPOINT.replace('ADDRESS', encodeAddress(address))
        + `?from=${start.toISOString()}&to=${to.toISOString()}`;

    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });

    if (!res.ok) {
        throw new Error(`Nimiq Watch answered ${res.status} for ${address}`);
    }

    const body = await res.json();

    if (!body || !Array.isArray(body.groups)) {
        throw new Error(`Nimiq Watch returned no groups for ${address}`);
    }

    return body.groups;
}

/**
 * Collapse restake events into one row per day per paying validator.
 *
 * Grouped by validator rather than summed flat: a staker who moves between
 * pools should still be able to see which one paid what, and merging them
 * would quietly destroy that.
 */
function toDailyRewards(events) {
    const byKey = new Map();

    for (const event of events) {
        const date = String(event.time_window || '').slice(0, 10);
        const validator = event.sender_address;
        const value = Number(event.aggregated_value);

        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !validator || !Number.isFinite(value)) {
            continue;
        }

        const key = `${date}|${validator}`;
        byKey.set(key, (byKey.get(key) || 0) + value);
    }

    return [...byKey.entries()]
        .map(([key, rewards]) => {
            const [date, validator] = key.split('|');
            return { date, validator, rewards: Math.round(rewards) };
        })
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** Fetch and collapse in one step, which is what the backfill actually wants. */
async function dailyRewards(address, from, to) {
    return toDailyRewards(await fetchRestakeEvents(address, from, to));
}

module.exports = { fetchRestakeEvents, toDailyRewards, dailyRewards, GENESIS, ENDPOINT };
