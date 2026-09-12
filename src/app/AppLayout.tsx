import { createContext, use, useMemo, useState, type ReactNode } from 'react';
import { Outlet } from 'react-router';

import { AppHeader } from '@/widgets/app-header/AppHeader';

interface BreadcrumbApi {
  breadcrumb: string;
  setBreadcrumb: (value: string) => void;
}

const BreadcrumbContext = createContext<BreadcrumbApi | null>(null);

/** Дозволяє сторінці деталки дописати хлібну крихту у глобальний хедер. */
export const useBreadcrumb = (): BreadcrumbApi => {
  const context = use(BreadcrumbContext);
  if (!context) throw new Error('useBreadcrumb must be used within AppLayout');
  return context;
};

export const AppLayout = ({ children }: { children?: ReactNode }) => {
  const [breadcrumb, setBreadcrumb] = useState('');
  const api = useMemo(() => ({ breadcrumb, setBreadcrumb }), [breadcrumb]);

  return (
    <BreadcrumbContext value={api}>
      <AppHeader breadcrumb={breadcrumb} />
      <main>{children ?? <Outlet />}</main>
    </BreadcrumbContext>
  );
};
