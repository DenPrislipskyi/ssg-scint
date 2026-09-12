import type { LeadTime } from '@/entities/quote/model/types';

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/** Грошове форматування — єдине джерело правди для всього застосунку. */
export const usd = (value: number): string => USD.format(value);

/** "5 d 12 h" | "12 h" | "" — як у прототипі. */
export const formatLeadTime = (lead: LeadTime | null | undefined): string => {
  if (!lead) return '';
  if (lead.days) return lead.hours ? `${lead.days} d ${lead.hours} h` : `${lead.days} d`;
  return lead.hours ? `${lead.hours} h` : '';
};

export const formatPercent = (value: number): string => `${Math.round(value * 100)} %`;

/** Округлення до копійок без плаваючої похибки на типових значеннях. */
export const round2 = (value: number): number => Math.round(value * 100) / 100;

/** "12-Aug-2026 09:14" → "12-Aug-2026" */
export const dateOnly = (timestamp: string): string => timestamp.split(' ')[0] ?? timestamp;

/** Перше слово імені — для звертання в листах. */
export const firstName = (fullName: string): string => fullName.split(' ')[0] ?? fullName;

export const pluralSuffix = (count: number): string => (count === 1 ? '' : 's');

/** "TECHNICAL" → "Technical". Enum-и зберігаються в UPPER, показуються в Title Case. */
export const titleCase = (value: string): string =>
  value.charAt(0) + value.slice(1).toLowerCase();
