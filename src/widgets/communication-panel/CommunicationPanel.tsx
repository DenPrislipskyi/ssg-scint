import { useClarificationDraft } from '@/features/clarification-draft';
import { useQuoteDetail } from '@/pages/quote-detail/model/QuoteDetailContext';
import { useCommunicationStore } from '@/pages/quote-detail/model/communicationStore';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { IconClose } from '@/shared/ui/icons';
import { CustomerThread } from '@/widgets/communication-panel/CustomerThread';
import { SupplierThread } from '@/widgets/communication-panel/SupplierThread';

/** Права колонка: два канали листування — з клієнтом і з постачальниками. */
export const CommunicationPanel = () => {
  const { quote } = useQuoteDetail();
  const { channel, close, open } = useCommunicationStore();
  const draft = useClarificationDraft();

  return (
    <Card className="sticky top-[72px] flex max-h-[calc(100vh-90px)] flex-col self-start overflow-hidden">
      <div className="flex items-center gap-1 border-b border-line2 px-2.5 pt-2">
        {(['customer', 'supplier'] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => open(value)}
            aria-selected={channel === value}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-[13.5px] font-medium',
              channel === value ? 'border-ink text-ink' : 'border-transparent text-ink2 hover:text-ink',
            )}
          >
            {value === 'customer' ? `Customer · ${quote.header.contactName}` : 'Supplier emails'}
          </button>
        ))}

        <span className="ml-auto" />
        {channel === 'customer' && (
          <Button size="xs" className="my-1" onClick={() => void draft.openDraft()}>
            + Email to customer
          </Button>
        )}
        <Button size="xs" className="my-1 ml-1.5" onClick={close} aria-label="Close panel">
          <IconClose className="size-3.5" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
        {channel === 'customer' ? <CustomerThread /> : <SupplierThread />}
      </div>
    </Card>
  );
};
