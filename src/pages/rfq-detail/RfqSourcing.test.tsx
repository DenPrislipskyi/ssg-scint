import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { RFQ_STAGE } from '@/app/router/paths';
import { RfqDetailPage } from '@/pages/rfq-detail/RfqDetailPage';
import { renderWithProviders } from '@/test/renderWithProviders';

/** Поля фільтрів дебаунсяться, тож чекати доводиться довше за рендер. */
const SLOW = { timeout: 3000 };

const SAMPLE = 'Load sample supplier response';
/** Місце колонки з ціною серед восьми колонок таблиці пропозицій. */
const PRICE = 5;

/** Рядки нижньої таблиці — тієї, що про відповіді постачальників. */
const offerRows = () =>
  within(
    screen.getByText('Product / specification').closest('table')!.querySelector('tbody')!,
  ).getAllByRole('row');

const cellsOf = (row: HTMLElement) =>
  within(row)
    .getAllByRole('cell')
    .map((cell) => cell.textContent);

const MATCHING = { path: '/rfqs/:rfqId', element: <RfqDetailPage /> };
const SOURCING = {
  path: '/rfqs/:rfqId/sourcing',
  element: <RfqDetailPage stage={RFQ_STAGE.sourcing} />,
};

/** Другий етап, відкритий за власною адресою — так, як на нього переходять. */
const renderSourcing = () =>
  renderWithProviders(SOURCING.element, {
    path: SOURCING.path,
    initialEntries: ['/rfqs/sample/sourcing'],
    siblings: [MATCHING],
  });

/**
 * Той самий екран, але через перший етап: mock-репозиторій тримає
 * підтвердження в собі, тож довести позиції до товару можна тільки руками.
 */
const settleEverything = async () => {
  const user = userEvent.setup();
  renderWithProviders(MATCHING.element, {
    path: MATCHING.path,
    initialEntries: ['/rfqs/sample'],
    siblings: [SOURCING],
  });
  await screen.findByRole('heading', { level: 1 });

  await user.click(screen.getByRole('button', { name: 'Accept all proposed' }));
  await screen.findByText('2 of 3 line(s) matched');

  const orphan = (await screen.findByText(/turbocharger cartridge/)).closest('tr')!;
  await user.click(orphan);
  await user.click(screen.getByRole('button', { name: 'Or pick manually' }));
  await user.click(await screen.findByText('WELDER GLOVES FIVE FINGERS', undefined, SLOW));
  await user.click(within(orphan).getByRole('button', { name: 'Confirm' }));
  await screen.findByText('3 of 3 line(s) matched');

  return user;
};

