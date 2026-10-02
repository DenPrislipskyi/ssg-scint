import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import type { QuotationFormat } from '@/entities/rfq/lib/quotation';
import { QuotationEmail } from '@/widgets/finalisation/QuotationEmail';

const CUSTOMER = 'purchasing@almi.example.com';
const MAILBOX = 'supply@sevenseas.example.com';

const letter = (format: QuotationFormat = 'SG standard') =>
  render(
    <QuotationEmail format={format} reference="RFQ-0042" customer={CUSTOMER} mailbox={MAILBOX} />,
  );

const attached = () =>
  within(screen.getByRole('list'))
    .queryAllByRole('listitem')
    .map((item) => item.querySelector('[title]')!.textContent);

describe('QuotationEmail', () => {
  it('goes back to the customer, from the mailbox the RFQ came in to', () => {
    letter();

    const recipients = screen.getByRole('heading', { name: 'Recipients' }).closest('section')!;
    expect(within(recipients).getByText('From').nextElementSibling).toHaveTextContent(MAILBOX);
    expect(within(recipients).getByText('To').nextElementSibling).toHaveTextContent(CUSTOMER);
  });

  it('says a generated file is made on send', () => {
    letter();

    expect(screen.getAllByText('Generated on send')).toHaveLength(2);
  });

  it('attaches the files the format comes as, by the names they download under', () => {
    letter();

    expect(attached()).toEqual(['RFQ-0042_quotation.pdf', 'RFQ-0042_quotation_sg.xlsm']);
  });

  it("attaches only the customer's own file in their layout", () => {
    letter('Customer file (.xlsx)');

    expect(attached()).toEqual(['RFQ-0042_customer_file.xlsx']);
  });

  it('leaves a removed file off the letter', async () => {
    const user = userEvent.setup();
    letter();

    await user.click(screen.getByRole('button', { name: 'Remove RFQ-0042_quotation.pdf' }));

    expect(attached()).toEqual(['RFQ-0042_quotation_sg.xlsm']);
  });

  it('says so when no file is left', async () => {
    const user = userEvent.setup();
    letter('Customer file (.xlsx)');

    await user.click(screen.getByRole('button', { name: 'Remove RFQ-0042_customer_file.xlsx' }));

    expect(screen.getByText('No files attached')).toBeInTheDocument();
  });

  it('adds a file picked by hand, and can take it off again', async () => {
    const user = userEvent.setup();
    letter();

    await user.upload(
      screen.getByLabelText('Attach file'),
      new File(['x'.repeat(2048)], 'certificate.pdf', { type: 'application/pdf' }),
    );

    expect(attached()).toEqual([
      'RFQ-0042_quotation.pdf',
      'RFQ-0042_quotation_sg.xlsm',
      'certificate.pdf',
    ]);
    expect(screen.getByText('2 KB')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remove certificate.pdf' }));
    expect(attached()).not.toContain('certificate.pdf');
  });

  it('opens with the default letter, signed by the office of the format', () => {
    letter('UAE standard');

    const message = screen.getByLabelText('Email message');
    expect(message).toHaveValue(
      [
        `Dear ${CUSTOMER},`,
        '',
        'Good Day.',
        '',
        'Thank you for placing your inquiry with us.',
        '',
        'We are pleased to submit our best offer for your kind perusal. Kindly check our offer against your requirements.',
        '',
        'Best regards,',
        'Seven Seas Shipchandlers (L.L.C)',
      ].join('\n'),
    );
  });

  it('lets the letter be edited', async () => {
    const user = userEvent.setup();
    letter();

    const message = screen.getByLabelText('Email message');
    await user.clear(message);
    await user.type(message, 'Please find our offer attached.');

    expect(message).toHaveValue('Please find our offer attached.');
  });

  it('does not send in the POC', () => {
    letter();

    expect(screen.getByRole('button', { name: 'Send to customer' })).toBeDisabled();
  });
});
