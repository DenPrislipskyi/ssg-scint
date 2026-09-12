import { NotImplementedError } from '@/shared/api/ApiError';
import { httpClient } from '@/shared/api/httpClient';
import type {
  MailDraftPayload,
  Paginated,
  QuoteLinePatch,
  QuoteListParams,
  QuoteRepository,
  SendQuotePayload,
  WebInquiryPayload,
} from '@/entities/quote/api/quoteRepository';
import type {
  LineId,
  Quote,
  QuoteId,
  QuoteListItem,
  QuoteOutputType,
  QuotePricingSettings,
} from '@/entities/quote/model/types';
import type { SupplierId } from '@/entities/supplier/model/types';

/**
 * Реалізація поверх реального API.
 *
 * Читання вже підключені до очікуваних ендпоїнтів; операції запису навмисно
 * кидають NotImplementedError, поки бекенд їх не надасть, — так розбіжність
 * контракту виявляється одразу, а не тихою поламаною поведінкою.
 *
 * Коли ендпоїнти з'являться, тіла методів замінюються на httpClient-виклики,
 * а решта застосунку не змінюється взагалі.
 */
export class HttpQuoteRepository implements QuoteRepository {
  list(params: QuoteListParams): Promise<Paginated<QuoteListItem>> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.pageSize) query.set('pageSize', String(params.pageSize));
    if (params.search) query.set('search', params.search);
    return httpClient<Paginated<QuoteListItem>>(`/quotes?${query.toString()}`);
  }

  getById(id: QuoteId): Promise<Quote> {
    return httpClient<Quote>(`/quotes/${id}`);
  }

  // TODO(api): POST /quotes/:id/ownership { accept }
  takeOwnership(_id: QuoteId, _accept: boolean): Promise<Quote> {
    throw new NotImplementedError('takeOwnership');
  }

  // TODO(api): PATCH /quotes/:id/lines/:lineId
  updateLine(_id: QuoteId, _lineId: LineId, _patch: QuoteLinePatch): Promise<Quote> {
    throw new NotImplementedError('updateLine');
  }

  // TODO(api): POST /quotes/:id/lines
  addLine(_id: QuoteId, _customerDescription: string): Promise<Quote> {
    throw new NotImplementedError('addLine');
  }

  // TODO(api): DELETE /quotes/:id/lines/:lineId/item
  clearLineItem(_id: QuoteId, _lineId: LineId): Promise<Quote> {
    throw new NotImplementedError('clearLineItem');
  }

  // TODO(api): POST /quotes/:id/lines/:lineId/reject-suggestions
  rejectSuggestions(_id: QuoteId, _lineId: LineId): Promise<Quote> {
    throw new NotImplementedError('rejectSuggestions');
  }

  // TODO(api): PUT /quotes/:id/lines/:lineId/suppliers
  setLineSuppliers(_id: QuoteId, _lineId: LineId, _supplierIds: SupplierId[]): Promise<Quote> {
    throw new NotImplementedError('setLineSuppliers');
  }

  // TODO(api): DELETE /quotes/:id/lines/:lineId/suppliers/:supplierId
  removeLineSupplier(_id: QuoteId, _lineId: LineId, _supplierId: SupplierId): Promise<Quote> {
    throw new NotImplementedError('removeLineSupplier');
  }

  // TODO(api): POST /quotes/:id/lines/:lineId/selected-offer
  selectOffer(_id: QuoteId, _lineId: LineId, _supplierId: SupplierId | null): Promise<Quote> {
    throw new NotImplementedError('selectOffer');
  }

  // TODO(api): POST /quotes/:id/lines/:lineId/suppliers/:supplierId/follow-up
  setFollowUpNote(
    _id: QuoteId,
    _lineId: LineId,
    _supplierId: SupplierId,
    _note: string,
  ): Promise<Quote> {
    throw new NotImplementedError('setFollowUpNote');
  }

  // TODO(api): POST /quotes/:id/lines/:lineId/suppliers/:supplierId/resolve-info
  resolveInfoRequest(
    _id: QuoteId,
    _lineId: LineId,
    _supplierId: SupplierId,
    _mode: 'forward' | 'ignore',
  ): Promise<Quote> {
    throw new NotImplementedError('resolveInfoRequest');
  }

  // TODO(api): POST /quotes/:id/web-inquiries
  sendWebInquiry(_id: QuoteId, _payload: WebInquiryPayload): Promise<Quote> {
    throw new NotImplementedError('sendWebInquiry');
  }

  // TODO(api): PUT /quotes/:id/mails/draft
  saveClarificationDraft(_id: QuoteId, _payload: MailDraftPayload): Promise<Quote> {
    throw new NotImplementedError('saveClarificationDraft');
  }

  // TODO(api): POST /quotes/:id/mails/:mailId/send
  sendMail(_id: QuoteId, _mailId: string): Promise<Quote> {
    throw new NotImplementedError('sendMail');
  }

  // TODO(api): DELETE /quotes/:id/mails/:mailId
  discardMail(_id: QuoteId, _mailId: string): Promise<Quote> {
    throw new NotImplementedError('discardMail');
  }

  // TODO(api): POST /quotes/:id/mails/:mailId/updates/:lineId
  applyProposedUpdate(
    _id: QuoteId,
    _mailId: string,
    _lineId: LineId,
    _apply: boolean,
  ): Promise<Quote> {
    throw new NotImplementedError('applyProposedUpdate');
  }

  // TODO(api): PATCH /quotes/:id/pricing
  updatePricing(_id: QuoteId, _patch: Partial<QuotePricingSettings>): Promise<Quote> {
    throw new NotImplementedError('updatePricing');
  }

  // TODO(api): PATCH /quotes/:id/output-type
  setOutputType(_id: QuoteId, _outputType: QuoteOutputType): Promise<Quote> {
    throw new NotImplementedError('setOutputType');
  }

  // TODO(api): POST /quotes/:id/send
  sendQuote(_id: QuoteId, _payload: SendQuotePayload): Promise<Quote> {
    throw new NotImplementedError('sendQuote');
  }

  // TODO(api): POST /quotes/:id/revise
  reviseQuote(_id: QuoteId, _applyLowerMargin: boolean): Promise<Quote> {
    throw new NotImplementedError('reviseQuote');
  }

  // TODO(api): POST /quotes/:id/order
  convertToOrder(_id: QuoteId): Promise<Quote> {
    throw new NotImplementedError('convertToOrder');
  }

  // TODO(api): POST /quotes/:id/order/ready
  markReadyForProcurement(_id: QuoteId): Promise<Quote> {
    throw new NotImplementedError('markReadyForProcurement');
  }

  simulateSupplierReplies(_id: QuoteId): Promise<{ quote: Quote; count: number }> {
    throw new NotImplementedError('simulateSupplierReplies (demo only)');
  }

  simulateCustomerClarificationAnswer(_id: QuoteId): Promise<Quote> {
    throw new NotImplementedError('simulateCustomerClarificationAnswer (demo only)');
  }

  simulateCustomerQuoteReply(_id: QuoteId): Promise<Quote> {
    throw new NotImplementedError('simulateCustomerQuoteReply (demo only)');
  }

  async reset(): Promise<void> {
    // Реальні дані не скидаються з клієнта.
  }
}
