import { describe, expect, it } from 'vitest';

import {
  alreadySent,
  formatMoment,
  hasAnyReply,
  supplierThreads,
} from '@/entities/rfq/lib/responses';
import type { SourcingRow } from '@/entities/rfq/lib/sourcing';
import type { SentInquiry } from '@/entities/rfq/model/types';

const NORTHGATE = 'Northgate Marine Fasteners Ltd.';
const SAFETY = 'Safety Innovators (Intl) Pte Ltd';

const RFQ = { reference: 'RFQ-0042', vessel: 'MV LIA', port: 'Singapore' };

const row = (line: number, over: Partial<SourcingRow> = {}): SourcingRow => ({
  line,
  key: `${line}`,
  index: line,
  itemCode: `T000000${line}`,
  itemDescription: 'Welder gloves five fingers, leather',
  quantity: '30',
  uom: 'prs',
  supplier: NORTHGATE,
  unitPrice: null,
  receivedAt: null,
  ...over,
});

const priced = (line: number, unitPrice: number, receivedAt: string): SourcingRow =>
  row(line, { unitPrice, receivedAt });

const sentTo = (supplier: string, body = 'Urgent please'): SentInquiry => ({
  supplier,
  body,
  sentAt: '2026-09-25T11:04:00Z',
  lines: [3],
});

describe('supplierThreads', () => {
  it('groups by supplier, exactly as the inquiries do', () => {
    const threads = supplierThreads([row(2), row(3, { supplier: SAFETY })], [], RFQ);

    expect(threads.map((one) => one.supplier)).toEqual([NORTHGATE, SAFETY]);
  });

  it('leaves out a line that named nobody, because there is no thread', () => {
    const threads = supplierThreads([row(3, { supplier: '' })], [], RFQ);

    expect(threads).toEqual([]);
  });

  it('prefers the letter that was sent over the template it came from', () => {
    const threads = supplierThreads([row(3)], [sentTo(NORTHGATE)], RFQ);

    expect(threads[0]!.outbound).toBe('Urgent please');
    expect(threads[0]!.sentAt).toBe('2026-09-25T11:04:00Z');
  });

  it('falls back to the template when nothing has gone yet', () => {
    const threads = supplierThreads([row(3)], [], RFQ);

    expect(threads[0]!.outbound).toContain(`Dear ${NORTHGATE},`);
    expect(threads[0]!.sentAt).toBeNull();
  });

  it('offers back the same quantity that was asked for', () => {
    const threads = supplierThreads([priced(3, 2.25, '2026-09-25T11:31:00Z')], [], RFQ);

    expect(threads[0]!.offered).toEqual([
      {
        key: '3',
        line: 3,
        specification: 'Welder gloves five fingers, leather',
        uom: 'prs',
        availableQty: '30 prs',
        unitPrice: 2.25,
      },
    ]);
  });

  it('offers nothing for a line nobody priced', () => {
    const threads = supplierThreads([row(3)], [sentTo(NORTHGATE)], RFQ);

    expect(threads[0]!.offered).toEqual([]);
    expect(threads[0]!.repliedAt).toBeNull();
  });

  it('dates the reply by the first price that came in', () => {
    const threads = supplierThreads(
      [priced(2, 2.25, '2026-09-25T11:31:00Z'), priced(3, 19.5, '2026-09-25T11:29:00Z')],
      [],
      RFQ,
    );

    expect(threads[0]!.repliedAt).toBe('2026-09-25T11:29:00Z');
  });

  it('keeps every line asked about, priced or not', () => {
    const threads = supplierThreads([priced(2, 2.25, '2026-09-25T11:31:00Z'), row(3)], [], RFQ);

    expect(threads[0]!.rows.map((one) => one.line)).toEqual([2, 3]);
    expect(threads[0]!.offered.map((one) => one.line)).toEqual([2]);
  });
});

describe('the gates on the two buttons', () => {
  it('has nothing to read until a price comes back', () => {
    expect(hasAnyReply([row(3)])).toBe(false);
    expect(hasAnyReply([row(2), priced(3, 2.25, '2026-09-25T11:31:00Z')])).toBe(true);
  });

  it('counts the inquiries as gone the moment there is one', () => {
    expect(alreadySent([])).toBe(false);
    expect(alreadySent([sentTo(NORTHGATE)])).toBe(true);
  });
});

describe('formatMoment', () => {
  it('reads as a date and a time', () => {
    expect(formatMoment('2026-09-25T11:31:00Z')).toMatch(/2026/);
  });

  it('shows nothing rather than Invalid Date', () => {
    expect(formatMoment(null)).toBe('');
    expect(formatMoment('not a date')).toBe('');
  });
});
