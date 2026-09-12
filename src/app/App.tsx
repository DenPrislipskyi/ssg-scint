import { Suspense } from 'react';
import { RouterProvider } from 'react-router/dom';

import { ErrorBoundary } from '@/app/ErrorBoundary';
import { AppProviders } from '@/app/providers/AppProviders';
import { router } from '@/app/router/routes';

export const App = () => (
  <ErrorBoundary>
    <AppProviders>
      <Suspense fallback={<div className="p-6 text-ink3">Loading…</div>}>
        <RouterProvider router={router} />
      </Suspense>
    </AppProviders>
  </ErrorBoundary>
);
