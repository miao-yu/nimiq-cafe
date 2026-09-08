import HubApi from '@nimiq/hub-api';

// ----------------------------------------------------------------------

/**
 * Where a signature comes from.
 *
 *  - 'nimiq-pay' -- running inside the Nimiq Pay Mini App host, which injects
 *    `window.nimiq` before the page script runs.
 *  - 'hub'       -- the regular Nimiq Wallet, in an ordinary browser.
 *
 * The two are picked between at runtime, so the same sign-in button works in
 * both places and the caller never has to know which it got.
 */
export type ProviderKind = 'nimiq-pay' | 'hub';

export type SignatureResult = {
  /** Hex, which is what both paths normalise to and what the server expects. */
  publicKey: string;
  signature: string;
  /** The address that signed. Advisory -- the server derives its own from the key. */
  signer: string;
};

export type NimiqSigner = {
  readonly kind: ProviderKind;
  sign: (message: string) => Promise<SignatureResult>;
};

/**
 * The slice of the injected Mini App provider used here. Deliberately not
 * @nimiq/mini-app-sdk: its `init()` is a readiness wrapper around this same
 * object, and the wait below is the whole of it. Swapping to the SDK later is
 * a one-line change in `resolve()`.
 */
type InjectedProvider = {
  listAccounts: () => Promise<string[] | ProviderError>;
  sign: (message: string) => Promise<{ publicKey: string; signature: string } | ProviderError>;
};

type ProviderError = { error: { type: string; message: string } };

declare global {
  interface Window {
    nimiq?: InjectedProvider;
  }
}

const APP_NAME = 'NimiqCafe';

/**
 * Pin the endpoint. HubApi otherwise guesses one from the page's hostname and
 * falls back to http://localhost:8080 for anything it does not recognise as a
 * Nimiq domain -- which nimiq.cafe is not.
 */
const HUB_ENDPOINT = 'https://hub.nimiq.com';

/**
 * How long to wait for the host to inject `window.nimiq`. Outside Nimiq Pay it
 * never arrives, so this is dead time for browser users -- keep it short, and
 * call `warmSigner()` early so it elapses while they are reading the page.
 */
const INJECTION_TIMEOUT_MS = 1500;

let cached: Promise<NimiqSigner> | undefined;

/** Resolve the signer, once per page load. */
export function getSigner(): Promise<NimiqSigner> {
  cached ??= resolve();
  return cached;
}

/** Start resolving without waiting for the answer, to hide the injection wait. */
export function warmSigner(): void {
  void getSigner();
}

/** Forget the cached choice, so a failed attempt can be retried cleanly. */
export function resetSigner(): void {
  cached = undefined;
}

async function resolve(): Promise<NimiqSigner> {
  const injected = await waitForInjection();
  return injected ? createMiniAppSigner(injected) : createHubSigner();
}

async function waitForInjection(): Promise<InjectedProvider | null> {
  if (typeof window === 'undefined') return null;

  const deadline = Date.now() + INJECTION_TIMEOUT_MS;
  while (!window.nimiq) {
    if (Date.now() > deadline) return null;
    await new Promise((done) => {
      setTimeout(done, 50);
    });
  }
  return window.nimiq;
}

/** The provider resolves its errors instead of rejecting them. Turn that back. */
function unwrap<T>(value: T | ProviderError): T {
  if (value && typeof value === 'object' && 'error' in value) {
    throw new Error((value as ProviderError).error.message);
  }
  return value as T;
}

function createMiniAppSigner(provider: InjectedProvider): NimiqSigner {
  return {
    kind: 'nimiq-pay',
    async sign(message: string) {
      const accounts = unwrap(await provider.listAccounts());
      if (!accounts.length) {
        throw new Error('Nimiq Pay returned no account to sign with.');
      }

      const { publicKey, signature } = unwrap(await provider.sign(message));

      return { publicKey, signature, signer: accounts[0] };
    },
  };
}

function createHubSigner(): NimiqSigner {
  const hub = new HubApi(HUB_ENDPOINT);

  return {
    kind: 'hub',
    async sign(message: string) {
      // No `signer`, so the Hub shows its own account picker and reports back
      // which address was used -- one dialog rather than choose-then-sign.
      const signed = await hub.signMessage({ appName: APP_NAME, message });

      return {
        publicKey: toHex(signed.signerPublicKey),
        signature: toHex(signed.signature),
        signer: signed.signer,
      };
    },
  };
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
