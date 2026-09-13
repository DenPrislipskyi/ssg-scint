import type { MatchLine, MatchRoute } from '@/entities/rfq/model/types';

/** Один рядок таблиці Product matching. */
export interface MatchTableRow {
  /** Номер позиції в RFQ. Кілька рядків таблиці можуть нести один номер: це
   *  кандидати однієї позиції. */
  line: number;
  key: string;
  customerDescription: string;
  quantity: string;
  uom: string;
  itemCode: string;
  itemDescription: string;
  confidence: number | null;
  how: MatchRoute;
  why: string;
  /** Увесь рядок аркуша. Права половина таблиці читається лише звідси. */
  item: Record<string, string>;
  /** true — це один із кандидатів, а не підтверджений збіг. */
  isCandidate: boolean;
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
export const sourceOf = (item: Record<string, string>): string =>
  column(item, 'Product Source');

/** Одиниця виміру аркуша. Не та, в якій просив клієнт. */
export const internalUomOf = (item: Record<string, string>): string =>
  column(item, 'UOM');

/**
 * Розкладає рядки RFQ на рядки таблиці.
 *
 * Правило просте і має рівно три випадки:
 *
 *   товар підтверджено       → один рядок із ним
 *   не підтверджено, є топ-5 → по рядку на кожного кандидата
 *   нічого не знайшлося      → один рядок із порожньою правою половиною
 *
 * Третій випадок важливий: позиція, якій нічим відповісти, мусить лишитися на
 * екрані. Зникла позиція виглядає як позиція, якої в RFQ не було.
 */
export const toTableRows = (lines: MatchLine[]): MatchTableRow[] => {
  const rows: MatchTableRow[] = [];

  for (const line of lines) {
    const left = {
      line: line.line,
      customerDescription: line.customerDescription,
      quantity: line.quantity,
      uom: line.uom,
      how: line.how,
      why: line.why,
    };

    if (line.itemCode) {
      rows.push({
        ...left,
        key: `${line.line}:${line.itemCode}`,
        itemCode: line.itemCode,
        itemDescription: line.itemDescription,
        confidence: line.confidence,
        item: line.item,
        isCandidate: false,
      });
      continue;
    }

    if (line.candidates.length === 0) {
      rows.push({
        ...left,
        key: `${line.line}:none`,
        itemCode: '',
        itemDescription: '',
        confidence: null,
        item: {},
        isCandidate: false,
      });
      continue;
    }

    for (const candidate of line.candidates) {
      rows.push({
        ...left,
        key: `${line.line}:${candidate.itemCode}`,
        itemCode: candidate.itemCode,
        itemDescription: candidate.description,
        confidence: candidate.confidence,
        item: candidate.item,
        isCandidate: true,
      });
    }
  }

  return rows;
};
