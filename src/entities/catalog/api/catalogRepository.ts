import type { CatalogData } from '@/entities/catalog/model/types';

/** Контракт доступу до товарного каталогу. Реалізації: mock і http. */
export interface CatalogRepository {
  getCatalog(): Promise<CatalogData>;
}
