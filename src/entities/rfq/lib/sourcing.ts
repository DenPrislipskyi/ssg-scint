import {
  internalUomOf,
  sourceOf,
  supplierOf,
  type MatchTableRow,
} from '@/entities/rfq/lib/matchRows';
import type { MatchLine } from '@/entities/rfq/model/types';

/**
 * Джерело товару, для якого потрібен постачальник.
 *
 * `JIT` — товару в нас немає, і його хтось має привезти: саме такі позиції
 * їдуть на другий етап. Усе інше лежить на складі, і постачальник там ми
 * самі — питати нема кого, і ім'я фірми в такому рядку було б неправдою.
 *
 * Аркуш сьогодні знає рівно два джерела, `JIT` і `Stock`. Якщо колись
 * з'явиться третє, вирішувати про нього треба буде тут — в одному місці.
 */
const JIT = 'JIT';

/** Чи цій позиції потрібен постачальник ззовні. */
export const needsSourcing = (item: Record<string, string>): boolean =>
  sourceOf(item).trim().toUpperCase() === JIT;

/** Постачальник, якого видно людині. Для складського товару — нікого. */
export const shownSupplier = (item: Record<string, string>): string =>
  needsSourcing(item) ? supplierOf(item) : '';

/** Позиція, яку хтось довів до товару. */
export const isConfirmed = (line: MatchLine): boolean => line.confirmedItemCode !== '';

/** Скільки позицій уже доведено до товару. */
export const confirmedCount = (lines: MatchLine[]): number => lines.filter(isConfirmed).length;

/**
 * Чи можна йти шукати постачальників.
 *
 * Кожна позиція — і складська теж. Складській постачальник не потрібен, але
 * товар потрібен: поки позиція ні на чому не зупинена, невідомо навіть, чи
 * вона взагалі складська, і рахувати другий етап нема з чого.
 */
export const readyForSourcing = (lines: MatchLine[]): boolean => lines.every(isConfirmed);

/** Один рядок таблиці Supplier sourcing. */
export interface SourcingRow {
  line: number;
  key: string;
  itemCode: string;
  itemDescription: string;
  /** Скільки просив клієнт, у його ж одиниці — не в нашій. */
  quantity: string;
  uom: string;
  supplier: string;
  /** Номер позиції в записі — ним адресується запис ціни. */
  index: number;
  /** Скільки постачальник просить за одиницю. `null` — ще не відповів. */
  unitPrice: number | null;
  /** Коли ця ціна прийшла. `null` там само, де й ціна. */
  receivedAt: string | null;
}

/**
 * Позиції, для яких треба знайти постачальника.
 *
 * Тільки JIT і тільки підтверджені: складські на цей екран не потрапляють —
 * не як приховані, а як такі, що їх тут нема чого робити. Номер позиції
 * лишається той, що в RFQ: людина шукатиме її на першому етапі саме за ним.
 */
export const sourcingRows = (lines: MatchLine[]): SourcingRow[] =>
  lines
    .filter((line) => isConfirmed(line) && needsSourcing(line.item))
    .map((line, index) => ({
      line: line.line,
      key: `${index}:${line.line}`,
      itemCode: line.itemCode,
      itemDescription: line.itemDescription,
      quantity: line.quantity,
      // Одиниця клієнта, а без неї — наша: порожня клітинка в рядку, за яким
      // пишуть листа постачальнику, гірша за одиницю з аркуша.
      uom: line.uom || internalUomOf(line.item),
      supplier: supplierOf(line.item),
      index: line.index,
      unitPrice: line.offerUnitPrice,
      receivedAt: line.offerReceivedAt,
    }));

/**
 * Чи вже хтось відповів на цьому RFQ.
 *
 * Одна відповідь відмикає підписи на всіх рядках одразу: ціни приходять
 * однією дією, і рядок, який мовчить, поки сусідній уже каже ціну, читався б
 * як позиція, про яку забули.
 */
export const anyPriced = (lines: MatchLine[]): boolean =>
  lines.some((line) => line.offerUnitPrice !== null);

/** Так постачальник називає ціну: `Unit Price: 2.25 USD`. */
const priceNote = (unitPrice: number): string => `Unit Price: ${unitPrice.toFixed(2)} USD`;

/** Складській позиції ніхто не писав і не напише. */
const NO_INQUIRY = 'stock — no inquiry';

/**
 * Підписи під назвою постачальника на екрані мапінгу.
 *
 * Порожньо, поки ніхто не відповів: до того сказати про постачальника нічого,
 * крім його імені, а імені там і так досить.
 *
 * Складська позиція каже, чому в неї немає ціни, а не мовчить: порожня
 * клітинка поруч із чужою ціною читається як ціна, якої ми не дочекалися.
 *
 * Кількість — та сама, що просили, і в тій самій одиниці, що й на другому
 * етапі: два екрани, які називають одну кількість по-різному, — це два
 * екрани, між якими доведеться вибирати.
 */
export const supplierNotes = (row: MatchTableRow): string[] => {
  if (!needsSourcing(row.item)) return [NO_INQUIRY];
  if (row.offerUnitPrice === null) return [];

  const quantity = [row.quantity, row.uom || internalUomOf(row.item)].filter(Boolean).join(' ');
  return [priceNote(row.offerUnitPrice), ...(quantity ? [`Available Qty: ${quantity}`] : [])];
};
