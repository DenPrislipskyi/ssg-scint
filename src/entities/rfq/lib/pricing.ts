import { costOf, internalUomOf, marginOf, sourceOf } from '@/entities/rfq/lib/matchRows';
import { needsSourcing } from '@/entities/rfq/lib/sourcing';
import type { MatchLine } from '@/entities/rfq/model/types';
import { round2 } from '@/shared/lib/format';

/**
 * Націнка, з якою рахують цей RFQ — по одній на джерело.
 *
 * Дві, а не одна: складський товар і привезений постачальником заробляють
 * по-різному, і аркуш каже про них різні числа. Одне спільне поле довелося б
 * ставити двічі поспіль, щоб описати те, що вже описано.
 */
export interface Margins {
  stock: number;
  jit: number;
}

/** Націнка, яку аркуш назвав для цього джерела. */
const sheetMargin = (lines: MatchLine[], jit: boolean): number | null => {
  const named = lines
    .filter((line) => needsSourcing(line.item) === jit)
    .map((line) => marginOf(line.item))
    .find((margin) => margin !== null);
  return named ?? null;
};

/** Коли аркуш мовчить. Нуль, а не вигадане число: 0 % видно й легко виправити. */
const NO_MARGIN = 0;

/**
 * Націнки, з якими екран відкривається — ті, що в аркуші.
 *
 * Аркуш сьогодні несе по одному числу на джерело (`12` складу, `15` JIT), і
 * саме тому в шапці два поля, а не колонка на рядок: поле, яке всюди показує
 * одне й те саме, — це не вибір на кожен рядок.
 *
 * Якщо колись рядки одного джерела розійдуться, тут береться перше назване, і
 * вирішувати про це доведеться **в цій функції**.
 */
export const sheetMargins = (lines: MatchLine[]): Margins => ({
  stock: sheetMargin(lines, false) ?? NO_MARGIN,
  jit: sheetMargin(lines, true) ?? NO_MARGIN,
});

/** Один рядок таблиці Pricing. */
export interface PricingRow {
  line: number;
  key: string;
  itemCode: string;
  itemDescription: string;
  source: string;
  /**
   * Чи везе цю позицію постачальник. Рішення ухвалює `needsSourcing` і лише
   * воно: екран, що звіряв би текст колонки сам, став би другим місцем, де
   * вирішують, що таке JIT.
   */
  jit: boolean;
  /** Скільки просив клієнт, його ж словами — для показу. */
  quantity: string;
  uom: string;
  /**
   * Скільки одиниця коштує нам. `null` — JIT, якому постачальник ще не
   * відповів, і порахувати з цього нічого не можна.
   */
  cost: number | null;
  /** Націнка, з якою рахується саме цей рядок, у відсотках. */
  margin: number;
  /** Ціна продажу за одиницю, округлена до копійок. `null` без собівартості. */
  unitPrice: number | null;
  /** Ціна продажу всієї позиції. `null` без собівартості або без кількості. */
  total: number | null;
}

/**
 * Ціна продажу за одиницю: собівартість плюс націнка.
 *
 * Округлюється тут, а не при показі, і на це спирається `total`. Ціна за
 * одиницю — те, що бачить і називає клієнт; множити на кількість приховане
 * число, яке ніде не написане, означало б підсумок, що не сходиться з власною
 * таблицею.
 */
export const sellingPrice = (cost: number, margin: number): number =>
  round2(cost * (1 + margin / 100));

/** Скільки коштує вся позиція. */
export const lineTotal = (unitPrice: number, quantity: number): number =>
  round2(unitPrice * quantity);

/**
 * Кількість як число. `null` для порожньої і для всього, що числом не є:
 * клієнт пише своїми словами, і «2 coil» помножити не можна.
 */
const quantityOf = (line: MatchLine): number | null => {
  const text = line.quantity.replace(/\s+/g, '').replace(',', '.');
  if (text === '') return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

/**
 * Рядки таблиці Pricing — усі позиції RFQ, і складські, і JIT.
 *
 * На відміну від другого етапу, тут немає з чого викидати: рахунок виставляють
 * за все замовлення, і позиція, що не потрапила в підсумок, — це позиція, за
 * яку ніхто не заплатить.
 *
 * Порядок той, що в RFQ: людина шукатиме позицію за її номером.
 */
export const pricingRows = (lines: MatchLine[], margins: Margins): PricingRow[] =>
  lines.map((line, index) => {
    const jit = needsSourcing(line.item);
    // Складському товару ціну знає аркуш; за JIT її називає постачальник, і
    // поки він мовчить, рахувати нема з чого.
    const cost = jit ? line.offerUnitPrice : costOf(line.item);
    const margin = jit ? margins.jit : margins.stock;
    const quantity = quantityOf(line);
    const unitPrice = cost === null ? null : sellingPrice(cost, margin);

    return {
      line: line.line,
      key: `${index}:${line.line}`,
      itemCode: line.itemCode,
      itemDescription: line.itemDescription,
      source: sourceOf(line.item),
      jit,
      quantity: line.quantity,
      // Одиниця клієнта, а без неї — наша, як і на другому етапі.
      uom: line.uom || internalUomOf(line.item),
      cost,
      margin,
      unitPrice,
      total: unitPrice === null || quantity === null ? null : lineTotal(unitPrice, quantity),
    };
  });

/**
 * Скільки коштує все замовлення.
 *
 * Сума лише порахованих рядків. Позиція без ціни не рахується нулем: нуль
 * додав би до підсумку твердження, що вона безплатна, — а насправді про неї
 * ще нічого не відомо, і про це каже лічильник поряд.
 */
export const quoteTotal = (rows: PricingRow[]): number =>
  round2(rows.reduce((sum, row) => sum + (row.total ?? 0), 0));

/** Скільки позицій уже мають ціну. */
export const pricedCount = (rows: PricingRow[]): number =>
  rows.filter((row) => row.total !== null).length;
