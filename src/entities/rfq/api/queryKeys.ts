import type { RfqId } from '@/entities/rfq/model/types';

export const rfqKeys = {
  all: ['rfqs'] as const,
  detail: (id: RfqId) => [...rfqKeys.all, 'detail', id] as const,
  // Under the RFQ's own key, so anything that refetches the RFQ refetches
  // what its quotation would print too.
  quotation: (id: RfqId, format: string) => [...rfqKeys.detail(id), 'quotation', format] as const,
};
