import type { Unit } from '@/entities/catalog/model/types';

export const conversionKey = (from: Unit, to: Unit): string =>
  `${from.toLowerCase()}>${to.toLowerCase()}`;

/**
 * Множник переведення одиниці клієнта в нашу.
 * `null`, якщо правила для цієї пари немає — рядок піде як «unknown».
 */
export const conversionFactor = (
  conversions: Record<string, number>,
  from: Unit,
  to: Unit,
): number | null => conversions[conversionKey(from, to)] ?? null;

/** Округлення вгору до 3 знаків — щоб не замовляти менше, ніж просив клієнт. */
export const ceilTo3 = (value: number): number => Math.ceil(value * 1000) / 1000;
