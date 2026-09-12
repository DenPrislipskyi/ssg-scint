import { useSuspenseQuery } from '@tanstack/react-query';

import { useRepositories } from '@/app/providers/RepositoriesProvider';
import type { Supplier, SupplierId } from '@/entities/supplier/model/types';

export const suppliersQueryKey = ['suppliers'] as const;

export interface SupplierDirectory {
  all: Supplier[];
  byId: Record<SupplierId, Supplier>;
}

export const useSuppliers = (): SupplierDirectory => {
  const { suppliers } = useRepositories();
  const { data } = useSuspenseQuery({
    queryKey: suppliersQueryKey,
    queryFn: async () => {
      const all = await suppliers.getSuppliers();
      return { all, byId: Object.fromEntries(all.map((s) => [s.id, s])) };
    },
    staleTime: Infinity,
  });
  return data;
};
