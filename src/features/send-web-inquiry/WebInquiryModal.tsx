import { useMemo, useState } from 'react';

import { buildWebInquiryText } from '@/entities/mail/lib/templates';
import { outboundQuantity } from '@/entities/quote/lib/shipSupplyQty';
import type { LineId } from '@/entities/quote/model/types';
import type { SupplierId } from '@/entities/supplier/model/types';
import { buildWebInquiryGroups } from '@/features/send-web-inquiry/webInquiryGroups';
import { useQuoteDetail } from '@/pages/quote-detail/model/QuoteDetailContext';
import { pluralSuffix } from '@/shared/lib/format';
import { AttachmentThumb } from '@/shared/ui/Attachment';
import { Button } from '@/shared/ui/Button';
import { Textarea } from '@/shared/ui/Field';
import { Modal } from '@/shared/ui/Modal';
import { useToast } from '@/shared/ui/Toast';

export interface WebInquiryModalProps {
  open: boolean;
  onClose: () => void;
}

/** Прев'ю листів постачальникам перед відправкою. Один блок = один лист. */
export const WebInquiryModal = ({ open, onClose }: WebInquiryModalProps) => {
  const { quote, catalog, suppliers, actions } = useQuoteDetail();
  const toast = useToast();

  const groups = useMemo(() => buildWebInquiryGroups(quote), [quote]);

  const [excludedSuppliers, setExcludedSuppliers] = useState<Set<SupplierId>>(new Set());
  const [excludedAttachments, setExcludedAttachments] = useState<Set<string>>(new Set());

  const selectedGroups = groups.filter((group) => !excludedSuppliers.has(group.supplierId));
  const lineCount = new Set(groups.flatMap((g) => g.lines.map((entry) => entry.line.id))).size;

  const toggle = <T,>(set: Set<T>, value: T): Set<T> => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  const attachmentKey = (supplierId: SupplierId, lineId: LineId) => `${supplierId}:${lineId}`;

  const send = async () => {
    await actions.sendWebInquiry({
      groups: selectedGroups.map((group) => ({
        supplierId: group.supplierId,
        lineIds: group.lines.map((entry) => entry.line.id),
        attachments: group.lines
          .filter(
            (entry) =>
              entry.line.attachment &&
              !excludedAttachments.has(attachmentKey(group.supplierId, entry.line.id)),
          )
          .map((entry) => entry.line.attachment!)
          .filter(Boolean),
      })),
    });

    const pairs = selectedGroups.reduce((sum, group) => sum + group.lines.length, 0);
    onClose();
    toast.show(
      `${selectedGroups.length} Web Inquiry email${pluralSuffix(selectedGroups.length)} sent via Outlook · ${pairs} line-supplier pairs waiting`,
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Send Web Inquiry · Mail Preview"
      subtitle={`${groups.length} supplier${pluralSuffix(groups.length)} · ${lineCount} line${pluralSuffix(lineCount)} · one email per supplier via Outlook from supply.singapore@`}
      footer={
        <>
          <span className="text-[13px] text-ink4">
            Attachments are per line — untick to send without the customer&apos;s file
          </span>
          <span className="ml-auto" />
          <Button onClick={onClose}>Close</Button>
          <Button variant="primary" disabled={selectedGroups.length === 0} onClick={send}>
            Send via Outlook
          </Button>
        </>
      }
    >
      {groups.map((group) => {
        const supplier = suppliers.byId[group.supplierId];
        return (
          <section
            key={group.supplierId}
            className="mb-2.5 overflow-hidden rounded-[10px] border border-line"
          >
            <header className="flex items-center gap-2.5 border-b border-line2 bg-[#F9FAFB] px-3 py-2.5 text-[13.5px]">
              <input
                type="checkbox"
                checked={!excludedSuppliers.has(group.supplierId)}
                onChange={() => setExcludedSuppliers((set) => toggle(set, group.supplierId))}
                aria-label={`Include ${supplier?.name}`}
              />
              <b className="font-medium">{supplier?.name}</b>
              <span className="text-xs text-ink3">{supplier?.email} · English</span>
              <span className="ml-auto text-xs text-ink3">
                {group.lines.length} item{pluralSuffix(group.lines.length)}
              </span>
            </header>

            <table className="w-full border-separate border-spacing-0 text-[13px]">
              <thead>
                <tr>
                  {['Sr No', 'Item Code', 'Description', 'Qty', 'UOM', 'Supplier Remarks', 'Attachment'].map(
                    (header) => (
                      <th
                        key={header}
                        className="border-b border-line bg-[#F9FAFB] px-3 py-2.5 text-left text-[13px] font-medium whitespace-nowrap text-ink3"
                      >
                        {header}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {group.lines.map(({ line, index }) => {
                  const { quantity, unit } = outboundQuantity(line, catalog);
                  const item = line.matchedItemCode
                    ? catalog.itemsByCode[line.matchedItemCode]
                    : undefined;
                  const unitDiffers = unit !== line.customerUnit.toLowerCase();

                  return (
                    <tr key={line.id}>
                      <td className="border-b border-line2 px-3 py-2.5 align-top text-ink4">
                        {index + 1}
                      </td>
                      <td className="border-b border-line2 px-3 py-2.5 align-top font-mono text-[13px]">
                        {line.matchedItemCode ?? '—'}
                      </td>
                      <td className="border-b border-line2 px-3 py-2.5 align-top">
                        {item?.name ?? line.customerDescription}
                        {item && (
                          <div className="text-[13px] text-ink4">{line.customerDescription}</div>
                        )}
                      </td>
                      <td className="border-b border-line2 px-3 py-2.5 text-right align-top">
                        {quantity}
                      </td>
                      <td className="border-b border-line2 px-3 py-2.5 align-top">
                        {unit}
                        {unitDiffers && (
                          <span className="text-[13px] text-ink4">
                            {' '}
                            (customer: {line.requestedQuantity} {line.customerUnit})
                          </span>
                        )}
                      </td>
                      <td className="border-b border-line2 px-3 py-2.5 align-top text-[13px] text-ink2">
                        {line.note ?? ''}
                      </td>
                      <td className="border-b border-line2 px-3 py-2.5 align-top">
                        {line.attachment ? (
                          <label className="inline-flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={
                                !excludedAttachments.has(attachmentKey(group.supplierId, line.id))
                              }
                              onChange={() =>
                                setExcludedAttachments((set) =>
                                  toggle(set, attachmentKey(group.supplierId, line.id)),
                                )
                              }
                            />
                            <AttachmentThumb name={line.attachment} className="size-8" />
                            <span className="text-[13px]">{line.attachment}</span>
                          </label>
                        ) : (
                          <span className="text-ink4">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="border-t border-line2 px-3 py-2.5">
              <div className="mb-1 text-[13px] text-ink4">Email Template · English</div>
              <Textarea
                className="min-h-[70px] w-full"
                defaultValue={buildWebInquiryText(quote.header)}
                aria-label={`Email template for ${supplier?.name}`}
              />
            </div>
          </section>
        );
      })}
    </Modal>
  );
};
