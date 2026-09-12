import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useRepositories } from '@/app/providers/RepositoriesProvider';
import type { QuoteListParams } from '@/entities/quote/api/quoteRepository';
import { quoteKeys } from '@/entities/quote/api/queryKeys';

export const useQuotes = (params: QuoteListParams) => {
  const { quotes } = useRepositories();
  return useQuery({
    queryKey: quoteKeys.list(params),
    queryFn: () => quotes.list(params),
    // Під час пошуку показуємо попередній результат, а не порожню таблицю.
    placeholderData: keepPreviousData,
    // Про нові листи повідомляє useQuoteStream. Тут лишається тільки страховка
    // на випадок, коли вкладка була у фоні й браузер приглушив з'єднання.
    refetchOnWindowFocus: true,
  });
};
