import { Navigate, createBrowserRouter, type RouteObject } from 'react-router';
import { LocatorPage } from '@/features/locator/LocatorPage';
import { AppShell } from '@/features/shell/AppShell';
import { RouteError } from '@/features/shell/RouteError';

export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <LocatorPage /> },
      // There's only one screen: unknown paths land on it rather than a dead end.
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
];

export function createRouter() {
  return createBrowserRouter(routes);
}
