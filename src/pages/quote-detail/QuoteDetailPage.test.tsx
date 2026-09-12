import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { QuoteDetailPage } from '@/pages/quote-detail/QuoteDetailPage';
import { LineItemsTab } from '@/pages/quote-detail/tabs/LineItemsTab';
import { SourcingTab } from '@/pages/quote-detail/tabs/SourcingTab';
import { renderWithProviders } from '@/test/renderWithProviders';

const renderQuote = (quoteId: string, tab: 'lines' | 'sourcing' = 'lines') =>
  renderWithProviders(<QuoteDetailPage />, {
    path: '/rfqs/:quoteId',
    initialEntries: [`/rfqs/${quoteId}`],
    children: [
      { path: 'lines', element: <LineItemsTab /> },
      { path: 'sourcing', element: <SourcingTab /> },
    ],
    initialTab: tab,
  });

describe('QuoteDetailPage', () => {
  beforeEach(() => localStorage.clear());

  it('shows the quote header and every derived line status', async () => {
    renderQuote('nordic');

    expect(await screen.findByText('RFQ-E114_26')).toBeInTheDocument();
    expect(screen.getByText('Nordic Aurora Shipping')).toBeInTheDocument();
    expect(screen.getByText('MV LIA · IMO 9417751')).toBeInTheDocument();

    // nordic містить одразу кілька різних станів рядків
    expect(await screen.findAllByText('Ready')).not.toHaveLength(0);
    expect(screen.getAllByText('Choose variant').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Needs supplier').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Select supplier').length).toBe(2);

    // Пропозиція з ціною має пріоритет над запитом інформації, але ремарка лишається видимою.
    expect(
      screen.getByText(/E W Liner Charts & Publications: please provide sample image/),
    ).toBeInTheDocument();
  });

  it('asks to take ownership only for untouched quotes', async () => {
    const user = userEvent.setup();
    renderQuote('meridian');

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Meridian Tankers · E116_26/)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Yes' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('matches a line to the catalogue through the combobox', async () => {
    const user = userEvent.setup();
    renderQuote('nordic');

    // Рядок 7 «Weldings gloves(five fingers)» має два варіанти й не зіставлений.
    const row = (await screen.findByText('Weldings gloves(five fingers)')).closest('tr')!;
    await user.click(within(row).getByText('Welder gloves five fingers'));

    await waitFor(() =>
      expect(
        within(screen.getByText('Weldings gloves(five fingers)').closest('tr')!).getByText(
          'T85116300',
        ),
      ).toBeInTheDocument(),
    );
  });

  it('converts the customer unit into our ship-supply unit', async () => {
    renderQuote('nordic');

    // 250 cm гідравлічного шланга → 2.5 m у наших одиницях
    const row = (await screen.findByText(/Hydraulic hose 2SN/)).closest('tr')!;
    expect(within(row).getByLabelText('Ship supply quantity')).toHaveValue('2.5');
    expect(within(row).getByText('cm → m ×0.01')).toBeInTheDocument();
  });

  it('lists supplier offers on the Sourcing tab and lets the user select one', async () => {
    const user = userEvent.setup();
    renderQuote('nordic', 'sourcing');

    // Рядок 12 має дві пропозиції з ціною — на ньому видно і вибір, і «утримання».
    const hansaRow = (await screen.findByText('Hansa Technik')).closest('tr')!;
    await user.click(within(hansaRow).getByRole('button', { name: 'Select' }));

    expect(await screen.findByText('Selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unselect' })).toBeInTheDocument();
    // Решта пропозицій того ж рядка переходять у стан «на утриманні».
    expect(screen.getAllByText('On hold').length).toBeGreaterThan(0);
  });
});
