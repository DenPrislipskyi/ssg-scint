import { MAX_SUPPLIERS_PER_LINE } from '@/shared/config/constants';
import { firstName } from '@/shared/lib/format';
import type { CatalogData } from '@/entities/catalog/model/types';
import { buildQuotationEmail } from '@/entities/mail/lib/templates';
import type {
  MailDraftPayload,
  Paginated,
  QuoteLinePatch,
  QuoteListParams,
  QuoteRepository,
  SendQuotePayload,
  WebInquiryPayload,
} from '@/entities/quote/api/quoteRepository';
import { buildQuoteListItem } from '@/entities/quote/lib/quoteSummary';
import { syncClarificationDraft } from '@/entities/quote/lib/clarification';
import type {
  LineId,
  Quote,
  QuoteId,
  QuoteListItem,
  QuoteOutputType,
  QuotePricingSettings,
} from '@/entities/quote/model/types';
import type { SupplierId } from '@/entities/supplier/model/types';
import demoReplies from '@/shared/api/mock/fixtures/demoSupplierReplies';
import type { MockStore } from '@/shared/api/mock/MockStore';
import { mockDelay } from '@/shared/api/mock/mockDelay';

const NOW = 'just now';

const findLine = (quote: Quote, lineId: LineId) => {
  const line = quote.lines.find((candidate) => candidate.id === lineId);
  if (!line) throw new Error(`Line not found: ${lineId}`);
  return line;
};

/**
 * Реалізація сховища котирувань на локальних фікстурах.
 * Містить ту саму логіку переходів станів, що виконував прототип у браузері,
 * і в бойовому режимі повністю замінюється на HttpQuoteRepository.
 */
export class MockQuoteRepository implements QuoteRepository {
  private readonly store: MockStore;
  private readonly getCatalog: () => Promise<CatalogData>;

  constructor(store: MockStore, getCatalog: () => Promise<CatalogData>) {
    this.store = store;
    this.getCatalog = getCatalog;
  }

  /* ─── Читання ─────────────────────────────────────────────────────── */

  async list({ page = 1, pageSize = 25, search = '' }: QuoteListParams): Promise<Paginated<QuoteListItem>> {
    await mockDelay();
    const catalog = await this.getCatalog();

    const all = this.store.all().map((quote) => buildQuoteListItem(quote, catalog));

    const needle = search.trim().toLowerCase();
    const filtered = needle
      ? all.filter((item) =>
          [item.customerName, item.vesselName, item.reference, item.quotationNumber]
            .join(' ')
            .toLowerCase()
            .includes(needle),
        )
      : all;

    const start = (page - 1) * pageSize;
    return {
      items: filtered.slice(start, start + pageSize),
      total: filtered.length,
      page,
      pageSize,
    };
  }

  async getById(id: QuoteId): Promise<Quote> {
    await mockDelay(80);
    return this.store.get(id);
  }

  /* ─── Відповідальність ────────────────────────────────────────────── */

  async takeOwnership(id: QuoteId, accept: boolean): Promise<Quote> {
    await mockDelay(60);
    return this.store.update(id, (quote) => {
      if (accept) {
        quote.isTaken = true;
        quote.isDeclined = false;
        quote.responsibleUser = 'Priya N.';
        quote.processingTime = quote.processingTime === '—' ? '1 h' : quote.processingTime;
      } else {
        quote.isDeclined = true;
      }
    });
  }

  /* ─── Рядки ───────────────────────────────────────────────────────── */

  async updateLine(id: QuoteId, lineId: LineId, patch: QuoteLinePatch): Promise<Quote> {
    const catalog = await this.getCatalog();
    return this.store.update(id, (quote) => {
      const line = findLine(quote, lineId);

      if (patch.matchedItemCode !== undefined) {
        line.matchedItemCode = patch.matchedItemCode;
        line.manualShipSupplyQuantity = null;
        line.overriddenUnit = null;
        if (patch.matchedItemCode && !line.suggestedItemCodes.includes(patch.matchedItemCode)) {
          line.suggestedItemCodes.unshift(patch.matchedItemCode);
        }
      }
      if (patch.manualShipSupplyQuantity !== undefined) {
        line.manualShipSupplyQuantity = patch.manualShipSupplyQuantity;
      }
      if (patch.overriddenUnit !== undefined) {
        line.overriddenUnit = patch.overriddenUnit;
        line.manualShipSupplyQuantity = null;
      }
      if (patch.internalComment !== undefined) line.internalComment = patch.internalComment;
      if (patch.customerRemark !== undefined) line.customerRemark = patch.customerRemark;
      if (patch.isExcluded !== undefined) line.isExcluded = patch.isExcluded;
      if (patch.isAsked !== undefined) line.isAsked = patch.isAsked;

      syncClarificationDraft(quote, catalog);
    });
  }

