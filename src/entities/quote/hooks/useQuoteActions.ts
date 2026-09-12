import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useRepositories } from '@/app/providers/RepositoriesProvider';
import type {
  MailDraftPayload,
  QuoteLinePatch,
  SendQuotePayload,
  WebInquiryPayload,
} from '@/entities/quote/api/quoteRepository';
import { quoteKeys } from '@/entities/quote/api/queryKeys';
import type {
  LineId,
  Quote,
  QuoteId,
  QuoteOutputType,
  QuotePricingSettings,
} from '@/entities/quote/model/types';
import type { SupplierId } from '@/entities/supplier/model/types';

/**
 * Єдиний набір дій над котируванням для всього UI.
 * Кожна дія оновлює кеш деталки результатом і скидає кеш реєстру.
 */
export const useQuoteActions = (quoteId: QuoteId) => {
  const { quotes } = useRepositories();
  const queryClient = useQueryClient();

  const commit = useMemo(() => {
    const apply = (quote: Quote) => {
      queryClient.setQueryData(quoteKeys.detail(quoteId), quote);
      void queryClient.invalidateQueries({ queryKey: quoteKeys.lists() });
      return quote;
    };
    return apply;
  }, [queryClient, quoteId]);

  const { mutateAsync } = useMutation({
    mutationFn: (run: () => Promise<Quote>) => run(),
    onSuccess: commit,
  });

  return useMemo(
    () => ({
      takeOwnership: (accept: boolean) => mutateAsync(() => quotes.takeOwnership(quoteId, accept)),

      updateLine: (lineId: LineId, patch: QuoteLinePatch) =>
        mutateAsync(() => quotes.updateLine(quoteId, lineId, patch)),
      addLine: (description: string) => mutateAsync(() => quotes.addLine(quoteId, description)),
      clearLineItem: (lineId: LineId) => mutateAsync(() => quotes.clearLineItem(quoteId, lineId)),
      rejectSuggestions: (lineId: LineId) =>
        mutateAsync(() => quotes.rejectSuggestions(quoteId, lineId)),

      setLineSuppliers: (lineId: LineId, supplierIds: SupplierId[]) =>
        mutateAsync(() => quotes.setLineSuppliers(quoteId, lineId, supplierIds)),
      removeLineSupplier: (lineId: LineId, supplierId: SupplierId) =>
        mutateAsync(() => quotes.removeLineSupplier(quoteId, lineId, supplierId)),
      selectOffer: (lineId: LineId, supplierId: SupplierId | null) =>
        mutateAsync(() => quotes.selectOffer(quoteId, lineId, supplierId)),
      setFollowUpNote: (lineId: LineId, supplierId: SupplierId, note: string) =>
        mutateAsync(() => quotes.setFollowUpNote(quoteId, lineId, supplierId, note)),
      resolveInfoRequest: (lineId: LineId, supplierId: SupplierId, mode: 'forward' | 'ignore') =>
        mutateAsync(() => quotes.resolveInfoRequest(quoteId, lineId, supplierId, mode)),

      sendWebInquiry: (payload: WebInquiryPayload) =>
        mutateAsync(() => quotes.sendWebInquiry(quoteId, payload)),

      saveClarificationDraft: (payload: MailDraftPayload) =>
        mutateAsync(() => quotes.saveClarificationDraft(quoteId, payload)),
      sendMail: (mailId: string) => mutateAsync(() => quotes.sendMail(quoteId, mailId)),
      discardMail: (mailId: string) => mutateAsync(() => quotes.discardMail(quoteId, mailId)),
      applyProposedUpdate: (mailId: string, lineId: LineId, apply: boolean) =>
        mutateAsync(() => quotes.applyProposedUpdate(quoteId, mailId, lineId, apply)),

      updatePricing: (patch: Partial<QuotePricingSettings>) =>
        mutateAsync(() => quotes.updatePricing(quoteId, patch)),
      setOutputType: (outputType: QuoteOutputType) =>
        mutateAsync(() => quotes.setOutputType(quoteId, outputType)),
      sendQuote: (payload: SendQuotePayload) =>
        mutateAsync(() => quotes.sendQuote(quoteId, payload)),

      reviseQuote: (applyLowerMargin: boolean) =>
        mutateAsync(() => quotes.reviseQuote(quoteId, applyLowerMargin)),
      convertToOrder: () => mutateAsync(() => quotes.convertToOrder(quoteId)),
      markReadyForProcurement: () => mutateAsync(() => quotes.markReadyForProcurement(quoteId)),

      simulateSupplierReplies: async () => {
        const { quote, count } = await quotes.simulateSupplierReplies(quoteId);
        commit(quote);
        return count;
      },
      simulateCustomerClarificationAnswer: () =>
        mutateAsync(() => quotes.simulateCustomerClarificationAnswer(quoteId)),
      simulateCustomerQuoteReply: () =>
        mutateAsync(() => quotes.simulateCustomerQuoteReply(quoteId)),
    }),
    [commit, mutateAsync, quoteId, quotes],
  );
};

export type QuoteActions = ReturnType<typeof useQuoteActions>;
