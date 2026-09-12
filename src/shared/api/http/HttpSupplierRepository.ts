import type { SupplierRepository } from '@/entities/supplier/api/supplierRepository';
import type { Supplier } from '@/entities/supplier/model/types';
import { httpClient } from '@/shared/api/httpClient';

export class HttpSupplierRepository implements SupplierRepository {
  getSuppliers(): Promise<Supplier[]> {
    return httpClient<Supplier[]>('/suppliers');
  }
}
