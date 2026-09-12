import { describe, expect, it } from 'vitest';

import { applyMargin, roundToHalf } from '@/entities/quote/lib/pricing';

describe('roundToHalf', () => {
  it('rounds to the nearest 0.5', () => {
    expect(roundToHalf(10.24)).toBe(10);
    expect(roundToHalf(10.26)).toBe(10.5);
    expect(roundToHalf(10.75)).toBe(11);
  });
});

describe('applyMargin', () => {
  it('rounds cheap items to cents', () => {
    // 0.42 * 1.14 = 0.4788 → 0.48
    expect(applyMargin(0.42, 0.14)).toBe(0.48);
  });

  it('rounds items from $5 up to the nearest 0.5', () => {
    // 6.4 * 1.14 = 7.296 → 7.5
    expect(applyMargin(6.4, 0.14)).toBe(7.5);
  });

  it('switches strategy exactly at the $5 boundary', () => {
    expect(applyMargin(4.99, 0.14)).toBe(5.69);
    expect(applyMargin(5, 0.14)).toBe(5.5);
  });
});
