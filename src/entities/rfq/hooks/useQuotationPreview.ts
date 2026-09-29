import { useQuery } from '@tanstack/react-query';

import { useRepositories } from '@/app/providers/RepositoriesProvider';
import { rfqKeys } from '@/entities/rfq/api/queryKeys';
import { isCustomerLayout, type QuotationFormat } from '@/entities/rfq/lib/quotation';
import type { RfqId } from '@/entities/rfq/model/types';

/**
 * What the quotation PDF on this letterhead would print, for the preview.
 *
 * Nothing is asked for until a letterhead is picked, and never for the
 * customer's own file - that preview is drawn from the table on the page.
 */
export const useQuotationPreview = (id: RfqId, format: QuotationFormat | null) => {
  const { rfqs } = useRepositories();
  const letterhead = format !== null && !isCustomerLayout(format) ? format : null;

  return useQuery({
    queryKey: rfqKeys.quotation(id, letterhead ?? ''),
    queryFn: () =>
      letterhead === null
        ? Promise.reject(new Error('No letterhead picked'))
        : rfqs.quotationPreview(id, letterhead),
    enabled: letterhead !== null,
  });
};
