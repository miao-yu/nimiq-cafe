import axios, { endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------

export type Challenge = {
  code: string;
  message: string;
  expiresAt: number;
};

/**
 * A sign-in challenge fetched *before* the button is pressed.
 *
 * The wallet has to be opened from inside the click that asked for it. iOS --
 * which is every browser on an iPhone, Chrome included, because they are all
 * WebKit -- only allows `window.open` in the same task as the gesture, and an
 * `await` on a network request ends that task. Asking the server for a
 * challenge at click time is exactly that await, and it is why signing in was
 * refused on iPhone while the popup opened fine on desktop.
 *
 * So the round trip happens early, and the click spends what is already here.
 * The server still issues the message and still burns it on use -- this moves
 * *when* it is fetched, not what is trusted.
 */

// Renew this far ahead of expiry. The server gives five minutes; a challenge
// with less than a minute left is not worth handing to a wallet dialog that
// the person may take a while to finish.
const RENEW_BEFORE_MS = 60 * 1000;

let held: Challenge | undefined;
let inFlight: Promise<Challenge> | undefined;

function usable(challenge: Challenge | undefined): challenge is Challenge {
  return !!challenge && challenge.expiresAt - Date.now() > RENEW_BEFORE_MS;
}

/** Fetch one, sharing a single request between concurrent callers. */
export function fetchChallenge(): Promise<Challenge> {
  inFlight ??= axios
    .post<Challenge>(endpoints.auth.challenge)
    .then((res) => {
      held = res.data;
      return res.data;
    })
    .finally(() => {
      inFlight = undefined;
    });

  return inFlight;
}

/**
 * Make sure one is ready. Fire and forget -- callers are effects, and a failed
 * prefetch must not surface as an error on a page nobody has interacted with.
 * `takeChallenge` falls back to fetching if this never landed.
 */
export function primeChallenge(): void {
  if (usable(held) || inFlight) return;
  void fetchChallenge().catch(() => undefined);
}

/**
 * The held challenge, synchronously, or undefined if there is none worth using.
 *
 * Synchronous is the whole point: a click handler must reach the wallet without
 * awaiting anything. Taking it also starts fetching the next one, so a cancelled
 * dialog followed by a second attempt still finds one waiting.
 */
export function takeChallenge(): Challenge | undefined {
  const ready = usable(held) ? held : undefined;
  held = undefined;
  primeChallenge();
  return ready;
}
