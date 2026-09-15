/**
 * Аркуш товарів на фікстурах — один на всі mock-репозиторії.
 *
 * Той самий рядок несе і кандидат позиції, і пункт ручного вибору, і товар,
 * на якому позицію зупинили. Два описи одного аркуша розходяться першої ж
 * дороги: колонку додали в одному місці, і екран, який читає з іншого,
 * мовчить — рівно так і сталося з `Supplier`.
 *
 * Колонки й `Product Source` — як у справжньому аркуші, який знає рівно два
 * джерела: `JIT` (везе постачальник) і `Stock` (лежить у нас).
 */
export const sheetRow = (
  itemCode: string,
  description: string,
  source: string,
  uom: string,
  supplier: string,
  customer: { code: string; description: string } = { code: '', description: '' },
): Record<string, string> => ({
  'Customer Code': customer.code,
  'Item Code': itemCode,
  'Customer Description': customer.description,
  'Item Description / SSG Description': description,
  'Product Source': source,
  UOM: uom,
  Supplier: supplier,
});

const NORTHGATE = 'Northgate Marine Fasteners Ltd.';
const SEABOARD = 'Seaboard Industrial Supplies FZE';
const HARBOUR = 'Harbour Safety Equipment Co.';
const MERIDIAN = 'Meridian Tools & Hardware LLC';

/** Кілька рядків — достатньо, щоб обидва фільтри було видно в роботі. */
export const MOCK_SHEET: Record<string, string>[] = [
  sheetRow('T69128400', 'HEX HEAD BOLT/NUT STEEL UNGALV, M16 X 65MM', 'Stock', 'SET', NORTHGATE, {
    code: '691284',
    description: 'Hexagon Head Bolts Full Threaded (Bolt with Nut) M16*65',
  }),
  sheetRow('T69133100', 'HEX HEAD BOLT/NUT STEEL UNGALV, M20 X 80MM', 'JIT', 'SET', NORTHGATE, {
    code: '691331',
    description: 'Hexagon Head Bolts Full Threaded (Bolt with Nut) M20*80',
  }),
  sheetRow('T69114500', 'HEX HEAD BOLT/NUT STEEL UNGALV, M8 X 50MM', 'JIT', 'SET', SEABOARD, {
    code: '691145',
    description: 'Hexagon Head Bolts Full Threaded (Bolt with Nut) M8*50',
  }),
  sheetRow('T85116300', 'WELDER GLOVES FIVE FINGERS', 'JIT', 'PRS', HARBOUR),
  sheetRow(
    'T33410300',
    'SAFETY SIGN DAVIT-LAUNCHED LIFERAFT 150 X 150 MM',
    'Stock',
    'PCS',
    HARBOUR,
  ),
  sheetRow('T65082300', 'RULE CONVEX STEEL METRIC 5MTR', 'Stock', 'PCS', MERIDIAN),
];

/** Наш опис товару — колонка, за якою його показують людині. */
export const descriptionOf = (row: Record<string, string>): string =>
  row['Item Description / SSG Description'] ?? '';

/** Рядок аркуша за нашим кодом. Порожньо — такого товару аркуш не несе. */
export const findInSheet = (itemCode: string): Record<string, string> | undefined =>
  MOCK_SHEET.find((row) => row['Item Code'] === itemCode);
