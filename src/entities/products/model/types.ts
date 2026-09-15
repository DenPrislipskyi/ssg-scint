/**
 * Товар так, як його тримає аркуш деска.
 *
 * Не той самий каталог, що в `entities/catalog` — той обслуговує екрани
 * котирування і живе на фікстурах POC. Цей — рядки справжнього аркуша, з
 * якого мапляться позиції RFQ.
 */
export interface SheetProduct {
  itemCode: string;
  description: string;
  /** Увесь рядок аркуша — той самий, що несе кандидат. */
  item: Record<string, string>;
}

export interface ProductPage {
  items: SheetProduct[];
  /**
   * Скільки рядків підійшло, а не скільки повернулося. Список, який каже
   * «50 результатів», коли їх чотириста, привчає перестати уточнювати.
   */
  total: number;
}

export interface ProductFilters {
  /** Частина нашого коду товару. */
  code: string;
  /** Частина нашого опису товару. */
  description: string;
  limit?: number;
}
