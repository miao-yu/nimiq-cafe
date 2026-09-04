import type { RouteObject } from 'react-router';

import { Outlet } from 'react-router';
import { lazy, Suspense } from 'react';

import { AuthCenteredLayout } from 'src/layouts/auth-centered';

import { SplashScreen } from 'src/components/loading-screen';

import { GuestGuard } from 'src/auth/guard';

/** **************************************
 * Nimiq
 *************************************** */
const Nimiq = {
  SignInPage: lazy(() => import('src/pages/auth/nimiq/sign-in')),
};

const authNimiq = {
  path: 'nimiq',
  children: [
    {
      path: 'sign-in',
      element: (
        <GuestGuard>
          <AuthCenteredLayout>
            <Nimiq.SignInPage />
          </AuthCenteredLayout>
        </GuestGuard>
      ),
    },
  ],
};

// ----------------------------------------------------------------------

export const authRoutes: RouteObject[] = [
  {
    path: 'auth',
    element: (
      <Suspense fallback={<SplashScreen />}>
        <Outlet />
      </Suspense>
    ),
    children: [authNimiq],
  },
];
