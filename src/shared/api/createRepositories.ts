import type { CatalogRepository } from '@/entities/catalog/api/catalogRepository';
import type { QuoteRepository } from '@/entities/quote/api/quoteRepository';
import type { RfqRepository } from '@/entities/rfq/api/rfqRepository';
import type { SupplierRepository } from '@/entities/supplier/api/supplierRepository';
import { env } from '@/shared/config/env';
import { HttpCatalogRepository } from '@/shared/api/http/HttpCatalogRepository';
import { HttpQuoteRepository } from '@/shared/api/http/HttpQuoteRepository';
import { HttpRfqRepository } from '@/shared/api/http/HttpRfqRepository';
import { HttpSupplierRepository } from '@/shared/api/http/HttpSupplierRepository';
import { MockCatalogRepository } from '@/shared/api/mock/MockCatalogRepository';
import { MockQuoteRepository } from '@/shared/api/mock/MockQuoteRepository';
import { MockRfqRepository } from '@/shared/api/mock/MockRfqRepository';
import { MockStore } from '@/shared/api/mock/MockStore';
import { MockSupplierRepository } from '@/shared/api/mock/MockSupplierRepository';

export interface Repositories {
  quotes: QuoteRepository;
  rfqs: RfqRepository;
  catalog: CatalogRepository;
  suppliers: SupplierRepository;
}

/** Усе на локальних фікстурах. Використовується в тестах напряму. */
export const createMockRepositories = (): Repositories => {
  const catalog = new MockCatalogRepository();
  // Каталог кешується один раз: mock-репозиторій використовує його в розрахунках.
  let cached: ReturnType<CatalogRepository['getCatalog']> | null = null;
  const getCatalog = () => (cached ??= catalog.getCatalog());

  return {
    quotes: new MockQuoteRepository(new MockStore(), getCatalog),
    rfqs: new MockRfqRepository(),
    catalog,
    suppliers: new MockSupplierRepository(),
  };
};

/**
 * Реєстр листів — з бекенда агента, решта екранів — на фікстурах.
 *
 * Проміжний стан, і навмисний: агент уже знає, які листи прийшли і що з ними
 * сталося, але ще не знає нічого про позиції, постачальників і ціни. Тому
 * перша сторінка показує тільки реальні дані, а сторінка котирування працює
 * на фікстурах, поки бекенд не віддасть і її.
 */
const createHybridRepositories = (): Repositories => {
  const mock = createMockRepositories();
  const http = new HttpQuoteRepository();
  const http_rfqs = new HttpRfqRepository();

  // Один метод з бекенда, решта — з mock. Проксі, а не клас-обгортка на
  // двадцять делегувальних методів: список довгий, а відрізняється одне.
  const quotes = new Proxy(mock.quotes, {
    get: (target, key) => (key === 'list' ? http.list.bind(http) : Reflect.get(target, key)),
  });

  // RFQ теж із бекенда: увесь екран мапінгу живе на реальних даних агента.
  return { ...mock, quotes, rfqs: http_rfqs };
};

/**
 * Точка перемикання джерела даних.
 * Перехід на реальний бекенд = зміна VITE_API_MODE на "http".
 */
export const createRepositories = (): Repositories => {
  if (env.apiMode === 'http') {
    return {
      quotes: new HttpQuoteRepository(),
      rfqs: new HttpRfqRepository(),
      catalog: new HttpCatalogRepository(),
      suppliers: new HttpSupplierRepository(),
    };
  }

  return env.apiMode === 'hybrid' ? createHybridRepositories() : createMockRepositories();
};
