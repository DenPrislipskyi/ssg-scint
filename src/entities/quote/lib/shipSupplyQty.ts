import { ceilTo3, conversionFactor } from '@/entities/catalog/lib/units';
import type { CatalogData, Unit } from '@/entities/catalog/model/types';
import type { QuoteLine } from '@/entities/quote/model/types';

export interface ShipSupplyQuantity {
  /** Кількість у наших одиницях. null — коли товар ще не зіставлено. */
  quantity: number | null;
  /** Наша одиниця. */
  unit: Unit | null;
  /** Введено вручну користувачем. */
  isManual: boolean;
  /** Одиниця клієнта збігається з нашою — конверсія не потрібна. */
  isSameUnit: boolean;
  /** Правила конверсії не знайдено — кількість треба перевірити вручну. */
  isUnknown: boolean;
  /** Застосований множник, якщо конверсія була лінійною. */
  factor: number | null;
  /** Застосоване правило фасування, якщо кількість рахувалась по упаковках. */
  pack: { unit: Unit; quantity: number } | null;
}

const empty: ShipSupplyQuantity = {
  quantity: null,
  unit: null,
  isManual: false,
  isSameUnit: false,
  isUnknown: false,
  factor: null,
  pack: null,
};

/**
 * Переводить кількість у одиницях клієнта в наші складські одиниці.
 *
 * Пріоритет: ручне значення → збіг одиниць → таблиця конверсій → правило
 * фасування → «unknown» (кількість лишається клієнтською, UI просить перевірити).
 */
export const resolveShipSupplyQuantity = (
  line: QuoteLine,
  catalog: CatalogData,
): ShipSupplyQuantity => {
  if (!line.matchedItemCode) return empty;

  const item = catalog.itemsByCode[line.matchedItemCode];
  if (!item) return empty;

  const itemUnit = item.unit;
  const targetUnit = line.overriddenUnit ?? itemUnit;
  const customerUnit = (line.customerUnit ?? '').toLowerCase();

  if (line.manualShipSupplyQuantity != null) {
    return { ...empty, quantity: line.manualShipSupplyQuantity, unit: targetUnit, isManual: true };
  }

  if (customerUnit === targetUnit) {
    return { ...empty, quantity: line.requestedQuantity, unit: targetUnit, isSameUnit: true };
  }

  const factor = conversionFactor(catalog.conversions, customerUnit, targetUnit);
  if (factor != null) {
    return {
      ...empty,
      quantity: ceilTo3(line.requestedQuantity * factor),
      unit: targetUnit,
      factor,
    };
  }

  const pack = catalog.packSpecs[line.matchedItemCode];
  if (pack && pack.unit === customerUnit && targetUnit === itemUnit) {
    return {
      ...empty,
      quantity: Math.ceil(line.requestedQuantity / pack.quantity),
      unit: targetUnit,
      pack: { unit: pack.unit, quantity: pack.quantity },
    };
  }

  // Правила немає: показуємо кількість клієнта і позначаємо як таку, що потребує перевірки.
  return {
    ...empty,
    quantity: line.requestedQuantity,
    unit: line.overriddenUnit ?? line.customerUnit,
    isUnknown: true,
  };
};

/** Кількість і одиниця для відправки постачальнику / у документ. */
export const outboundQuantity = (
  line: QuoteLine,
  catalog: CatalogData,
): { quantity: number; unit: Unit } => {
  const ssq = resolveShipSupplyQuantity(line, catalog);
  return {
    quantity: ssq.quantity ?? line.requestedQuantity,
    unit: ssq.unit ?? line.customerUnit,
  };
};
