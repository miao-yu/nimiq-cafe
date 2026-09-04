import { useState, useEffect } from 'react';

import { paths } from 'src/routes/paths';
import { useRouter, useSearchParams } from 'src/routes/hooks';

import { SplashScreen } from 'src/components/loading-screen';

import { useAuthContext } from '../hooks';

// ----------------------------------------------------------------------

type GuestGuardProps = {
  children: React.ReactNode;
};

export function GuestGuard({ children }: GuestGuardProps) {
  const router = useRouter();

  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') || paths.settings;

  const { loading, authenticated } = useAuthContext();

  const [isChecking, setIsChecking] = useState<boolean>(true);

  const checkPermissions = async (): Promise<void> => {
    if (loading) {
      return;
    }

    if (authenticated) {
      router.replace(returnTo);
      return;
    }

    setIsChecking(false);
  };

  useEffect(() => {
    checkPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, loading]);

  if (isChecking) {
    return <SplashScreen />;
  }

  return <>{children}</>;
}
