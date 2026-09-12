import quotesFixture from '@/shared/api/mock/fixtures/quotes.json';
import type { Quote, QuoteId } from '@/entities/quote/model/types';

const STORAGE_KEY = 'scint-quotes-v1';

const clone = <T>(value: T): T => structuredClone(value);

/**
 * In-memory сховище котирувань із дзеркалом у localStorage.
 * Замінює localStorage-блоб прототипу і живе рівно стільки, скільки mock-режим.
 */
export class MockStore {
  private quotes: Map<QuoteId, Quote>;

  constructor() {
    this.quotes = new Map(this.load().map((quote) => [quote.header.id, quote]));
  }

  private load(): Quote[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as Quote[];
    } catch {
      // Пошкоджений або недоступний localStorage — стартуємо з чистих фікстур.
    }
    return clone(quotesFixture as unknown as Quote[]);
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...this.quotes.values()]));
    } catch {
      // Приватний режим / переповнена квота — працюємо тільки в пам'яті.
    }
  }

  all(): Quote[] {
    return clone([...this.quotes.values()]);
  }

  get(id: QuoteId): Quote {
    const quote = this.quotes.get(id);
    if (!quote) throw new Error(`Quote not found: ${id}`);
    return clone(quote);
  }

  /** Застосовує зміну до копії котирування і зберігає результат. */
  update(id: QuoteId, mutate: (draft: Quote) => void): Quote {
    const draft = this.get(id);
    mutate(draft);
    this.quotes.set(id, draft);
    this.persist();
    return clone(draft);
  }

  reset(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    this.quotes = new Map(
      clone(quotesFixture as unknown as Quote[]).map((quote) => [quote.header.id, quote]),
    );
  }
}
