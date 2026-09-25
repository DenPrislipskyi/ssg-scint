import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import type { DraftInquiry } from '@/entities/rfq/api/rfqRepository';
import type { SourcingRow } from '@/entities/rfq/lib/sourcing';
import type { SentInquiry } from '@/entities/rfq/model/types';
import { createMockRepositories, type Repositories } from '@/shared/api/createRepositories';
import { renderWithProviders } from '@/test/renderWithProviders';
import { SupplierSourcing } from '@/widgets/supplier-sourcing/SupplierSourcing';

const SAMPLE = 'Load sample supplier response';

/** Рядки таблиці товарів усередині модалки — не тієї, що під нею. */
const productRows = () =>
  within(
    within(screen.getByRole('dialog'))
      .getByText('Internal item code')
      .closest('table')!
      .querySelector('tbody')!,
  ).getAllByRole('row');

const NORTHGATE = 'Northgate Marine Fasteners Ltd.';
const SAFETY = 'Safety Innovators (Intl) Pte Ltd';

const row = (line: number, over: Partial<SourcingRow> | number | null = null): SourcingRow => ({
  line,
  key: `${line}`,
  index: line,
  itemCode: `T000000${line}`,
  itemDescription: 'HEX HEAD BOLT/NUT STEEL UNGALV, M20 X 80MM',
  quantity: '12',
  uom: 'pcs',
  supplier: NORTHGATE,
  unitPrice: null,
  receivedAt: null,
  ...(typeof over === 'object' && over !== null ? over : { unitPrice: over }),
});

/** Репозиторії, що записують, кого саме питали про ціну. */
const listening = (): { repositories: Repositories; asked: number[] } => {
  const repositories = createMockRepositories();
  const asked: number[] = [];
  const price = repositories.rfqs.price.bind(repositories.rfqs);

  repositories.rfqs.price = async (id, index, unitPrice) => {
    asked.push(index);
    return price(id, index, unitPrice);
  };
  return { repositories, asked };
};

/** Репозиторії, що записують, які саме листи пішли. */
const posting = (): { repositories: Repositories; posted: DraftInquiry[][] } => {
  const repositories = createMockRepositories();
  const posted: DraftInquiry[][] = [];

  repositories.rfqs.sendInquiries = async (_id, inquiries) => {
    posted.push(inquiries);
  };
  return { repositories, posted };
};

/** Лист, який уже пішов — такий, яким його віддає запис. */
const sentTo = (supplier: string, ...lines: number[]): SentInquiry => ({
  supplier,
  body: `Dear ${supplier},\n\nKindly quote the following item(s).`,
  sentAt: '2026-09-25T11:04:00Z',
  lines,
});

const RESPONSES = 'Supplier Responses';

/** Підказка саме цієї кнопки — на сторінці їх буває кілька. */
const tooltipOf = (name: string) =>
  within(screen.getByRole('button', { name }).parentElement!).getByRole('tooltip');

const render = (rows: SourcingRow[], repositories?: Repositories, inquiries: SentInquiry[] = []) =>
  renderWithProviders(
    <SupplierSourcing
      rfqId="sample"
      reference="RFQ-0042"
      vessel="MV LIA"
      port="Singapore"
      rows={rows}
      inquiries={inquiries}
    />,
    {
      path: '/rfqs/:rfqId/sourcing',
      initialEntries: ['/rfqs/sample/sourcing'],
      ...(repositories ? { repositories } : {}),
    },
  );

