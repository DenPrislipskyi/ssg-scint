import { selectedSupplier } from '@/entities/quote/lib/lineState';
import { resolveShipSupplyQuantity } from '@/entities/quote/lib/shipSupplyQty';
import type { CatalogData } from '@/entities/catalog/model/types';
import type { LineId, QuoteLine } from '@/entities/quote/model/types';
import type { SupplierDirectory } from '@/entities/supplier/hooks/useSuppliers';
import type { SupplierId } from '@/entities/supplier/model/types';
import { cn } from '@/shared/lib/cn';
import { percentBackground } from '@/shared/lib/colorScale';
import { formatLeadTime, usd } from '@/shared/lib/format';
import { AttachmentThumb } from '@/shared/ui/Attachment';
import { Button } from '@/shared/ui/Button';
import type { ColumnDef } from '@/shared/ui/DataTable';
import { Tag } from '@/shared/ui/Tag';
import type { SourcingRow } from '@/widgets/sourcing-table/sourcingRows';

export interface SourcingColumnsDeps {
  catalog: CatalogData;
  suppliers: SupplierDirectory;
  openSupplierDropdownLineId: LineId | null;
  renderSupplierDropdown: (line: QuoteLine) => React.ReactNode;
  onOpenSupplierDropdown: (lineId: LineId) => void;
  onResolve: (lineId: LineId) => void;
  onSelect: (lineId: LineId, supplierId: SupplierId) => void;
  onDrop: (lineId: LineId, supplierId: SupplierId) => void;
  onRemind: (lineId: LineId, supplierId: SupplierId) => void;
  onCall: (lineId: LineId, supplierId: SupplierId) => void;
}

const PIN = { action: 120, status: 120, item: 320 } as const;

/** Клітинка малюється лише на першому рядку групи. */
const groupSpan = (row: SourcingRow) => (row.offerIndex === 0 ? row.groupSize : ('skip' as const));

