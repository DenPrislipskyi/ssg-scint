import type { CatalogData } from '@/entities/catalog/model/types';
import { buildClarificationText } from '@/entities/mail/lib/templates';
import type { LineId, Mail, Quote, QuoteLine } from '@/entities/quote/model/types';

/**
 * Рядки, які автоматично потрапляють у чернетку уточнення:
 * не зіставлені з каталогом, не виключені і ще не запитані у клієнта.
 */
export const linesNeedingClarification = (quote: Quote): QuoteLine[] =>
  quote.lines.filter((line) => !line.matchedItemCode && !line.isExcluded && !line.isAsked);

export const findClarificationDraft = (quote: Quote): Mail | undefined =>
  quote.mails.find((mail) => mail.kind === 'clarification' && mail.status === 'draft');

/**
 * Тримає чернетку уточнення в актуальному стані.
 *
 * Склад чернетки = автоматичні рядки ∪ додані вручну (які досі потребують уточнення).
 * Текст перегенеровується лише коли склад рядків змінився — щоб не затирати
 * правки користувача. Порожня чернетка видаляється.
 *
 * Функція мутує переданий об'єкт: викликається всередині оновлення сховища.
 */
export const syncClarificationDraft = (
  quote: Quote,
  catalog: CatalogData,
  { keepManual = true }: { keepManual?: boolean } = {},
): LineId[] => {
  const auto = linesNeedingClarification(quote).map((line) => line.id);
  const draft = findClarificationDraft(quote);
  if (!draft) return auto;

  const stillRelevant = (lineId: LineId) => {
    const line = quote.lines.find((candidate) => candidate.id === lineId);
    return Boolean(line && !line.matchedItemCode && !line.isExcluded && !line.isAsked);
  };

  const manual = keepManual ? draft.lineIds.filter(stillRelevant) : [];
  const order = new Map(quote.lines.map((line, index) => [line.id, index]));
  const next = [...new Set([...auto, ...manual])].sort(
    (a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0),
  );

  if (next.length === 0) {
    quote.mails = quote.mails.filter((mail) => mail.id !== draft.id);
    return auto;
  }

  const changed = next.join(',') !== draft.lineIds.join(',');
  draft.lineIds = next;
  if (changed) {
    const lines = next
      .map((lineId) => quote.lines.find((line) => line.id === lineId))
      .filter((line): line is QuoteLine => Boolean(line));
    draft.body = buildClarificationText(lines, quote.header, catalog);
  }

  return next;
};
