// Rebuilding an address's past balances from today's, walking backwards.
//
// The chain stores current state, not history: there is no "what was this
// worth in March" to query. But every *change* is recoverable -- transfers and
// fees from the transaction list, compounded rewards from the restake events
// already backfilled into pool.portfolio_rewards -- so today's balance minus
// the changes since day D gives day D.
//
// Pure on purpose. The walk is the part that is easy to get subtly wrong and
// impossible to eyeball once it is inside a cron, so it takes plain data and
// returns plain data, and scripts/reconstructPortfolioHistory.js does the I/O.

// Every staking action is a transfer to or from this contract. A deposit is
// therefore two facts about one transaction -- liquid down, staked up -- and
// the total is unchanged, which is why totals only move on external transfers.
const STAKING_CONTRACT = 'NQ77 0000 0000 0000 0000 0000 0000 0000 0001';

const DAY_MS = 24 * 60 * 60 * 1000;

function dayKey(msOrDate) {
    return new Date(msOrDate).toISOString().slice(0, 10);
}

function normalize(address) {
    return String(address || '').replace(/\s+/g, '').toUpperCase();
}

/**
 * Per-day deltas for one address.
 *
 * A transaction is read from the address's point of view: value in when it is
 * the recipient, value plus fee out when it is the sender. The fee is only
 * ever paid by the sender, so it is only ever subtracted there.
 */
function dailyDeltas(address, transactions, restakesByDate) {
    const self = normalize(address);
    const contract = normalize(STAKING_CONTRACT);
    const deltas = new Map();

    const at = (date) => {
        if (!deltas.has(date)) {
            deltas.set(date, { liquid: 0, staked: 0 });
        }
        return deltas.get(date);
    };

    for (const tx of transactions) {
        const date = dayKey(tx.timestamp);
        const from = normalize(tx.from);
        const to = normalize(tx.to);
        const value = Number(tx.value) || 0;
        const fee = Number(tx.fee) || 0;
        const day = at(date);

        if (to === self) {
            day.liquid += value;
        }
        if (from === self) {
            day.liquid -= value + fee;
        }

        // The staking side of the same transaction.
        if (from === self && to === contract) {
            day.staked += value;
        }
        if (from === contract && to === self) {
            day.staked -= value;
        }
    }

    // Rewards are compounded straight into the stake; they never touch liquid.
    for (const [date, rewards] of Object.entries(restakesByDate)) {
        at(date).staked += Number(rewards) || 0;
    }

    return deltas;
}

/**
 * Walk backwards from today's balances, one day at a time.
 *
 * `current` is end-of-today. The changes recorded *on* day D are what turned
 * day D-1 into day D, so subtracting them from D yields D-1 -- which is why
 * the loop subtracts the day it is leaving rather than the one it is entering.
 *
 * Returns oldest first, excluding today, whose real snapshot the cron records
 * separately and should not be second-guessed.
 *
 * inactive and retired are folded into `staked`: they are sub-states inside the
 * contract, distinguishing them needs the staking payload decoded, and no chart
 * plots them apart. Totals -- the only thing the value chart reads -- are exact
 * either way.
 */
function reconstructHistory({ address, current, transactions, restakesByDate, days, today }) {
    const end = today ? new Date(`${today}T00:00:00Z`) : new Date();
    const deltas = dailyDeltas(address, transactions, restakesByDate);

    let liquid = Number(current.liquid) || 0;
    let staked = (Number(current.staked) || 0)
        + (Number(current.inactive) || 0)
        + (Number(current.retired) || 0);

    const out = [];

    for (let back = 0; back < days; back += 1) {
        const leaving = dayKey(end.getTime() - back * DAY_MS);
        const delta = deltas.get(leaving) || { liquid: 0, staked: 0 };

        liquid -= delta.liquid;
        staked -= delta.staked;

        const date = dayKey(end.getTime() - (back + 1) * DAY_MS);

        out.push({
            date,
            // A balance cannot be negative. One going below zero means the
            // transaction list was truncated and the walk is missing inflows,
            // so it is clamped and flagged rather than charted as nonsense.
            liquid: Math.max(0, Math.round(liquid)),
            staked: Math.max(0, Math.round(staked)),
            underflow: liquid < -1 || staked < -1,
        });
    }

    return out.reverse();
}

module.exports = { STAKING_CONTRACT, dailyDeltas, reconstructHistory, dayKey };
