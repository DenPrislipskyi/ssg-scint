import type { ProductRepository } from '@/entities/products/api/productRepository';
import type { ProductFilters, ProductPage } from '@/entities/products/model/types';
import { httpClient } from '@/shared/api/httpClient';

/** Аркуш товарів із бекенда агента. */
export class HttpProductRepository implements ProductRepository {
  search({ code, description, limit }: ProductFilters): Promise<ProductPage> {
    const query = new URLSearchParams();
    if (code) query.set('code', code);
    if (description) query.set('description', description);
    if (limit) query.set('limit', String(limit));

    const tail = query.toString();
    return httpClient<ProductPage>(`/catalog/items${tail ? `?${tail}` : ''}`);
  }
}
