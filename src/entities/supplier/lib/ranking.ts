import type { ProductFamily } from '@/entities/catalog/model/types';
import type { Supplier, SupplierId } from '@/entities/supplier/model/types';

/** Ранг постачальника в родині. 9 = немає історії (сортується останнім). */
export const NO_RANK = 9;

export const rankFor = (supplier: Supplier, family: ProductFamily): number =>
  supplier.rankByFamily[family] ?? NO_RANK;

export const isBlockedFor = (supplier: Supplier, family: ProductFamily): boolean =>
  supplier.blockedFamilies.includes(family);

export interface RankedSupplier {
  supplier: Supplier;
  rank: number;
  isAssigned: boolean;
}

/**
 * Список для дропдауна вибору постачальника.
 * Порядок: вже призначені → кращий ранг у родині → вищий on-time %.
 * Заблоковані для родини — виключені повністю.
 */
export const rankSuppliersForFamily = (
  suppliers: Supplier[],
  family: ProductFamily,
  assignedIds: SupplierId[],
  query = '',
): RankedSupplier[] => {
  const assigned = new Set(assignedIds);
  const needle = query.trim().toLowerCase();

  return suppliers
    .filter((supplier) => !isBlockedFor(supplier, family))
    .filter((supplier) => supplier.name.toLowerCase().includes(needle))
    .map((supplier) => ({
      supplier,
      rank: rankFor(supplier, family),
      isAssigned: assigned.has(supplier.id),
    }))
    .sort(
      (a, b) =>
        Number(b.isAssigned) - Number(a.isAssigned) ||
        a.rank - b.rank ||
        b.supplier.onTimePercent - a.supplier.onTimePercent,
    );
};
