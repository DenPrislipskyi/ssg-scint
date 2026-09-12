import type { Supplier } from '@/entities/supplier/model/types';

export interface SupplierRepository {
  getSuppliers(): Promise<Supplier[]>;
}
