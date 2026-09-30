import { describe, expect, it } from 'vitest';

import {
  asChoice,
  asKey,
  asManualChoice,
  byConfidence,
  inOrder,
  customerCodeOf,
  sourceOf,
  toTableRows,
  withChoice,
} from '@/entities/rfq/lib/matchRows';
import type { MatchLine } from '@/entities/rfq/model/types';

const SHEET = {
  'Customer Code': '691284',
  'Item Code': 'T69128400',
  'Item Description / SSG Description': 'HEX HEAD BOLT/NUT STEEL UNGALV, M16 X 65MM',
  'Product Source': 'Stock',
  UOM: 'SET',
};

const line = (overrides: Partial<MatchLine> = {}): MatchLine => ({
  line: 1,
  index: 1,
  confirmedItemCode: '',
  customerCode: '691284',
  customerDescription: 'Hexagon Head Bolts (Bolt with Nut) M16*65',
  quantity: '500',
  uom: 'set',
  itemCode: 'T69128400',
  itemDescription: 'HEX HEAD BOLT/NUT STEEL UNGALV, M16 X 65MM',
  item: SHEET,
  confidence: 100,
  how: 'code_confirmed',
  why: 'Same bolt.',
  candidates: [],
  offerUnitPrice: null,
  offerReceivedAt: null,
  approvedUnitPrice: null,
  ...overrides,
});

const overruled = (overrides: Partial<MatchLine> = {}): MatchLine =>
  line({
    itemCode: '',
    itemDescription: '',
    item: {},
    confidence: null,
    how: 'code_rejected',
    candidates: [
      { itemCode: 'T1', description: 'first', confidence: 100, why: '', item: SHEET },
      { itemCode: 'T2', description: 'second', confidence: 20, why: '', item: {} },
    ],
    ...overrides,
  });

describe('toTableRows', () => {
  it('gives a matched line one row', () => {
    const rows = toTableRows([line()]);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.itemCode).toBe('T69128400');
    expect(rows[0]?.isProposal).toBe(false);
  });

  it('gives a line with five candidates one row, not five', () => {
    // П'ять кандидатів однієї позиції, розкладені в таблицю, читаються як
    // п'ять позицій замовлення - а це не те, що просив клієнт.
    const rows = toTableRows([overruled()]);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.candidates).toHaveLength(2);
  });

  it('fills the right half of an unconfirmed line with the best candidate', () => {
    const rows = toTableRows([overruled()]);

    expect(rows[0]?.itemCode).toBe('T1');
    expect(rows[0]?.itemDescription).toBe('first');
    expect(rows[0]?.confidence).toBe(100);
    expect(rows[0]?.item).toBe(SHEET);
    expect(rows[0]?.isProposal).toBe(true);
  });

  it('never proposes over a confirmed product', () => {
    // Підтверджене вже вирішено; пропозиція поруч із ним сперечалася б із тим,
    // що вирішено, і читалася б як другий варіант там, де його немає.
    const rows = toTableRows([
      line({
        candidates: [{ itemCode: 'T9', description: 'other', confidence: 40, why: '', item: {} }],
      }),
    ]);

    expect(rows[0]?.itemCode).toBe('T69128400');
    expect(rows[0]?.isProposal).toBe(false);
  });

  it('shows the code the customer wrote, not the one the sheet files it under', () => {
    // Раніше в цій колонці стояв Customer Code рядка аркуша, тож одна позиція
    // показувала п'ять різних "кодів клієнта", яких клієнт не писав.
    const rows = toTableRows([
      overruled({
        customerCode: '650823',
        candidates: [
          { itemCode: 'T1', description: 'first', confidence: 100, why: '', item: SHEET },
        ],
      }),
    ]);

    expect(rows[0]?.customerCode).toBe('650823');
    expect(customerCodeOf(rows[0]!.item)).toBe('691284');
  });

  it('still shows a line nothing could be found for', () => {
    // Зникла позиція виглядає як позиція, якої в RFQ не було.
    const rows = toTableRows([
      line({
        itemCode: '',
        itemDescription: '',
        item: {},
        confidence: null,
        how: 'none',
        candidates: [],
      }),
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.itemCode).toBe('');
    expect(rows[0]?.confidence).toBeNull();
    expect(rows[0]?.customerDescription).toBe('Hexagon Head Bolts (Bolt with Nut) M16*65');
  });

  it('keeps the number of the RFQ line, one row each', () => {
    const rows = toTableRows([line({ line: 1 }), overruled({ line: 2 }), line({ line: 3 })]);

    expect(rows.map((row) => row.line)).toEqual([1, 2, 3]);
  });

  it('keys rows apart even when two files bring the same line number', () => {
    // Номер позиції приходить із файла клієнта, а файлів в одному RFQ буває
    // два. Ключ, зібраний із номера, тоді повторився б.
    const rows = toTableRows([line({ line: 1 }), line({ line: 1 })]);

    expect(new Set(rows.map((row) => row.key)).size).toBe(2);
  });

  it('carries the customer half untouched', () => {
    const rows = toTableRows([overruled()]);

    expect(rows[0]?.quantity).toBe('500');
    expect(rows[0]?.uom).toBe('set');
    expect(rows[0]?.why).toBe('Same bolt.');
  });

  it('reads the sheet columns of whichever row fills the right half', () => {
    const rows = toTableRows([overruled()]);

    expect(sourceOf(rows[0]!.item)).toBe('Stock');
  });

  it('finds a heading however it was typed in the sheet', () => {
    expect(customerCodeOf({ 'customer  code': '550101' })).toBe('550101');
    expect(sourceOf({})).toBe('');
  });

  it('has nothing to show for an RFQ with no lines', () => {
    expect(toTableRows([])).toEqual([]);
  });
});

