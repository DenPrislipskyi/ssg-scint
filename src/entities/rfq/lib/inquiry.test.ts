import { describe, expect, it } from 'vitest';

import { inquiryGroups, inquiryText, lineNote } from '@/entities/rfq/lib/inquiry';
import type { SourcingRow } from '@/entities/rfq/lib/sourcing';

const SAFETY = 'Safety Innovators (Intl) Pte Ltd';
const HANSA = 'Hansa Technik';

const row = (line: number, supplier: string, over: Partial<SourcingRow> = {}): SourcingRow => ({
  line,
  key: `${line}`,
  index: line,
  itemCode: 'T85116300',
  itemDescription: 'Welder gloves five fingers, leather',
  quantity: '30',
  uom: 'prs',
  supplier,
  unitPrice: null,
  ...over,
});

const RFQ = { reference: 'RFQ-0114', vessel: 'MV LIA', port: 'Singapore' };

describe('inquiryGroups', () => {
  it('writes one letter per supplier, however many lines they carry', () => {
    // Два листи підряд від того самого відправника про ту саму поставку
    // читаються як помилка, і відповідають на них один раз.
    const groups = inquiryGroups([row(3, SAFETY), row(5, HANSA), row(6, SAFETY)]);

    expect(groups.map((one) => one.supplier)).toEqual([SAFETY, HANSA]);
    expect(groups[0]?.rows.map((one) => one.line)).toEqual([3, 6]);
    expect(groups[1]?.rows.map((one) => one.line)).toEqual([5]);
  });

  it('leaves out a line with nobody to write to', () => {
    expect(inquiryGroups([row(3, ''), row(5, HANSA)]).map((one) => one.supplier)).toEqual([HANSA]);
  });

  it('says which lines a supplier is being asked about', () => {
    const [group] = inquiryGroups([row(3, SAFETY), row(6, SAFETY)]);
    expect(lineNote(group!)).toBe('lines 3, 6');

    const [one] = inquiryGroups([row(3, SAFETY)]);
    expect(lineNote(one!)).toBe('line 3');
  });
});

describe('inquiryText', () => {
  it('writes the letter the desk would write', () => {
    const [group] = inquiryGroups([
      row(3, SAFETY),
      row(6, SAFETY, {
        itemCode: 'T31237400',
        itemDescription: 'Boilersuit cotton navy, UV protect, 3XL',
        quantity: '3',
        uom: 'pcs',
      }),
    ]);

    expect(inquiryText(group!, RFQ)).toBe(
      [
        'Subject: Web Inquiry · RFQ-0114 · MV LIA',
        '',
        `Dear ${SAFETY},`,
        '',
        'Kindly quote the following item(s) for MV LIA, delivery Singapore.',
        'Please confirm product / specification, your unit of measure, available quantity and unit price.',
        '',
        '3. T85116300 · Welder gloves five fingers, leather — 30 prs',
        '6. T31237400 · Boilersuit cotton navy, UV protect, 3XL — 3 pcs',
        '',
        'Best regards,',
        'Seven Seas Group — Singapore',
      ].join('\n'),
    );
  });

  it('asks each supplier only about their own lines', () => {
    const groups = inquiryGroups([row(3, SAFETY), row(5, HANSA)]);

    expect(inquiryText(groups[1]!, RFQ)).toContain(`Dear ${HANSA},`);
    expect(inquiryText(groups[1]!, RFQ)).not.toContain('3. T85116300');
  });

  it('says nothing about a vessel the RFQ never named', () => {
    // Порожнє судно не лишає по собі дірки в реченні й у темі листа.
    const [group] = inquiryGroups([row(3, SAFETY)]);
    const text = inquiryText(group!, { ...RFQ, vessel: '' });

    expect(text).toContain('Subject: Web Inquiry · RFQ-0114\n');
    expect(text).toContain('Kindly quote the following item(s), delivery Singapore.');
  });

  it('says nothing about a port the RFQ never named', () => {
    const [group] = inquiryGroups([row(3, SAFETY)]);
    expect(inquiryText(group!, { ...RFQ, port: '' })).toContain(
      'Kindly quote the following item(s) for MV LIA.',
    );
  });
});
