import type { RfqDetail, RfqId } from '@/entities/rfq/model/types';

/** Лист одному постачальнику — так, як його складає екран, ще без часу. */
export interface DraftInquiry {
  supplier: string;
  body: string;
  /** Номери позицій у **записі**, не на сторінці. */
  lines: number[];
}

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
  /**
   * Записати, скільки постачальник просить за одиницю цієї позиції, або
   * забути його ціну (`unitPrice: null`).
   */
  price(id: RfqId, index: number, unitPrice: number | null): Promise<void>;
  /**
   * Записати листи, що пішли постачальникам — **усі одним викликом**.
   *
   * Одне натискання надсилає їх усі, і половина з них у записі описувала б
   * розсилку, якої не було. Час ставить сервер, а не браузер.
   *
   * Кидає, якщо запити з цього RFQ вже пішли: листи йдуть один раз.
   */
  sendInquiries(id: RfqId, inquiries: DraftInquiry[]): Promise<void>;
}
