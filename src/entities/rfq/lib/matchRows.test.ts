import { describe, expect, it } from 'vitest';

import { customerCodeOf, sourceOf, toTableRows } from '@/entities/rfq/lib/matchRows';
import type { MatchLine } from '@/entities/rfq/model/types';

const SHEET = {
  'Customer Code': '691284',
  'Item Code': 'T69128400',
  'Item Description / SSG Description': 'HEX HEAD BOLT/NUT STEEL UNGALV, M16 X 65MM',
  'Product Source': 'Stock',
  UOM: 'SET',
};

const line = (overrides: Partial<MatchLine> = {}): MatchLine => ({
  line: 1,
  customerCode: '691284',
  customerDescription: 'Hexagon Head Bolts (Bolt with Nut) M16*65',
  quantity: '500',
  uom: 'set',
  itemCode: 'T69128400',
  itemDescription: 'HEX HEAD BOLT/NUT STEEL UNGALV, M16 X 65MM',
  item: SHEET,
  confidence: 100,
  how: 'code_confirmed',
  why: 'Same bolt.',
  candidates: [],
  ...overrides,
});

describe('toTableRows', () => {
  it('gives a matched line one row', () => {
    const rows = toTableRows([line()]);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.itemCode).toBe('T69128400');
    expect(rows[0]?.isCandidate).toBe(false);
  });

  it('gives an unmatched line one row per candidate', () => {
    const rows = toTableRows([
      line({
        itemCode: '',
        itemDescription: '',
        confidence: null,
        how: 'none',
        candidates: [
          { itemCode: 'T1', description: 'first', confidence: 100, item: SHEET },
          { itemCode: 'T2', description: 'second', confidence: 20, item: {} },
        ],
      }),
    ]);

    expect(rows.map((row) => row.itemCode)).toEqual(['T1', 'T2']);
    expect(rows.every((row) => row.isCandidate)).toBe(true);
    expect(rows.map((row) => row.confidence)).toEqual([100, 20]);
  });

  it('keeps the customer half on every candidate row', () => {
    const rows = toTableRows([
      line({
        itemCode: '',
        candidates: [
          { itemCode: 'T1', description: 'first', confidence: 100, item: SHEET },
          { itemCode: 'T2', description: 'second', confidence: 20, item: {} },
        ],
      }),
    ]);

    expect(rows.map((row) => row.customerDescription)).toEqual([
      'Hexagon Head Bolts (Bolt with Nut) M16*65',
      'Hexagon Head Bolts (Bolt with Nut) M16*65',
    ]);
    expect(rows.map((row) => row.quantity)).toEqual(['500', '500']);
  });

  it('still shows a line nothing could be found for', () => {
    // Зникла позиція виглядає як позиція, якої в RFQ не було.
    const rows = toTableRows([line({ itemCode: '', confidence: null, candidates: [] })]);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.itemCode).toBe('');
    expect(rows[0]?.customerDescription).toBe('Hexagon Head Bolts (Bolt with Nut) M16*65');
  });

  it('keeps the number of the RFQ line, so candidates share one', () => {
    // Наскрізний лічильник читався як номер позиції і брехав: позиція 3
    // називалася четвертою просто тому, що вище стояли два кандидати.
    const rows = toTableRows([
      line({ line: 1 }),
      line({
        line: 2,
        itemCode: '',
        candidates: [
          { itemCode: 'T1', description: 'first', confidence: 100, item: SHEET },
          { itemCode: 'T2', description: 'second', confidence: 20, item: {} },
        ],
      }),
      line({ line: 3, itemCode: 'T3' }),
    ]);

    expect(rows.map((row) => row.line)).toEqual([1, 2, 2, 3]);
  });

  it('reads the right half of the table out of the sheet row', () => {
    const rows = toTableRows([
      line({
        itemCode: '',
        candidates: [{ itemCode: 'T1', description: 'first', confidence: 100, item: SHEET }],
      }),
    ]);

    // Навіть коли клієнт коду не надсилав, у колонці стоїть код з аркуша.
    expect(customerCodeOf(rows[0]!.item)).toBe('691284');
    expect(sourceOf(rows[0]!.item)).toBe('Stock');
  });

  it('finds a heading however it was typed in the sheet', () => {
    expect(customerCodeOf({ 'customer  code': '550101' })).toBe('550101');
    expect(sourceOf({})).toBe('');
  });

  it('has nothing to show for an RFQ with no lines', () => {
    expect(toTableRows([])).toEqual([]);
  });
});
