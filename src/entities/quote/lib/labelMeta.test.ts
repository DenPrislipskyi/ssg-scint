import { describe, expect, it } from 'vitest';

import { labelTone } from '@/entities/quote/lib/labelMeta';

describe('labelTone', () => {
  it('gives every label the agent sets its own colour', () => {
    expect(labelTone('SSG RFQ')).toBe('ok');
    expect(labelTone('SSG Review')).toBe('warn');
    expect(labelTone('SSG Error')).toBe('bad');
    expect(labelTone('SSG Not Sent')).toBe('sup');
    expect(labelTone('SSG No action')).toBe('muted');
  });

  it('does not care how the mailbox spells the category', () => {
    expect(labelTone('ssg rfq')).toBe('ok');
    expect(labelTone('  SSG RFQ  ')).toBe('ok');
  });

  it('shows a label it has never seen rather than hiding the row', () => {
    expect(labelTone('SSG Routed')).toBe('muted');
  });
});
