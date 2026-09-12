import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { useToast } from '@/shared/ui/Toast';
import { useQuoteDetail } from '@/pages/quote-detail/model/QuoteDetailContext';

/**
 * Питає, чи бере користувач котирування в роботу.
 * Показується один раз — після відповіді котирування вважається обробленим.
 */
export const AssignQuoteModal = () => {
  const { quote, actions } = useQuoteDetail();
  const toast = useToast();

  const shouldAsk = !quote.isTaken && !quote.isDeclined;

  const accept = async () => {
    await actions.takeOwnership(true);
    toast.show(`You are Responsible User for ${quote.header.reference}`);
  };

  const decline = async () => {
    await actions.takeOwnership(false);
    toast.show('Left unassigned — anyone can take it');
  };

  return (
    <Modal
      open={shouldAsk}
      onClose={decline}
      title="Assign this quote to you?"
      width="400px"
      showCloseButton={false}
      footer={
        <>
          <span className="ml-auto" />
          <Button onClick={decline}>No</Button>
          <Button variant="primary" onClick={accept}>
            Yes
          </Button>
        </>
      }
    >
      <p className="m-0 text-sm text-ink2">
        {quote.header.customerName} · {quote.header.reference} · {quote.lines.length} line items
      </p>
    </Modal>
  );
};
