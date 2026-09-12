import { describe, expect, it } from 'vitest';

import { resolveShipSupplyQuantity } from '@/entities/quote/lib/shipSupplyQty';
import { makeCatalog, makeItem, makeLine } from '@/test/factories';

const catalog = {
  ...makeCatalog([
    makeItem({ code: 'T-M', unit: 'm' }),
    makeItem({ code: 'T-BOX', unit: 'box' }),
    makeItem({ code: 'T-SET', unit: 'set' }),
  ]),
  packSpecs: { 'T-BOX': { code: 'T-BOX', unit: 'pair', quantity: 100 } },
};

describe('resolveShipSupplyQuantity', () => {
  it('returns nothing when the line has no matched item', () => {
    expect(resolveShipSupplyQuantity(makeLine(), catalog).quantity).toBeNull();
  });

  it('manual entry overrides every automatic rule', () => {
    const line = makeLine({
      matchedItemCode: 'T-M',
      customerUnit: 'cm',
      requestedQuantity: 250,
      manualShipSupplyQuantity: 7,
    });
    const result = resolveShipSupplyQuantity(line, catalog);
    expect(result).toMatchObject({ quantity: 7, unit: 'm', isManual: true });
  });

  it('passes quantity through when units already match', () => {
    const line = makeLine({ matchedItemCode: 'T-SET', customerUnit: 'set', requestedQuantity: 500 });
    expect(resolveShipSupplyQuantity(line, catalog)).toMatchObject({
      quantity: 500,
      isSameUnit: true,
    });
  });

  it('applies the conversion table and rounds up to 3 decimals', () => {
    const line = makeLine({ matchedItemCode: 'T-M', customerUnit: 'cm', requestedQuantity: 250 });
    expect(resolveShipSupplyQuantity(line, catalog)).toMatchObject({
      quantity: 2.5,
      unit: 'm',
      factor: 0.01,
    });
  });

  it('falls back to pack rules and rounds up to whole packs', () => {
    const line = makeLine({ matchedItemCode: 'T-BOX', customerUnit: 'pair', requestedQuantity: 250 });
    expect(resolveShipSupplyQuantity(line, catalog)).toMatchObject({
      quantity: 3,
      unit: 'box',
      pack: { unit: 'pair', quantity: 100 },
    });
  });

  it('flags units it cannot convert instead of guessing', () => {
    const line = makeLine({ matchedItemCode: 'T-SET', customerUnit: 'drum', requestedQuantity: 2 });
    expect(resolveShipSupplyQuantity(line, catalog)).toMatchObject({
      quantity: 2,
      isUnknown: true,
    });
  });
});
