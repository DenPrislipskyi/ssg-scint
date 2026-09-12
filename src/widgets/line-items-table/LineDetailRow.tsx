import { supplierNeedingInfo } from '@/entities/quote/lib/lineState';
import type { LineMessage, QuoteLine } from '@/entities/quote/model/types';
import { useQuoteDetail } from '@/pages/quote-detail/model/QuoteDetailContext';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/Button';
import { Input, Textarea } from '@/shared/ui/Field';
import { AttachmentPill } from '@/shared/ui/Attachment';
import { Tag } from '@/shared/ui/Tag';

const AUTHOR_BORDER: Record<LineMessage['author'], string> = {
  supplier: 'border-l-[3px] border-l-warn',
  customer: 'border-l-[3px] border-l-sup',
  cs: 'border-l-[3px] border-l-line',
};

const Heading = ({ children }: { children: string }) => (
  <h4 className="m-0 mb-1.5 text-xs font-medium tracking-wider text-ink3 uppercase">{children}</h4>
);

const Message = ({
  who,
  at,
  children,
  actions,
  tone,
}: {
  who: string;
  at: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  tone: LineMessage['author'];
}) => (
  <div
    className={cn(
      'mb-1.5 grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-1 rounded-lg border border-line2 bg-white px-2.5 py-2 text-[13px]',
      AUTHOR_BORDER[tone],
    )}
  >
    <span className="font-medium whitespace-nowrap">
      {who}
      <small className="ml-1.5 font-normal text-ink3">{at}</small>
    </span>
    <span className="col-start-2 text-ink2">{children}</span>
    {actions && <span className="col-start-2 mt-1 flex flex-wrap gap-1.5">{actions}</span>}
  </div>
);

export interface LineDetailRowProps {
  line: QuoteLine;
  onAskCustomer: () => void;
}

/** Розгорнутий блок під рядком: комунікація, ремарка клієнта, внутрішній коментар. */
export const LineDetailRow = ({ line, onAskCustomer }: LineDetailRowProps) => {
  const { catalog, suppliers, actions } = useQuoteDetail();

  const commentingSuppliers = line.suppliers.filter(
    (entry) => entry.status === 'replied' && (entry.infoRequest || entry.offer?.remarks),
  );
  const blocked = supplierNeedingInfo(line);
  const hasContent = commentingSuppliers.length > 0 || line.messages.length > 0;

  return (
    <div className="grid gap-[18px] md:grid-cols-[1.2fr_1fr]">
      <div>
        <Heading>Supplier Comments · communication on this line</Heading>

        {commentingSuppliers.map((entry) => {
          const supplier = suppliers.byId[entry.supplierId];
          const needsInfo = entry.infoRequest && !entry.isInfoResolved;
          return (
            <Message
              key={entry.supplierId}
              tone="supplier"
              who={supplier?.name ?? entry.supplierId}
              at={entry.repliedAt ?? ''}
              actions={
                needsInfo ? (
                  <>
                    {line.attachment && (
                      <Button
                        size="xs"
                        variant="primary"
                        onClick={() =>
                          void actions.resolveInfoRequest(line.id, entry.supplierId, 'forward')
                        }
                      >
                        Forward customer&apos;s {line.attachment}
                      </Button>
                    )}
                    <Button size="xs" onClick={onAskCustomer}>
                      Ask customer
                    </Button>
                    <Button
                      size="xs"
                      onClick={() => void actions.removeLineSupplier(line.id, entry.supplierId)}
                    >
                      Drop this supplier
                    </Button>
                    <Button
                      size="xs"
                      onClick={() =>
                        void actions.resolveInfoRequest(line.id, entry.supplierId, 'ignore')
                      }
                    >
                      Ignore · use other offers
                    </Button>
                  </>
                ) : undefined
              }
            >
              {entry.infoRequest ?? entry.offer?.remarks}
              {entry.isInfoResolved && entry.infoRequest && (
                <>
                  {' '}
                  <Tag tone="ok">answered</Tag>
                </>
              )}
            </Message>
          );
        })}

        {line.messages.map((message, index) => (
          <Message
            key={index}
            tone={message.author}
            who={
              message.author === 'supplier'
                ? (suppliers.byId[message.supplierId ?? '']?.name ?? 'Supplier')
                : message.author === 'customer'
                  ? 'Customer'
                  : 'Priya N.'
            }
            at={message.at}
          >
            {message.text}
            {message.attachment && (
              <>
                {' '}
                <AttachmentPill name={message.attachment} />
              </>
            )}
          </Message>
        ))}

        {!hasContent && <div className="text-[13px] text-ink4">No messages yet.</div>}
        {blocked && null}
      </div>

      <div>
        <Heading>Customer remark · from the RFQ email</Heading>
        <Input
          className="mb-2.5 w-full"
          defaultValue={line.customerRemark ?? ''}
          placeholder="e.g. preferred supplier, brand, urgency"
          onBlur={(event) => void actions.updateLine(line.id, { customerRemark: event.target.value })}
          aria-label="Customer remark"
        />

        <Heading>Quote Comments (internal)</Heading>
        <Textarea
          className="min-h-[60px] w-full"
          defaultValue={line.internalComment}
          placeholder="Notes for this line — visible to the team, not to the customer"
          onBlur={(event) => void actions.updateLine(line.id, { internalComment: event.target.value })}
          aria-label="Internal comment"
        />

        <div className="mt-1.5 text-[13px] text-ink4">
          Customer attachment:{' '}
          {line.attachment ? <AttachmentPill name={line.attachment} /> : 'none'} · Quotation
          Description:{' '}
          <span className="text-ink2">
            {line.matchedItemCode ? (catalog.itemsByCode[line.matchedItemCode]?.name ?? '—') : '—'}
          </span>
        </div>
      </div>
    </div>
  );
};
