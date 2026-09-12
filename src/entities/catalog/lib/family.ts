import type { ItemCode, ProductFamily } from '@/entities/catalog/model/types';

/** Родина товару = перші 3 символи коду. Порожній рядок, якщо код невідомий. */
export const productFamily = (code: ItemCode | null | undefined): ProductFamily =>
  code ? code.slice(0, 3) : '';