describe('SupplierSourcing', () => {
  it('asks every line when nobody has answered', async () => {
    const user = userEvent.setup();
    const { repositories, asked } = listening();
    render([row(2, null), row(3, null)], repositories);

    await user.click(screen.getByRole('button', { name: SAMPLE }));

    await waitFor(() => expect(asked).toEqual([2, 3]));
  });

  it('asks again only for the lines that never got a price', async () => {
    // Половина записів може не дійти. Кнопка мусить лишитися доступною, а
    // перезапит — не чіпати число, яке вже хтось прочитав.
    const user = userEvent.setup();
    const { repositories, asked } = listening();
    render([row(2, 24.5), row(3, null)], repositories);

    const load = screen.getByRole('button', { name: SAMPLE });
    expect(load).toBeEnabled();
    await user.click(load);

    await waitFor(() => expect(asked).toEqual([3]));
    expect(screen.getByText('$24.5')).toBeInTheDocument();
  });

  it('has nobody left to ask once every line carries a price', () => {
    render([row(2, 24.5), row(3, 4.8)]);

    expect(screen.getByRole('button', { name: SAMPLE })).toBeDisabled();
    expect(screen.getByText('$4.8')).toBeInTheDocument();
  });

  it('has nobody to ask at all when no line is JIT', () => {
    render([]);

    expect(screen.getByRole('button', { name: SAMPLE })).toBeDisabled();
    expect(screen.getByText('Nothing to quote — no JIT line on this RFQ')).toBeInTheDocument();
  });

  it('offers one letter per supplier, not one per line', async () => {
    const user = userEvent.setup();
    render([row(3, { supplier: SAFETY }), row(5), row(6, { supplier: SAFETY })]);

    await user.click(screen.getByRole('button', { name: 'Send Web Inquiry' }));

    const panel = screen.getByRole('dialog');
    expect(within(panel).getByRole('button', { name: /lines 3, 6/ })).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: /line 5/ })).toBeInTheDocument();
    expect(within(panel).getByText('2 suggested supplier(s) · 3 JIT line(s)')).toBeInTheDocument();
  });

  it('lists the products of the supplier being looked at', async () => {
    const user = userEvent.setup();
    render([row(3, { supplier: SAFETY }), row(5), row(6, { supplier: SAFETY })]);
    await user.click(screen.getByRole('button', { name: 'Send Web Inquiry' }));

    expect(within(productRows()[0]!).getAllByRole('cell')[0]).toHaveTextContent('3');
    expect(productRows()).toHaveLength(2);
    expect(screen.getByText(`Products for ${SAFETY}`)).toBeInTheDocument();
  });

  it('rewrites the letter and the table when another supplier is picked', async () => {
    const user = userEvent.setup();
    render([row(3, { supplier: SAFETY }), row(5), row(6, { supplier: SAFETY })]);
    await user.click(screen.getByRole('button', { name: 'Send Web Inquiry' }));

    const letter = () => screen.getByLabelText<HTMLTextAreaElement>('Supplier email template');
    expect(letter().value).toContain(`Dear ${SAFETY},`);

    await user.click(screen.getByRole('button', { name: /line 5/ }));

    expect(letter().value).toContain(`Dear ${NORTHGATE},`);
    expect(letter().value).not.toContain('3. T0000003');
    expect(productRows()).toHaveLength(1);
  });

  it('keeps an edited letter with the supplier it was written for', async () => {
    const user = userEvent.setup();
    render([row(3, { supplier: SAFETY }), row(5)]);
    await user.click(screen.getByRole('button', { name: 'Send Web Inquiry' }));

    const letter = () => screen.getByLabelText<HTMLTextAreaElement>('Supplier email template');
    await user.clear(letter());
    await user.type(letter(), 'Rewritten for one supplier only');

    await user.click(screen.getByRole('button', { name: /line 5/ }));
    expect(letter().value).toContain(`Dear ${NORTHGATE},`);

    await user.click(screen.getByRole('button', { name: /line 3/ }));
    expect(letter().value).toBe('Rewritten for one supplier only');
  });

  it('closes on Cancel without recording anything', async () => {
    const user = userEvent.setup();
    const { repositories, posted } = posting();
    render([row(3, null)], repositories);

    await user.click(screen.getByRole('button', { name: 'Send Web Inquiry' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(posted).toEqual([]);
  });

  it('records the letters, then closes', async () => {
    const user = userEvent.setup();
    const { repositories, posted } = posting();
    render([row(3, null)], repositories);

    await user.click(screen.getByRole('button', { name: 'Send Web Inquiry' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Send Web Inquiry' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(posted).toHaveLength(1);
    expect(posted[0]).toEqual([
      { supplier: NORTHGATE, body: expect.stringContaining(`Dear ${NORTHGATE},`), lines: [3] },
    ]);
  });

  it('sends every supplier at once, not only the one on screen', async () => {
    const user = userEvent.setup();
    const { repositories, posted } = posting();
    render([row(2), row(3, { supplier: SAFETY })], repositories);

    await user.click(screen.getByRole('button', { name: 'Send Web Inquiry' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Send Web Inquiry' }),
    );

    await waitFor(() => expect(posted).toHaveLength(1));
    expect(posted[0]!.map((one) => one.supplier)).toEqual([NORTHGATE, SAFETY]);
  });

  it('keeps the edits a person made to a letter', async () => {
    const user = userEvent.setup();
    const { repositories, posted } = posting();
    render([row(3, null)], repositories);

    await user.click(screen.getByRole('button', { name: 'Send Web Inquiry' }));
    const dialog = screen.getByRole('dialog');
    await user.clear(within(dialog).getByLabelText('Supplier email template'));
    await user.type(within(dialog).getByLabelText('Supplier email template'), 'Urgent please');
    await user.click(within(dialog).getByRole('button', { name: 'Send Web Inquiry' }));

    await waitFor(() => expect(posted).toHaveLength(1));
    expect(posted[0]![0]!.body).toBe('Urgent please');
  });

  it('will not send the inquiries a second time', async () => {
    render([row(3, null)], undefined, [sentTo(NORTHGATE, 3)]);

    expect(screen.getByRole('button', { name: 'Send Web Inquiry' })).toBeDisabled();
  });

  it('has nobody to write to when no line named a supplier', () => {
    render([row(3, { supplier: '' })]);

    expect(screen.getByRole('button', { name: 'Send Web Inquiry' })).toBeDisabled();
  });

  it('shows a price to one decimal, as a supplier would quote it', () => {
    render([row(2, 7)]);

    const cells = within(screen.getByText('$7.0').closest('tr')!).getAllByRole('cell');
    expect(cells[5]).toHaveTextContent('$7.0');
  });
});

describe('Supplier Responses', () => {
  /** Рядки таблиці пропозиції всередині вікна відповідей. */
  const offeredRows = () =>
    within(
      within(screen.getByRole('dialog'))
        .getByText('Product / specification')
        .closest('table')!
        .querySelector('tbody')!,
    ).getAllByRole('row');

  it('cannot be read before anybody has answered', () => {
    render([row(3, null)]);

    expect(screen.getByRole('button', { name: RESPONSES })).toBeDisabled();
  });

  it('says why it cannot be read', () => {
    // Своя підказка, а не `title`: нативну Chrome над вимкненою кнопкою не
    // показує взагалі, а там, де показує, — тримає близько секунди.
    render([row(3, null)]);

    expect(tooltipOf(RESPONSES)).toHaveTextContent(/Load a sample/);
  });

  it('says why nothing more can be sent, once the inquiries have gone', () => {
    render([row(3, 2.25)], undefined, [sentTo(NORTHGATE, 3)]);

    expect(tooltipOf('Send Web Inquiry')).toHaveTextContent(/already been sent/);
  });

  it('opens once a price has come back', () => {
    render([row(3, 2.25)]);

    expect(screen.getByRole('button', { name: RESPONSES })).toBeEnabled();
  });

  it('has no thread to show when no line named a supplier', () => {
    render([row(3, { supplier: '', unitPrice: 2.25 })]);

    expect(screen.getByRole('button', { name: RESPONSES })).toBeDisabled();
  });

  it('shows the letter that was actually sent, not the template', async () => {
    const user = userEvent.setup();
    render([row(3, 2.25)], undefined, [
      { supplier: NORTHGATE, body: 'Urgent please', sentAt: '2026-09-25T11:04:00Z', lines: [3] },
    ]);

    await user.click(screen.getByRole('button', { name: RESPONSES }));

    expect(within(screen.getByRole('dialog')).getByText('Urgent please')).toBeInTheDocument();
  });

  it('says so when the letter has not gone yet', async () => {
    const user = userEvent.setup();
    render([row(3, 2.25)]);

    await user.click(screen.getByRole('button', { name: RESPONSES }));

    expect(within(screen.getByRole('dialog')).getByText('not sent yet')).toBeInTheDocument();
  });

  it('quotes back the product, the quantity asked for and the price on the record', async () => {
    const user = userEvent.setup();
    render([row(3, { unitPrice: 2.25, quantity: '30', uom: 'prs' })], undefined, [
      sentTo(NORTHGATE, 3),
    ]);

    await user.click(screen.getByRole('button', { name: RESPONSES }));

    const cells = within(offeredRows()[0]!).getAllByRole('cell');
    expect(cells.map((cell) => cell.textContent)).toEqual([
      '3',
      'HEX HEAD BOLT/NUT STEEL UNGALV, M20 X 80MM',
      'prs',
      '30 prs',
      '$2.3',
    ]);
  });

  it('leaves a line nobody priced out of the reply', async () => {
    const user = userEvent.setup();
    render([row(2, 2.25), row(3, null)], undefined, [sentTo(NORTHGATE, 2, 3)]);

    await user.click(screen.getByRole('button', { name: RESPONSES }));

    expect(offeredRows()).toHaveLength(1);
    expect(within(offeredRows()[0]!).getAllByRole('cell')[0]).toHaveTextContent('2');
  });

  it('still shows every line that was asked about', async () => {
    const user = userEvent.setup();
    render([row(2, 2.25), row(3, null)], undefined, [sentTo(NORTHGATE, 2, 3)]);

    await user.click(screen.getByRole('button', { name: RESPONSES }));

    expect(productRows()).toHaveLength(2);
  });

  it('writes the reply in the supplier’s name and about this RFQ', async () => {
    const user = userEvent.setup();
    render([row(3, 2.25)], undefined, [sentTo(NORTHGATE, 3)]);

    await user.click(screen.getByRole('button', { name: RESPONSES }));

    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByText(/Thank you for your inquiry regarding RFQ-0042/)).toBeInTheDocument();
    expect(dialog.getByText(/^— RE: RFQ-0042$/)).toBeInTheDocument();
  });

  it('marks a supplier who has not answered as pending', async () => {
    const user = userEvent.setup();
    render([row(2, 2.25), row(3, { supplier: SAFETY })], undefined, [sentTo(NORTHGATE, 2)]);

    await user.click(screen.getByRole('button', { name: RESPONSES }));

    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByText('Replied')).toBeInTheDocument();
    expect(dialog.getByText('Pending')).toBeInTheDocument();
  });

  it('offers nothing to read for a supplier who has not answered', async () => {
    const user = userEvent.setup();
    render([row(2, 2.25), row(3, { supplier: SAFETY })], undefined, [sentTo(NORTHGATE, 2)]);

    await user.click(screen.getByRole('button', { name: RESPONSES }));
    // Кнопка постачальника несе ще й бейдж та підпис, тож ім'я — не рівність.
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: /Safety Innovators/ }),
    );

    expect(screen.getByText(/No reply from Safety Innovators/)).toBeInTheDocument();
  });
});
