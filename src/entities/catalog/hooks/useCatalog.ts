import { useSuspenseQuery } from '@tanstack/react-query';

import { useRepositories } from '@/app/providers/RepositoriesProvider';
import type { CatalogData } from '@/entities/catalog/model/types';

export const catalogQueryKey = ['catalog'] as const;

/** Каталог потрібен майже кожному розрахунку, тому вантажиться через Suspense. */
export const useCatalog = (): CatalogData => {
  const { catalog } = useRepositories();
  const { data } = useSuspenseQuery({
    queryKey: catalogQueryKey,
    queryFn: () => catalog.getCatalog(),
    staleTime: Infinity,
  });
  return data;
};
