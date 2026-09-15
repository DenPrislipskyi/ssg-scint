import { httpClient } from '@/shared/api/httpClient';
import type { RfqRepository } from '@/entities/rfq/api/rfqRepository';
import type { RfqDetail, RfqId } from '@/entities/rfq/model/types';

/** Один RFQ з бекенда агента. */
export class HttpRfqRepository implements RfqRepository {
  getById(id: RfqId): Promise<RfqDetail> {
    return httpClient<RfqDetail>(`/quotes/${encodeURIComponent(id)}/rfq`);
  }

  confirm(id: RfqId, index: number, itemCode: string | null): Promise<void> {
    const path = `/quotes/${encodeURIComponent(id)}/rfq/lines/${index}/confirmation`;
    // Зняти вибір — це DELETE, а не PUT з порожнім значенням: «ніхто не
    // зупинився» і «зупинилися ні на чому» читалися б однаково, а перше з них
    // не має бути записом, який хтось зробив.
    return itemCode === null
      ? httpClient<void>(path, { method: 'DELETE' })
      : httpClient<void>(path, { method: 'PUT', body: { itemCode } });
  }

  price(id: RfqId, index: number, unitPrice: number | null): Promise<void> {
    const path = `/quotes/${encodeURIComponent(id)}/rfq/lines/${index}/offer`;
    // Та сама пара, що й у підтвердженні, і з тієї ж причини: «ніхто не
    // називав ціни» — це не ціна, яку хтось назвав порожньою.
    return unitPrice === null
      ? httpClient<void>(path, { method: 'DELETE' })
      : httpClient<void>(path, { method: 'PUT', body: { unitPrice } });
  }
}
