import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { quoteKeys } from '@/entities/quote/api/queryKeys';
import { env } from '@/shared/config/env';

/**
 * Тримає реєстр свіжим: бекенд сам каже, коли з'явився новий лист.
 *
 * Агент наповнює реєстр без участі користувача, а нікому не спадає на думку
 * перезавантажувати сторінку заради листа, про який він не знає. Опитування
 * за таймером робило б те саме, але слало б запит щодесять секунд назавжди —
 * тут запит іде лише тоді, коли справді щось змінилося.
 *
 * Перепідключення робить сам EventSource, тож ретраїв тут немає навмисно.
 */
export const useQuoteStream = (): void => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // На фікстурах стрімити нікому, а в jsdom EventSource і не існує.
    if (env.apiMode === 'mock' || typeof EventSource === 'undefined') return;

    const source = new EventSource(`${env.apiBaseUrl}/quotes/stream`);
    source.addEventListener('quotes', () => {
      void queryClient.invalidateQueries({ queryKey: quoteKeys.lists() });
    });

    return () => source.close();
  }, [queryClient]);
};