describe('Supplier Sourcing', () => {
  it('sends an unsettled RFQ back to Product Matching', async () => {
    // Підказка в шапці — це прохання не заходити; адресний рядок його обходить,
    // тож етап мусить бути закритий і тут.
    renderSourcing();

    expect(await screen.findByText('Product matching')).toBeInTheDocument();
    expect(screen.queryByText('Supplier sourcing · JIT products')).not.toBeInTheDocument();
  });

  it('lists the JIT lines with the supplier each was settled on', async () => {
    const user = await settleEverything();
    await user.click(within(screen.getAllByRole('listitem')[1]!).getByRole('link'));

    await screen.findByText('Supplier sourcing · JIT products');
    const body = screen.getByText('Internal item code').closest('table')!.querySelector('tbody')!;
    const rows = within(body).getAllByRole('row');

    // Позиція 1 складська — на цьому екрані її немає, і це не пропажа:
    // товар уже наш, питати про нього нема кого.
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('T69133100');
    expect(rows[0]).toHaveTextContent('Northgate Marine Fasteners Ltd.');
    expect(rows[1]).toHaveTextContent('T85116300');
    expect(rows[1]).toHaveTextContent('Harbour Safety Equipment Co.');
    expect(within(body).queryByText('T69128400')).not.toBeInTheDocument();
  });

  it('keeps the line numbers the customer RFQ gave them', async () => {
    const user = await settleEverything();
    await user.click(within(screen.getAllByRole('listitem')[1]!).getByRole('link'));

    await screen.findByText('Supplier sourcing · JIT products');
    const body = screen.getByText('Internal item code').closest('table')!.querySelector('tbody')!;
    const rows = within(body).getAllByRole('row');

    // 2 і 3, а не 1 і 2: позицію шукатимуть на першому етапі за її номером.
    expect(within(rows[0]!).getAllByRole('cell')[0]).toHaveTextContent('2');
    expect(within(rows[1]!).getAllByRole('cell')[0]).toHaveTextContent('3');
  });

  it('counts the JIT lines and says the stock ones skip this stage', async () => {
    const user = await settleEverything();
    await user.click(within(screen.getAllByRole('listitem')[1]!).getByRole('link'));

    expect(
      await screen.findByText(/2 JIT lines · 0 offer\(s\) selected · In-Stock lines skip sourcing/),
    ).toBeInTheDocument();
  });

  it('asks about the same lines the inquiry went out for', async () => {
    const user = await settleEverything();
    await user.click(within(screen.getAllByRole('listitem')[1]!).getByRole('link'));

    await screen.findByText('Supplier offers');
    expect(screen.getByText('2 JIT lines without a confirmed cost')).toBeInTheDocument();

    const rows = offerRows();
    expect(rows).toHaveLength(2);
    // Постачальник, товар, одиниця й кількість — те саме, про що питали вище.
    expect(cellsOf(rows[0]!)).toEqual([
      '2',
      'Northgate Marine Fasteners Ltd.',
      'HEX HEAD BOLT/NUT STEEL UNGALV, M20 X 80MM',
      'pcs',
      '12',
      '—',
      '',
      '',
    ]);
    expect(cellsOf(rows[1]!).slice(0, 5)).toEqual([
      '3',
      'Harbour Safety Equipment Co.',
      'WELDER GLOVES FIVE FINGERS',
      'pc',
      '1',
    ]);
  });

  it('quotes no price until a supplier has answered', async () => {
    const user = await settleEverything();
    await user.click(within(screen.getAllByRole('listitem')[1]!).getByRole('link'));
    await screen.findByText('Supplier offers');

    expect(offerRows().map((row) => cellsOf(row)[PRICE])).toEqual(['—', '—']);
  });

  it('puts a price on every line when the sample response is loaded', async () => {
    const user = await settleEverything();
    await user.click(within(screen.getAllByRole('listitem')[1]!).getByRole('link'));
    await screen.findByText('Supplier offers');

    await user.click(screen.getByRole('button', { name: SAMPLE }));

    // Вигадані числа, тож перевіряємо форму: долар і одна цифра після коми.
    // Чекаємо, бо ціна їде в запис і повертається звідти, а не з пам'яті.
    await waitFor(() => {
      for (const row of offerRows()) {
        expect(cellsOf(row)[PRICE]).toMatch(/^\$\d{1,3}\.\d$/);
      }
    });
  });

  it('keeps the prices after the page is opened again', async () => {
    // Відповідь постачальника — те, на що потім виставляють рахунок. Вона
    // живе в записі, а не у вкладці, яку хтось закрив.
    const user = await settleEverything();
    await user.click(within(screen.getAllByRole('listitem')[1]!).getByRole('link'));
    await screen.findByText('Supplier offers');
    await user.click(screen.getByRole('button', { name: SAMPLE }));
    await waitFor(() => expect(cellsOf(offerRows()[0]!)[PRICE]).not.toBe('—'));
    const quoted = offerRows().map((row) => cellsOf(row)[PRICE]);

    // Туди й назад: сторінка монтується заново і читає запис із нуля.
    await user.click(within(screen.getAllByRole('listitem')[0]!).getByRole('link'));
    await screen.findByText('Product matching');
    await user.click(within(screen.getAllByRole('listitem')[1]!).getByRole('link'));
    await screen.findByText('Supplier offers');

    expect(offerRows().map((row) => cellsOf(row)[PRICE])).toEqual(quoted);
  });

  it('keeps the loaded prices put when the button is pressed again', async () => {
    // Друге натискання перемішало б числа, які хтось уже прочитав.
    const user = await settleEverything();
    await user.click(within(screen.getAllByRole('listitem')[1]!).getByRole('link'));
    await screen.findByText('Supplier offers');

    const load = screen.getByRole('button', { name: SAMPLE });
    await user.click(load);
    await waitFor(() => expect(cellsOf(offerRows()[0]!)[PRICE]).not.toBe('—'));
    const quoted = offerRows().map((row) => cellsOf(row)[PRICE]);

    expect(load).toBeDisabled();
    await user.click(load);
    expect(offerRows().map((row) => cellsOf(row)[PRICE])).toEqual(quoted);
  });

  it('gets back to Product Matching from the stage above it', async () => {
    const user = await settleEverything();
    await user.click(within(screen.getAllByRole('listitem')[1]!).getByRole('link'));
    await screen.findByText('Supplier sourcing · JIT products');

    expect(within(screen.getAllByRole('listitem')[0]!).getByRole('link')).toHaveAttribute(
      'href',
      '/rfqs/sample',
    );
  });
});
