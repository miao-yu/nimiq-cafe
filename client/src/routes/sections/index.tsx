import type { RouteObject } from 'react-router';

import { lazy } from 'react';

import { authRoutes } from './auth';
import { mainRoutes } from './main';

// ----------------------------------------------------------------------

const Page404 = lazy(() => import('src/pages/error/404'));

export const routesSection: RouteObject[] = [
  // Auth
  ...authRoutes,

  // Main
  ...mainRoutes,

  // No match
  { path: '*', element: <Page404 /> },
];
