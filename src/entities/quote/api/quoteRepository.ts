import type { ItemCode, Unit } from '@/entities/catalog/model/types';
import type { SupplierId } from '@/entities/supplier/model/types';
import type {
  LineId,
  Quote,
  QuoteId,
  QuoteListItem,
  QuoteOutputType,
  QuotePricingSettings,
} from '@/entities/quote/model/types';

export interface QuoteListParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Часткове оновлення рядка — тільки поля, які редагує користувач. */
export interface QuoteLinePatch {
  matchedItemCode?: ItemCode | null;
  manualShipSupplyQuantity?: number | null;
  overriddenUnit?: Unit | null;
  internalComment?: string;
  customerRemark?: string | null;
  isExcluded?: boolean;
  isAsked?: boolean;
}

export interface WebInquiryPayload {
  /** Постачальник → рядки, які увійдуть у його лист. */
  groups: Array<{ supplierId: SupplierId; lineIds: LineId[]; attachments: string[] }>;
}

export interface MailDraftPayload {
  mailId?: string;
  lineIds: LineId[];
  body: string;
}

export interface SendQuotePayload {
  outputType: QuoteOutputType;
}

/**
 * Єдина точка доступу до котирувань.
 * UI працює тільки з цим інтерфейсом і не знає, mock це чи реальний бекенд.
 */
export interface QuoteRepository {
  list(params: QuoteListParams): Promise<Paginated<QuoteListItem>>;
  getById(id: QuoteId): Promise<Quote>;

  takeOwnership(id: QuoteId, accept: boolean): Promise<Quote>;

  updateLine(id: QuoteId, lineId: LineId, patch: QuoteLinePatch): Promise<Quote>;
  addLine(id: QuoteId, customerDescription: string): Promise<Quote>;
  clearLineItem(id: QuoteId, lineId: LineId): Promise<Quote>;
  rejectSuggestions(id: QuoteId, lineId: LineId): Promise<Quote>;

  setLineSuppliers(id: QuoteId, lineId: LineId, supplierIds: SupplierId[]): Promise<Quote>;
  removeLineSupplier(id: QuoteId, lineId: LineId, supplierId: SupplierId): Promise<Quote>;
  selectOffer(id: QuoteId, lineId: LineId, supplierId: SupplierId | null): Promise<Quote>;
  setFollowUpNote(id: QuoteId, lineId: LineId, supplierId: SupplierId, note: string): Promise<Quote>;
  resolveInfoRequest(
    id: QuoteId,
    lineId: LineId,
    supplierId: SupplierId,
    mode: 'forward' | 'ignore',
  ): Promise<Quote>;

  sendWebInquiry(id: QuoteId, payload: WebInquiryPayload): Promise<Quote>;

  saveClarificationDraft(id: QuoteId, payload: MailDraftPayload): Promise<Quote>;
  sendMail(id: QuoteId, mailId: string): Promise<Quote>;
  discardMail(id: QuoteId, mailId: string): Promise<Quote>;
  applyProposedUpdate(id: QuoteId, mailId: string, lineId: LineId, apply: boolean): Promise<Quote>;

  updatePricing(id: QuoteId, patch: Partial<QuotePricingSettings>): Promise<Quote>;
  setOutputType(id: QuoteId, outputType: QuoteOutputType): Promise<Quote>;
  sendQuote(id: QuoteId, payload: SendQuotePayload): Promise<Quote>;

  reviseQuote(id: QuoteId, applyLowerMargin: boolean): Promise<Quote>;
  convertToOrder(id: QuoteId): Promise<Quote>;
  markReadyForProcurement(id: QuoteId): Promise<Quote>;

  /** Демонстраційні симуляції — існують тільки в mock-реалізації. */
  simulateSupplierReplies(id: QuoteId): Promise<{ quote: Quote; count: number }>;
  simulateCustomerClarificationAnswer(id: QuoteId): Promise<Quote>;
  simulateCustomerQuoteReply(id: QuoteId): Promise<Quote>;

  reset(): Promise<void>;
}
