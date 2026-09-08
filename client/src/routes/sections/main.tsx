import type { RouteObject } from 'react-router';

import { lazy, Suspense } from 'react';
import { Outlet, Navigate } from 'react-router';

import { CONFIG } from 'src/global-config';
import { DashboardLayout } from 'src/layouts/dashboard';

import { LoadingScreen } from 'src/components/loading-screen';

import { AuthGuard } from 'src/auth/guard';

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
const ConverterPage = lazy(() => import('src/pages/converter'));

// ----------------------------------------------------------------------

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
      // The site's home. Changed from /staking so the domain root opens on the
      // network dashboard; server/seo.js resolves "/" to the same page.
      { path: '/', element: <Navigate to="/dashboard" replace /> },
      { path: 'staking', element: <StakingPage /> },
      { path: 'faq', element: <FaqsPage /> },
      { path: 'staker/:address', element: <StakerPage /> },
      { path: 'settings', element: <AuthGuard><UserEditPage /></AuthGuard> },
      { path: 'dashboard', element: <DashboardPage /> },
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
