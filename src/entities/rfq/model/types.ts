/** Ідентифікатор RFQ — це id запису листа в агента. */
export type RfqId = string;

/** Як саме знайшовся товар. Перше, що дивиться оператор. */
export type MatchRoute = 'code_confirmed' | 'code_rejected' | 'search' | 'none';

export interface MatchCandidate {
  itemCode: string;
  description: string;
  /**
   * 0–100, самооцінка моделі. Не ймовірність і не відкаліброване значення:
   * показуємо людині, але нічого на ньому не вирішуємо.
   */
  confidence: number;
}

/**
 * Один рядок RFQ: ліворуч те, що просив клієнт, праворуч те, що продаємо ми.
 * Дві половини навмисно не змішані — уся суть екрана в їх порівнянні.
 */
export interface MatchLine {
  line: number;
  customerCode: string;
  customerDescription: string;
  quantity: string;
  uom: string;

  itemCode: string;
  itemDescription: string;
  /** Уся решта колонок аркуша. Екран поки не показує, але дані вже є. */
  item: Record<string, string>;
  confidence: number | null;
  how: MatchRoute;
  why: string;
  candidates: MatchCandidate[];
}

export interface RfqDetail {
  id: RfqId;
  customerName: string;
  vesselName: string;
  imo: string;
  port: string;
  receivedOn: string;
  subject: string;
  lines: MatchLine[];
}
