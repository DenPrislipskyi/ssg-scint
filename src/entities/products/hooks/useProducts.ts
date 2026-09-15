import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useRepositories } from '@/app/providers/RepositoriesProvider';
import { productKeys } from '@/entities/products/api/queryKeys';
import type { ProductFilters, ProductPage } from '@/entities/products/model/types';

const NOTHING: ProductPage = { items: [], total: 0 };

/**
 * Сторінка аркуша під два фільтри.
 *
 * `enabled` — бо це список, який відкривають зрідка: поки ніхто не відкрив
 * вибір руками, аркуш не потрібен і не запитується.
 *
 * `keepPreviousData` — бо фільтри набирають по літері. Без нього список
 * блимав би порожнім між кожними двома натисканнями клавіші.
 */
export const useProducts = (filters: ProductFilters, enabled: boolean) => {
  const { products } = useRepositories();
  const { data, isFetching } = useQuery({
    queryKey: productKeys.search(filters),
    queryFn: () => products.search(filters),
    placeholderData: keepPreviousData,
    enabled,
  });

  return { page: data ?? NOTHING, isFetching };
};
