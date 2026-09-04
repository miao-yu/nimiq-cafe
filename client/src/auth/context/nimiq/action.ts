import type { SignedMessage } from '@nimiq/hub-api';

import axios, { endpoints } from 'src/lib/axios';

import { setSession } from './utils';

// ----------------------------------------------------------------------

export type SignInParams = {
  message: string;
  signedMessage: SignedMessage;
};

/** **************************************
 * Sign in
 *************************************** */
export const signInWithAddress = async ({ message, signedMessage }: SignInParams): Promise<void> => {
  try {
    const base64Signature = btoa(String.fromCharCode(...signedMessage.signature));
    const base64SignerPublicKey = btoa(String.fromCharCode(...signedMessage.signerPublicKey));

    const params = { message, base64Signature, base64SignerPublicKey, signer: signedMessage.signer };

    const res = await axios.post(endpoints.auth.signIn, params);

    const { accessToken } = res.data;

    if (!accessToken) {
      throw new Error('Access token not found in response');
    }

    setSession(accessToken);
  } catch (error) {
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
