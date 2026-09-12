import { describe, expect, it } from 'vitest';

import { getLineStatus } from '@/entities/quote/lib/lineState';
import { makeCatalog, makeItem, makeLine, makeLineSupplier, makeOffer } from '@/test/factories';

const catalog = makeCatalog([
  makeItem({ code: 'T-STOCK', inStock: true }),
  makeItem({ code: 'T-JIT', inStock: false, costPrice: 0 }),
]);

describe('getLineStatus', () => {
  it('excluded wins over everything else', () => {
    const line = makeLine({ isExcluded: true, matchedItemCode: 'T-STOCK' });
    expect(getLineStatus(line, catalog)).toBe('excluded');
  });

  it('selected offer outranks other replies', () => {
    const line = makeLine({
      suppliers: [
        makeLineSupplier({ status: 'replied', offer: makeOffer(), isSelected: true }),
        makeLineSupplier({ supplierId: 'hansa', status: 'replied', offer: makeOffer() }),
      ],
    });
    expect(getLineStatus(line, catalog)).toBe('supplierSelected');
  });

  it('priced reply asks the user to select a supplier', () => {
    const line = makeLine({
      suppliers: [makeLineSupplier({ status: 'replied', offer: makeOffer() })],
    });
    expect(getLineStatus(line, catalog)).toBe('selectSupplier');
  });

  it('unresolved info request blocks the line', () => {
    const line = makeLine({
      suppliers: [makeLineSupplier({ status: 'replied', infoRequest: 'need a photo' })],
    });
    expect(getLineStatus(line, catalog)).toBe('supplierNeedsInfo');
  });

  it('resolved info request no longer blocks the line', () => {
    const line = makeLine({
      matchedItemCode: 'T-STOCK',
      suppliers: [
        makeLineSupplier({ status: 'replied', infoRequest: 'need a photo', isInfoResolved: true }),
      ],
    });
    expect(getLineStatus(line, catalog)).toBe('ready');
  });

  it('awaiting supplier shows inquiry sent', () => {
    const line = makeLine({ suppliers: [makeLineSupplier({ status: 'awaiting' })] });
    expect(getLineStatus(line, catalog)).toBe('inquirySent');
  });

  it('asked customer applies only to unmatched lines', () => {
    expect(getLineStatus(makeLine({ isAsked: true }), catalog)).toBe('askedCustomer');
    expect(getLineStatus(makeLine({ isAsked: true, matchedItemCode: 'T-STOCK' }), catalog)).toBe(
      'ready',
    );
  });

  it('suggestions without a match require choosing a variant', () => {
    const line = makeLine({ suggestedItemCodes: ['T-STOCK', 'T-JIT'] });
    expect(getLineStatus(line, catalog)).toBe('chooseVariant');
  });

  it('no match and no suggestions is not found', () => {
    expect(getLineStatus(makeLine(), catalog)).toBe('notFound');
  });

  it('matched non-stock item needs a supplier', () => {
    expect(getLineStatus(makeLine({ matchedItemCode: 'T-JIT' }), catalog)).toBe('needsSupplier');
  });
});
