import type { MatchCandidate, MatchLine, MatchRoute } from '@/entities/rfq/model/types';

/** Один рядок таблиці Product matching — рівно одна позиція RFQ. */
export interface MatchTableRow {
  /** Номер позиції в RFQ. Один рядок таблиці — один номер, без винятків. */
  line: number;
  /** Як цю позицію називає запис. Цим номером адресується підтвердження. */
  index: number;
  key: string;
  /** Код, який написав клієнт. Не код з аркуша: це ліва половина таблиці. */
  customerCode: string;
  customerDescription: string;
  quantity: string;
  uom: string;
  itemCode: string;
  itemDescription: string;
  confidence: number | null;
  how: MatchRoute;
  why: string;
  /** Рядок аркуша, з якого читається права половина таблиці. */
  item: Record<string, string>;
  /**
   * true — праву половину заповнює найкращий кандидат, а не підтверджений
   * товар. Пропозиція, яку ще ніхто не приймав.
   */
  isProposal: boolean;
  /** З чого можна вибирати. Порожньо, коли вибирати не було з чого. */
  candidates: MatchCandidate[];
  /** Товар, на якому зупинилася людина. Порожньо — «Review Needed». */
  confirmedItemCode: string;
}

/**
 * Заголовок колонки аркуша, як його читає фронт.
 *
 * Люди набирають заголовки по-різному — регістр і пробіли гуляють, — тому
 * шукаємо так само нестрого, як це робить бекенд.
 */
const column = (item: Record<string, string>, heading: string): string => {
  const wanted = heading.replace(/\s+/g, '').toLowerCase();
  const found = Object.entries(item).find(
    ([key]) => key.replace(/\s+/g, '').toLowerCase() === wanted,
  );
  return found?.[1] ?? '';
};

/** Код клієнта з аркуша: колонка `Customer Code` знайденого об'єкта. */
export const customerCodeOf = (item: Record<string, string>): string =>
  column(item, 'Customer Code');

/** Stock / JIT / GPL / CPL — звідки береться товар. */
export const sourceOf = (item: Record<string, string>): string => column(item, 'Product Source');

/** Одиниця виміру аркуша. Не та, в якій просив клієнт. */
export const internalUomOf = (item: Record<string, string>): string => column(item, 'UOM');

/**
 * Хто постачає цей товар — колонка `Supplier` того ж рядка аркуша.
 *
 * Вибрати товар і вибрати постачальника — на цьому екрані одна дія: рядок
 * аркуша несе і те, і те. Тому окремого списку постачальників немає і не має
 * бути: він показував би вибір, якого насправді не роблять.
 */
export const supplierOf = (item: Record<string, string>): string => column(item, 'Supplier');

/**
 * Код як ключ: тільки літери й цифри, у верхньому регістрі.
 *
 * Те саме, що робить `normalize_code` на бекенді, і з тієї ж причини:
 * `79 54 96` і `795496` — це один код, написаний двічі.
 */
export const asKey = (code: string): string => code.replace(/[^\p{L}\p{N}]+/gu, '').toUpperCase();

/**
 * Розкладає рядки RFQ на рядки таблиці — **по одному на позицію**.
 *
 * Топ-5 кандидатів у таблицю не потрапляють: п'ять рядків з однаковою лівою
 * половиною читаються як п'ять позицій замовлення, яких клієнт не просив.
 * Вони їдуть із рядком і розкриваються під ним, де їх видно як те, чим вони
 * є, — список, з якого треба вибрати один.
 *
 * Права половина згорнутого рядка:
 *
 *   код підтверджено         → підтверджений товар
 *   не підтверджено, є топ-5 → найкращий кандидат, як пропозиція
 *   нічого не знайшлося      → порожньо
 *
 * Останній випадок важливий: позиція, якій нічим відповісти, мусить лишитися
 * на екрані. Зникла позиція виглядає як позиція, якої в RFQ не було.
 */
export const toTableRows = (lines: MatchLine[]): MatchTableRow[] =>
  lines.map((line, index) => {
    // Пропозиція є тільки там, де підтвердженого товару немає: інакше вона
    // сперечалася б із тим, що вже вирішено.
    const proposal = line.itemCode ? undefined : line.candidates[0];

    return {
      line: line.line,
      index: line.index,
      confirmedItemCode: line.confirmedItemCode,
      // Номер позиції — не ключ: бекенд бере його з файла клієнта, і два
      // файли в одному RFQ приносять свої нумерації, які можуть збігтися.
      key: `${index}:${line.line}`,
      customerCode: line.customerCode,
      customerDescription: line.customerDescription,
      quantity: line.quantity,
      uom: line.uom,
      how: line.how,
      why: line.why,
      itemCode: line.itemCode || proposal?.itemCode || '',
      itemDescription: line.itemDescription || proposal?.description || '',
      confidence: line.itemCode ? line.confidence : (proposal?.confidence ?? null),
      item: line.itemCode ? line.item : (proposal?.item ?? {}),
      isProposal: proposal !== undefined,
      candidates: line.candidates,
    };
  });

/**
 * Чи ця позиція зупинена **на тому товарі, який зараз у ній стоїть**.
 *
 * Не «щось підтверджено»: людина, яка відкрила список і вказала на інший
 * товар, уже бачить у рядку новий товар, і підтвердження зі старого на нього
 * не поширюється. Тому статус, кнопка й постачальник читають саме це — інакше
 * рядок устиг би показати новий товар зі старим постачальником поруч.
 */
export const isSettled = (row: MatchTableRow): boolean =>
  row.confirmedItemCode !== '' && row.confirmedItemCode === row.itemCode;

/**
 * Товар, на який оператор вказав для однієї позиції.
 *
 * Однакової форми і для кандидата зі списку, і для товару, знайденого руками:
 * праворуч у таблиці стоїть рядок аркуша, а звідки на нього вказали — питання
 * не до таблиці. Різниця лише в `confidence`.
 */
export interface ChosenProduct {
  itemCode: string;
  description: string;
  item: Record<string, string>;
  /**
   * `null` для товару, обраного руками: людина обрала його сама, і покриття
   * слів не було причиною. Число тут вигадувало б доказ, якого не було.
   */
  confidence: number | null;
}

/** Кандидат зі списку — як вибір. */
export const asChoice = (candidate: MatchCandidate): ChosenProduct => ({
  itemCode: candidate.itemCode,
  description: candidate.description,
  item: candidate.item,
  confidence: candidate.confidence,
});

/** Рядок аркуша, знайдений руками, — як вибір. */
export const asManualChoice = (product: {
  itemCode: string;
  description: string;
  item: Record<string, string>;
}): ChosenProduct => ({ ...product, confidence: null });

/**
 * Той самий рядок, але праву половину заповнює обраний товар.
 *
 * Вибір міняє **одне** — який рядок аркуша стоїть праворуч. Ліва половина це
 * слова клієнта, і жодне натискання їх не чіпає: половина сенсу екрана в тому,
 * що дві половини порівнюються, а не зливаються.
 *
 * Без вибору не робить нічого: рядок і так уже показує або підтверджений
 * товар, або те, що запропонував пошук.
 */
export const withChoice = (row: MatchTableRow, chosen: ChosenProduct | undefined): MatchTableRow =>
  chosen === undefined
    ? row
    : {
        ...row,
        itemCode: chosen.itemCode,
        itemDescription: chosen.description,
        item: chosen.item,
        confidence: chosen.confidence,
      };
