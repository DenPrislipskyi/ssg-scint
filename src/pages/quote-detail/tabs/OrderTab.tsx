import { useState } from 'react';

import { isBelowMarginFloor } from '@/entities/quote/lib/pricing';
import { useQuoteDetail } from '@/pages/quote-detail/model/QuoteDetailContext';
import { Button } from '@/shared/ui/Button';
import { useToast } from '@/shared/ui/Toast';
import { OrderTimeline } from '@/widgets/order-timeline/OrderTimeline';

const Panel = ({ children }: { children: React.ReactNode }) => (
  <div className="border-b border-line2 px-4 py-3 text-[13.5px]">{children}</div>
);

export const OrderTab = () => {
  const { quote, actions } = useQuoteDetail();
  const toast = useToast();
  const [applyLowerMargin, setApplyLowerMargin] = useState(true);

  const revise = async () => {
    await actions.reviseQuote(applyLowerMargin);
    toast.show('Revision R1 sent · customer accepted (demo)');
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 px-4 pt-3.5 pb-2.5">
        <Button disabled={Boolean(quote.sentAt) || isBelowMarginFloor(quote)}>
          Send quote by email
        </Button>
        <span className="ml-auto" />
        <Button
          disabled={!quote.acceptedAt || Boolean(quote.orderStage)}
          onClick={async () => {
            await actions.convertToOrder();
            toast.show('Converted to Order · SO created');
          }}
        >
          Convert to Order
        </Button>
        <Button
          disabled={quote.orderStage !== 'created'}
          onClick={async () => {
            await actions.markReadyForProcurement();
            toast.show('Marked Ready for Procurement');
          }}
        >
          Ready for Procurement
        </Button>
      </div>

      <div className="px-4 pb-2">
        <OrderTimeline quote={quote} />
      </div>

      {!quote.sentAt && (
        <Panel>
          <span className="text-ink4">
            Quote not sent yet. Correspondence with the customer and suppliers is in the
            Communication panel.
          </span>
        </Panel>
      )}

      {quote.sentAt && !quote.hasCustomerReply && (
        <Panel>
          <span className="text-ink4">
            Quote sent {quote.sentAt}. Waiting for the customer — see Communication › Customer.
          </span>
        </Panel>
      )}

      {quote.hasCustomerReply && !quote.revisedAt && (
        <Panel>
          <b className="font-medium">Customer replied</b>
          <span className="ml-1.5 text-xs text-ink3">today 08:12</span>
          <div className="text-ink2">Asks to add the missing line and 12 % margin.</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-4 text-ink2">
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="margin-decision"
                checked={applyLowerMargin}
                onChange={() => setApplyLowerMargin(true)}
              />
              Apply 12 %
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="margin-decision"
                checked={!applyLowerMargin}
                onChange={() => setApplyLowerMargin(false)}
              />
              Keep 14 %
            </label>
            <Button size="xs" variant="primary" onClick={revise}>
              Revise &amp; re-send
            </Button>
          </div>
        </Panel>
      )}

      {quote.revisedAt && (
        <Panel>
          <b className="font-medium">Revision R1 sent</b>
          <span className="ml-1.5 text-xs text-ink3">{quote.revisedAt}</span>
        </Panel>
      )}

      {quote.acceptedAt && (
        <Panel>
          <b className="font-medium">Accepted · PO received</b>
          <span className="ml-1.5 text-xs text-ink3">{quote.acceptedAt}</span>
        </Panel>
      )}

      {quote.orderStage && (
        <Panel>
          <b className="font-medium">
            {quote.orderStage === 'ready' ? 'SO created · Ready for Procurement' : 'SO created'}
          </b>
          <div className="text-[13px] text-ink2">
            Lines, suppliers and lead times carried over from the quote.
          </div>
        </Panel>
      )}
    </>
  );
};
