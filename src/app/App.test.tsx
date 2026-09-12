import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { App } from '@/app/App';

/**
 * Димовий тест усього дерева: провайдери, роутер і завантаження даних
 * перевіряються разом, бо саме на їх стику ламаються збірки.
 */
describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/rfqs');
  });

  it('boots into the RFQ list with data loaded', async () => {
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'RFQ list' })).toBeInTheDocument();
    expect(screen.getByText('POC')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset demo' })).toBeInTheDocument();
    expect(screen.getByText('Supply Singapore')).toBeInTheDocument();

    // Дані доїхали з репозиторію в таблицю.
    expect(await screen.findByText('Nordic Aurora Shipping')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Open RFQ' })[0]).toBeInTheDocument();
  });

  it('redirects the root path to the RFQ list', async () => {
    window.history.pushState({}, '', '/');
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'RFQ list' })).toBeInTheDocument();
  });
});
