import type { ProductRepository } from '@/entities/products/api/productRepository';
import type { ProductFilters, ProductPage, SheetProduct } from '@/entities/products/model/types';
import { descriptionOf, MOCK_SHEET } from '@/shared/api/mock/fixtures/sheet';
import { mockDelay } from '@/shared/api/mock/mockDelay';

const SHEET: SheetProduct[] = MOCK_SHEET.map((item) => ({
  itemCode: item['Item Code'] ?? '',
  description: descriptionOf(item),
  item,
}));

export class MockProductRepository implements ProductRepository {
  async search({ code, description, limit = 50 }: ProductFilters): Promise<ProductPage> {
    await mockDelay(30);
    const wantedCode = code.trim().toUpperCase();
    const wantedWords = description.trim().toUpperCase();

    const found = SHEET.filter(
      (product) =>
        product.itemCode.toUpperCase().includes(wantedCode) &&
        product.description.toUpperCase().includes(wantedWords),
    );

    return { items: found.slice(0, limit), total: found.length };
  }
}
