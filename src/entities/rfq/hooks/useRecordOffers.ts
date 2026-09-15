import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useRepositories } from '@/app/providers/RepositoriesProvider';
import { rfqKeys } from '@/entities/rfq/api/queryKeys';
import type { RfqId } from '@/entities/rfq/model/types';

export interface Offer {
  /** Номер позиції в записі, не на сторінці. */
  index: number;
  /** Скільки постачальник просить за одиницю. `null` забуває його ціну. */
  unitPrice: number | null;
}

/**
 * Записати ціни постачальників — одну або одразу всі.
 *
 * Той самий шлях, що й у підтвердження, і з тих самих причин: послідовно, бо
 * кілька одночасних записів в один запис — це кілька шансів побачити середину
 * чужої транзакції, і одне перечитування в кінці замість власної копії правди
 * на клієнті.
 */
export const useRecordOffers = (id: RfqId) => {
  const { rfqs } = useRepositories();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (offers: Offer | Offer[]) => {
      for (const { index, unitPrice } of [offers].flat()) {
        await rfqs.price(id, index, unitPrice);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: rfqKeys.detail(id) }),
  });
};
