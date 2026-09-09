import type { RouteObject } from 'react-router';

import { lazy, Suspense } from 'react';
import { Outlet, Navigate } from 'react-router';

import { CONFIG } from 'src/global-config';
import { DashboardLayout } from 'src/layouts/dashboard';

import { LoadingScreen } from 'src/components/loading-screen';

import { AuthGuard } from 'src/auth/guard';
import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

// Overview
const StakingPage = lazy(() => import('src/pages/dashboard'));
const DashboardPage = lazy(() => import('src/pages/dashboard/ecommerce'));
const FaqsPage = lazy(() => import('src/pages/faqs'));
const StakerPage = lazy(() => import('src/pages/dashboard/course'));
const BlockPage = lazy(() => import('src/pages/explorer/block'));
const TransactionPage = lazy(() => import('src/pages/explorer/transaction'));
const WalletPage = lazy(() => import('src/pages/explorer/wallet'));
const ExplorerPage = lazy(() => import('src/pages/explorer'));
const UserEditPage = lazy(() => import('src/pages/dashboard/user/edit'));
const PoolsPage = lazy(() => import('src/pages/dashboard/pool/list'));
const PoolDetailsPage = lazy(() => import('src/pages/dashboard/pool/details'));
const BlocksPage = lazy(() => import('src/pages/explorer/blocks'));
const TransactionsPage = lazy(() => import('src/pages/explorer/transactions'));
const CalculatorPage = lazy(() => import('src/pages/calculator'));
const PortfolioPage = lazy(() => import('src/pages/portfolio'));
const ConverterPage = lazy(() => import('src/pages/converter'));

// ----------------------------------------------------------------------

/**
 * The domain root.
 *
 * Portfolio when signed in, Network otherwise. Not an unconditional redirect
 * to /portfolio: that page is behind AuthGuard, so every signed-out visitor --
 * and every crawler, which is never signed in -- would land on a sign-in form,
 * and the site's most-linked URL would resolve to a noindex page. server/seo.js
 * still answers "/" with the Network metadata for the same reason: what a
 * crawler actually gets here is the Network page.
 */
function RootRedirect() {
  const { authenticated, loading } = useAuthContext();

  // checkUserSession may be mid-flight asking /api/auth/me whether the shared
  // reef.nimiq.cafe cookie names anybody. Redirecting before it answers would
  // send a signed-in arrival to Network.
  if (loading) {
    return <LoadingScreen />;
  }

  return <Navigate to={authenticated ? '/portfolio' : '/network'} replace />;
}

const mainLayout = () => (
  <DashboardLayout>
    <Suspense fallback={<LoadingScreen />}>
      <Outlet />
    </Suspense>
  </DashboardLayout>
);

export const mainRoutes: RouteObject[] = [
  {
    element: CONFIG.auth.skip ? mainLayout() : <AuthGuard>{mainLayout()}</AuthGuard>,
    children: [
      { path: '/', element: <RootRedirect /> },
      { path: 'staking', element: <StakingPage /> },
      { path: 'faq', element: <FaqsPage /> },
      { path: 'staker/:address', element: <StakerPage /> },
      { path: 'settings', element: <AuthGuard><UserEditPage /></AuthGuard> },
      // Signed-in only: the address comes from the token, so there is nothing
      // to show without one.
      { path: 'portfolio', element: <AuthGuard><PortfolioPage /></AuthGuard> },
      { path: 'network', element: <DashboardPage /> },
      { path: 'block/:blockNumber', element: <BlockPage /> },
      { path: 'tx/:hash', element: <TransactionPage /> },
      { path: 'wallet/:address', element: <WalletPage /> },
      { path: 'explorer', element: <ExplorerPage /> },
      { path: 'blocks', element: <BlocksPage /> },
      { path: 'transactions', element: <TransactionsPage /> },
      { path: 'calculator', element: <CalculatorPage /> },
      { path: 'converter', element: <ConverterPage /> },
      {
        path: 'pools',
        children: [
          { index: true, element: <PoolsPage /> },
          { path: 'list', element: <PoolsPage /> },
          { path: ':address', element: <PoolDetailsPage /> },
        ],
      },
    ],
  },
];
