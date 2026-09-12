import { Suspense, useEffect, useMemo } from 'react';
import { Navigate, Outlet, useParams } from 'react-router';

import { useBreadcrumb } from '@/app/AppLayout';
import { AssignQuoteModal } from '@/features/assign-quote/AssignQuoteModal';
import { useCatalog } from '@/entities/catalog/hooks/useCatalog';
import { useQuote } from '@/entities/quote/hooks/useQuote';
import { useQuoteActions } from '@/entities/quote/hooks/useQuoteActions';
import { useSuppliers } from '@/entities/supplier/hooks/useSuppliers';
import { QuoteDetailProvider } from '@/pages/quote-detail/model/QuoteDetailContext';
import { useCommunicationStore } from '@/pages/quote-detail/model/communicationStore';
import { QuoteHeaderBar } from '@/pages/quote-detail/QuoteHeaderBar';
import { QuoteMetaGrid } from '@/pages/quote-detail/QuoteMetaGrid';
import { QuoteTabs } from '@/pages/quote-detail/QuoteTabs';
import { paths } from '@/app/router/paths';
import { cn } from '@/shared/lib/cn';
import { Card } from '@/shared/ui/Card';
import { CommunicationPanel } from '@/widgets/communication-panel/CommunicationPanel';

const QuoteDetailContent = ({ quoteId }: { quoteId: string }) => {
  const quote = useQuote(quoteId);
  const catalog = useCatalog();
  const suppliers = useSuppliers();
  const actions = useQuoteActions(quoteId);
  const { setBreadcrumb } = useBreadcrumb();
  const isPanelOpen = useCommunicationStore((state) => state.isOpen);

  useEffect(() => {
    setBreadcrumb(`› RFQ-${quote.header.reference}`);
    return () => setBreadcrumb('');
  }, [quote.header.reference, setBreadcrumb]);

  const value = useMemo(
    () => ({ quote, catalog, suppliers, actions }),
    [quote, catalog, suppliers, actions],
  );

  return (
    <QuoteDetailProvider value={value}>
      <div className="mx-auto max-w-[1600px] px-6 pt-6 pb-8">
        <QuoteHeaderBar />

        <div
          className={cn(
            'grid gap-4',
            isPanelOpen
              ? 'grid-cols-1 max-[1000px]:grid-cols-1 min-[1000px]:grid-cols-[minmax(0,1fr)_460px]'
              : 'grid-cols-1',
          )}
        >
          <div className="min-w-0">
            <Card className="mb-4">
              <QuoteMetaGrid />
              <QuoteTabs />
              <Suspense fallback={<div className="p-6 text-ink3">Loading tab…</div>}>
                <Outlet />
              </Suspense>
            </Card>
          </div>

          {isPanelOpen && <CommunicationPanel />}
        </div>
      </div>

      <AssignQuoteModal />
    </QuoteDetailProvider>
  );
};

export const QuoteDetailPage = () => {
  const { quoteId } = useParams();
  if (!quoteId) return <Navigate to={paths.rfqList} replace />;
  return <QuoteDetailContent quoteId={quoteId} />;
};
