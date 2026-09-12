import { useSuspenseQuery } from '@tanstack/react-query';

import { useRepositories } from '@/app/providers/RepositoriesProvider';
import { quoteKeys } from '@/entities/quote/api/queryKeys';
import type { Quote, QuoteId } from '@/entities/quote/model/types';

export const useQuote = (id: QuoteId): Quote => {
  const { quotes } = useRepositories();
  const { data } = useSuspenseQuery({
    queryKey: quoteKeys.detail(id),
    queryFn: () => quotes.getById(id),
  });
  return data;
};
