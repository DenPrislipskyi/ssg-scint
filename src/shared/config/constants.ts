/** Бізнес-константи. Жодних магічних чисел у компонентах. */

/** Максимум постачальників, яких можна призначити на один рядок. */
export const MAX_SUPPLIERS_PER_LINE = 5;

/** Мінімальна маржа без погодження менеджера. */
export const MARGIN_FLOOR = 0.1;

/** Термін постачання, з якого рядок не встигає у контейнер. */
export const LEAD_TIME_CUTOFF_DAYS = 9;

/** Скільки часу тримається toast, мс. */
export const TOAST_DURATION_MS = 2600;

/** Порогове значення часу обробки, після якого воно підсвічується як прострочене. */
export const PROCESSING_TIME_ALERT_HOURS = 24;

/** Скільки позицій item master показувати в комбобоксі поза передбаченими. */
export const CATALOG_SEARCH_LIMIT = 8;

/** Доступні маржі у випадному списку Client Pricing. */
export const MARGIN_OPTIONS = [
  { value: 0.14, label: '14 %' },
  { value: 0.12, label: '12 %' },
  { value: 0.11, label: '11 %' },
  { value: 0.09, label: '9 % · below floor' },
] as const;

export const STORE_TYPES = ['TECHNICAL', 'DECK', 'SAFETY', 'PROVISIONS', 'STATIONARY'] as const;
export const PRODUCT_CATEGORIES = ['TECHNICAL', 'DECK', 'ENGINE', 'SAFETY', 'PROVISIONS'] as const;
