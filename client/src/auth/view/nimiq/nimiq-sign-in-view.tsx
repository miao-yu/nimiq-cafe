import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import LoadingButton from '@mui/lab/LoadingButton';

import { warmSigner } from 'src/lib/nimiq-provider';
import { signInWithAddress } from 'src/auth/context/nimiq';

import { useAuthContext } from '../../hooks';
import { getErrorMessage } from '../../utils';
import { FormHead } from '../../components/form-head';
// import { useRouter } from 'src/routes/hooks';

// ----------------------------------------------------------------------

export function NimiqSignInView() {
  const [loading, setLoading] = useState(false);
  // const router = useRouter();

  const { checkUserSession } = useAuthContext();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Deciding between Nimiq Pay and the Hub means waiting to see whether the
  // host injects a provider. Start that on mount so the wait happens while the
  // page is being read rather than after the button is pressed.
  useEffect(() => {
    warmSigner();
  }, []);

  const handleSignIn = async () => {
    setLoading(true);
    try {
      // The message is issued by the server, so there is nothing to pass here.
      await signInWithAddress();
      await checkUserSession?.();

      // router.refresh();
    } catch (error) {
      console.error('Error signing message:', error);
      const feedbackMessage = getErrorMessage(error);
      setErrorMessage(feedbackMessage);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <>
      <FormHead
        title="Sign in with your Nimiq address"
        description="Click to sign in and get started. This quick verification process doesn't cost anything and doesn't require any blockchain transactions. We never access or store your passwords or private keys."
        sx={{ textAlign: { xs: 'center', md: 'center' }, mb: 3 }}
      />

      {!!errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMessage}
        </Alert>
      )}

      <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
        <LoadingButton
          onClick={handleSignIn}
          fullWidth
          color="inherit"
          size="large"
          type="submit"
          variant="contained"
          loading={loading}
          loadingIndicator="Sign in..."
        >
          Sign in
        </LoadingButton>
      </Box>
    </>
  );
}
