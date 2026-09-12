import { engagedSuppliers } from '@/entities/quote/lib/lineState';
import type { LineSupplier, Quote, QuoteLine } from '@/entities/quote/model/types';

export interface SourcingRow {
  id: string;
  line: QuoteLine;
  lineIndex: number;
  entry: LineSupplier;
  /** Позиція пропозиції в межах рядка — визначає, чи малювати rowspan-клітинки. */
  offerIndex: number;
  /** Скільки пропозицій у цієї позиції — значення rowSpan. */
  groupSize: number;
}

/**
 * Розгортає котирування у плоский список «рядок × постачальник».
 * Клітинки позиції об'єднуються через rowSpan за `offerIndex === 0`.
 */
export const buildSourcingRows = (quote: Quote): SourcingRow[] =>
  quote.lines.flatMap((line, lineIndex) => {
    const entries = engagedSuppliers(line);
    return entries.map((entry, offerIndex) => ({
      id: `${line.id}:${entry.supplierId}`,
      line,
      lineIndex,
      entry,
      offerIndex,
      groupSize: entries.length,
    }));
  });
