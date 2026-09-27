import { screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { DraftApproval } from '@/entities/rfq/api/rfqRepository';
import { sheetMargins, type Margins } from '@/entities/rfq/lib/pricing';
import type { Approval, MatchLine } from '@/entities/rfq/model/types';
import { createMockRepositories, type Repositories } from '@/shared/api/createRepositories';
import { renderWithProviders } from '@/test/renderWithProviders';
import { Pricing } from '@/widgets/pricing/Pricing';

const sheetRow = (source: string, price: string, margin: string) => ({
  'Item Code': 'T69133100',
  'Item Description / SSG Description': 'HEX HEAD BOLT/NUT STEEL UNGALV, M20 X 80MM',
  'Product Source': source,
  UOM: 'SET',
  Price: price,
  'Margin %': margin,
});

const STOCK = sheetRow('Stock', '25', '12');
const JIT = sheetRow('JIT', '', '15');

const line = (overrides: Partial<MatchLine> = {}): MatchLine => ({
  line: 1,
  index: 1,
  customerCode: '',
  customerDescription: 'bolts hex head with nuts',
  quantity: '10',
  uom: 'pcs',
  itemCode: 'T69133100',
  itemDescription: 'HEX HEAD BOLT/NUT STEEL UNGALV, M20 X 80MM',
  item: STOCK,
  confidence: 70,
  how: 'search',
  why: '',
  candidates: [],
  confirmedItemCode: 'T69133100',
  offerUnitPrice: null,
  offerReceivedAt: null,
  approvedUnitPrice: null,
  ...overrides,
});

/**
 * Екран із власними націнками — так, як його тримає сторінка.
 *
 * Стан живе над таблицею, бо ті самі числа стоять і в підписі етапу; тут він
 * підміняється найменшим, що вміє те саме.
 */
const Screen = ({
  lines,
  approval = null,
  onContinue = () => {},
}: {
  lines: MatchLine[];
  approval?: Approval | null;
  onContinue?: () => void;
}) => {
  const [margins, setMargins] = useState<Margins>(() => sheetMargins(lines));
  return (
    <Pricing
      rfqId="sample"
      lines={lines}
      approval={approval}
      margins={margins}
      onMargins={setMargins}
      onContinue={onContinue}
    />
  );
};

/** Екран із провайдерами: кнопка Approve ходить у репозиторій. */
const render = (ui: React.ReactElement, repositories?: Repositories) =>
  renderWithProviders(ui, {
    path: '/rfqs/:rfqId/pricing',
    initialEntries: ['/rfqs/sample/pricing'],
    ...(repositories ? { repositories } : {}),
  });

/** Підпис, як його віддає запис. */
const SIGNED: Approval = {
  approvedAt: '2026-09-25T16:40:00Z',
  marginStock: 12,
  marginJit: 15,
};

/** Клітинки рядка таблиці, по його номеру позиції. */
const cellsOf = (lineNumber: number) =>
  within(screen.getByText(String(lineNumber)).closest('tr')!)
    .getAllByRole('cell')
    .map((cell) => cell.textContent);

const UNIT = 8;
const TOTAL = 9;
const COST = 6;
const MARGIN = 7;

describe('Pricing', () => {
  it('opens with the margins the sheet named, one per source', () => {
    render(<Screen lines={[line(), line({ index: 2, line: 2, item: JIT })]} />);

    expect(screen.getByLabelText('In-Stock margin %')).toHaveValue(12);
    expect(screen.getByLabelText('JIT margin %')).toHaveValue(15);
  });

  it('prices a stock line from the sheet', () => {
    render(<Screen lines={[line()]} />);

    const cells = cellsOf(1);
    expect(cells[COST]).toBe('$25.00');
    expect(cells[MARGIN]).toContain('12 %');
    expect(cells[UNIT]).toBe('$28.00');
    expect(cells[TOTAL]).toBe('$280.00');
  });

  it('waits for the supplier on a JIT line, and says so', () => {
    render(<Screen lines={[line({ item: JIT })]} />);

    const cells = cellsOf(1);
    expect(cells[COST]).toContain('awaiting supplier');
    expect(cells[UNIT]).toBe('—');
    expect(cells[TOTAL]).toBe('—');
  });

  it('prices the JIT line once the supplier has answered', () => {
    render(<Screen lines={[line({ item: JIT, offerUnitPrice: 2.25 })]} />);

    const cells = cellsOf(1);
    expect(cells[COST]).toBe('$2.25');
    expect(cells[UNIT]).toBe('$2.59');
  });

  it('recalculates only the stock lines when the stock margin changes', async () => {
    const user = userEvent.setup();
    render(<Screen lines={[line(), line({ index: 2, line: 2, item: JIT, offerUnitPrice: 10 })]} />);

    await user.clear(screen.getByLabelText('In-Stock margin %'));
    await user.type(screen.getByLabelText('In-Stock margin %'), '50');

    expect(cellsOf(1)[UNIT]).toBe('$37.50');
    expect(cellsOf(2)[UNIT]).toBe('$11.50');
  });

  it('recalculates only the JIT lines when the JIT margin changes', async () => {
    const user = userEvent.setup();
    render(<Screen lines={[line(), line({ index: 2, line: 2, item: JIT, offerUnitPrice: 10 })]} />);

    await user.clear(screen.getByLabelText('JIT margin %'));
    await user.type(screen.getByLabelText('JIT margin %'), '50');

    expect(cellsOf(1)[UNIT]).toBe('$28.00');
    expect(cellsOf(2)[UNIT]).toBe('$15.00');
  });

  it('adds up only what is priced, and says how much of the RFQ that is', () => {
    render(<Screen lines={[line(), line({ index: 2, line: 2, item: JIT })]} />);

    expect(screen.getByText('Total quote amount').closest('tr')).toHaveTextContent('$280.00');
    expect(screen.getByText('1 of 2 lines priced')).toBeInTheDocument();
  });

  it('will not move on until the pricing is approved', () => {
    render(<Screen lines={[line()]} />);

    expect(screen.getByRole('button', { name: /Continue to RFQ Finalisation/ })).toBeDisabled();
  });
});

describe('Approving the pricing', () => {
  /** Репозиторії, що записують, що саме пішло на підпис. */
  const listening = () => {
    const repositories = createMockRepositories();
    const signed: DraftApproval[] = [];
    repositories.rfqs.approve = async (_id, approval) => {
      signed.push(approval);
    };
    return { repositories, signed };
  };

  const approveButton = () => screen.getByRole('button', { name: /Approve/ });

  it('cannot be approved while a line is still waiting on its supplier', () => {
    // Котирування з діркою — це не менше котирування, а хибне: у підсумку
    // дірки не видно, вона просто робить число меншим.
    render(<Screen lines={[line(), line({ index: 2, line: 2, item: JIT })]} />);

    expect(approveButton()).toBeDisabled();
    expect(within(approveButton().parentElement!).getByRole('tooltip')).toHaveTextContent(
      /Make sure every line has a price/,
    );
  });

  it('can be approved once every line has a price', () => {
    render(<Screen lines={[line(), line({ index: 2, line: 2, item: JIT, offerUnitPrice: 5 })]} />);

    expect(approveButton()).toBeEnabled();
  });

  it('signs the prices the screen showed, not the inputs to them', async () => {
    const user = userEvent.setup();
    const { repositories, signed } = listening();
    // Обидва джерела, бо підписують і ті, і ті — і націнки в них різні.
    render(
      <Screen lines={[line(), line({ index: 2, line: 2, item: JIT, offerUnitPrice: 5 })]} />,
      repositories,
    );

    await user.click(approveButton());

    await waitFor(() => expect(signed).toHaveLength(1));
    expect(signed[0]).toEqual({
      marginStock: 12,
      marginJit: 15,
      lines: [
        { index: 1, unitPrice: 28 },
        { index: 2, unitPrice: 5.75 },
      ],
    });
  });

  it('signs the margin a person typed, not the one the sheet named', async () => {
    const user = userEvent.setup();
    const { repositories, signed } = listening();
    render(<Screen lines={[line()]} />, repositories);

    await user.clear(screen.getByLabelText('In-Stock margin %'));
    await user.type(screen.getByLabelText('In-Stock margin %'), '50');
    await user.click(approveButton());

    await waitFor(() => expect(signed).toHaveLength(1));
    expect(signed[0]).toMatchObject({ marginStock: 50, lines: [{ index: 1, unitPrice: 37.5 }] });
  });

  it('locks both margins once it is signed, and says why', () => {
    render(<Screen lines={[line()]} approval={SIGNED} />);

    expect(screen.getByLabelText('In-Stock margin %')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('JIT margin %')).toHaveAttribute('readonly');
    // Підказка своя, а не `title`: нативну браузер тримає близько секунди.
    const field = screen.getByLabelText('In-Stock margin %').closest('label')!.parentElement!;
    expect(within(field).getByRole('tooltip')).toHaveTextContent(/approved/);
  });

  it('will not be signed twice', () => {
    render(<Screen lines={[line()]} approval={SIGNED} />);

    expect(approveButton()).toBeDisabled();
  });

  it('opens the way onwards once it is signed', async () => {
    const user = userEvent.setup();
    const onwards = vi.fn();
    render(<Screen lines={[line()]} approval={SIGNED} onContinue={onwards} />);

    await user.click(screen.getByRole('button', { name: /Continue to RFQ Finalisation/ }));

    expect(onwards).toHaveBeenCalledOnce();
  });

  it('shows the price that was signed, not the one it would compute now', () => {
    // Після підпису собівартість і націнка ще рухаються, а котирування — ні.
    render(<Screen lines={[line({ approvedUnitPrice: 99.5 })]} approval={SIGNED} />);

    expect(cellsOf(1)[UNIT]).toBe('$99.50');
    expect(cellsOf(1)[TOTAL]).toBe('$995.00');
  });
});
