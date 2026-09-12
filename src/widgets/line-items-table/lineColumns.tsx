import { getLineStatus, supplierReplyCounts } from '@/entities/quote/lib/lineState';
import { LINE_STATUS_META } from '@/entities/quote/lib/statusMeta';
import type { CatalogData } from '@/entities/catalog/model/types';
import type { LineId, QuoteLine } from '@/entities/quote/model/types';
import type { SupplierDirectory } from '@/entities/supplier/hooks/useSuppliers';
import { cn } from '@/shared/lib/cn';
import { AttachmentThumb } from '@/shared/ui/Attachment';
import type { ColumnDef } from '@/shared/ui/DataTable';
import { StatusChip } from '@/shared/ui/StatusChip';
import { IconChevron } from '@/shared/ui/icons';
import { ItemCell } from '@/widgets/line-items-table/ItemCell';
import { ItemUnitCell, ShipSupplyQtyCell } from '@/widgets/line-items-table/QuantityCells';
import { SupplierCell } from '@/widgets/line-items-table/SupplierCell';

export interface LineColumnsDeps {
  catalog: CatalogData;
  suppliers: SupplierDirectory;
  /** id рядків, які зараз у чернетці уточнення. */
  draftLineIds: Set<LineId>;
  expandedLineId: LineId | null;
  onToggleDetails: (lineId: LineId) => void;
  onAskCustomer: (line: QuoteLine) => void;
}

/** Ширини закріплених колонок. Значення взяті з прототипу. */
const PIN = { toggle: 34, index: 52, status: 170, item: 400 } as const;

export const buildLineColumns = ({
  catalog,
  suppliers,
  draftLineIds,
  expandedLineId,
  onToggleDetails,
  onAskCustomer,
}: LineColumnsDeps): ColumnDef<QuoteLine>[] => [
  {
    key: 'toggle',
    header: '',
    locked: true,
    pinWidth: PIN.toggle,
    cell: (line) => (
      <button
        type="button"
        onClick={() => onToggleDetails(line.id)}
        title="Comments & communication"
        aria-label="Toggle line details"
        aria-expanded={expandedLineId === line.id}
        className="inline-flex size-[22px] items-center justify-center rounded text-ink4 hover:bg-sel hover:text-ink"
      >
        <IconChevron
          className={cn('size-3.5 transition-transform', expandedLineId === line.id && 'rotate-90')}
        />
      </button>
    ),
  },
  {
    key: 'index',
    header: 'Sr #',
    align: 'right',
    locked: true,
    pinWidth: PIN.index,
    cell: (_line, { index }) => <span className="block text-right text-ink4">{index + 1}</span>,
  },
  {
    key: 'status',
    header: 'Status',
    locked: true,
    pinWidth: PIN.status,
    cell: (line) => {
      const status = getLineStatus(line, catalog);
      const meta = LINE_STATUS_META[status];
      const counts = supplierReplyCounts(line);
      const showCounts = status === 'inquirySent' || status === 'selectSupplier';
      const infoRemarks = line.suppliers.filter(
        (entry) => entry.status === 'replied' && entry.infoRequest && !entry.isInfoResolved,
      );

      return (
        <>
          <StatusChip
            meta={meta}
            {...(showCounts ? { suffix: `${counts.replied} of ${counts.total}` } : {})}
          />
          {draftLineIds.has(line.id) && (
            <div className="text-[13px] text-ink4">in clarification draft</div>
          )}
          {infoRemarks.map((entry) => (
            <span
              key={entry.supplierId}
              className="mt-1 block text-xs text-info"
              title={entry.infoRequest ?? ''}
            >
              {suppliers.byId[entry.supplierId]?.name}:{' '}
              {entry.infoRequest?.replace(/^remarks:\s*/i, '')}
            </span>
          ))}
          {line.internalComment && <div className="text-[13px] text-ink4">has comment</div>}
        </>
      );
    },
  },
  {
    key: 'item',
    header: 'Item Description · Item Code',
    locked: true,
    pinWidth: PIN.item,
    cellClassName: 'relative',
    cell: (line) => (
      <div className="relative min-w-[360px]">
        <ItemCell line={line} onAskCustomer={() => onAskCustomer(line)} />
      </div>
    ),
  },
  {
    key: 'customerDescription',
    header: 'Customer Description',
    cellClassName: 'min-w-[260px] max-w-[360px] whitespace-normal text-ink2',
    cell: (line) => (
      <>
        <span className="line-clamp-2-box max-w-[380px]">{line.customerDescription}</span>
        {line.attachment && <AttachmentThumb name={line.attachment} className="ml-1" />}
        {line.note && <span className="text-[13px] text-ink4"> · {line.note}</span>}
        {line.customerRemark && (
          <div
            className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-info-line bg-info-soft px-2 py-0.5 text-xs text-[#7C2D12]"
            title="From the customer's email"
          >
            ✎ {line.customerRemark}
          </div>
        )}
      </>
    ),
  },
  {
    key: 'customerCode',
    header: 'Customer Code',
    cell: (line) => <span className="font-mono text-ink4">{line.customerCode || '—'}</span>,
  },
  {
    key: 'requestedQuantity',
    header: 'Req Qty',
    align: 'right',
    cell: (line) => line.requestedQuantity,
  },
  { key: 'customerUnit', header: 'Cust UOM', cell: (line) => line.customerUnit },
  {
    key: 'shipSupplyQty',
    header: 'SS Qty',
    align: 'right',
    cell: (line) => <ShipSupplyQtyCell line={line} />,
  },
  { key: 'itemUnit', header: 'Item UOM', cell: (line) => <ItemUnitCell line={line} /> },
  {
    key: 'suppliers',
    header: 'Select Supplier (max 5)',
    cellClassName: 'relative min-w-[240px]',
    cell: (line) => <SupplierCell line={line} />,
  },
];
