import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderResult } from '@testing-library/react';
import { Suspense, type ReactElement } from 'react';
import { createMemoryRouter, Navigate, RouterProvider, type RouteObject } from 'react-router';

import { AppLayout } from '@/app/AppLayout';
import { RepositoriesProvider } from '@/app/providers/RepositoriesProvider';
import { createMockRepositories } from '@/shared/api/createRepositories';
import { LightboxProvider } from '@/shared/ui/Lightbox';
import { ToastProvider } from '@/shared/ui/Toast';

export interface RenderOptions {
  path?: string;
  initialEntries?: string[];
  /** Вкладені маршрути для сторінок з <Outlet/>. */
  children?: RouteObject[];
  /** Куди редиректити з індексного маршруту. */
  initialTab?: string;
}

/** Монтує сторінку з повним набором провайдерів і mock-репозиторіями. */
export const renderWithProviders = (
  element: ReactElement,
  { path = '/quotes', initialEntries = ['/quotes'], children, initialTab }: RenderOptions = {},
): RenderResult => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  const nested: RouteObject[] | undefined = children
    ? [
        ...(initialTab ? [{ index: true, element: <Navigate to={initialTab} replace /> }] : []),
        ...children,
      ]
    : undefined;

  const router = createMemoryRouter(
    [
      {
        element: <AppLayout />,
        children: [{ path, element, ...(nested ? { children: nested } : {}) }],
      },
    ],
    { initialEntries },
  );

  return render(
    <QueryClientProvider client={queryClient}>
      <RepositoriesProvider value={createMockRepositories()}>
        <ToastProvider>
          <LightboxProvider>
            <Suspense fallback={<div>Loading…</div>}>
              <RouterProvider router={router} />
            </Suspense>
          </LightboxProvider>
        </ToastProvider>
      </RepositoriesProvider>
    </QueryClientProvider>,
  );
};
