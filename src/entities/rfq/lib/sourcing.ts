import { internalUomOf, sourceOf, supplierOf } from '@/entities/rfq/lib/matchRows';
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
    }));
