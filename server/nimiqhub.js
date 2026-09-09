// Transaction history for one address, from the Nimiq Hub API.
//
// Only used to reconstruct past balances: transfers and fees are the half of
// the movement that restake events do not cover. Cheap, because restakes are
// not transactions -- a staker with a year of compounding rewards still has a
// handful of actual transactions. Measured 2026-09-09: 7 rows / 6 KB / 0.6s
// for one, 30 rows for another.

const ENDPOINT = process.env.NIMIQ_HUB_API_URL || 'https://api.nimiqhub.com';
const TIMEOUT_MS = Number(process.env.NIMIQ_HUB_TIMEOUT_MS || 60000);

// Requested count. The API has no date filter, so the only lever is how many
// of the most recent transactions to take; the caller compares the number
// returned against this to notice truncation.
const DEFAULT_LIMIT = Number(process.env.NIMIQ_HUB_TX_LIMIT || 500);

/**
 * Most recent transactions first.
 *
 * The address is percent-encoded, not plus-encoded: this API answers 500 to
 * `+` in the path, unlike the Nimiq Watch one, which requires it.
 */
async function fetchTransactions(address, limit = DEFAULT_LIMIT) {
    const url = `${ENDPOINT}/getTransactionsByAddress/${encodeURIComponent(String(address).trim())}/${limit}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });

    if (!res.ok) {
        throw new Error(`Nimiq Hub answered ${res.status} for ${address}`);
    }

    const body = await res.json();

    if (!body || !Array.isArray(body.data)) {
        throw new Error(body && body.error ? `Nimiq Hub: ${body.error}` : 'Nimiq Hub returned no data');
    }

    return {
        transactions: body.data,
        // Exactly `limit` back almost certainly means there are more, so the
        // walk is missing the oldest movements and will drift.
        truncated: body.data.length >= limit,
    };
}

module.exports = { fetchTransactions, ENDPOINT, DEFAULT_LIMIT };
