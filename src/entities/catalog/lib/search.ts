import { CATALOG_SEARCH_LIMIT } from '@/shared/config/constants';
import type { CatalogItem, ItemCode } from '@/entities/catalog/model/types';

export interface CatalogSearchResult {
  /** Позиції, які система заздалегідь запропонувала для цього рядка. */
  predicted: CatalogItem[];
  /** Решта збігів з item master. */
  master: CatalogItem[];
  /** Плоский список у порядку відображення — для клавіатурної навігації. */
  flat: CatalogItem[];
}

const matchesAllTerms = (item: CatalogItem, terms: string[]): boolean => {
  const haystack = `${item.name} ${item.code}`.toLowerCase();
  return terms.every((term) => haystack.includes(term));
};

/**
 * Пошук по каталогу з AND-семантикою по словах запиту.
 * Передбачені варіанти показуються окремою групою і не дублюються в «Item master».
 */
export const searchCatalog = (
  query: string,
  suggestedCodes: ItemCode[],
  items: CatalogItem[],
  itemsByCode: Record<ItemCode, CatalogItem>,
): CatalogSearchResult => {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const suggested = new Set(suggestedCodes);

  const predicted = suggestedCodes
    .map((code) => itemsByCode[code])
    .filter((item): item is CatalogItem => item != null && matchesAllTerms(item, terms));

  const master = items
    .filter((item) => !suggested.has(item.code) && matchesAllTerms(item, terms))
    .slice(0, CATALOG_SEARCH_LIMIT);

  return { predicted, master, flat: [...predicted, ...master] };
};

export interface TextSegment {
  text: string;
  isMatch: boolean;
}

/**
 * Розбиває рядок на сегменти зі збігами, щоб підсвітити їх у JSX.
 * Свідомо повертає дані, а не HTML — жодного dangerouslySetInnerHTML.
 */
export const highlightMatches = (text: string, query: string): TextSegment[] => {
  const terms = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

  if (terms.length === 0) return [{ text, isMatch: false }];

  const pattern = new RegExp(`(${terms.join('|')})`, 'ig');
  const matcher = new RegExp(`^(?:${terms.join('|')})$`, 'i');

  return text
    .split(pattern)
    .filter((part) => part !== '')
    .map((part) => ({ text: part, isMatch: matcher.test(part) }));
};
