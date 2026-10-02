import { costOf, internalUomOf, marginOf, sourceOf } from '@/entities/rfq/lib/matchRows';
import { needsSourcing } from '@/entities/rfq/lib/sourcing';
import type { Approval, MatchLine } from '@/entities/rfq/model/types';
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
  /**
   * Націнки, які людина поставила окремим позиціям, за номером позиції в
   * записі. Позиція, якої тут немає, рахується з націнкою свого джерела.
   *
   * Окремо від двох загальних, а не замість них: зміна загальної не чіпає
   * того, що виставили вручну, — інакше одне натискання в шапці мовчки
   * стерло б рішення, ухвалене про конкретний рядок.
   */
  lines?: Readonly<Record<number, number>>;
}

/** Націнка, з якою рахується позиція: її власна, а без неї — її джерела. */
export const marginFor = (margins: Margins, index: number, jit: boolean): number =>
  margins.lines?.[index] ?? (jit ? margins.jit : margins.stock);

/** Ті самі націнки, де в однієї позиції своя. */
export const withLineMargin = (margins: Margins, index: number, margin: number): Margins => ({
  ...margins,
  lines: { ...margins.lines, [index]: margin },
});

/** Ті самі націнки, де позиція знову рахується з націнкою свого джерела. */
export const withoutLineMargin = (margins: Margins, index: number): Margins => {
  const { [index]: _dropped, ...rest } = margins.lines ?? {};
  return { ...margins, lines: rest };
};

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
  /** Номер позиції в записі. Ним адресується затвердження ціни. */
  index: number;
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
  /** Чи це власна націнка рядка, а не націнка його джерела. */
  customMargin: boolean;
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
    const customMargin = margins.lines?.[line.index] !== undefined;
    const margin = marginFor(margins, line.index, jit);
    const quantity = quantityOf(line);
    // Затверджена ціна має перевагу над порахованою. Після підпису
    // собівартість і націнка ще рухаються, а котирування — ні: інакше воно
    // перестало б бути числом, яке назвали клієнтові.
    const unitPrice = line.approvedUnitPrice ?? (cost === null ? null : sellingPrice(cost, margin));

    return {
      line: line.line,
      index: line.index,
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
      customMargin,
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

/**
 * Чи можна підписувати котирування.
 *
 * Тільки коли ціна є на **кожній** позиції. Котирування з діркою — це не
 * менше котирування, а хибне: у підсумку дірки не видно, вона просто робить
 * число меншим, і помітити це можна вже після того, як його назвали.
 */
export const readyToApprove = (rows: PricingRow[]): boolean =>
  rows.length > 0 && rows.every((row) => row.unitPrice !== null);

/**
 * Чому підписувати ще не можна.
 *
 * Коротко й по ділу: людина читає це, наводячи мишу на кнопку, яка не
 * натискається, — їй треба знати, що зробити, а не чому саме так вирішили.
 */
export const APPROVE_BLOCKED = 'Make sure every line has a price';

/**
 * Чому кнопка більше нічого не робить, а поля не редагуються. Одна фраза на
 * обидва: питання під ними одне — що вже сталося, — і два різні формулювання
 * читалися б як дві різні причини.
 */
export const ALREADY_APPROVED = 'Pricing already approved';

/** Ціни є всі, бракує лише підпису. */
export const NOT_APPROVED = 'Approve the pricing first';

/**
 * Чому ще не можна йти далі. Порожньо, коли вже можна.
 *
 * Дві різні відповіді, бо це два різні стани: у першому бракує чисел і йти
 * нема з чим, у другому числа є, а підпису під ними немає. Одна фраза на
 * обидва відправляла б половину людей шукати ціни, які вже на екрані.
 *
 * Одна функція на всіх, хто про це питає — кнопка переходу і четвертий етап
 * у шапці: дві фрази про одне розійшлися б першої ж правки.
 */
export const whyNotFinalised = (rows: PricingRow[], approved: boolean): string | undefined =>
  approved ? undefined : readyToApprove(rows) ? NOT_APPROVED : APPROVE_BLOCKED;

/**
 * Що саме йде на підпис: дві націнки й ціна на кожну позицію.
 *
 * Власні націнки рядків окремо не йдуть: вони вже в ціні позиції, а ціна — це
 * те, що підписують.
 */
export const toApproval = (
  rows: PricingRow[],
  margins: Margins,
): { marginStock: number; marginJit: number; lines: { index: number; unitPrice: number }[] } => ({
  marginStock: margins.stock,
  marginJit: margins.jit,
  lines: rows
    .filter((row) => row.unitPrice !== null)
    .map((row) => ({ index: row.index, unitPrice: row.unitPrice as number })),
});

/**
 * Націнки, які показує екран: затверджені, якщо підпис уже є.
 *
 * Після підпису поля показують ті числа, з якими рахували, а не ті, що
 * лишилися в аркуші: інакше екран пояснював би затверджену ціну націнкою, яка
 * її не давала.
 */
export const shownMargins = (approval: Approval | null, edited: Margins): Margins =>
  approval
    ? {
        stock: approval.marginStock,
        jit: approval.marginJit,
        ...(edited.lines ? { lines: edited.lines } : {}),
      }
    : edited;
