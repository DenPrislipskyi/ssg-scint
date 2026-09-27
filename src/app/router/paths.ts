import type { RfqId } from '@/entities/rfq/model/types';

/** Єдине джерело правди для URL застосунку. */
export const paths = {
  rfqList: '/rfqs',
  rfq: (id: RfqId) => `/rfqs/${encodeURIComponent(id)}`,
  rfqSourcing: (id: RfqId) => `/rfqs/${encodeURIComponent(id)}/sourcing`,
  rfqPricing: (id: RfqId) => `/rfqs/${encodeURIComponent(id)}/pricing`,
  rfqFinalisation: (id: RfqId) => `/rfqs/${encodeURIComponent(id)}/finalisation`,
  /**
   * Вкладки старого екрана котирування. Жоден маршрут туди більше не веде —
   * лишилося, поки `src/pages/quote-detail/` не видалено остаточно.
   */
  rfqTab: (id: RfqId, tab: QuoteTab) => `/rfqs/${encodeURIComponent(id)}/${tab}`,
} as const;

/** Етапи POC за номером. Усі чотири — справжні екрани. */
export const RFQ_STAGE = { matching: 1, sourcing: 2, pricing: 3, finalisation: 4 } as const;

export const QUOTE_TABS = ['lines', 'sourcing', 'pricing', 'send', 'order'] as const;
export type QuoteTab = (typeof QUOTE_TABS)[number];

export const QUOTE_TAB_LABELS: Record<QuoteTab, string> = {
  lines: 'Line Items',
  sourcing: 'Sourcing',
  pricing: 'Client Pricing',
  send: 'Send Quote',
  order: 'Order',
};
