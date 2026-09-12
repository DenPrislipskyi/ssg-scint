import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { paths } from '@/app/router/paths';
import { SupplierDropdown } from '@/features/assign-suppliers/SupplierDropdown';
import { ColumnSettings, useColumnVisibility } from '@/features/column-settings';
import { WebInquiryModal } from '@/features/send-web-inquiry/WebInquiryModal';
import { pendingInquiryStats } from '@/features/send-web-inquiry/webInquiryGroups';
import { selectedSupplier, unresolvedInfoCount } from '@/entities/quote/lib/lineState';
import { useQuoteDetail } from '@/pages/quote-detail/model/QuoteDetailContext';
import { useLineItemsStore } from '@/pages/quote-detail/model/lineItemsStore';
import { pluralSuffix } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button';
import { DataTable } from '@/shared/ui/DataTable';
import { useToast } from '@/shared/ui/Toast';
import { buildSourcingColumns } from '@/widgets/sourcing-table/sourcingColumns';
import { buildSourcingRows } from '@/widgets/sourcing-table/sourcingRows';

export const SourcingTab = () => {
  const { quote, catalog, suppliers, actions } = useQuoteDetail();
  const { quoteId = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [isInquiryOpen, setInquiryOpen] = useState(false);

  const dropdownLineId = useLineItemsStore((state) => state.supplierDropdownLineId);
  const openSupplierDropdown = useLineItemsStore((state) => state.openSupplierDropdown);
  const expand = useLineItemsStore((state) => state.expand);

  const rows = useMemo(() => buildSourcingRows(quote), [quote]);

  const columns = useMemo(
    () =>
      buildSourcingColumns({
        catalog,
        suppliers,
        openSupplierDropdownLineId: dropdownLineId,
        renderSupplierDropdown: (line) => (
          <SupplierDropdown line={line} onDone={() => openSupplierDropdown(null)} />
        ),
        onOpenSupplierDropdown: openSupplierDropdown,
        onResolve: (lineId) => {
          expand(lineId);
          void navigate(paths.rfqTab(quoteId, 'lines'));
        },
        onSelect: (lineId, supplierId) => void actions.selectOffer(lineId, supplierId),
        onDrop: (lineId, supplierId) => {
          void actions.removeLineSupplier(lineId, supplierId);
          toast.show(`${suppliers.byId[supplierId]?.name} dropped for this line`);
        },
        onRemind: (lineId, supplierId) => {
          void actions.setFollowUpNote(lineId, supplierId, 'Reminder sent just now');
          toast.show(`Reminder sent to ${suppliers.byId[supplierId]?.name}`);
        },
        onCall: (lineId, supplierId) =>
          void actions.setFollowUpNote(lineId, supplierId, 'Called just now · promised today'),
      }),
    [
      actions,
      catalog,
      dropdownLineId,
      expand,
      navigate,
      openSupplierDropdown,
      quoteId,
      suppliers,
      toast,
    ],
  );

  const { visibility, toggle } = useColumnVisibility('sourcing', columns);

  const lineGroups = new Set(rows.map((row) => row.line.id));
  const replied = rows.filter((row) => row.entry.status === 'replied').length;
  const chosen = quote.lines.filter((line) => selectedSupplier(line)).length;
  const toSelect = quote.lines.filter(
    (line) => !selectedSupplier(line) && line.suppliers.some((entry) => entry.offer),
  ).length;
  const unresolved = unresolvedInfoCount(quote.lines);
  const inquiry = pendingInquiryStats(quote);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 px-4 pt-3.5 pb-2.5">
        <Button
          variant="blue"
          size="lg"
          disabled={inquiry.supplierCount === 0}
          badge={inquiry.supplierCount || undefined}
          onClick={() => setInquiryOpen(true)}
        >
          Send Web Inquiry
        </Button>

        <span className="text-ink2">
          <b>{lineGroups.size}</b> lines with suppliers · <b>{replied} of {rows.length}</b> responses
          · {chosen} selected
          {toSelect > 0 && (
            <>
              {' '}
              · <b>{toSelect} to select</b>
            </>
          )}
          {unresolved > 0 && (
            <>
              {' '}
              · <b className="text-info">{unresolved} remark{pluralSuffix(unresolved)} unresolved</b>
            </>
          )}{' '}
          · {quote.inquiries.length} inquiry email{pluralSuffix(quote.inquiries.length)} sent
        </span>

        <span className="ml-auto" />
        <ColumnSettings
          columns={columns}
          visibility={visibility}
          onToggle={toggle}
          size="xs"
          popoverClassName="right-4 top-11 w-[260px]"
        />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
        visibility={visibility}
        isGroupStart={(row) => row.offerIndex === 0}
        rowClassName={(row) => (row.entry.isSelected ? '[&>td]:bg-ok-soft' : undefined)}
        emptyMessage="No Web Inquiry sent yet — assign suppliers in Line Items and send"
      />

      <div className="flex flex-wrap gap-3.5 px-4 py-2 text-xs text-ink3">
        <span>Cut-off → lead time must fit the container</span>
        <span>Price rounding 0.5 applies on selection</span>
      </div>

      <WebInquiryModal open={isInquiryOpen} onClose={() => setInquiryOpen(false)} />
    </>
  );
};
