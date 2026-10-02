import { describe, expect, it } from 'vitest';

import { finalRows, finalTotal } from '@/entities/rfq/lib/finalisation';
import type { MatchLine } from '@/entities/rfq/model/types';

/** Рядок аркуша несе і код клієнта, і його опис — звідси їх і беруть. */
const item = (source: string) => ({
  'Customer Code': '691284',
  'Customer Description': 'Hexagon head bolts full threaded',
  'Item Code': 'T69133100',
  'Item Description / SSG Description': 'HEX HEAD BOLT/NUT STEEL UNGALV, M20 X 80MM',
  'Product Source': source,
  UOM: 'SET',
  Price: '25',
  'Margin %': '12',
});

const line = (overrides: Partial<MatchLine> = {}): MatchLine => ({
  line: 1,
  index: 1,
  customerCode: '999999',
  customerDescription: 'what the customer actually wrote',
  quantity: '10',
  uom: 'pcs',
  itemCode: 'T69133100',
  itemDescription: 'HEX HEAD BOLT/NUT STEEL UNGALV, M20 X 80MM',
  item: item('Stock'),
  confidence: 70,
  how: 'search',
  why: '',
  candidates: [],
  confirmedItemCode: 'T69133100',
  offerUnitPrice: null,
  offerReceivedAt: null,
  approvedUnitPrice: 28,
  ...overrides,
});

describe('finalRows', () => {
  it('takes the customer code and description from the sheet', () => {
    // Не з листа клієнта: тут показують те, як його товар записано в нас.
    const [row] = finalRows([line()]);

    expect(row!.customerCode).toBe('691284');
    expect(row!.customerDescription).toBe('Hexagon head bolts full threaded');
  });

  it('shows the price that was approved', () => {
    const [row] = finalRows([line()]);

    expect(row).toMatchObject({ unitPrice: 28, total: 280 });
  });

  it('does not recompute from cost and margin', () => {
    // Собівартість 25 і націнка 12 % дали б 28.00; підписали 99.50, і саме
    // це число назвали клієнтові.
    const [row] = finalRows([line({ approvedUnitPrice: 99.5 })]);

    expect(row).toMatchObject({ unitPrice: 99.5, total: 995 });
  });

  it('leaves an unapproved line without a price', () => {
    const [row] = finalRows([line({ approvedUnitPrice: null })]);

    expect(row).toMatchObject({ unitPrice: null, total: null });
  });

  it('cannot total a quantity that is not a number', () => {
    const [row] = finalRows([line({ quantity: '2 coil' })]);

    expect(row).toMatchObject({ unitPrice: 28, total: null });
  });

  it('falls back to our unit when the customer named none', () => {
    expect(finalRows([line({ uom: '' })])[0]!.uom).toBe('SET');
  });

  it('shows our unit next to the customer one, as product matching does', () => {
    const [row] = finalRows([line()]);

    expect(row).toMatchObject({ uom: 'pcs', internalUom: 'SET' });
  });

  it('leaves the internal unit empty when the sheet names none', () => {
    const { UOM: _none, ...noUnit } = item('Stock');

    expect(finalRows([line({ item: noUnit })])[0]!.internalUom).toBe('');
  });

  it('keeps every line of the RFQ', () => {
    expect(finalRows([line(), line({ index: 2, line: 2, item: item('JIT') })])).toHaveLength(2);
  });
});

describe('finalTotal', () => {
  it('adds up the approved lines', () => {
    const rows = finalRows([
      line(),
      line({ index: 2, line: 2, approvedUnitPrice: 5, quantity: '4' }),
    ]);

    expect(finalTotal(rows)).toBe(300);
  });

  it('does not count an unpriced line as free', () => {
    expect(finalTotal(finalRows([line({ approvedUnitPrice: null })]))).toBe(0);
  });
});
