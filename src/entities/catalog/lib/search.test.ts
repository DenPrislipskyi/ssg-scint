import { describe, expect, it } from 'vitest';

import { highlightMatches, searchCatalog } from '@/entities/catalog/lib/search';
import { makeItem } from '@/test/factories';

const items = [
  makeItem({ code: 'T69128400', name: 'Hex head bolt/nut steel ungalv, M16 x 65 mm' }),
  makeItem({ code: 'T69128401', name: 'Hex head bolt steel ungalv, M16 x 65 mm (no nut)' }),
  makeItem({ code: 'T85116300', name: 'Welder gloves five fingers', inStock: false }),
];
const itemsByCode = Object.fromEntries(items.map((item) => [item.code, item]));

describe('searchCatalog', () => {
  it('splits results into predicted and the rest of the item master', () => {
    const result = searchCatalog('', ['T85116300'], items, itemsByCode);

    expect(result.predicted.map((item) => item.code)).toEqual(['T85116300']);
    expect(result.master.map((item) => item.code)).toEqual(['T69128400', 'T69128401']);
    // Плоский список задає порядок клавіатурної навігації через обидві групи.
    expect(result.flat).toHaveLength(3);
  });

  it('requires every search term to match (AND semantics)', () => {
    expect(searchCatalog('bolt nut', [], items, itemsByCode).master).toHaveLength(2);
    expect(searchCatalog('bolt gloves', [], items, itemsByCode).master).toHaveLength(0);
  });

  it('matches on the item code as well as the name', () => {
    expect(searchCatalog('T851', [], items, itemsByCode).master.map((i) => i.code)).toEqual([
      'T85116300',
    ]);
  });

  it('never lists a predicted item twice', () => {
    const result = searchCatalog('hex', ['T69128400'], items, itemsByCode);
    expect(result.master.map((item) => item.code)).not.toContain('T69128400');
  });
});

describe('highlightMatches', () => {
  it('returns a single plain segment when there is no query', () => {
    expect(highlightMatches('Welder gloves', '')).toEqual([{ text: 'Welder gloves', isMatch: false }]);
  });

  it('marks matching segments case-insensitively', () => {
    const segments = highlightMatches('Welder gloves five fingers', 'GLOVES');
    expect(segments.filter((s) => s.isMatch).map((s) => s.text)).toEqual(['gloves']);
  });

  it('handles several terms in one string', () => {
    const segments = highlightMatches('Hex head bolt', 'hex bolt');
    expect(segments.filter((s) => s.isMatch).map((s) => s.text)).toEqual(['Hex', 'bolt']);
  });

  it('treats regex characters in the query as literals', () => {
    expect(() => highlightMatches('1/2" hose (250 cm)', '(250')).not.toThrow();
    const segments = highlightMatches('1/2" hose (250 cm)', '(250');
    expect(segments.filter((s) => s.isMatch).map((s) => s.text)).toEqual(['(250']);
  });
});
