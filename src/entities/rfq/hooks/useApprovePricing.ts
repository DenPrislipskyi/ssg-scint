import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useRepositories } from '@/app/providers/RepositoriesProvider';
import { rfqKeys } from '@/entities/rfq/api/queryKeys';
import type { DraftApproval } from '@/entities/rfq/api/rfqRepository';
import type { RfqId } from '@/entities/rfq/model/types';

/**
 * Затвердити ціни цього RFQ — раз і назавжди.
 *
 * Після успіху перечитуємо запис: у ньому з'являються заморожені ціни й
 * підпис, і саме вони замикають поля націнки й відмикають четвертий етап — а
 * не прапорець на клієнті, який не переживе перезавантаження.
 */
export const useApprovePricing = (id: RfqId) => {
  const { rfqs } = useRepositories();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (approval: DraftApproval) => rfqs.approve(id, approval),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: rfqKeys.detail(id) }),
  });
};
