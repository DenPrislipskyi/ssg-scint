import type { RfqId } from '@/entities/rfq/model/types';

export const rfqKeys = {
  all: ['rfqs'] as const,
  detail: (id: RfqId) => [...rfqKeys.all, 'detail', id] as const,
};
