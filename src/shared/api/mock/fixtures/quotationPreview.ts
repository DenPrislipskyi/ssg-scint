import type { QuotationFormat } from '@/entities/rfq/lib/quotation';
import type { MatchLine, QuotationPreview } from '@/entities/rfq/model/types';

/**
 * A stand-in for what the backend's quotation layout returns, so the preview
 * can be looked at without a backend. Its wording is copied from the backend's
 * offices only to look the part - the real document is the backend's, and this
 * is not kept in step with it.
 */
const LETTERHEADS: Partial<Record<QuotationFormat, QuotationPreview['letterhead']>> = {
  'SG standard': {
    name: 'Seven Seas Maritime Services (Singapore) Pte. Ltd',
    address: '12 Tuas Road, Singapore. 638486',
    registration: 'UEN : 199305221C, Tax Reg No : M201169402',
    phone: 'Phone: +65 3152 2188 Fax: +65 3152 2189',
    email: 'supply.singapore@sevenseasgroup.com',
    web: 'www.sevenseasgroup.com',
  },
  'UAE standard': {
    name: 'Seven Seas Shipchandlers (L.L.C)',
    address: 'Plot 598-668, Dubai Investments Park,Off Emirates Road, P.O.Box 5592, Dubai',
    registration: '',
    phone: 'Phone: +971 4 8033 3333 Fax:',
    email: 'supply.uae@sevenseasgroup.com',
    web: 'www.sevenseasgroup.com',
  },
};

const money = (value: number): string => value.toFixed(2);

export const mockQuotationPreview = (
  format: QuotationFormat,
  lines: MatchLine[],
  reference: string,
): QuotationPreview => {
  const letterhead = LETTERHEADS[format];
  if (letterhead === undefined) throw new Error(`${format} has no letterhead`);

  const rows = lines.map((line) => {
    const price = line.approvedUnitPrice ?? 0;
    const quantity = Number(line.quantity) || 0;
    return [
      String(line.line),
      line.itemCode,
      line.itemDescription,
      money(quantity),
      line.uom,
      money(price),
      money(Math.round(price * quantity * 100) / 100),
    ];
  });
  const subtotal = rows.reduce((sum, row) => sum + Number(row[6]), 0);
  const empty = (title: string, labels: string[]) => ({
    title,
    rows: labels.map((label): [string, string] => [label, '']),
    tall: false,
  });

  return {
    logo: null,
    letterhead,
    banner: 'Quotation For purchasing@almi.example.com',
    pairs: [
      [
        { ...empty('Customer Address', ['Billing Address']), tall: true },
        empty('Seven Seas Contact Details', ['Seven Seas Contact Person', 'Email-Id']),
      ],
      [
        empty('RFQ Details', ['Reference', 'Contact', 'Phone', 'Email']),
        empty('Port and Dates', [
          'Port',
          'Lead Time (Days)',
          'RFQ Received Date',
          'Offer Valid Till',
        ]),
      ],
      [
        empty('Vessel Details', ['Vessel Name', 'IMO Number']),
        {
          title: 'Seven Seas Reference',
          rows: [
            ['Quotation Number', reference],
            ['Seven Seas Client Code', ''],
          ],
          tall: false,
        },
      ],
    ],
    terms: {
      title: 'Supplier Terms and Condition',
      rows: [
        ['Comments', 'All quotes are subject to General terms and conditions of Seven Seas Group.'],
        ['Payment Terms', ''],
      ],
      tall: false,
    },
    currency: 'USD',
    columns: [
      { name: 'Sr No', align: 'center', width: 59.9 },
      { name: 'Identification', align: 'left', width: 90.9 },
      { name: 'Description', align: 'left', width: 329.3 },
      { name: 'Qty', align: 'right', width: 66.8 },
      { name: 'Uom', align: 'left', width: 62 },
      { name: 'UnitPrice', align: 'right', width: 86.6 },
      { name: 'Total', align: 'right', width: 84.7 },
    ],
    rows,
    totals: [
      { label: 'Subtotal', value: money(subtotal), strong: true, shaded: true },
      { label: 'Freight ( + )', value: '0.00', strong: false, shaded: false },
      { label: 'Other ( + )', value: '0.00', strong: false, shaded: false },
      { label: 'Total Price(USD)', value: money(subtotal), strong: true, shaded: false },
    ],
  };
};
