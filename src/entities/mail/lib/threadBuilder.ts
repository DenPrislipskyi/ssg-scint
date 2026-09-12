import { formatLeadTime, usd } from '@/shared/lib/format';
import type { CatalogData } from '@/entities/catalog/model/types';
import { buildWebInquiryBody } from '@/entities/mail/lib/templates';
import type { Quote, QuoteLine } from '@/entities/quote/model/types';
import type { SupplierId } from '@/entities/supplier/model/types';

export interface SupplierEvent {
  direction: 'in' | 'out';
  at: string;
  title: string;
  body: string;
  attachments: string[];
}

/**
 * Збирає хронологію листування з одним постачальником:
 * надіслані Web Inquiry, нагадування, дзвінки, відповіді і повідомлення по рядках.
 */
export const buildSupplierEvents = (
  quote: Quote,
  supplierId: SupplierId,
  catalog: CatalogData,
): SupplierEvent[] => {
  const events: SupplierEvent[] = [];
  const lineById = new Map(quote.lines.map((line, index) => [line.id, { line, index }]));

  for (const inquiry of quote.inquiries) {
    if (inquiry.supplierId !== supplierId) continue;
    const lines = inquiry.lineIds
      .map((id) => lineById.get(id))
      .filter((entry): entry is { line: QuoteLine; index: number } => Boolean(entry))
      .map((entry) => entry.line);

    events.push({
      direction: 'out',
      at: inquiry.sentAt,
      title: 'Web Inquiry sent',
      body: buildWebInquiryBody(quote.header, lines, catalog),
      attachments: inquiry.attachments,
    });
  }

  quote.lines.forEach((line, index) => {
    const entry = line.suppliers.find((s) => s.supplierId === supplierId);
    if (!entry) return;

    if (entry.status === 'awaiting' && entry.followUpNote) {
      events.push({
        direction: 'out',
        at: '',
        title: entry.followUpNote.startsWith('Called') ? 'Phone call logged' : 'Reminder sent',
        body: `${entry.followUpNote} — line ${index + 1}: ${line.customerDescription}`,
        attachments: [],
      });
    }

    if (entry.status === 'replied') {
      const needsInfo = Boolean(entry.infoRequest) && !entry.isInfoResolved;
      events.push({
        direction: 'in',
        at: entry.repliedAt ?? '',
        title: needsInfo ? 'Reply · needs info' : entry.offer ? 'Offer received' : 'Reply',
        body: entry.offer
          ? `Line ${index + 1}: ${line.customerDescription}\n` +
            `${entry.offer.supplierDescription}${entry.offer.brand ? ` · ${entry.offer.brand}` : ''}\n` +
            `${entry.offer.quotedQuantity} ${entry.offer.unit} @ ${usd(entry.offer.unitPrice)} · ` +
            `lead ${formatLeadTime(entry.offer.leadTime)} · valid ${entry.offer.validity || '—'}` +
            `${entry.offer.remarks ? `\nRemarks: ${entry.offer.remarks}` : ''}`
          : `Line ${index + 1}: ${line.customerDescription}\n${entry.infoRequest ?? ''}`,
        attachments: [],
      });
    }

    for (const message of line.messages) {
      if (message.author === 'customer') continue;
      if (message.supplierId && message.supplierId !== supplierId) continue;
      if (!message.supplierId && !message.text.includes(supplierId)) {
        // Повідомлення CS без явного постачальника показуємо лише коли воно його згадує.
        if (message.author === 'cs' && !entry) continue;
      }
      events.push({
        direction: message.author === 'supplier' ? 'in' : 'out',
        at: message.at,
        title: message.author === 'supplier' ? 'Message' : 'Sent',
        body: `Line ${index + 1}: ${message.text}`,
        attachments: message.attachment ? [message.attachment] : [],
      });
    }
  });

  return events;
};
