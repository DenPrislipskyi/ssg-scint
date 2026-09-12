import { describe, expect, it } from 'vitest';

import { buildSupplierEvents } from '@/entities/mail/lib/threadBuilder';
import type { Quote } from '@/entities/quote/model/types';
import { makeCatalog, makeItem, makeLine, makeLineSupplier, makeOffer } from '@/test/factories';

const catalog = makeCatalog([makeItem({ code: 'T-1', name: 'Hex bolt' })]);

const makeQuote = (overrides: Partial<Quote> = {}): Quote =>
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
    processingTime: '1 h',
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

describe('buildSupplierEvents', () => {
  it('is empty when nothing was sent to the supplier', () => {
    expect(buildSupplierEvents(makeQuote(), 'hansa', catalog)).toEqual([]);
  });

  it('lists the sent Web Inquiry with the requested items', () => {
    const line = makeLine({ id: 'L1', matchedItemCode: 'T-1', requestedQuantity: 500 });
    const quote = makeQuote({
      lines: [line],
      inquiries: [
        { id: 'wi1', sentAt: '13-Aug 10:12', supplierId: 'hansa', lineIds: ['L1'], attachments: [] },
      ],
    });

    const [event] = buildSupplierEvents(quote, 'hansa', catalog);
    expect(event).toMatchObject({ direction: 'out', title: 'Web Inquiry sent' });
    expect(event?.body).toContain('1. Hex bolt — 500 set');
  });

  it('renders a received offer with price, lead time and validity', () => {
    const line = makeLine({
      id: 'L1',
      suppliers: [
        makeLineSupplier({
          supplierId: 'hansa',
          status: 'replied',
          repliedAt: '12-Aug 16:40',
          offer: makeOffer({ unitPrice: 142, quotedQuantity: 4, unit: 'pcs', remarks: 'Genuine' }),
        }),
      ],
    });

    const [event] = buildSupplierEvents(makeQuote({ lines: [line] }), 'hansa', catalog);
    expect(event).toMatchObject({ direction: 'in', title: 'Offer received', at: '12-Aug 16:40' });
    expect(event?.body).toContain('4 pcs @ $142.00');
    expect(event?.body).toContain('lead 3 d');
    expect(event?.body).toContain('Remarks: Genuine');
  });

  it('marks a reply that asks for information instead of quoting', () => {
    const line = makeLine({
      id: 'L1',
      suppliers: [
        makeLineSupplier({
          supplierId: 'ewliner',
          status: 'replied',
          infoRequest: 'Please provide sample image',
        }),
      ],
    });

    const [event] = buildSupplierEvents(makeQuote({ lines: [line] }), 'ewliner', catalog);
    expect(event?.title).toBe('Reply · needs info');
    expect(event?.body).toContain('Please provide sample image');
  });

  it('distinguishes reminders from logged phone calls', () => {
    const withNote = (note: string) =>
      makeQuote({
        lines: [
          makeLine({
            id: 'L1',
            suppliers: [
              makeLineSupplier({ supplierId: 'pacific', status: 'awaiting', followUpNote: note }),
            ],
          }),
        ],
      });

    expect(buildSupplierEvents(withNote('Reminder sent just now'), 'pacific', catalog)[0]?.title).toBe(
      'Reminder sent',
    );
    expect(buildSupplierEvents(withNote('Called just now'), 'pacific', catalog)[0]?.title).toBe(
      'Phone call logged',
    );
  });

  it('ignores events belonging to other suppliers', () => {
    const quote = makeQuote({
      lines: [makeLine({ id: 'L1' })],
      inquiries: [
        { id: 'wi1', sentAt: '13-Aug', supplierId: 'hansa', lineIds: ['L1'], attachments: [] },
      ],
    });
    expect(buildSupplierEvents(quote, 'ancor', catalog)).toEqual([]);
  });
});