  async addLine(id: QuoteId, customerDescription: string): Promise<Quote> {
    const catalog = await this.getCatalog();
    return this.store.update(id, (quote) => {
      quote.lines.push({
        id: `${id}-L${quote.lines.length + 1}-${Date.now()}`,
        customerDescription,
        customerCode: '',
        requestedQuantity: 1,
        customerUnit: 'pcs',
        matchedItemCode: null,
        suggestedItemCodes: [],
        rejectedItemCodes: [],
        suppliers: [],
        attachment: null,
        customerRemark: null,
        clarificationQuestion: null,
        note: 'added by CS',
        isAsked: false,
        isExcluded: false,
        internalComment: '',
        messages: [],
        manualShipSupplyQuantity: null,
        overriddenUnit: null,
      });
      syncClarificationDraft(quote, catalog);
    });
  }

  async clearLineItem(id: QuoteId, lineId: LineId): Promise<Quote> {
    const catalog = await this.getCatalog();
    return this.store.update(id, (quote) => {
      const line = findLine(quote, lineId);
      if (line.matchedItemCode) line.rejectedItemCodes.push(line.matchedItemCode);
      line.matchedItemCode = null;
      line.suggestedItemCodes = line.suggestedItemCodes.filter(
        (code) => !line.rejectedItemCodes.includes(code),
      );
      syncClarificationDraft(quote, catalog);
    });
  }

  async rejectSuggestions(id: QuoteId, lineId: LineId): Promise<Quote> {
    const catalog = await this.getCatalog();
    return this.store.update(id, (quote) => {
      const line = findLine(quote, lineId);
      line.rejectedItemCodes.push(...line.suggestedItemCodes);
      line.suggestedItemCodes = [];
      line.matchedItemCode = null;
      syncClarificationDraft(quote, catalog);
    });
  }

  /* ─── Постачальники на рядку ──────────────────────────────────────── */

  async setLineSuppliers(id: QuoteId, lineId: LineId, supplierIds: SupplierId[]): Promise<Quote> {
    return this.store.update(id, (quote) => {
      const line = findLine(quote, lineId);
      const keep = line.suppliers.filter(
        (supplier) => supplier.status !== 'assigned' || supplierIds.includes(supplier.supplierId),
      );
      const existing = new Set(keep.map((supplier) => supplier.supplierId));

      const added = supplierIds
        .filter((supplierId) => !existing.has(supplierId))
        .slice(0, Math.max(0, MAX_SUPPLIERS_PER_LINE - keep.length))
        .map((supplierId) => ({
          supplierId,
          status: 'assigned' as const,
          offer: null,
          infoRequest: null,
          isInfoResolved: false,
          isIgnored: false,
          isSelected: false,
          followUpNote: null,
          repliedAt: null,
        }));

      line.suppliers = [...keep, ...added];
    });
  }

  async removeLineSupplier(id: QuoteId, lineId: LineId, supplierId: SupplierId): Promise<Quote> {
    return this.store.update(id, (quote) => {
      const line = findLine(quote, lineId);
      line.suppliers = line.suppliers.filter((supplier) => supplier.supplierId !== supplierId);
    });
  }

  async selectOffer(id: QuoteId, lineId: LineId, supplierId: SupplierId | null): Promise<Quote> {
    return this.store.update(id, (quote) => {
      const line = findLine(quote, lineId);
      const wasSelected = line.suppliers.find((s) => s.supplierId === supplierId)?.isSelected;
      line.suppliers.forEach((supplier) => {
        supplier.isSelected = false;
      });
      if (!supplierId || wasSelected) return;

      const target = line.suppliers.find((supplier) => supplier.supplierId === supplierId);
      if (target?.status === 'replied' && target.offer) target.isSelected = true;
    });
  }

