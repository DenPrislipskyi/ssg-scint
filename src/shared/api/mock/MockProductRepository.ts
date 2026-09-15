import type { ProductRepository } from '@/entities/products/api/productRepository';
import type { ProductFilters, ProductPage, SheetProduct } from '@/entities/products/model/types';
import { mockDelay } from '@/shared/api/mock/mockDelay';

const row = (itemCode: string, description: string, source: string, uom: string): SheetProduct => ({
  itemCode,
  description,
  item: {
    'Item Code': itemCode,
    'Item Description / SSG Description': description,
    'Product Source': source,
    UOM: uom,
  },
});

/** Кілька рядків аркуша — достатньо, щоб обидва фільтри було видно в роботі. */
const SHEET: SheetProduct[] = [
  row('T69128400', 'HEX HEAD BOLT/NUT STEEL UNGALV, M16 X 65MM', 'Stock', 'SET'),
  row('T69133100', 'HEX HEAD BOLT/NUT STEEL UNGALV, M20 X 80MM', 'JIT', 'SET'),
  row('T69114500', 'HEX HEAD BOLT/NUT STEEL UNGALV, M8 X 50MM', 'GPL', 'SET'),
  row('T85116300', 'WELDER GLOVES FIVE FINGERS', 'Stock', 'PRS'),
  row('T33410300', 'SAFETY SIGN DAVIT-LAUNCHED LIFERAFT 150 X 150 MM', 'Stock', 'PCS'),
  row('T65082300', 'RULE CONVEX STEEL METRIC 5MTR', 'Stock', 'PCS'),
];

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
