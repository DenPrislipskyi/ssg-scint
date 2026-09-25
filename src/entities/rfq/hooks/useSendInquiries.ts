import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useRepositories } from '@/app/providers/RepositoriesProvider';
import { rfqKeys } from '@/entities/rfq/api/queryKeys';
import type { DraftInquiry } from '@/entities/rfq/api/rfqRepository';
import type { RfqId } from '@/entities/rfq/model/types';

/**
 * Надіслати запити постачальникам — усі одним викликом.
 *
 * На відміну від підтверджень і цін, тут **не** цикл: одне натискання
 * надсилає всю розсилку, і половина листів у записі описувала б те, чого не
 * було. Обрив посеред такого циклу лишив би саме це.
 *
 * Листи йдуть один раз, і бекенд відмовляє другому разу сам. Тому після
 * успіху перечитуємо RFQ: у записі з'являються надіслані листи, і саме вони
 * гасять кнопку — а не прапорець на клієнті, який не переживе перезавантаження.
 */
export const useSendInquiries = (id: RfqId) => {
  const { rfqs } = useRepositories();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inquiries: DraftInquiry[]) => rfqs.sendInquiries(id, inquiries),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: rfqKeys.detail(id) }),
  });
};
