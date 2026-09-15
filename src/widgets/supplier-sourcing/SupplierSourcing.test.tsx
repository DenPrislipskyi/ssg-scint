import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import type { SourcingRow } from '@/entities/rfq/lib/sourcing';
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

const render = (rows: SourcingRow[], repositories?: Repositories) =>
  renderWithProviders(
    <SupplierSourcing
      rfqId="sample"
      reference="RFQ-0042"
      vessel="MV LIA"
      port="Singapore"
      rows={rows}
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

  it('closes on either button, because neither sends anything', async () => {
    const user = userEvent.setup();
    render([row(3, null)]);

    await user.click(screen.getByRole('button', { name: 'Send Web Inquiry' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Send Web Inquiry' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Send Web Inquiry' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
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
