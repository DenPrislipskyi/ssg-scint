import { httpBlob, httpClient } from '@/shared/api/httpClient';
import type { DraftApproval, DraftInquiry, RfqRepository } from '@/entities/rfq/api/rfqRepository';
import type { QuotationFormat } from '@/entities/rfq/lib/quotation';
import type { QuotationPreview, RfqDetail, RfqId } from '@/entities/rfq/model/types';

/** What the backend calls each office's letterhead, for the PDF and the workbook. */
const LETTERHEAD: Partial<Record<QuotationFormat, string>> = {
  'SG standard': 'sg',
  'UAE standard': 'uae',
};

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

  sendInquiries(id: RfqId, inquiries: DraftInquiry[]): Promise<void> {
    // Один PUT на всю розсилку, а не по одному на постачальника: обрив
    // посеред циклу лишив би в записі половину листів — опис розсилки, якої
    // не було.
    return httpClient<void>(`/quotes/${encodeURIComponent(id)}/rfq/inquiries`, {
      method: 'PUT',
      body: { inquiries },
    });
  }

  approve(id: RfqId, approval: DraftApproval): Promise<void> {
    return httpClient<void>(`/quotes/${encodeURIComponent(id)}/rfq/approval`, {
      method: 'PUT',
      body: approval,
    });
  }

  quotationPdf(id: RfqId, format: QuotationFormat): Promise<Blob> {
    const letterhead = LETTERHEAD[format];
    if (letterhead === undefined) return Promise.reject(new Error(`${format} has no PDF`));
    const query = new URLSearchParams({ format: letterhead });
    return httpBlob(`/quotes/${encodeURIComponent(id)}/rfq/quotation.pdf?${query.toString()}`, {
      // Rendering a long RFQ takes the server longer than reading one.
      timeoutMs: 60_000,
    });
  }

  quotationPreview(id: RfqId, format: QuotationFormat): Promise<QuotationPreview> {
    const letterhead = LETTERHEAD[format];
    if (letterhead === undefined) return Promise.reject(new Error(`${format} has no letterhead`));
    const query = new URLSearchParams({ format: letterhead });
    return httpClient<QuotationPreview>(
      `/quotes/${encodeURIComponent(id)}/rfq/quotation?${query.toString()}`,
    );
  }

  quoteWorkbook(id: RfqId, format: QuotationFormat): Promise<Blob> {
    const letterhead = LETTERHEAD[format];
    if (letterhead === undefined) return Promise.reject(new Error(`${format} has no workbook`));
    const query = new URLSearchParams({ format: letterhead });
    return httpBlob(`/quotes/${encodeURIComponent(id)}/rfq/quotation.xlsm?${query.toString()}`, {
      timeoutMs: 60_000,
    });
  }

  customerFile(id: RfqId): Promise<Blob> {
    return httpBlob(`/quotes/${encodeURIComponent(id)}/rfq/customer-file.xlsx`, {
      timeoutMs: 60_000,
    });
  }
}
