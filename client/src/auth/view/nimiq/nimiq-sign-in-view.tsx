import { useState } from 'react';
import HubApi from '@nimiq/hub-api';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import LoadingButton from '@mui/lab/LoadingButton';

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

  const handleSignIn = async () => {
    setLoading(true);
    try {
      const hubApi = new HubApi('https://hub.nimiq.com');
      const options = { appName: 'NimiqCafe', message: 'Welcome to NimiqCafe!\n\nSign in to continue. This verification process is free and doesn\'t involve any blockchain transactions or access to your sensitive information like passwords or private keys.' };

      const signedMessage = await hubApi.signMessage(options);

      await signInWithAddress({ message: options.message, signedMessage });
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
