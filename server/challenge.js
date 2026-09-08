// Single-use sign-in challenges.
//
// The sign-in message used to be a fixed constant, so any signature over it
// stayed valid forever: capture one anywhere and it was a permanent credential
// for that address. A challenge is random, short-lived and burned on use, so a
// captured signature is worth nothing a second time.
//
// Held in memory, which is right for one pm2 fork on one VPS and nothing else.
// Behind two instances a challenge issued by A cannot be consumed by B and
// sign-in fails intermittently -- move the store to Redis (already a
// dependency) if this is ever scaled out.

const { randomBytes } = require('crypto');

const TTL_MS = 5 * 60 * 1000;
// A full table means someone is spraying; issuing stops rather than growing
// without bound. 10k five-minute challenges is far beyond real traffic.
const MAX_PENDING = 10000;

const pending = new Map();

function sweep(now) {
    for (const [code, entry] of pending) {
        if (entry.expiresAt <= now) {
            pending.delete(code);
        }
    }
}

/**
 * Issue a challenge. Unlike Reef's, this is not bound to an address: the
 * address is derived from the signing key when the signature is verified, so
 * binding one in advance would add nothing except a second wallet dialog --
 * the Hub returns the signer from signMessage, and asking for it up front
 * would mean calling chooseAddress first.
 *
 * The app name is in the text so a signature collected here cannot be replayed
 * against a different app, and the whole string is shown verbatim in the
 * wallet, so it reads as something a person can agree to.
 */
function issueChallenge() {
    const now = Date.now();
    sweep(now);
    if (pending.size >= MAX_PENDING) {
        throw new Error('Too many pending challenges');
    }

    const code = randomBytes(16).toString('hex');
    const expiresAt = now + TTL_MS;

    const message = [
        'Sign in to NimiqCafe',
        `Code: ${code}`,
        'Valid for 5 minutes. Signing costs nothing and moves no NIM.',
    ].join('\n');

    pending.set(code, { message, expiresAt });

    return { code, message, expiresAt };
}

/**
 * Return the challenge for `code` and burn it. A second call with the same
 * code fails, which is the whole point -- deletion happens before the expiry
 * check so a replay cannot even probe for a still-valid entry.
 */
function consumeChallenge(code) {
    const now = Date.now();
    sweep(now);

    if (typeof code !== 'string') {
        return null;
    }

    const entry = pending.get(code);
    if (!entry) {
        return null;
    }

    pending.delete(code);

    if (entry.expiresAt <= now) {
        return null;
    }

    return entry;
}

module.exports = { issueChallenge, consumeChallenge, TTL_MS, MAX_PENDING };
