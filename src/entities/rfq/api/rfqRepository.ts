import type { RfqDetail, RfqId } from '@/entities/rfq/model/types';

/**
 * Доступ до одного RFQ з усіма його рядками.
 * UI бачить лише цей інтерфейс і не знає, звідки дані.
 */
export interface RfqRepository {
  getById(id: RfqId): Promise<RfqDetail>;
  /**
   * Зупинити позицію на товарі, або зняти вибір (`itemCode: null`).
   *
   * `index` — номер позиції в **записі**, не на сторінці: перенумерація на
   * екрані не має права переадресувати підтвердження.
   */
  confirm(id: RfqId, index: number, itemCode: string | null): Promise<void>;
}
