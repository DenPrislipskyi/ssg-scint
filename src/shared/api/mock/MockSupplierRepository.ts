import type { SupplierRepository } from '@/entities/supplier/api/supplierRepository';
import type { Supplier } from '@/entities/supplier/model/types';
import suppliers from '@/shared/api/mock/fixtures/suppliers.json';
import { mockDelay } from '@/shared/api/mock/mockDelay';

export class MockSupplierRepository implements SupplierRepository {
  async getSuppliers(): Promise<Supplier[]> {
    await mockDelay(60);
    return suppliers as Supplier[];
  }
}
