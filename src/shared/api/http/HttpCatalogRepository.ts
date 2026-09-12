import type { CatalogRepository } from '@/entities/catalog/api/catalogRepository';
import type { CatalogData } from '@/entities/catalog/model/types';
import { httpClient } from '@/shared/api/httpClient';

export class HttpCatalogRepository implements CatalogRepository {
  getCatalog(): Promise<CatalogData> {
    return httpClient<CatalogData>('/catalog');
  }
}
