import { render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { sheetMargins, type Margins } from '@/entities/rfq/lib/pricing';
import type { MatchLine } from '@/entities/rfq/model/types';
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
  ...overrides,
});

/**
 * Екран із власними націнками — так, як його тримає сторінка.
 *
 * Стан живе над таблицею, бо ті самі числа стоять і в підписі етапу; тут він
 * підміняється найменшим, що вміє те саме.
 */
const Screen = ({ lines }: { lines: MatchLine[] }) => {
  const [margins, setMargins] = useState<Margins>(() => sheetMargins(lines));
  return <Pricing lines={lines} margins={margins} onMargins={setMargins} />;
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

  it('leads nowhere yet, because the fourth stage is not in this POC', () => {
    render(<Screen lines={[line()]} />);

    expect(screen.getByRole('button', { name: /Continue to RFQ Finalisation/ })).toBeDisabled();
  });
});
