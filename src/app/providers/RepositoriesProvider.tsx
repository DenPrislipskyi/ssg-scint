import { createContext, use, useMemo, type ReactNode } from 'react';

import { createRepositories, type Repositories } from '@/shared/api/createRepositories';

const RepositoriesContext = createContext<Repositories | null>(null);

export const RepositoriesProvider = ({
  children,
  value,
}: {
  children: ReactNode;
  /** Підміна реалізацій у тестах. */
  value?: Repositories;
}) => {
  const repositories = useMemo(() => value ?? createRepositories(), [value]);
  return <RepositoriesContext value={repositories}>{children}</RepositoriesContext>;
};

export const useRepositories = (): Repositories => {
  const context = use(RepositoriesContext);
  if (!context) throw new Error('useRepositories must be used within RepositoriesProvider');
  return context;
};
