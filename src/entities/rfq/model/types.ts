/** Ідентифікатор RFQ — це id запису листа в агента. */
export type RfqId = string;

/**
 * Як саме знайшовся товар. Перше, що дивиться оператор.
 *
 *   code_confirmed  код клієнта назвав товар, і опис із ним збігся
 *   code_rejected   код назвав товар, опис не збігся — код відкинуто
 *   search          коду не було (або його немає в аркуші) — шукали словами
 *   none            аркушу нема чого запропонувати
 */
export type MatchRoute = 'code_confirmed' | 'code_rejected' | 'search' | 'none';

export interface MatchCandidate {
  itemCode: string;
  description: string;
  /**
   * 0–100, скор пошуку як відсоток від найкращого кандидата ТІЄЇ Ж лінії.
   * Не ймовірність і не порівнюється між лініями: показуємо людині, але
   * нічого на ньому не вирішуємо.
   */
  confidence: number;
  /** Увесь рядок аркуша — кандидат заповнює ті самі колонки, що й збіг. */
  item: Record<string, string>;
}

/**
 * Один рядок RFQ: ліворуч те, що просив клієнт, праворуч те, що продаємо ми.
 * Дві половини навмисно не змішані — уся суть екрана в їх порівнянні.
 */
export interface MatchLine {
  /** Де вона стоїть на сторінці, 1..n. На це показує людина. */
  line: number;
  /**
   * Як цю позицію називає запис — власна нумерація читача всередині файла,
   * з якого вона прийшла. Саме нею адресується підтвердження: екран, який
   * перенумерує рядки, не має права перенаправити підтвердження на чужий товар.
   */
  index: number;
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
  /**
   * Товар, на якому зупинилася людина. Порожньо, поки ніхто не зупинився —
   * і порожньо знову, коли передумали: це один стан, а не два.
   */
  confirmedItemCode: string;
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
