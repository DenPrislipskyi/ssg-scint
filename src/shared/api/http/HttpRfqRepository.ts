import { httpClient } from '@/shared/api/httpClient';
import type { RfqRepository } from '@/entities/rfq/api/rfqRepository';
import type { RfqDetail, RfqId } from '@/entities/rfq/model/types';

/** Один RFQ з бекенда агента. */
export class HttpRfqRepository implements RfqRepository {
  getById(id: RfqId): Promise<RfqDetail> {
    return httpClient<RfqDetail>(`/quotes/${encodeURIComponent(id)}/rfq`);
  }
}
