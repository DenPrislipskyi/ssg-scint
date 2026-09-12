import type { ProductFamily } from '@/entities/catalog/model/types';

export type SupplierId = string;

export interface Supplier {
  id: SupplierId;
  name: string;
  email: string;
  /** Відсоток вчасних постачань. Впливає на сортування і колір бейджа. */
  onTimePercent: number;
  /** Ранг у родині товарів: 1 = preferred. Відсутність = немає історії. */
  rankByFamily: Partial<Record<ProductFamily, number>>;
  /** Родини, для яких постачальник заблокований (напр. після рекламації). */
  blockedFamilies: ProductFamily[];
  historyNote: string;
}
