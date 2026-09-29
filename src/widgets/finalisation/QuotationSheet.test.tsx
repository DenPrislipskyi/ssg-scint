import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { QuotationPreview } from '@/entities/rfq/model/types';
import { QuotationSheet } from '@/widgets/finalisation/QuotationSheet';

const panel = (title: string, rows: [string, string][], tall = false) => ({ title, rows, tall });

/** The UAE form: the widest there is, with its discount and VAT columns. */
const DUBAI: QuotationPreview = {
  logo: 'data:image/jpeg;base64,AAAA',
  letterhead: {
    name: 'Seven Seas Shipchandlers (L.L.C)',
    address: 'Plot 598-668, Dubai Investments Park',
    registration: '',
    phone: 'Phone: +971 4 8033 3333 Fax:',
    email: 'supply.uae@sevenseasgroup.com',
    web: 'www.sevenseasgroup.com',
  },
  banner: 'Quotation For purchasing@example.com',
  pairs: [
    [
      panel('Customer Address', [['Billing Address', '']], true),
      panel('Seven Seas Contact Details', [['Email-Id', 'supply.uae@sevenseasgroup.com']]),
    ],
  ],
  terms: panel('Supplier Terms and Condition', [['Payment Terms', '']]),
  currency: 'USD',
  columns: [
    { name: 'Sr No', align: 'center', width: 33.3 },
    { name: 'Identification', align: 'left', width: 64.2 },
    { name: 'Description', align: 'left', width: 276.7 },
    { name: 'Qty', align: 'right', width: 41.6 },
    { name: 'Uom', align: 'left', width: 36.3 },
    { name: 'Rate', align: 'right', width: 59.7 },
    { name: 'VAT%', align: 'right', width: 41 },
    { name: 'Net Total', align: 'right', width: 67.1 },
  ],
  rows: Array.from({ length: 100 }, (_, n) => [
    String(n + 1),
    'T69126500',
    'HEX HEAD BOLT M14 X 50MM',
    '2.00',
    'pcs',
    '48.65',
    '0.00%',
    '97.30',
  ]),
  totals: [
    { label: 'Subtotal', value: '9730.00', strong: true, shaded: true },
    { label: 'VAT', value: '0.00', strong: false, shaded: false },
    { label: 'Total Price(USD)', value: '9730.00', strong: true, shaded: false },
  ],
};

const items = () => screen.getByText('Identification').closest('table')!;

describe('QuotationSheet', () => {
  it("says what the PDF says, in the office's own words", () => {
    render(<QuotationSheet preview={DUBAI} />);

    expect(screen.getByText('Seven Seas Shipchandlers (L.L.C)')).toBeVisible();
    expect(screen.getByRole('heading', { name: DUBAI.banner })).toBeVisible();
    expect(screen.getByText('Supplier Terms and Condition')).toBeVisible();
    expect(screen.getByText('Currency: USD')).toBeVisible();
  });

  it('carries the Dubai form columns, VAT included', () => {
    render(<QuotationSheet preview={DUBAI} />);

    // The second heading row; the first is the three grey blocks above it.
    const names = [...items().querySelectorAll('thead tr:nth-child(2) th')].map(
      (one) => one.textContent,
    );
    expect(names).toEqual(DUBAI.columns.map((one) => one.name));
  });

  it('shows every line on one page, however many there are', () => {
    // Paper breaks a long table across pages; a screen scrolls.
    render(<QuotationSheet preview={DUBAI} />);

    expect(within(items().querySelector('tbody')!).getAllByRole('row')).toHaveLength(100);
    expect(screen.queryByText(/^Page \d+ of \d+$/)).not.toBeInTheDocument();
  });

  it('divides the table in the proportions the PDF does', () => {
    render(<QuotationSheet preview={DUBAI} />);

    const widths = [...items().querySelectorAll('col')].map((one) => one.style.width);
    const total = DUBAI.columns.reduce((sum, one) => sum + one.width, 0);
    expect(widths[2]).toBe(`${(100 * 276.7) / total}%`);
  });

  it('aligns each column as the PDF does', () => {
    render(<QuotationSheet preview={DUBAI} />);

    const [first] = within(items().querySelector('tbody')!).getAllByRole('row');
    const cells = within(first!).getAllByRole('cell');
    expect(cells[0]).toHaveClass('text-center');
    expect(cells[2]).toHaveClass('text-left');
    expect(cells[7]).toHaveClass('text-right');
  });

  it('puts Subtotal on the grey band and the final total in bold', () => {
    render(<QuotationSheet preview={DUBAI} />);

    expect(screen.getByText('Subtotal').closest('tr')).toHaveClass('bg-[#c0c0c0]');
    expect(screen.getByText('Total Price(USD)')).toHaveClass('font-bold');
  });

  it('shows the logo when there is one, and goes without it otherwise', () => {
    const { rerender } = render(<QuotationSheet preview={DUBAI} />);
    expect(screen.getByRole('img', { name: 'Seven Seas' })).toHaveAttribute('src', DUBAI.logo);

    rerender(<QuotationSheet preview={{ ...DUBAI, logo: null }} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
