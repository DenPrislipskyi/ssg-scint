import { customerCodeOf, customerDescriptionOf, internalUomOf } from '@/entities/rfq/lib/matchRows';
import { lineTotal } from '@/entities/rfq/lib/pricing';
import type { MatchLine } from '@/entities/rfq/model/types';
import { round2 } from '@/shared/lib/format';

/** Один рядок підсумкової таблиці — позиція, як її підписали. */
export interface FinalRow {
  line: number;
  key: string;
  /** Код клієнта з аркуша, колонка `Customer Code`. */
  customerCode: string;
  /** Опис клієнта з аркуша, колонка `Customer Description`. */
  customerDescription: string;
  itemCode: string;
  itemDescription: string;
  quantity: string;
  uom: string;
  /** Затверджена ціна за одиницю. `null` для позиції, що не пройшла підпис. */
  unitPrice: number | null;
  total: number | null;
}

/** Кількість як число — те саме правило, що й на третьому етапі. */
const quantityOf = (line: MatchLine): number | null => {
  const text = line.quantity.replace(/\s+/g, '').replace(',', '.');
  if (text === '') return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

/**
 * Підсумкова таблиця: що саме підписали.
 *
 * Читає **лише затверджені** ціни — `approvedUnitPrice`, а не ті, що екран
 * рахує зараз. У цьому весь сенс четвертого етапу: він показує котирування,
 * яке назвали, а не те, яким воно стало б із сьогоднішньою собівартістю.
 *
 * Ліва половина — з аркуша, не з листа клієнта: `Customer Code` і `Customer
 * Description` того рядка, на якому позицію зупинили.
 */
export const finalRows = (lines: MatchLine[]): FinalRow[] =>
  lines.map((line, index) => {
    const quantity = quantityOf(line);
    const unitPrice = line.approvedUnitPrice;

    return {
      line: line.line,
      key: `${index}:${line.line}`,
      customerCode: customerCodeOf(line.item),
      customerDescription: customerDescriptionOf(line.item),
      itemCode: line.itemCode,
      itemDescription: line.itemDescription,
      quantity: line.quantity,
      // Одиниця клієнта, а без неї — наша, як і на попередніх етапах.
      uom: line.uom || internalUomOf(line.item),
      unitPrice,
      total: unitPrice === null || quantity === null ? null : lineTotal(unitPrice, quantity),
    };
  });

/**
 * Скільки коштує все замовлення за підписаними цінами.
 *
 * Те саме правило, що й на третьому етапі: рядок без ціни не рахується нулем.
 * Після підпису таких рядків не буває — підписати котирування з діркою не
 * можна, — але правило лишається одне на обидва екрани.
 */
export const finalTotal = (rows: FinalRow[]): number =>
  round2(rows.reduce((sum, row) => sum + (row.total ?? 0), 0));