  async setFollowUpNote(
    id: QuoteId,
    lineId: LineId,
    supplierId: SupplierId,
    note: string,
  ): Promise<Quote> {
    return this.store.update(id, (quote) => {
      const supplier = findLine(quote, lineId).suppliers.find((s) => s.supplierId === supplierId);
      if (supplier) supplier.followUpNote = note;
    });
  }

  async resolveInfoRequest(
    id: QuoteId,
    lineId: LineId,
    supplierId: SupplierId,
    mode: 'forward' | 'ignore',
  ): Promise<Quote> {
    return this.store.update(id, (quote) => {
      const line = findLine(quote, lineId);
      const supplier = line.suppliers.find((s) => s.supplierId === supplierId);
      if (!supplier) return;

      supplier.isInfoResolved = true;
      if (mode === 'ignore') {
        supplier.isIgnored = true;
        return;
      }
      line.messages.push({
        author: 'cs',
        supplierId,
        at: NOW,
        text: `Sample image forwarded to supplier — Web Inquiry re-sent.`,
        attachment: line.attachment,
      });
    });
  }

  /* ─── Web Inquiry ─────────────────────────────────────────────────── */

  async sendWebInquiry(id: QuoteId, payload: WebInquiryPayload): Promise<Quote> {
    await mockDelay(200);
    return this.store.update(id, (quote) => {
      for (const group of payload.groups) {
        quote.inquiries.push({
          id: `${id}-WI${quote.inquiries.length + 1}`,
          sentAt: NOW,
          supplierId: group.supplierId,
          lineIds: group.lineIds,
          attachments: group.attachments,
        });

        for (const lineId of group.lineIds) {
          const supplier = findLine(quote, lineId).suppliers.find(
            (candidate) => candidate.supplierId === group.supplierId,
          );
          if (supplier?.status === 'assigned') supplier.status = 'awaiting';
        }
      }
    });
  }

  /* ─── Листування з клієнтом ───────────────────────────────────────── */

  async saveClarificationDraft(id: QuoteId, payload: MailDraftPayload): Promise<Quote> {
    const catalog = await this.getCatalog();
    return this.store.update(id, (quote) => {
      const draft = quote.mails.find(
        (mail) => mail.kind === 'clarification' && mail.status === 'draft',
      );

      if (draft) {
        draft.lineIds = [...new Set([...draft.lineIds, ...payload.lineIds])];
        draft.body = payload.body || draft.body;
      } else {
        quote.mails.push({
          id: `${id}-M${quote.mails.length + 1}`,
          kind: 'clarification',
          status: 'draft',
          title: null,
          at: '',
          body: payload.body,
          attachments: [],
          lineIds: payload.lineIds,
          proposedUpdates: [],
          revision: null,
          isAnswerToClarification: false,
        });
      }
      syncClarificationDraft(quote, catalog, { keepManual: true });
    });
  }

  async sendMail(id: QuoteId, mailId: string): Promise<Quote> {
    const catalog = await this.getCatalog();
    return this.store.update(id, (quote) => {
      const mail = quote.mails.find((candidate) => candidate.id === mailId);
      if (!mail) return;

      mail.status = 'sent';
      mail.at = 'today 10:20';
      for (const lineId of mail.lineIds) {
        findLine(quote, lineId).isAsked = true;
      }
      syncClarificationDraft(quote, catalog);
    });
  }

  async discardMail(id: QuoteId, mailId: string): Promise<Quote> {
    return this.store.update(id, (quote) => {
      quote.mails = quote.mails.filter((mail) => mail.id !== mailId);
    });
  }

  async applyProposedUpdate(
    id: QuoteId,
    mailId: string,
    lineId: LineId,
    apply: boolean,
  ): Promise<Quote> {
    const catalog = await this.getCatalog();
    return this.store.update(id, (quote) => {
      const mail = quote.mails.find((candidate) => candidate.id === mailId);
      const update = mail?.proposedUpdates.find((candidate) => candidate.lineId === lineId);
      if (!update) return;

      update.isApplied = true;
      if (!apply) return;

      const line = findLine(quote, lineId);
      line.isAsked = false;

      if (update.itemCode) {
        line.matchedItemCode = update.itemCode;
        if (!line.suggestedItemCodes.includes(update.itemCode)) {
          line.suggestedItemCodes.unshift(update.itemCode);
        }
      } else if (update.attachment) {
        line.attachment = update.attachment;
        const blocked = line.suppliers.find((s) => s.infoRequest && !s.isInfoResolved);
        if (blocked) {
          blocked.isInfoResolved = true;
          line.messages.push({
            author: 'customer',
            supplierId: null,
            at: 'today 08:12',
            text: 'Sample image received from customer',
            attachment: update.attachment,
          });
          line.messages.push({
            author: 'cs',
            supplierId: blocked.supplierId,
            at: 'today 08:15',
            text: 'Forwarded to supplier — Web Inquiry re-sent.',
            attachment: update.attachment,
          });
        }
      } else {
        line.customerDescription = `${line.customerDescription} — ${update.after.split(' · ')[0]}`;
        line.clarificationQuestion = null;
      }

      syncClarificationDraft(quote, catalog);
    });
  }

