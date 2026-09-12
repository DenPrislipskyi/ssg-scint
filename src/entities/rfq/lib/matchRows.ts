import type { MatchLine } from '@/entities/rfq/model/types';

/** Один рядок таблиці Product matching. */
export interface MatchTableRow {
  /** Наскрізний номер по всій таблиці — просто лічильник об'єктів. */
  n: number;
  key: string;
  customerCode: string;
  customerDescription: string;
  quantity: string;
  uom: string;
  itemCode: string;
  itemDescription: string;
  confidence: number | null;
  /** true — це один із кандидатів, а не підтверджений збіг. */
  isCandidate: boolean;
}

/**
 * Розкладає рядки RFQ на рядки таблиці.
 *
 * Правило просте і має рівно три випадки:
 *
 *   товар знайдено        → один рядок із ним
 *   не знайдено, є кандидати → по рядку на кожного кандидата
 *   не знайдено, кандидатів нема → один рядок із порожньою правою половиною
 *
 * Третій випадок важливий: позиція, якій нічим відповісти, мусить лишитися на
 * екрані. Зникла позиція виглядає як позиція, якої в RFQ не було.
 */
export const toTableRows = (lines: MatchLine[]): MatchTableRow[] => {
  const rows: MatchTableRow[] = [];

  for (const line of lines) {
    const left = {
      customerCode: line.customerCode,
      customerDescription: line.customerDescription,
      quantity: line.quantity,
      uom: line.uom,
    };

    if (line.itemCode) {
      rows.push({
        ...left,
        n: rows.length + 1,
        key: `${line.line}:${line.itemCode}`,
        itemCode: line.itemCode,
        itemDescription: line.itemDescription,
        confidence: line.confidence,
        isCandidate: false,
      });
      continue;
    }

    if (line.candidates.length === 0) {
      rows.push({
        ...left,
        n: rows.length + 1,
        key: `${line.line}:none`,
        itemCode: '',
        itemDescription: '',
        confidence: null,
        isCandidate: false,
      });
      continue;
    }

    for (const candidate of line.candidates) {
      rows.push({
        ...left,
        n: rows.length + 1,
        key: `${line.line}:${candidate.itemCode}`,
        itemCode: candidate.itemCode,
        itemDescription: candidate.description,
        confidence: candidate.confidence,
        isCandidate: true,
      });
    }
  }

  return rows;
};
