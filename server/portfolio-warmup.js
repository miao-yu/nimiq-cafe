// Builds a newly seen address's history immediately, instead of leaving it for
// the nightly crons.
//
// The crons still exist and still own the steady state -- topping everyone up,
// retrying failures, backing off. This is only about the first time an address
// is seen: waiting until 00:40 for a chart meant somebody who signed in at
// lunchtime saw placeholders all day. Measured, the work is ~1s for rewards and
// ~1s for the reconstruction, so there is no reason to make them wait.
//
// Fire and forget. Nothing here is awaited by a request: a slow or broken
// Nimiq Watch must never make signing in slow or broken. The page keeps its
// "still gathering" state until the work lands, which is the same state it
// would have shown anyway.
//
// Politeness is preserved by construction:
//   * one address at a time, process-wide -- a queue, not a fan-out, so ten
//     simultaneous sign-ins are ten sequential requests rather than ten
//     concurrent ones;
//   * an address already in flight or already queued is not queued twice;
//   * the queue is bounded, and past that the nightly cron picks up the rest;
//   * work is skipped entirely when the address already has what it needs.

const portfolio = require('./portfolio');
const jobs = require('./portfolio-jobs');

// Beyond this, new arrivals wait for the cron rather than growing a backlog in
// memory. Far above any plausible burst for this site.
const MAX_QUEUE = Number(process.env.PORTFOLIO_WARMUP_QUEUE || 50);

// A pause between queued addresses, matching the cron's. Nothing here is urgent
// enough to justify going faster against someone else's service.
const DELAY_MS = Number(process.env.PORTFOLIO_WARMUP_DELAY_MS || 2000);

const queued = new Set();
const queue = [];
let draining = false;

const sleep = (ms) => new Promise((done) => { setTimeout(done, ms); });

/** What, if anything, this address still needs. */
async function pending(pool, address) {
    const [rows] = await pool.query(
        `SELECT rewards_synced_to, history_reconstructed_at
         FROM pool.portfolio_accounts WHERE address = ?`,
        [portfolio.canonical(address)]
    );

    if (!rows.length) {
        return null;
    }

    return {
        rewards: rows[0].rewards_synced_to === null,
        history: rows[0].history_reconstructed_at === null,
    };
}

async function warmOne(pool, address) {
    const todo = await pending(pool, address);

    if (!todo || (!todo.rewards && !todo.history)) {
        return;
    }

    if (todo.rewards) {
        const result = await jobs.backfillRewards(pool, address, null);
        console.log(`warmup ${address}: ${result.written} reward day(s) in ${result.ms}ms`);
    }

    if (todo.history) {
        // Needs the rewards above; they are the restakes the walk subtracts.
        const prices = await portfolio.getDailyPrices(pool, 365);
        const result = await jobs.reconstructPast(pool, address, prices);
        console.log(`warmup ${address}: ${result.written} history day(s) in ${result.ms}ms`);
    }
}

async function drain(pool) {
    if (draining) {
        return;
    }
    draining = true;

    try {
        while (queue.length) {
            const address = queue.shift();
            queued.delete(address);

            try {
                await warmOne(pool, address);
            } catch (error) {
                // The cron will retry with backoff; this attempt just ends.
                console.error(`warmup ${address} failed: ${error.message}`);
            }

            if (queue.length) {
                await sleep(DELAY_MS);
            }
        }
    } finally {
        draining = false;
    }
}

/**
 * Queue an address for warm-up. Returns immediately and never throws -- callers
 * are request handlers and must not be delayed or broken by this.
 */
function warmAddress(pool, address) {
    try {
        const key = portfolio.canonical(address);

        if (queued.has(key) || queue.length >= MAX_QUEUE) {
            return;
        }

        queued.add(key);
        queue.push(key);

        void drain(pool);
    } catch (error) {
        console.error('warmAddress failed to queue:', error.message);
    }
}

module.exports = { warmAddress };
