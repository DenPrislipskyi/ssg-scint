import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { RfqDetailPage } from '@/pages/rfq-detail/RfqDetailPage';
import { renderWithProviders } from '@/test/renderWithProviders';

const render = () =>
  renderWithProviders(<RfqDetailPage />, {
    path: '/rfqs/:rfqId',
    initialEntries: ['/rfqs/sample'],
  });

describe('RfqDetailPage', () => {
  beforeEach(() => localStorage.clear());

  it('titles the page with the RFQ reference, not the vessel', async () => {
    render();

    // Референсу в даних ще немає — показуємо прочерк, а не підставляємо судно.
    const heading = await screen.findByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('—');
    expect(heading).not.toHaveTextContent('ALMI');
  });

  it('puts the RFQ into the header breadcrumb', async () => {
    render();

    // Крихту виставляє ефект сторінки, тож чекаємо на неї, а не читаємо одразу.
    const crumb = await screen.findByText(/^›/);
    expect(screen.getByRole('banner')).toContainElement(crumb);
  });

  it('goes back to the list from the header button', async () => {
    const user = userEvent.setup();
    render();

    const back = await screen.findByRole('button', { name: '← RFQ list' });
    await user.click(back);

    expect(window.location.pathname).not.toBe('/rfqs/sample');
  });

  it('shows the five RFQ header fields', async () => {
    render();
    await screen.findByRole('heading', { level: 1 });

    for (const label of [
      'RFQ reference',
      'Customer',
      'Vessel',
      'Customer RFQ reference',
      'RFQ lines',
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByText('purchasing@almi.example.com')).toBeInTheDocument();
    expect(screen.getByText('MV ALMI GLOBE · IMO 9417751')).toBeInTheDocument();
  });

  it('marks only the first POC stage as current', async () => {
    render();
    await screen.findByRole('heading', { level: 1 });

    const stages = screen.getAllByRole('listitem');
    expect(stages).toHaveLength(4);
    expect(stages[0]).toHaveAttribute('aria-current', 'step');
    expect(stages[1]).not.toHaveAttribute('aria-current');
    expect(stages[1]).toHaveTextContent('Not in this POC');
  });

  it('splits the matching table into customer and internal column groups', async () => {
    render();
    await screen.findByRole('heading', { level: 1 });

    const customerGroup = screen.getByRole('columnheader', { name: 'CUSTOMER RFQ DATA' });
    expect(customerGroup).toHaveAttribute('colspan', '5');
    expect(screen.getByRole('columnheader', { name: 'MATCHED INTERNAL PRODUCT' })).toHaveAttribute(
      'colspan',
      '8',
    );
  });

  it('renders the confidence as a percentage with a bar', async () => {
    render();
    await screen.findByRole('heading', { level: 1 });

    const row = (await screen.findByText('T69128400')).closest('tr')!;
    expect(within(row).getByText('100 %')).toBeInTheDocument();
  });
});
