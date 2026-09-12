import { LEAD_TIME_CUTOFF_DAYS, MARGIN_FLOOR } from '@/shared/config/constants';
import { round2 } from '@/shared/lib/format';
import type { CatalogData, Unit } from '@/entities/catalog/model/types';
import {
  hasPricedOffer,
  isStockLine,
  selectedSupplier,
  supplierNeedingInfo,
} from '@/entities/quote/lib/lineState';
import { resolveShipSupplyQuantity } from '@/entities/quote/lib/shipSupplyQty';
import type { LineId, Quote, QuoteLine } from '@/entities/quote/model/types';

/** Округлення до найближчих 0.5 — політика ціноутворення компанії. */
export const roundToHalf = (value: number): number => Math.round(value * 2) / 2;

/**
 * Ціна продажу з націнки.
 * Дешеві позиції (< $5) округлюються до центів, решта — до 0.5,
 * щоб прайс виглядав «рівним».
 */
export const applyMargin = (cost: number, margin: number): number =>
  cost < 5 ? round2(cost * (1 + margin)) : roundToHalf(cost * (1 + margin));

export const isBelowMarginFloor = (quote: Quote): boolean =>
  quote.pricing.stockMargin < MARGIN_FLOOR || quote.pricing.nonStockMargin < MARGIN_FLOOR;

export type PriceSourceKind = 'offer' | 'stock' | 'jit' | 'none';

export interface PricingCheck {
  label: string;
  tone: 'ok' | 'warn' | 'bad' | 'sup' | 'ns' | 'info';
}

export interface PricingRow {
  lineId: LineId;
  line: QuoteLine;
  itemName: string;
  sourceKind: PriceSourceKind;
  sourceLabel: string;
  /** Собівартість за нашу одиницю. null — ціни ще немає. */
  cost: number | null;
  isStock: boolean;
  quantity: number;
  unit: Unit;
  customerQuantity: number;
  customerUnit: Unit;
  check: PricingCheck | null;
}

const checkFor = (line: QuoteLine, catalog: CatalogData): PricingCheck | null => {
  if (supplierNeedingInfo(line)) return { label: 'Supplier needs info', tone: 'info' };
  if (hasPricedOffer(line)) return { label: 'Choose supplier', tone: 'warn' };
  if (line.suppliers.some((s) => s.status !== 'assigned'))
    return { label: 'Waiting for suppliers', tone: 'sup' };
  if (line.matchedItemCode) {
    const isStock = isStockLine(line, catalog);
    if (!isStock) return { label: 'No Web Inquiry', tone: 'bad' };
    const ssq = resolveShipSupplyQuantity(line, catalog);
    return ssq.quantity == null ? { label: 'SS Qty missing', tone: 'bad' } : null;
  }
  if (line.isAsked) return { label: 'Asked customer', tone: 'ns' };
  if (line.suggestedItemCodes.length) return { label: 'Variant not chosen', tone: 'warn' };
  return { label: 'Not found', tone: 'bad' };
};

/** Рядки для вкладки Client Pricing і для документа котирування. */
export const buildPricingRows = (quote: Quote, catalog: CatalogData): PricingRow[] =>
  quote.lines
    .filter((line) => !line.isExcluded)
    .map((line) => {
      const ssq = resolveShipSupplyQuantity(line, catalog);
      const item = line.matchedItemCode ? catalog.itemsByCode[line.matchedItemCode] : undefined;
      const base = {
        lineId: line.id,
        line,
        itemName: item?.name ?? line.customerDescription,
        quantity: ssq.quantity ?? line.requestedQuantity,
        unit: ssq.unit ?? line.customerUnit,
        customerQuantity: line.requestedQuantity,
        customerUnit: line.customerUnit,
      };

      const chosen = selectedSupplier(line);
      if (chosen?.offer) {
        const isLate = chosen.offer.leadTime.days >= LEAD_TIME_CUTOFF_DAYS;
        return {
          ...base,
          sourceKind: 'offer' as const,
          sourceLabel: 'supplier',
          cost: round2(chosen.offer.unitPrice),
          isStock: false,
          check: isLate ? { label: 'Lead time · cut-off', tone: 'warn' as const } : null,
        };
      }

      if (line.suppliers.some((s) => s.status !== 'assigned')) {
        return {
          ...base,
          sourceKind: hasPricedOffer(line) ? ('offer' as const) : ('jit' as const),
          sourceLabel: 'JIT',
          cost: null,
          isStock: false,
          check: checkFor(line, catalog),
        };
      }

      if (item) {
        return {
          ...base,
          sourceKind: item.inStock ? ('stock' as const) : ('jit' as const),
          sourceLabel: item.inStock ? 'GPL · stock' : 'JIT',
          cost: item.inStock && ssq.quantity != null ? item.costPrice : null,
          isStock: item.inStock,
          check: checkFor(line, catalog),
        };
      }

      return {
        ...base,
        sourceKind: 'none' as const,
        sourceLabel: '—',
        cost: null,
        isStock: false,
        check: checkFor(line, catalog),
      };
    });

export interface PricedRow extends PricingRow {
  cost: number;
  margin: number;
  unitSellingPrice: number;
  total: number;
}

/** Рядки, для яких уже є ціна, з застосованою відповідною маржею. */
export const withPrices = (rows: PricingRow[], quote: Quote): PricedRow[] =>
  rows
    .filter((row): row is PricingRow & { cost: number } => row.cost != null)
    .map((row) => {
      const margin = row.isStock ? quote.pricing.stockMargin : quote.pricing.nonStockMargin;
      const unitSellingPrice = applyMargin(row.cost, margin);
      return { ...row, margin, unitSellingPrice, total: unitSellingPrice * row.quantity };
    });

export interface PricingTotals {
  netTotal: number;
  freight: number;
  grossTotal: number;
  pricedCount: number;
  unpricedCount: number;
}

export const getPricingTotals = (rows: PricingRow[], quote: Quote): PricingTotals => {
  const priced = withPrices(rows, quote);
  const netTotal = priced.reduce((sum, row) => sum + row.total, 0);
  const freight = quote.pricing.freightAmount;
  return {
    netTotal,
    freight,
    grossTotal: netTotal + freight,
    pricedCount: priced.length,
    unpricedCount: rows.length - priced.length,
  };
};

/** Ціна за одиницю клієнта — те, що бачить клієнт у документі. */
export const customerUnitPrice = (row: PricedRow): number =>
  round2(row.total / row.customerQuantity);
