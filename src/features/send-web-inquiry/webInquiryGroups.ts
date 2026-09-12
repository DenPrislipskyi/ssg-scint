import type { LineId, Quote, QuoteLine } from '@/entities/quote/model/types';
import type { SupplierId } from '@/entities/supplier/model/types';

export interface WebInquiryGroup {
  supplierId: SupplierId;
  lines: Array<{ line: QuoteLine; index: number }>;
}

/**
 * Групує ще не надіслані призначення по постачальниках —
 * один лист на постачальника, як вимагає процес.
 */
export const buildWebInquiryGroups = (quote: Quote): WebInquiryGroup[] => {
  const groups = new Map<SupplierId, WebInquiryGroup>();

  quote.lines.forEach((line, index) => {
    for (const entry of line.suppliers) {
      if (entry.status !== 'assigned') continue;
      const group = groups.get(entry.supplierId) ?? {
        supplierId: entry.supplierId,
        lines: [],
      };
      group.lines.push({ line, index });
      groups.set(entry.supplierId, group);
    }
  });

  return [...groups.values()];
};

export interface PendingInquiryStats {
  supplierCount: number;
  lineCount: number;
}

export const pendingInquiryStats = (quote: Quote): PendingInquiryStats => {
  const groups = buildWebInquiryGroups(quote);
  const lineIds = new Set<LineId>(groups.flatMap((g) => g.lines.map((entry) => entry.line.id)));
  return { supplierCount: groups.length, lineCount: lineIds.size };
};
