import type { ProductFilters, ProductPage } from '@/entities/products/model/types';

/** Доступ до аркуша товарів для ручного вибору. Реалізації: mock і http. */
export interface ProductRepository {
  search(filters: ProductFilters): Promise<ProductPage>;
}
