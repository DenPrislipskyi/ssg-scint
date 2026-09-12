import { createContext, use, type ReactNode } from 'react';

import type { CatalogData } from '@/entities/catalog/model/types';
import type { QuoteActions } from '@/entities/quote/hooks/useQuoteActions';
import type { Quote } from '@/entities/quote/model/types';
import type { SupplierDirectory } from '@/entities/supplier/hooks/useSuppliers';

export interface QuoteDetailValue {
  quote: Quote;
  catalog: CatalogData;
  suppliers: SupplierDirectory;
  actions: QuoteActions;
}

const QuoteDetailContext = createContext<QuoteDetailValue | null>(null);

/**
 * Спільний контекст усіх вкладок котирування.
 * Дає одне джерело правди — кеш деталки — і прибирає prop drilling через 5 вкладок.
 */
export const QuoteDetailProvider = ({
  value,
  children,
}: {
  value: QuoteDetailValue;
  children: ReactNode;
}) => <QuoteDetailContext value={value}>{children}</QuoteDetailContext>;

export const useQuoteDetail = (): QuoteDetailValue => {
  const context = use(QuoteDetailContext);
  if (!context) throw new Error('useQuoteDetail must be used within QuoteDetailProvider');
  return context;
};