  /* ─── Ціноутворення і відправка ───────────────────────────────────── */

  async updatePricing(id: QuoteId, patch: Partial<QuotePricingSettings>): Promise<Quote> {
    return this.store.update(id, (quote) => {
      quote.pricing = { ...quote.pricing, ...patch };
    });
  }

  async setOutputType(id: QuoteId, outputType: QuoteOutputType): Promise<Quote> {
    return this.store.update(id, (quote) => {
      quote.outputType = outputType;
    });
  }

  async sendQuote(id: QuoteId, payload: SendQuotePayload): Promise<Quote> {
    await mockDelay(220);
    return this.store.update(id, (quote) => {
      if (quote.sentAt) return;

      quote.outputType = payload.outputType;
      quote.sentAt = 'today 11:02';

      const { body, attachments } = buildQuotationEmail(quote);
      quote.mails.push({
        id: `${id}-M${quote.mails.length + 1}`,
        kind: 'quotation',
        status: 'sent',
        title: null,
        at: quote.sentAt,
        body,
        attachments,
        lineIds: [],
        proposedUpdates: [],
        revision: null,
        isAnswerToClarification: false,
      });
    });
  }

  /* ─── Замовлення ──────────────────────────────────────────────────── */

  async reviseQuote(id: QuoteId, applyLowerMargin: boolean): Promise<Quote> {
    await mockDelay(160);
    return this.store.update(id, (quote) => {
      quote.revisedAt = 'today 09:30';
      quote.marginDecision = applyLowerMargin ? 'apply12' : 'keep';
      if (applyLowerMargin) {
        quote.pricing.stockMargin = 0.12;
        quote.pricing.nonStockMargin = 0.12;
      }

      const name = firstName(quote.header.contactName);
      quote.mails.push({
        id: `${id}-M${quote.mails.length + 1}`,
        kind: 'quotation',
        status: 'sent',
        title: null,
        at: quote.revisedAt,
        body: `Dear ${name},\n\nRevised quotation R1 attached, margin adjusted as requested.\n\nBest regards,\nPriya N.`,
        attachments: [
          `${quote.header.quotationNumber}-R1.pdf`,
          `${quote.header.quotationNumber}-R1.xlsx`,
        ],
        lineIds: [],
        proposedUpdates: [],
        revision: 'R1',
        isAnswerToClarification: false,
      });

      // Клієнт акцептує ревізію — у реальній системі це прийде окремою подією.
      quote.acceptedAt = 'today 14:05';
      quote.mails.push({
        id: `${id}-M${quote.mails.length + 1}`,
        kind: 'customerReply',
        status: 'sent',
        title: 'Order confirmation',
        at: quote.acceptedAt,
        body: `Confirmed, please proceed. PO attached.\n\n${name}`,
        attachments: ['PO.pdf'],
        lineIds: [],
        proposedUpdates: [],
        revision: null,
        isAnswerToClarification: false,
      });
    });
  }

  async convertToOrder(id: QuoteId): Promise<Quote> {
    return this.store.update(id, (quote) => {
      quote.orderStage = 'created';
    });
  }

  async markReadyForProcurement(id: QuoteId): Promise<Quote> {
    return this.store.update(id, (quote) => {
      quote.orderStage = 'ready';
    });
  }

  /* ─── Демо-симуляції ──────────────────────────────────────────────── */

