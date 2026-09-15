import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useRepositories } from '@/app/providers/RepositoriesProvider';
import { rfqKeys } from '@/entities/rfq/api/queryKeys';
import type { RfqId } from '@/entities/rfq/model/types';

export interface Confirmation {
  /** Номер позиції в записі, не на сторінці. */
  index: number;
  /** `null` знімає підтвердження. */
  itemCode: string | null;
}

/**
 * Зупинити позицію на товарі, або зняти вибір.
 *
 * Після кожної зміни перечитуємо RFQ замість того, щоб правити кеш руками:
 * підтвердження — єдине, що на цьому екрані записується, воно рідкісне, і
 * відповідь сервера тут дешевша за окрему копію правди на клієнті.
 */
export const useConfirmMatch = (id: RfqId) => {
  const { rfqs } = useRepositories();
  const queryClient = useQueryClient();

  return useMutation({
    // Одна позиція або одразу кілька — одним і тим самим шляхом, бо різниця
    // між ними лише в тому, скільки разів натиснули. Послідовно, а не
    // паралельно: двадцять одночасних записів в один запис — це двадцять
    // шансів побачити середину чужої транзакції.
    mutationFn: async (settling: Confirmation | Confirmation[]) => {
      for (const { index, itemCode } of [settling].flat()) {
        await rfqs.confirm(id, index, itemCode);
      }
    },
    // Один раз у кінці, хай там скільки позицій підтвердили.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: rfqKeys.detail(id) }),
  });
};
