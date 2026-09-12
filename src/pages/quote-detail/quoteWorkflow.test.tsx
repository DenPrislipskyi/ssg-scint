import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { QuoteDetailPage } from '@/pages/quote-detail/QuoteDetailPage';
import { LineItemsTab } from '@/pages/quote-detail/tabs/LineItemsTab';
import { OrderTab } from '@/pages/quote-detail/tabs/OrderTab';
import { PricingTab } from '@/pages/quote-detail/tabs/PricingTab';
import { SendQuoteTab } from '@/pages/quote-detail/tabs/SendQuoteTab';
import { SourcingTab } from '@/pages/quote-detail/tabs/SourcingTab';
import { renderWithProviders } from '@/test/renderWithProviders';

const TABS = [
  { path: 'lines', element: <LineItemsTab /> },
  { path: 'sourcing', element: <SourcingTab /> },
  { path: 'pricing', element: <PricingTab /> },
  { path: 'send', element: <SendQuoteTab /> },
  { path: 'order', element: <OrderTab /> },
];

const renderQuote = (quoteId: string, tab = 'lines') =>
  renderWithProviders(<QuoteDetailPage />, {
    path: '/rfqs/:quoteId',
    initialEntries: [`/rfqs/${quoteId}`],
    children: TABS,
    initialTab: tab,
  });

describe('quote workflow', () => {
  beforeEach(() => localStorage.clear());

  it('assigns a supplier and sends a Web Inquiry', async () => {
    const user = userEvent.setup();
    renderQuote('nordic');

    const row = (await screen.findByText('Convex rulers')).closest('tr')!;
    await user.click(within(row).getByRole('button', { name: '+ supplier' }));

    // Дропдаун ранжує постачальників за історією в родині товару.
    await user.click(await screen.findByText('Lian Seng Hardware'));
    await user.click(screen.getByRole('button', { name: /Done/ }));

    await waitFor(() =>
      expect(
        within(screen.getByText('Convex rulers').closest('tr')!).getByText(/Lian Seng Hardware/),
      ).toBeInTheDocument(),
    );

    const sendButton = screen.getByRole('button', { name: /Send Web Inquiry/ });
    expect(sendButton).toBeEnabled();
    await user.click(sendButton);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/one email per supplier via Outlook/)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Send via Outlook' }));

    // Рядок переходить у стан очікування відповіді постачальника.
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(
      within(screen.getByText('Convex rulers').closest('tr')!).getByText(/waiting/),
    ).toBeInTheDocument();
  });

  it('recalculates client pricing when the margin changes', async () => {
    const user = userEvent.setup();
    renderQuote('hellenic', 'pricing');

    // 22.00 собівартість рису × 1.14 → 25.00 (округлення до 0.5)
    await screen.findByLabelText('Margin for stock items');
    expect(screen.getAllByText('$25.00').length).toBeGreaterThan(0);

    await user.selectOptions(screen.getByLabelText('Margin for stock items'), '0.12');

    // × 1.12 = 24.64 → 24.50
    await waitFor(() => expect(screen.getAllByText('$24.50').length).toBeGreaterThan(0));
  });

  it('blocks sending when the margin falls below the floor', async () => {
    const user = userEvent.setup();
    renderQuote('nordic', 'pricing');

    await user.selectOptions(await screen.findByLabelText('Margin for stock items'), '0.09');

    expect(await screen.findByText('Below 10 % floor · manager approval')).toBeInTheDocument();
  });

  it('keeps a sent quote read-only and drives the order lifecycle', async () => {
    renderQuote('hellenic', 'order');

    expect(await screen.findByRole('button', { name: 'Convert to Order' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Ready for Procurement' })).toBeDisabled();
    expect(screen.getByText(/Waiting for the customer/)).toBeInTheDocument();
  });

  it('auto-fills the clarification draft from unmatched lines', async () => {
    const user = userEvent.setup();
    renderQuote('nordic');

    const draftButton = await screen.findByRole('button', { name: /Clarification draft/ });
    await user.click(draftButton);

    const draft = (await screen.findByLabelText('Clarification draft')) as HTMLTextAreaElement;

    // Обидва блоки листа: неідентифіковані позиції і позиції з варіантами.
    expect(draft.value).toContain('Dear Lars');
    expect(draft.value).toContain('We could not identify the following item');
    expect(draft.value).toContain('we have several options and need your confirmation');
    expect(draft.value).toContain('Welder gloves five fingers / Welder gloves gauntlet 35 cm');
  });

  it('sends the clarification and marks the lines as asked', async () => {
    const user = userEvent.setup();
    renderQuote('nordic');

    await user.click(await screen.findByRole('button', { name: /Clarification draft/ }));
    await screen.findByLabelText('Clarification draft');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(screen.getAllByText('Asked customer').length).toBeGreaterThan(0));
  });
});