  async simulateSupplierReplies(id: QuoteId): Promise<{ quote: Quote; count: number }> {
    await mockDelay(180);
    let count = 0;

    const quote = this.store.update(id, (draft) => {
      for (const line of draft.lines) {
        for (const supplier of line.suppliers) {
          const isPending =
            supplier.status === 'awaiting' ||
            (supplier.status === 'replied' && !supplier.offer && supplier.isInfoResolved);
          if (!isPending) continue;

          const reply = demoReplies[supplier.supplierId];
          count += 1;

          if (reply?.infoRequest && !supplier.isInfoResolved) {
            supplier.status = 'replied';
            supplier.offer = null;
            supplier.infoRequest = reply.infoRequest;
            supplier.repliedAt = NOW;
            continue;
          }

          supplier.status = 'replied';
          supplier.infoRequest = null;
          supplier.isInfoResolved = false;
          supplier.repliedAt = NOW;
          supplier.offer = {
            unitPrice: reply?.unitPrice ?? 20,
            leadTime: reply?.leadTime ?? { days: 5, hours: 0 },
            validity: reply?.validity ?? '14 d',
            remarks: reply?.remarks ?? null,
            supplierDescription: reply?.supplierDescription ?? '',
            brand: reply?.brand ?? '',
            unit: reply?.unit ?? line.customerUnit,
            quotedQuantity: Math.round(line.requestedQuantity * (reply?.quantityFactor ?? 1)),
          };
        }
      }
    });

    return { quote, count };
  }

  async simulateCustomerClarificationAnswer(id: QuoteId): Promise<Quote> {
    await mockDelay(180);
    return this.store.update(id, (quote) => {
      const asked = quote.lines.filter((line) => line.isAsked && !line.matchedItemCode);

      const updates = asked.map((line, index) => {
        const description = line.customerDescription.toLowerCase();
        const isHose = description.includes('hose');
        const isNautical = description.includes('nautical') || description.includes('sign');

        if (index > 0) {
          return {
            lineId: line.id,
            before: 'not found',
            after: 'still unclear — customer will send photo',
            itemCode: null,
            attachment: null,
            isApplied: false,
          };
        }
        if (isHose) {
          return {
            lineId: line.id,
            before: 'not found',
            after: 'Hose assy hydraulic 1/2" BSP F/F 1.2 m 250 bar · T22004100 · in stock',
            itemCode: 'T22004100',
            attachment: null,
            isApplied: false,
          };
        }
        if (isNautical) {
          return {
            lineId: line.id,
            before: 'not found',
            after: 'Sample image received → forward to the supplier',
            itemCode: null,
            attachment: 'IMO_sign_sample.jpg',
            isApplied: false,
          };
        }
        return {
          lineId: line.id,
          before: 'not found',
          after: 'Deck light bracket 316L 200×120 · new item · JIT',
          itemCode: null,
          attachment: null,
          isApplied: false,
        };
      });

      const withAttachment = updates.some((update) => update.attachment);
      const name = firstName(quote.header.contactName);

      quote.mails.push({
        id: `${id}-M${quote.mails.length + 1}`,
        kind: 'customerReply',
        status: 'sent',
        title: 'Answer to clarification',
        at: 'today 08:12',
        body: withAttachment
          ? `Attached the sample image of the sign we need.\n\n${name}`
          : `Bracket: 316L stainless, 200 x 120 mm, 4 mm plate, drawing attached again.\nTool: we will send a photo tomorrow.\n\n${name}`,
        attachments: withAttachment ? ['IMO_sign_sample.jpg'] : ['drawing_v2.pdf'],
        lineIds: [],
        proposedUpdates: updates,
        revision: null,
        isAnswerToClarification: true,
      });
    });
  }

  async simulateCustomerQuoteReply(id: QuoteId): Promise<Quote> {
    await mockDelay(180);
    return this.store.update(id, (quote) => {
      quote.hasCustomerReply = true;
      quote.mails.push({
        id: `${id}-M${quote.mails.length + 1}`,
        kind: 'customerReply',
        status: 'sent',
        title: 'Reply to quotation',
        at: 'today 08:12',
        body:
          'Please also add the missing line if you can source it. And can you do 12 % on this one, ' +
          `we have a second vessel coming.\n\n${firstName(quote.header.contactName)}`,
        attachments: [],
        lineIds: [],
        proposedUpdates: [],
        revision: null,
        isAnswerToClarification: false,
      });
    });
  }

  async reset(): Promise<void> {
    this.store.reset();
  }
}

