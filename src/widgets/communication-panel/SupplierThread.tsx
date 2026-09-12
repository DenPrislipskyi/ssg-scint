import { useMemo, useState } from 'react';

import { buildSupplierEvents } from '@/entities/mail/lib/threadBuilder';
import type { SupplierId } from '@/entities/supplier/model/types';
import { useQuoteDetail } from '@/pages/quote-detail/model/QuoteDetailContext';
import { useCommunicationStore } from '@/pages/quote-detail/model/communicationStore';
import { cn } from '@/shared/lib/cn';
import { AttachmentList } from '@/shared/ui/Attachment';
import { AccordionItem, DirectionBadge, MailBody } from '@/shared/ui/Accordion';
import { Button } from '@/shared/ui/Button';
import { useToast } from '@/shared/ui/Toast';

/** Хронологія листування з обраним постачальником по всіх рядках котирування. */
export const SupplierThread = () => {
  const { quote, catalog, suppliers } = useQuoteDetail();
  const toast = useToast();
  const activeSupplierId = useCommunicationStore((state) => state.activeSupplierId);
  const setSupplier = useCommunicationStore((state) => state.setSupplier);
  const [openEventIndex, setOpenEventIndex] = useState<number | null>(null);

  const supplierIds = useMemo(
    () => [
      ...new Set(quote.lines.flatMap((line) => line.suppliers.map((entry) => entry.supplierId))),
    ],
    [quote.lines],
  );

  const currentId: SupplierId | null =
    activeSupplierId && supplierIds.includes(activeSupplierId)
      ? activeSupplierId
      : (supplierIds[0] ?? null);

  const events = useMemo(
    () => (currentId ? buildSupplierEvents(quote, currentId, catalog) : []),
    [catalog, currentId, quote],
  );

  if (supplierIds.length === 0) {
    return (
      <div className="px-4 py-3 text-[13.5px] text-ink4">No suppliers assigned yet.</div>
    );
  }

  const supplier = currentId ? suppliers.byId[currentId] : undefined;
  const lastIndex = events.length - 1;
  const activeIndex = openEventIndex ?? lastIndex;

  return (
    <>
      <div className="flex flex-wrap gap-1.5 border-b border-line2 px-3 py-2.5">
        {supplierIds.map((id) => {
          const replied = quote.lines.reduce(
            (sum, line) =>
              sum +
              line.suppliers.filter((e) => e.supplierId === id && e.status === 'replied').length,
            0,
          );
          const waiting = quote.lines.reduce(
            (sum, line) =>
              sum +
              line.suppliers.filter((e) => e.supplierId === id && e.status === 'awaiting').length,
            0,
          );
          const isActive = id === currentId;

          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                setSupplier(id);
                setOpenEventIndex(null);
              }}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12.5px]',
                isActive ? 'border-ink bg-ink text-white' : 'border-line bg-white',
              )}
            >
              {suppliers.byId[id]?.name}
              {replied > 0 && (
                <span
                  className={cn(
                    'inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[11px]',
                    isActive ? 'bg-white/25 text-white' : 'bg-sup-soft text-sup',
                  )}
                >
                  {replied}
                </span>
              )}
              {replied === 0 && waiting > 0 && (
                <span className="inline-flex h-[18px] items-center rounded-full bg-warn-soft px-1.5 text-[11px] text-warn">
                  {waiting} waiting
                </span>
              )}
            </button>
          );
        })}
      </div>

      {supplier && (
        <div className="border-b border-line2 px-4 py-3 text-[13.5px]">
          <b className="font-medium">{supplier.name}</b>
          <span className="ml-1.5 text-xs text-ink3">{supplier.email}</span>
          <div className="text-[13px] text-ink4">
            on time {supplier.onTimePercent} % · {supplier.historyNote}
          </div>
        </div>
      )}

      {events.length === 0 ? (
        <div className="px-4 py-3 text-[13.5px] text-ink4">
          Assigned, nothing sent yet — use Send Web Inquiry.
        </div>
      ) : (
        events.map((event, index) => (
          <AccordionItem
            key={`${event.title}-${index}`}
            open={index === activeIndex}
            onToggle={() => setOpenEventIndex(index === activeIndex ? -1 : index)}
            badge={<DirectionBadge kind={event.direction} />}
            title={event.title}
            meta={event.at}
          >
            <MailBody>{event.body}</MailBody>
            <AttachmentList names={event.attachments} />
          </AccordionItem>
        ))
      )}

      <div className="px-4 py-3">
        <Button
          size="xs"
          onClick={() =>
            toast.show(
              `Free-form email to ${supplier?.name} — opens an Outlook draft in the real system`,
            )
          }
        >
          + Email to {supplier?.name}
        </Button>
      </div>
    </>
  );
};
