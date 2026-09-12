import type { CatalogData } from '@/entities/catalog/model/types';
import type { LineStatus, LineSupplier, QuoteLine } from '@/entities/quote/model/types';

/** Обраний офер постачальника на рядку, якщо він є. */
export const selectedSupplier = (line: QuoteLine): LineSupplier | undefined =>
  line.suppliers.find((supplier) => supplier.isSelected);

/** Постачальник, який відповів, але просить інформацію і його ще не «закрили». */
export const supplierNeedingInfo = (line: QuoteLine): LineSupplier | undefined =>
  line.suppliers.find(
    (supplier) => supplier.status === 'replied' && supplier.infoRequest && !supplier.isInfoResolved,
  );

export const hasPricedOffer = (line: QuoteLine): boolean =>
  line.suppliers.some((supplier) => supplier.status === 'replied' && supplier.offer !== null);

/** Товар зіставлено з каталогом і він є на складі. */
export const isStockLine = (line: QuoteLine, catalog: CatalogData): boolean => {
  if (!line.matchedItemCode) return false;
  return catalog.itemsByCode[line.matchedItemCode]?.inStock ?? false;
};

/**
 * Статус рядка. Порядок перевірок визначає пріоритет і його не можна міняти:
 * виключення → обраний офер → є ціни → потрібна інфа → чекаємо → запитали клієнта
 * → варіанти/не знайдено → склад → потрібен постачальник.
 */
export const getLineStatus = (line: QuoteLine, catalog: CatalogData): LineStatus => {
  if (line.isExcluded) return 'excluded';
  if (selectedSupplier(line)) return 'supplierSelected';
  if (hasPricedOffer(line)) return 'selectSupplier';
  if (supplierNeedingInfo(line)) return 'supplierNeedsInfo';
  if (line.suppliers.some((supplier) => supplier.status === 'awaiting')) return 'inquirySent';
  if (!line.matchedItemCode && line.isAsked) return 'askedCustomer';
  if (!line.matchedItemCode) return line.suggestedItemCodes.length ? 'chooseVariant' : 'notFound';
  if (isStockLine(line, catalog)) return 'ready';
  return 'needsSupplier';
};

/** Лічильник "N of M" для статусів очікування/відповідей. */
export const supplierReplyCounts = (line: QuoteLine): { replied: number; total: number } => {
  const replied = line.suppliers.filter((supplier) => supplier.status === 'replied').length;
  const awaiting = line.suppliers.filter((supplier) => supplier.status === 'awaiting').length;
  return { replied, total: replied + awaiting };
};

/** Постачальники, яким уже щось надсилали (не «щойно призначені»). */
export const engagedSuppliers = (line: QuoteLine): LineSupplier[] =>
  line.suppliers.filter((supplier) => supplier.status !== 'assigned');

export const unresolvedInfoCount = (lines: QuoteLine[]): number =>
  lines.reduce(
    (total, line) =>
      total +
      line.suppliers.filter(
        (s) => s.status === 'replied' && s.infoRequest && !s.isInfoResolved,
      ).length,
    0,
  );
