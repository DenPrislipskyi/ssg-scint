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

  it('leaves the columns nothing answers empty rather than invented', async () => {
    renderWithProviders(<RfqListPage />, { path: '/rfqs', initialEntries: ['/rfqs'] });

    const row = (await screen.findByText('Nordic Aurora Shipping')).closest('tr')!;
    const cells = within(row)
      .getAllByRole('cell')
      .map((cell) => cell.textContent);

    // RFQ reference, Customer RFQ ref and Lines have no source yet.
    expect([cells[0], cells[3], cells[4]]).toEqual(['—', '—', '—']);
  });

  it('renders the six columns of the RFQ list', async () => {
    renderWithProviders(<RfqListPage />, { path: '/rfqs', initialEntries: ['/rfqs'] });
    await screen.findByText('Nordic Aurora Shipping');

    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'RFQ reference',
      'Customer',
      'Vessel',
      'Customer RFQ ref',
      'Lines',
      '',
    ]);
  });
});
