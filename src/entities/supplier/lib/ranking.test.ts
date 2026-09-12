import { describe, expect, it } from 'vitest';

import { NO_RANK, rankFor, rankSuppliersForFamily } from '@/entities/supplier/lib/ranking';
import type { Supplier } from '@/entities/supplier/model/types';

const supplier = (overrides: Partial<Supplier>): Supplier => ({
  id: 'a',
  name: 'Supplier A',
  email: 'a@example.com',
  onTimePercent: 90,
  rankByFamily: {},
  blockedFamilies: [],
  historyNote: '',
  ...overrides,
});

const preferred = supplier({ id: 'preferred', name: 'Preferred', rankByFamily: { T69: 1 } });
const second = supplier({ id: 'second', name: 'Second', rankByFamily: { T69: 2 } });
const unranked = supplier({ id: 'unranked', name: 'Unranked', onTimePercent: 99 });
const blocked = supplier({ id: 'blocked', name: 'Blocked', blockedFamilies: ['T69'] });

const all = [unranked, second, blocked, preferred];

describe('rankFor', () => {
  it('falls back to NO_RANK when there is no history for the family', () => {
    expect(rankFor(preferred, 'T69')).toBe(1);
    expect(rankFor(preferred, 'T85')).toBe(NO_RANK);
  });
});

describe('rankSuppliersForFamily', () => {
  it('orders by rank, then by on-time percentage', () => {
    const result = rankSuppliersForFamily(all, 'T69', []);
    expect(result.map((entry) => entry.supplier.id)).toEqual(['preferred', 'second', 'unranked']);
  });

  it('hides suppliers blocked for the family', () => {
    expect(rankSuppliersForFamily(all, 'T69', []).map((e) => e.supplier.id)).not.toContain('blocked');
    expect(rankSuppliersForFamily(all, 'T12', []).map((e) => e.supplier.id)).toContain('blocked');
  });

  it('floats already assigned suppliers to the top', () => {
    const result = rankSuppliersForFamily(all, 'T69', ['unranked']);
    expect(result[0]?.supplier.id).toBe('unranked');
    expect(result[0]?.isAssigned).toBe(true);
  });

  it('filters by the search query', () => {
    expect(rankSuppliersForFamily(all, 'T69', [], 'seco').map((e) => e.supplier.id)).toEqual([
      'second',
    ]);
  });
});
