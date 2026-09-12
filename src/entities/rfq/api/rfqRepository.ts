import type { RfqDetail, RfqId } from '@/entities/rfq/model/types';

/**
 * Доступ до одного RFQ з усіма його рядками.
 * UI бачить лише цей інтерфейс і не знає, звідки дані.
 */
export interface RfqRepository {
  getById(id: RfqId): Promise<RfqDetail>;
}
