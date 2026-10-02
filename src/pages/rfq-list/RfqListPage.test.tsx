import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { RfqListPage } from '@/pages/rfq-list/RfqListPage';
import { renderWithProviders } from '@/test/renderWithProviders';

describe('RfqListPage', () => {
  beforeEach(() => localStorage.clear());

  it('lists every RFQ by its customer and vessel', async () => {
    renderWithProviders(<RfqListPage />, { path: '/rfqs', initialEntries: ['/rfqs'] });

    expect(await screen.findByRole('heading', { name: 'RFQ list' })).toBeInTheDocument();
    expect(
      screen.getByText(/Structured RFQ data has already been extracted upstream/),
    ).toBeInTheDocument();

    const row = (await screen.findByText('Nordic Aurora Shipping')).closest('tr')!;
    expect(within(row).getByText('MV LIA · IMO 9417751')).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Open RFQ' })).toBeInTheDocument();
  });

  it('shows the RFQ reference first', async () => {
    renderWithProviders(<RfqListPage />, { path: '/rfqs', initialEntries: ['/rfqs'] });

    const row = (await screen.findByText('Nordic Aurora Shipping')).closest('tr')!;
    const cells = within(row)
      .getAllByRole('cell')
      .map((cell) => cell.textContent);

    expect(cells[0]).toBe('E114_26');
  });

  it('counts the lines its matching screen will show', async () => {
    renderWithProviders(<RfqListPage />, { path: '/rfqs', initialEntries: ['/rfqs'] });

    const row = (await screen.findByText('Nordic Aurora Shipping')).closest('tr')!;
    const cells = within(row)
      .getAllByRole('cell')
      .map((cell) => cell.textContent);

    // A number, and not a dash: this RFQ was read, and its lines were counted.
    expect(cells[3]).toMatch(/^\d+$/);
    expect(cells[3]).not.toBe('0');
  });

  it('renders the five columns of the RFQ list', async () => {
    renderWithProviders(<RfqListPage />, { path: '/rfqs', initialEntries: ['/rfqs'] });
    await screen.findByText('Nordic Aurora Shipping');

    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'RFQ reference',
      'Customer',
      'Vessel',
      'Lines',
      '',
    ]);
  });
});
