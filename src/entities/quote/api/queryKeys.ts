import type { QuoteListParams } from '@/entities/quote/api/quoteRepository';
import type { QuoteId } from '@/entities/quote/model/types';

/** Ієрархічні ключі: інвалідація верхнього рівня скидає все нижче. */
export const quoteKeys = {
  all: ['quotes'] as const,
  lists: () => [...quoteKeys.all, 'list'] as const,
  list: (params: QuoteListParams) => [...quoteKeys.lists(), params] as const,
  details: () => [...quoteKeys.all, 'detail'] as const,
  detail: (id: QuoteId) => [...quoteKeys.details(), id] as const,
};
