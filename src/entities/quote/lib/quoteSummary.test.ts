import { describe, expect, it } from 'vitest';

import { buildQuoteListItem } from '@/entities/quote/lib/quoteSummary';
import type { Quote } from '@/entities/quote/model/types';
import { makeCatalog, makeItem, makeLine, makeLineSupplier, makeOffer } from '@/test/factories';

const catalog = makeCatalog([
  makeItem({ code: 'T-STOCK', inStock: true, costPrice: 5 }),
  makeItem({ code: 'T-JIT', inStock: false, costPrice: 0 }),
]);

const baseQuote = (overrides: Partial<Quote> = {}): Quote =>
  ({
    header: {
      id: 'q1',
      quotationNumber: '7.14.2026.1',
      reference: 'E1',
      customerName: 'Customer',
      customerCode: 'C1',
      contactName: 'Lars Eikeland',
      contactEmail: 'lars@example.com',
      vesselName: 'LIA',
      imo: '1',
      port: 'Singapore',
      cutOff: '15 Sep',
      storeType: 'DECK',
      productCategory: 'TECHNICAL',
      dueDate: '8 Sep',
      receivedAt: '12-Aug-2026 09:14',
      priority: 'NORMAL',
      fileType: 'EXCEL',
      team: 'SG LOCAL',
      attachments: [],
      requestBody: '',
    },
    isTaken: true,
    isDeclined: false,
    responsibleUser: 'Priya N.',
    processingTime: '22 h',
    lines: [],
    mails: [],
    inquiries: [],
    pricing: {
      storeType: 'DECK',
      productCategory: 'TECHNICAL',
      stockMargin: 0.14,
      nonStockMargin: 0.14,
      freightDistribution: 'none',
      freightAmount: 310,
    },
    outputType: null,
    sentAt: null,
    hasCustomerReply: false,
    revisedAt: null,
    acceptedAt: null,
    orderStage: null,
    marginDecision: null,
    ...overrides,
  }) as Quote;

describe('buildQuoteListItem', () => {
  it('reports an untouched quote as New regardless of its lines', () => {
    const quote = baseQuote({
      isTaken: false,
      responsibleUser: null,
      lines: [makeLine({ id: 'L1', matchedItemCode: 'T-STOCK' })],
    });

    const item = buildQuoteListItem(quote, catalog);
    expect(item.status).toBe('new');
    expect(item.responsibleUser).toBe('—');
    expect(item.processingTime).toBe('—');
  });

  it('counts priced lines and derives the completion percentage', () => {
    const quote = baseQuote({
      lines: [
        makeLine({ id: 'L1', matchedItemCode: 'T-STOCK' }),
        makeLine({ id: 'L2', matchedItemCode: 'T-STOCK' }),
        makeLine({ id: 'L3' }),
        makeLine({ id: 'L4' }),
      ],
    });

    const item = buildQuoteListItem(quote, catalog);
    expect(item.counts).toMatchObject({ total: 4, priced: 2, unpriced: 2, notFound: 2 });
    expect(item.completionPercent).toBe(50);
  });

  it('reports awaiting suppliers with a replied-of-total detail', () => {
    const quote = baseQuote({
      lines: [
        makeLine({
          id: 'L1',
          matchedItemCode: 'T-JIT',
          suppliers: [
            makeLineSupplier({ supplierId: 'a', status: 'awaiting' }),
            makeLineSupplier({ supplierId: 'b', status: 'awaiting' }),
          ],
        }),
      ],
    });

    const item = buildQuoteListItem(quote, catalog);
    expect(item.status).toBe('awaitingSuppliers');
    expect(item.statusDetail).toBe('0 of 2 replied');
  });

  it('surfaces an unresolved supplier info request above other states', () => {
    const quote = baseQuote({
      lines: [
        makeLine({
          id: 'L1',
          matchedItemCode: 'T-JIT',
          suppliers: [
            makeLineSupplier({ status: 'replied', infoRequest: 'need a photo' }),
          ],
        }),
      ],
    });

    expect(buildQuoteListItem(quote, catalog)).toMatchObject({
      status: 'supplierNeedsInfo',
      statusDetail: '1 line',
    });
  });

  it('reports a clarification once every open line has been asked', () => {
    const quote = baseQuote({
      lines: [makeLine({ id: 'L1', isAsked: true })],
      mails: [
        {
          id: 'm1',
          kind: 'clarification',
          status: 'sent',
          title: null,
          at: '13-Aug 09:40',
          body: '',
          attachments: [],
          lineIds: ['L1'],
          proposedUpdates: [],
          revision: null,
          isAnswerToClarification: false,
        },
      ],
    });

    expect(buildQuoteListItem(quote, catalog)).toMatchObject({
      status: 'clarificationSent',
      statusDetail: '13-Aug 09:40',
    });
  });

  it('prefers the order stage over every earlier state', () => {
    const sent = baseQuote({
      sentAt: 'today 11:02',
      outputType: 'email',
      lines: [makeLine({ id: 'L1', matchedItemCode: 'T-STOCK' })],
    });
    expect(buildQuoteListItem(sent, catalog)).toMatchObject({
      status: 'quoteSent',
      statusDetail: 'email',
    });

    const replied = { ...sent, hasCustomerReply: true };
    expect(buildQuoteListItem(replied, catalog).status).toBe('replyReceived');

    const ordered = { ...replied, orderStage: 'ready' as const };
    expect(buildQuoteListItem(ordered, catalog)).toMatchObject({
      status: 'order',
      statusDetail: 'SO · procurement',
    });
  });

  it('labels an MTML quote as delivered through the portal', () => {
    const quote = baseQuote({
      header: { ...baseQuote().header, fileType: 'MTML' },
      sentAt: 'today 11:02',
      lines: [makeLine({ id: 'L1', matchedItemCode: 'T-STOCK', suppliers: [] })],
    });
    expect(buildQuoteListItem(quote, catalog).statusDetail).toBe('portal');
  });

  it('excludes excluded lines from the unpriced count', () => {
    const quote = baseQuote({
      lines: [
        makeLine({ id: 'L1', matchedItemCode: 'T-STOCK' }),
        makeLine({ id: 'L2', isExcluded: true }),
      ],
    });
    expect(buildQuoteListItem(quote, catalog).counts?.unpriced).toBe(0);
  });

  it('treats a selected supplier offer as priced', () => {
    const quote = baseQuote({
      lines: [
        makeLine({
          id: 'L1',
          matchedItemCode: 'T-JIT',
          suppliers: [makeLineSupplier({ status: 'replied', offer: makeOffer(), isSelected: true })],
        }),
      ],
    });
    expect(buildQuoteListItem(quote, catalog).counts?.priced).toBe(1);
  });
});