describe('asKey', () => {
  it('reads one code written two ways as one code', () => {
    expect(asKey('79 54 96')).toBe(asKey('795496'));
    expect(asKey('T-691284/00')).toBe('T69128400');
  });

  it('is empty for a code that is only punctuation', () => {
    expect(asKey(' - / ')).toBe('');
  });
});

describe('withChoice', () => {
  const row = () => toTableRows([overruled()])[0]!;
  const second = () => asChoice(overruled().candidates[1]!);

  it('puts the chosen candidate in the right half', () => {
    const picked = withChoice(row(), second());

    expect(picked.itemCode).toBe('T2');
    expect(picked.itemDescription).toBe('second');
    expect(picked.confidence).toBe(20);
    expect(picked.item).toEqual({});
  });

  it('puts a product found by hand in the right half too', () => {
    // Список кандидатів - пропозиція. Хто не знайшов серед п'яти потрібного,
    // іде і бере шостий, і таблиця не має права цього не показати.
    const picked = withChoice(
      row(),
      asManualChoice({ itemCode: 'T404', description: 'FOUND BY HAND', item: { UOM: 'PCS' } }),
    );

    expect(picked.itemCode).toBe('T404');
    expect(picked.itemDescription).toBe('FOUND BY HAND');
    expect(picked.item).toEqual({ UOM: 'PCS' });
  });

  it('gives a product found by hand no score', () => {
    // Людина обрала його сама. Покриття слів не було причиною, і число тут
    // вигадувало б доказ, якого не було.
    const picked = withChoice(
      row(),
      asManualChoice({ itemCode: 'T404', description: 'X', item: {} }),
    );

    expect(picked.confidence).toBeNull();
  });

  it('leaves the customer half exactly as it was', () => {
    // Половина сенсу екрана в тому, що дві половини порівнюються. Вибір
    // товару не є повідомленням від клієнта.
    const before = row();
    const picked = withChoice(before, second());

    expect(picked.customerCode).toBe(before.customerCode);
    expect(picked.customerDescription).toBe(before.customerDescription);
    expect(picked.quantity).toBe(before.quantity);
    expect(picked.uom).toBe(before.uom);
    expect(picked.candidates).toBe(before.candidates);
  });

  it('changes nothing when nothing was chosen', () => {
    expect(withChoice(row(), undefined)).toEqual(row());
  });

  it('can re-point a line its code confirmed', () => {
    // Підтверджене кодом теж можна перевибрати - саме так передумують.
    const confirmed = toTableRows([line()])[0]!;

    expect(withChoice(confirmed, second()).itemCode).toBe('T2');
  });
});

describe('byConfidence', () => {
  /** Рядки таблиці з самими оцінками — більше тут нічого не вирішує. */
  const scored = (...marks: (number | null)[]) =>
    toTableRows(
      marks.map((confidence, index) => line({ line: index + 1, index: index + 1, confidence })),
    );

  const marksOf = (rows: ReturnType<typeof scored>) => rows.map((row) => row.confidence);

  it('puts the surest match first', () => {
    expect(marksOf(byConfidence(scored(40, 98, 71), 'desc'))).toEqual([98, 71, 40]);
  });

  it('turns around the other way', () => {
    expect(marksOf(byConfidence(scored(40, 98, 71), 'asc'))).toEqual([40, 71, 98]);
  });

  it('keeps an unscored line last, whichever way it is sorted', () => {
    // `null` — товар, обраний руками. Як нуль він очолював би таблицю при
    // «знизу вгору», на місці «агент певен найменше» — а агент не казав нічого.
    expect(marksOf(byConfidence(scored(40, null, 98), 'desc'))).toEqual([98, 40, null]);
    expect(marksOf(byConfidence(scored(40, null, 98), 'asc'))).toEqual([40, 98, null]);
  });

  it('leaves equal scores in the order the RFQ had them', () => {
    const rows = byConfidence(scored(71, 71, 71), 'desc');

    expect(rows.map((row) => row.line)).toEqual([1, 2, 3]);
  });

  it('does not reorder the rows it was handed', () => {
    // Масив належить викликачу; перевпорядкувати його нишком означало б
    // перевпорядкувати позиції RFQ.
    const rows = scored(40, 98);
    byConfidence(rows, 'desc');

    expect(marksOf(rows)).toEqual([40, 98]);
  });
});

describe('inOrder', () => {
  const rows = toTableRows([1, 2, 3].map((n) => line({ line: n, index: n, confidence: n * 10 })));
  const linesOf = (shown: typeof rows) => shown.map((row) => row.line);

  it('keeps the order it was given, whatever the scores are now', () => {
    const remembered = [rows[2]!.key, rows[0]!.key, rows[1]!.key];
    // Підтвердження міняє оцінку; порядок від цього не зсувається.
    const changed = rows.map((row) => ({ ...row, confidence: null }));

    expect(linesOf(inOrder(changed, remembered))).toEqual([3, 1, 2]);
  });

  it('puts a line it does not know last, in the order it came', () => {
    expect(linesOf(inOrder(rows, [rows[1]!.key]))).toEqual([2, 1, 3]);
  });

  it('does not reorder the rows it was handed', () => {
    inOrder(rows, [rows[2]!.key]);

    expect(linesOf(rows)).toEqual([1, 2, 3]);
  });
});
