import axios, { endpoints } from 'src/lib/axios';
import { signerNow, resetSigner } from 'src/lib/nimiq-provider';
import { takeChallenge, fetchChallenge } from 'src/lib/nimiq-challenge';

import { setSession } from './utils';

// ----------------------------------------------------------------------

/** **************************************
 * Sign in
 *
 * Two round trips, because the client must not choose what gets signed. The
 * server issues a random single-use message and looks it up again by code, so
 * a captured signature is worth nothing once used and nothing at all after
 * five minutes. It used to sign a fixed constant, which made any signature
 * over it a permanent credential.
 *
 * Works in an ordinary browser and inside Nimiq Pay; signerNow() decides which.
 *
 * Nothing may be awaited between entering this function and opening the wallet.
 * On iOS -- every iPhone browser, Chrome included -- a popup is only allowed in
 * the same task as the click, and asking the server for a challenge here is
 * what got sign-in refused there. The challenge is fetched ahead of the press
 * instead; the await below is only the fallback for when none was primed, and
 * it costs the popup on iPhone, so a second press is what recovers.
 *************************************** */
export const signInWithAddress = async (): Promise<void> => {
  try {
    const signer = signerNow();
    const challenge = takeChallenge() ?? (await fetchChallenge());

    const signed = await signer.sign(challenge.message);

    const res = await axios.post(endpoints.auth.signIn, {
      code: challenge.code,
      publicKey: signed.publicKey,
      signature: signed.signature,
      signer: signed.signer,
    });

    const { accessToken } = res.data;

    if (!accessToken) {
      throw new Error('Access token not found in response');
    }

    setSession(accessToken);
  } catch (error) {
    // A failed attempt may have been the provider choice, not the signature --
    // drop it so a retry can pick again rather than repeating the same failure.
    resetSigner();
    console.error('Error during sign in:', error);
    throw error;
  }
};

/** **************************************
 * Sign out
 *************************************** */
export const signOut = async (): Promise<void> => {
  try {
    // The shared cookie is httpOnly, so only the server can clear it. Without
    // this, signing out here would leave you signed in on reef.nimiq.cafe --
    // and signed back in here on the next reload.
    await axios.post(endpoints.auth.signOut).catch(() => undefined);
    await setSession(null);
  } catch (error) {
    console.error('Error during sign out:', error);
    throw error;
  }
};
