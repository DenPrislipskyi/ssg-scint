import { describe, expect, it } from 'vitest';

import {
  confirmedCount,
  needsSourcing,
  readyForSourcing,
  shownSupplier,
  sourcingRows,
} from '@/entities/rfq/lib/sourcing';
import type { MatchLine } from '@/entities/rfq/model/types';

const item = (source: string, supplier = 'Northgate Marine Fasteners Ltd.') => ({
  'Item Code': 'T69133100',
  'Item Description / SSG Description': 'HEX HEAD BOLT/NUT STEEL UNGALV, M20 X 80MM',
  'Product Source': source,
  UOM: 'SET',
  Supplier: supplier,
});

const line = (overrides: Partial<MatchLine> = {}): MatchLine => ({
  line: 1,
  index: 1,
  customerCode: '',
  customerDescription: 'bolts hex head with nuts',
  quantity: '12',
  uom: 'pcs',
  itemCode: 'T69133100',
  itemDescription: 'HEX HEAD BOLT/NUT STEEL UNGALV, M20 X 80MM',
  item: item('JIT'),
  confidence: 70,
  how: 'search',
  why: '',
  candidates: [],
  confirmedItemCode: 'T69133100',
  offerUnitPrice: null,
  ...overrides,
});

describe('needsSourcing', () => {
  it('asks a supplier only for what we do not have', () => {
    expect(needsSourcing(item('JIT'))).toBe(true);
    expect(needsSourcing(item('Stock'))).toBe(false);
  });

  it('reads the column however it was typed', () => {
    expect(needsSourcing({ 'product source': ' jit ' })).toBe(true);
  });

  it('asks nobody about a line that has no product yet', () => {
    expect(needsSourcing({})).toBe(false);
  });
});

describe('shownSupplier', () => {
  it('names the supplier of a product somebody has to bring us', () => {
    expect(shownSupplier(item('JIT'))).toBe('Northgate Marine Fasteners Ltd.');
  });

  it('names nobody for a product already on our shelf', () => {
    // Аркуш несе фірму й для складського рядка. Показати її тут означало б
    // сказати, що в когось щось замовляють, — а беруть зі свого складу.
    expect(shownSupplier(item('Stock'))).toBe('');
  });
});

describe('readyForSourcing', () => {
  it('waits for every line, stock ones included', () => {
    const lines = [line(), line({ index: 2, item: item('Stock'), confirmedItemCode: '' })];
    expect(readyForSourcing(lines)).toBe(false);
    expect(confirmedCount(lines)).toBe(1);
  });

  it('opens once nothing is left unsettled', () => {
    expect(readyForSourcing([line(), line({ index: 2, item: item('Stock') })])).toBe(true);
  });
});

describe('sourcingRows', () => {
  it('carries only the lines that need somebody to quote them', () => {
    const rows = sourcingRows([
      line({ line: 1, index: 1, item: item('Stock') }),
      line({ line: 2, index: 2, item: item('JIT') }),
      line({ line: 3, index: 3, item: item('JIT'), confirmedItemCode: '' }),
    ]);

    expect(rows.map((row) => row.line)).toEqual([2]);
    expect(rows[0]?.supplier).toBe('Northgate Marine Fasteners Ltd.');
  });

  it('keeps the quantity in the unit the customer asked in', () => {
    const rows = sourcingRows([line({ quantity: '12', uom: 'pcs' })]);
    expect([rows[0]?.quantity, rows[0]?.uom]).toEqual(['12', 'pcs']);
  });

  it('falls back to our own unit when the customer named none', () => {
    const rows = sourcingRows([line({ uom: '' })]);
    expect(rows[0]?.uom).toBe('SET');
  });
});
