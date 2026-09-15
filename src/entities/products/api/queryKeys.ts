import type { ProductFilters } from '@/entities/products/model/types';

export const productKeys = {
  all: ['products'] as const,
  search: (filters: ProductFilters) =>
    [...productKeys.all, 'search', filters.code, filters.description] as const,
};