export const buildSourcingColumns = ({
  catalog,
  suppliers,
  openSupplierDropdownLineId,
  renderSupplierDropdown,
  onOpenSupplierDropdown,
  onResolve,
  onSelect,
  onDrop,
  onRemind,
  onCall,
}: SourcingColumnsDeps): ColumnDef<SourcingRow>[] => [
  {
    key: 'action',
    header: 'Action',
    locked: true,
    pinWidth: PIN.action,
    cell: ({ line, entry }) => {
      const needsInfo = entry.infoRequest && !entry.isInfoResolved;
      return (
        <>
          {needsInfo && (
            <Button size="xs" variant="warning" onClick={() => onResolve(line.id)}>
              Resolve
            </Button>
          )}
          {!needsInfo && entry.offer && (
            <Button
              size="xs"
              variant={entry.isSelected ? 'primary' : 'default'}
              onClick={() => onSelect(line.id, entry.supplierId)}
            >
              {entry.isSelected ? 'Unselect' : 'Select'}
            </Button>
          )}
          {!needsInfo && !entry.offer && entry.status === 'awaiting' && (
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <Button size="xs" onClick={() => onRemind(line.id, entry.supplierId)}>
                Remind
              </Button>
              <Button size="xs" onClick={() => onCall(line.id, entry.supplierId)}>
                Call
              </Button>
            </span>
          )}
          {!entry.isSelected && (
            <div className="mt-1">
              <Button
                size="xs"
                className="text-ink3"
                title="Exclude this supplier for this line"
                onClick={() => onDrop(line.id, entry.supplierId)}
              >
                Drop
              </Button>
            </div>
          )}
        </>
      );
    },
  },
  {
    key: 'status',
    header: 'Status',
    locked: true,
    pinWidth: PIN.status,
    cell: ({ line, entry }) => {
      if (entry.infoRequest && !entry.isInfoResolved) return <Tag tone="info">Needs info</Tag>;
      if (entry.offer) {
        if (entry.isSelected) return <Tag solid>Selected</Tag>;
        return selectedSupplier(line) ? <Tag>On hold</Tag> : <Tag tone="ok">Replied</Tag>;
      }
      if (entry.status === 'replied') return <Tag tone="sup">Re-sent</Tag>;
      return (
        <>
          <Tag tone="sup">Waiting</Tag>
          {entry.followUpNote && (
            <div className="mt-1 text-[13px] text-ink4">{entry.followUpNote}</div>
          )}
        </>
      );
    },
  },
  {
    key: 'item',
    header: 'Item · as customer described',
    locked: true,
    pinWidth: PIN.item,
    cellClassName: 'relative bg-white',
    rowSpan: groupSpan,
    cell: ({ line, lineIndex }) => (
      <>
        <b className="font-medium">{lineIndex + 1}.</b> {line.customerDescription}
        {line.attachment && <AttachmentThumb name={line.attachment} className="size-7" />}
        <div className="text-[13px] text-ink4">
          {line.matchedItemCode ? (
            <>
              Our item: {catalog.itemsByCode[line.matchedItemCode]?.name} ·{' '}
              <span className="font-mono">{line.matchedItemCode}</span>
            </>
          ) : (
            'Not in item master'
          )}
        </div>
        {line.customerRemark && (
          <div className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-info-line bg-info-soft px-2 py-0.5 text-xs text-[#7C2D12]">
            ✎ {line.customerRemark}
          </div>
        )}
        <div className="mt-1.5">
          <Button size="xs" onClick={() => onOpenSupplierDropdown(line.id)}>
            + supplier / resend
          </Button>
        </div>
        {openSupplierDropdownLineId === line.id && renderSupplierDropdown(line)}
      </>
    ),
  },
  {
    key: 'quantity',
    header: 'Req Qty',
    align: 'right',
    cellClassName: 'bg-white',
    rowSpan: groupSpan,
    cell: ({ line }) => {
      const ssq = resolveShipSupplyQuantity(line, catalog);
      if (ssq.quantity == null || ssq.isSameUnit) {
        return `${line.requestedQuantity} ${line.customerUnit}`;
      }
      return (
        <>
          {ssq.quantity} {ssq.unit}
          <div className="text-[13px] text-ink4">
            cust. {line.requestedQuantity} {line.customerUnit}
          </div>
        </>
      );
    },
  },
  {
    key: 'supplier',
    header: 'Supplier · as they described it',
    cell: ({ entry }) => (
      <>
        <b className="font-medium">{suppliers.byId[entry.supplierId]?.name}</b>
        {entry.offer?.supplierDescription && (
          <div className="text-[13px] text-ink2">
            {entry.offer.supplierDescription}
            {entry.offer.brand && <span className="text-ink4"> · {entry.offer.brand}</span>}
          </div>
        )}
      </>
    ),
  },
  {
    key: 'repliedAt',
    header: 'Replied',
    cell: ({ entry }) => (
      <span className="text-[13px] text-ink2">
        {entry.status === 'replied' ? (entry.repliedAt ?? '') : ''}
      </span>
    ),
  },
  {
    key: 'quotedQty',
    header: 'Quoted Qty · UOM',
    align: 'right',
    cell: ({ line, entry }) => {
      if (!entry.offer) return <span className="text-ink4">—</span>;
      const ours = resolveShipSupplyQuantity(line, catalog).unit ?? line.customerUnit;
      const mismatched = entry.offer.unit !== ours;
      return (
        <>
          {entry.offer.quotedQuantity}{' '}
          <span
            className={cn(mismatched ? 'rounded bg-bad-soft px-1 font-medium text-bad' : 'text-ink4')}
            title={mismatched ? `Supplier UOM differs from ours (${ours})` : undefined}
          >
            {entry.offer.unit}
          </span>
        </>
      );
    },
  },
  {
    key: 'unitPrice',
    header: 'Unit Price',
    align: 'right',
    cell: ({ entry }) =>
      entry.offer ? (
        `${usd(entry.offer.unitPrice)}/${entry.offer.unit}`
      ) : (
        <span className="text-ink4">—</span>
      ),
  },
  {
    key: 'totalPrice',
    header: 'Total Price',
    align: 'right',
    cell: ({ entry }) =>
      entry.offer ? (
        usd(entry.offer.unitPrice * entry.offer.quotedQuantity)
      ) : (
        <span className="text-ink4">—</span>
      ),
  },
  {
    key: 'leadTime',
    header: 'Lead Time',
    cell: ({ entry }) => (entry.offer ? formatLeadTime(entry.offer.leadTime) : ''),
  },
  {
    key: 'validity',
    header: 'Validity',
    cell: ({ entry }) => <span className="text-[13px]">{entry.offer?.validity ?? ''}</span>,
  },
  {
    key: 'remarks',
    header: 'Remarks',
    cell: ({ entry }) => (
      <span className="text-[13px] text-ink2">
        {entry.infoRequest ?? entry.offer?.remarks ?? ''}
      </span>
    ),
  },
  {
    key: 'onTime',
    header: 'On time',
    align: 'right',
    cell: ({ entry }) => {
      const supplier = suppliers.byId[entry.supplierId];
      if (!supplier) return null;
      return (
        <span
          className={cn(
            '-m-3 block px-3 py-2.5 text-[13px] font-medium',
            percentBackground(supplier.onTimePercent),
          )}
        >
          {supplier.onTimePercent} %
        </span>
      );
    },
  },
  {
    key: 'history',
    header: 'History with us',
    cell: ({ entry }) => (
      <span className="text-[13px] text-ink2">{suppliers.byId[entry.supplierId]?.historyNote}</span>
    ),
  },
];
