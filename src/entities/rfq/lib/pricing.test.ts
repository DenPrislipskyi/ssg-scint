import { describe, expect, it } from 'vitest';

import {
  lineTotal,
  pricedCount,
  pricingRows,
  quoteTotal,
  sellingPrice,
  sheetMargins,
} from '@/entities/rfq/lib/pricing';
import type { MatchLine } from '@/entities/rfq/model/types';

/** Рядок аркуша: джерело, ціна й націнка — усе, на що дивиться цей екран. */
const item = (source: string, price: string, margin: string) => ({
  'Item Code': 'T69133100',
  'Item Description / SSG Description': 'HEX HEAD BOLT/NUT STEEL UNGALV, M20 X 80MM',
  'Product Source': source,
  UOM: 'SET',
  Price: price,
  'Margin %': margin,
});

const STOCK = item('Stock', '25', '12');
const JIT = item('JIT', '', '15');

const line = (overrides: Partial<MatchLine> = {}): MatchLine => ({
  line: 1,
  index: 1,
  customerCode: '',
  customerDescription: 'bolts hex head with nuts',
  quantity: '10',
  uom: 'pcs',
  itemCode: 'T69133100',
  itemDescription: 'HEX HEAD BOLT/NUT STEEL UNGALV, M20 X 80MM',
  item: STOCK,
  confidence: 70,
  how: 'search',
  why: '',
  candidates: [],
  confirmedItemCode: 'T69133100',
  offerUnitPrice: null,
  offerReceivedAt: null,
  approvedUnitPrice: null,
  ...overrides,
});

const MARGINS = { stock: 14, jit: 14 };

describe('sellingPrice', () => {
  it('is the cost plus the margin', () => {
    expect(sellingPrice(2.1, 14)).toBe(2.39);
    expect(sellingPrice(5.2, 14)).toBe(5.93);
    expect(sellingPrice(0.55, 14)).toBe(0.63);
  });

  it('adds nothing at no margin', () => {
    expect(sellingPrice(25, 0)).toBe(25);
  });
});

describe('lineTotal', () => {
  it('multiplies the price a customer is quoted, not the one behind it', () => {
    // 2.10 × 1.14 = 2.394, показане як 2.39. Підсумок множить показане: інакше
    // рядок не сходився б сам із собою на тій самій сторінці.
    expect(lineTotal(sellingPrice(2.1, 14), 500)).toBe(1195);
    expect(lineTotal(sellingPrice(5.2, 14), 12)).toBe(71.16);
    expect(lineTotal(sellingPrice(1.85, 14), 10)).toBe(21.1);
  });
});

describe('sheetMargins', () => {
  it('takes both numbers from the sheet', () => {
    expect(sheetMargins([line(), line({ index: 2, item: JIT })])).toEqual({ stock: 12, jit: 15 });
  });

  it('falls back to nothing added, rather than to a number nobody named', () => {
    expect(sheetMargins([line({ item: item('Stock', '25', '') })]).stock).toBe(0);
  });

  it('answers for a source the RFQ has no line of', () => {
    expect(sheetMargins([line()])).toEqual({ stock: 12, jit: 0 });
  });
});

describe('pricingRows', () => {
  it('prices a stock line from the sheet', () => {
    const [row] = pricingRows([line()], MARGINS);

    expect(row).toMatchObject({ jit: false, cost: 25, margin: 14, unitPrice: 28.5, total: 285 });
  });

  it('waits for the supplier on a JIT line', () => {
    const [row] = pricingRows([line({ item: JIT })], MARGINS);

    expect(row).toMatchObject({ jit: true, cost: null, unitPrice: null, total: null });
  });

  it('prices a JIT line the moment the supplier answers', () => {
    const [row] = pricingRows([line({ item: JIT, offerUnitPrice: 2.25 })], MARGINS);

    expect(row).toMatchObject({ cost: 2.25, unitPrice: 2.57, total: 25.7 });
  });

  it('takes each source its own margin', () => {
    const rows = pricingRows([line(), line({ index: 2, item: JIT, offerUnitPrice: 10 })], {
      stock: 12,
      jit: 15,
    });

    expect(rows.map((row) => row.margin)).toEqual([12, 15]);
  });

  it('keeps every line, stock and JIT alike', () => {
    // Рахунок виставляють за все замовлення: позиція, що не потрапила в
    // підсумок, — це позиція, за яку ніхто не заплатить.
    const rows = pricingRows([line(), line({ index: 2, item: JIT })], MARGINS);

    expect(rows).toHaveLength(2);
  });

  it('cannot total a quantity that is not a number', () => {
    const rows = pricingRows([line({ quantity: '2 coil' })], MARGINS);

    expect(rows[0]).toMatchObject({ unitPrice: 28.5, total: null });
  });

  it('falls back to our unit when the customer named none', () => {
    expect(pricingRows([line({ uom: '' })], MARGINS)[0]!.uom).toBe('SET');
  });
});

describe('quoteTotal', () => {
  it('adds up the lines that have a price', () => {
    const rows = pricingRows(
      [line({ quantity: '500', item: item('Stock', '2.10', '12') }), line({ index: 2, item: JIT })],
      MARGINS,
    );

    expect(quoteTotal(rows)).toBe(1195);
  });

  it('does not count an unpriced line as free', () => {
    // Нуль додав би до підсумку твердження, що позиція безплатна, — а про неї
    // ще нічого не відомо, і про це каже лічильник поряд.
    const rows = pricingRows([line({ item: JIT })], MARGINS);

    expect(quoteTotal(rows)).toBe(0);
    expect(pricedCount(rows)).toBe(0);
  });

  it('counts the lines that are priced', () => {
    const rows = pricingRows(
      [line(), line({ index: 2, item: JIT }), line({ index: 3, item: JIT, offerUnitPrice: 5 })],
      MARGINS,
    );

    expect(pricedCount(rows)).toBe(2);
  });
});
