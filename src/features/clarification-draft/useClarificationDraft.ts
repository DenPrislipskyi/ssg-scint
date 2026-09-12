import { useCallback, useMemo } from 'react';

import { buildClarificationText } from '@/entities/mail/lib/templates';
import {
  findClarificationDraft,
  linesNeedingClarification,
} from '@/entities/quote/lib/clarification';
import type { LineId, QuoteLine } from '@/entities/quote/model/types';
import { useQuoteDetail } from '@/pages/quote-detail/model/QuoteDetailContext';
import { useCommunicationStore } from '@/pages/quote-detail/model/communicationStore';
import { pluralSuffix } from '@/shared/lib/format';
import { useToast } from '@/shared/ui/Toast';

export interface ClarificationDraftApi {
  /** Рядки, які автоматично потребують уточнення. */
  autoLineIds: Set<LineId>;
  /** Рядки, які зараз у чернетці (авто + додані вручну). */
  draftLineIds: Set<LineId>;
  draftId: string | null;
  /** Додає рядки в чернетку і відкриває панель клієнта. */
  addLines: (lines: QuoteLine[]) => Promise<void>;
  /** Відкриває чернетку, створюючи її за потреби. */
  openDraft: () => Promise<void>;
}

/**
 * Керує чернеткою листа-уточнення.
 *
 * Склад чернетки і її текст синхронізує репозиторій (чиста функція
 * `syncClarificationDraft`), тут лише дії користувача — щоб уникнути
 * циклів ре-рендеру, які дав би useEffect.
 */
export const useClarificationDraft = (): ClarificationDraftApi => {
  const { quote, catalog, actions } = useQuoteDetail();
  const toast = useToast();
  const openPanel = useCommunicationStore((state) => state.open);

  const autoLines = useMemo(() => linesNeedingClarification(quote), [quote]);
  const draft = useMemo(() => findClarificationDraft(quote), [quote]);

  const autoLineIds = useMemo(() => new Set(autoLines.map((line) => line.id)), [autoLines]);
  const draftLineIds = useMemo(() => new Set(draft?.lineIds ?? []), [draft]);

  const addLines = useCallback(
    async (lines: QuoteLine[]) => {
      const lineIds = lines.map((line) => line.id);
      const merged = [...new Set([...(draft?.lineIds ?? []), ...autoLineIds, ...lineIds])];
      const bodyLines = merged
        .map((id) => quote.lines.find((line) => line.id === id))
        .filter((line): line is QuoteLine => Boolean(line));

      const updated = await actions.saveClarificationDraft({
        lineIds: merged,
        body: buildClarificationText(bodyLines, quote.header, catalog),
      });

      const nextDraft = findClarificationDraft(updated);
      openPanel('customer', nextDraft?.id);

      const count = linesNeedingClarification(updated).length;
      toast.show(`Clarification draft · ${count} line${pluralSuffix(count)}`);
    },
    [actions, autoLineIds, catalog, draft, openPanel, quote.header, quote.lines, toast],
  );

  const openDraft = useCallback(async () => {
    if (draft) {
      openPanel('customer', draft.id);
      return;
    }
    await addLines([]);
  }, [addLines, draft, openPanel]);

  return {
    autoLineIds,
    draftLineIds,
    draftId: draft?.id ?? null,
    addLines,
    openDraft,
  };
};
