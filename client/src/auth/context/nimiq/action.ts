import axios, { endpoints } from 'src/lib/axios';
import { getSigner, resetSigner } from 'src/lib/nimiq-provider';

import { setSession } from './utils';

// ----------------------------------------------------------------------

type Challenge = {
  code: string;
  message: string;
  expiresAt: number;
};

/** **************************************
 * Sign in
 *
 * Two round trips, because the client must not choose what gets signed. The
 * server issues a random single-use message and looks it up again by code, so
 * a captured signature is worth nothing once used and nothing at all after
 * five minutes. It used to sign a fixed constant, which made any signature
 * over it a permanent credential.
 *
 * Works in an ordinary browser and inside Nimiq Pay; getSigner() decides which.
 *************************************** */
export const signInWithAddress = async (): Promise<void> => {
  try {
    const signer = await getSigner();

    const { data: challenge } = await axios.post<Challenge>(endpoints.auth.challenge);

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
    await setSession(null);
  } catch (error) {
    console.error('Error during sign out:', error);
    throw error;
  }
};
