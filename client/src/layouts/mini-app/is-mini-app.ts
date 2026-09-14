/**
 * Whether this page is running inside the Nimiq Pay Mini App host.
 *
 * Read once, synchronously, at module load. The host injects `window.nimiq`
 * before the page script runs -- the same fact src/lib/nimiq-provider.ts relies
 * on to pick a signer -- so by the time React renders, the answer is already
 * final. Deciding it per render would risk painting the website shell first and
 * flipping to the app shell a frame later, which is exactly the kind of jump
 * that makes something feel like a web page in a wrapper.
 *
 * `?miniapp=1` forces it on in an ordinary browser and sticks for the tab, so
 * the shell can be looked at without a phone; `?miniapp=0` clears it. That
 * override is the only way either of us can see this layout during development,
 * since the real trigger only exists inside Nimiq Pay.
 */

const OVERRIDE_KEY = 'nimiq-cafe:miniapp';

function readOverride(): boolean | null {
  try {
    const param = new URLSearchParams(window.location.search).get('miniapp');

    if (param === '1' || param === '0') {
      const on = param === '1';
      sessionStorage.setItem(OVERRIDE_KEY, on ? '1' : '0');
      return on;
    }

    const stored = sessionStorage.getItem(OVERRIDE_KEY);
    return stored === null ? null : stored === '1';
  } catch {
    // Private windows and blocked site data throw on sessionStorage. An
    // unavailable override is not an error, it just means there isn't one.
    return null;
  }
}

function detect(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const override = readOverride();
  return override ?? 'nimiq' in window;
}

const RESULT = detect();

export function isMiniApp(): boolean {
  return RESULT;
}
