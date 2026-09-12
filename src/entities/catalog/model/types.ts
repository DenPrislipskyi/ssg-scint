/** Код позиції товарного каталогу, напр. "T69128400". */
export type ItemCode = string;

/** Перші три символи коду — «родина товару» (T69, T85…). Визначає рейтинг постачальників. */
export type ProductFamily = string;

export type Unit = string;

export interface CatalogItem {
  code: ItemCode;
  name: string;
  inStock: boolean;
  /** Складська собівартість. 0 означає, що товару немає на складі. */
  costPrice: number;
  unit: Unit;
}

/** Правило фасування: 1 упаковка item-а = quantity одиниць unit. */
export interface PackSpec {
  code: ItemCode;
  unit: Unit;
  quantity: number;
}

export interface UnitConversion {
  from: Unit;
  to: Unit;
  factor: number;
}

/** Довідники каталогу, які потрібні майже кожній похідній функції. */
export interface CatalogData {
  items: CatalogItem[];
  itemsByCode: Record<ItemCode, CatalogItem>;
  packSpecs: Record<ItemCode, PackSpec>;
  conversions: Record<string, number>;
  units: Unit[];
}
