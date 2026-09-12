import type { CatalogRepository } from '@/entities/catalog/api/catalogRepository';
import { conversionKey } from '@/entities/catalog/lib/units';
import type {
  CatalogData,
  CatalogItem,
  PackSpec,
  Unit,
  UnitConversion,
} from '@/entities/catalog/model/types';
import items from '@/shared/api/mock/fixtures/catalog-items.json';
import packs from '@/shared/api/mock/fixtures/pack-specs.json';
import conversions from '@/shared/api/mock/fixtures/unit-conversions.json';
import units from '@/shared/api/mock/fixtures/unit-list.json';
import { mockDelay } from '@/shared/api/mock/mockDelay';

export class MockCatalogRepository implements CatalogRepository {
  async getCatalog(): Promise<CatalogData> {
    await mockDelay(60);

    const catalogItems = items as CatalogItem[];
    return {
      items: catalogItems,
      itemsByCode: Object.fromEntries(catalogItems.map((item) => [item.code, item])),
      packSpecs: Object.fromEntries((packs as PackSpec[]).map((pack) => [pack.code, pack])),
      conversions: Object.fromEntries(
        (conversions as UnitConversion[]).map((c) => [conversionKey(c.from, c.to), c.factor]),
      ),
      units: units as Unit[],
    };
  }
}
