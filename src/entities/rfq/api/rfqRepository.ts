import type { QuotationFormat } from '@/entities/rfq/lib/quotation';
import type { QuotationPreview, RfqDetail, RfqId } from '@/entities/rfq/model/types';

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
  /**
   * Затвердити ціни — раз і назавжди.
   *
   * Ціни йдуть уже порахованими: екран показав їх людині, і перерахунок на
   * сервері затвердив би число, якого ніхто не бачив.
   *
   * Кидає, якщо цей RFQ уже затверджений, або якщо ціна є не на кожній
   * позиції: котирування з діркою — це не менше котирування, а хибне, і
   * дірки в підсумку не видно.
   */
  approve(id: RfqId, approval: DraftApproval): Promise<void>;
  /**
   * The quotation as the customer receives it: a PDF on the chosen letterhead.
   *
   * Throws until the pricing is approved - the document is the number named to
   * the customer, and before approval there is no such number yet.
   */
  quotationPdf(id: RfqId, format: QuotationFormat): Promise<Blob>;
  /**
   * What that PDF prints, as data for the screen to draw - the same layout
   * the PDF is drawn from, so the preview cannot disagree with the download.
   */
  quotationPreview(id: RfqId, format: QuotationFormat): Promise<QuotationPreview>;
  /**
   * The quotation in the customer's own spreadsheet layout. The same rule as
   * the PDF: nothing to download before approval.
   */
  customerFile(id: RfqId): Promise<Blob>;
  /**
   * The quotation as the desk's own macro workbook (`Quote.xlsm`), on the
   * chosen office's details. The same rule: nothing before approval.
   */
  quoteWorkbook(id: RfqId, format: QuotationFormat): Promise<Blob>;
}

/** Що саме затверджують: дві націнки й ціна на кожну позицію. */
export interface DraftApproval {
  marginStock: number;
  marginJit: number;
  lines: { index: number; unitPrice: number }[];
}
