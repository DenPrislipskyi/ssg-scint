import { describe, expect, it } from 'vitest';

import { toTableRows } from '@/entities/rfq/lib/matchRows';
import type { MatchLine } from '@/entities/rfq/model/types';

const line = (overrides: Partial<MatchLine> = {}): MatchLine => ({
  line: 1,
  customerCode: '691284',
  customerDescription: 'Hexagon Head Bolts (Bolt with Nut) M16*65',
  quantity: '500',
  uom: 'set',
  itemCode: 'T69128400',
  itemDescription: 'HEX HEAD BOLT/NUT STEEL UNGALV, M16 X 65MM',
  item: {},
  confidence: 96,
  how: 'code_confirmed',
  why: 'Same bolt.',
  candidates: [{ itemCode: 'T69128400', description: 'HEX HEAD BOLT', confidence: 96 }],
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
          { itemCode: 'T1', description: 'first', confidence: 40 },
          { itemCode: 'T2', description: 'second', confidence: 20 },
        ],
      }),
    ]);

    expect(rows.map((row) => row.itemCode)).toEqual(['T1', 'T2']);
    expect(rows.every((row) => row.isCandidate)).toBe(true);
    expect(rows.map((row) => row.confidence)).toEqual([40, 20]);
  });

  it('keeps the customer half on every candidate row', () => {
    const rows = toTableRows([
      line({
        itemCode: '',
        candidates: [
          { itemCode: 'T1', description: 'first', confidence: 40 },
          { itemCode: 'T2', description: 'second', confidence: 20 },
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

  it('numbers the rows straight through, not by line', () => {
    const rows = toTableRows([
      line({ line: 1 }),
      line({
        line: 2,
        itemCode: '',
        candidates: [
          { itemCode: 'T1', description: 'first', confidence: 40 },
          { itemCode: 'T2', description: 'second', confidence: 20 },
        ],
      }),
      line({ line: 3, itemCode: 'T3' }),
    ]);

    expect(rows.map((row) => row.n)).toEqual([1, 2, 3, 4]);
  });

  it('has nothing to show for an RFQ with no lines', () => {
    expect(toTableRows([])).toEqual([]);
  });
});
