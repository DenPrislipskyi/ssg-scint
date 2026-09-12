import { productFamily } from '@/entities/catalog/lib/family';
import { NO_RANK, rankFor } from '@/entities/supplier/lib/ranking';
import type { Supplier } from '@/entities/supplier/model/types';
import { selectedSupplier } from '@/entities/quote/lib/lineState';
import type { LineSupplier, QuoteLine } from '@/entities/quote/model/types';
import { cn } from '@/shared/lib/cn';
import { formatLeadTime, usd } from '@/shared/lib/format';
import { IconInfo, IconOk, IconWait } from '@/shared/ui/icons';

const CHIP =
  'mr-1 mb-1 inline-flex items-center gap-1.5 rounded-md border px-2 py-[3px] text-[13px] whitespace-nowrap';

export interface SupplierChipProps {
  line: QuoteLine;
  entry: LineSupplier;
  supplier: Supplier;
  onRemove: () => void;
  onSelect: () => void;
  onShowDetails: () => void;
}

/** Чип постачальника на рядку. Вигляд повністю визначається станом пропозиції. */
export const SupplierChip = ({
  line,
  entry,
  supplier,
  onRemove,
  onSelect,
  onShowDetails,
}: SupplierChipProps) => {
  if (entry.status === 'assigned') {
    const rank = rankFor(supplier, productFamily(line.matchedItemCode));
    return (
      <span
        className={cn(CHIP, 'border-line bg-white')}
        title={rank < NO_RANK ? `Rank #${rank} for this product family` : 'No history for this product family'}
      >
        {rank < NO_RANK && (
          <span className="rounded border border-line px-1 text-[11px] text-ink3">#{rank}</span>
        )}
        {supplier.name}
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${supplier.name}`}
          className="pl-0.5 text-[15px] leading-none text-ink4 hover:text-bad"
        >
          ×
        </button>
      </span>
    );
  }

  if (entry.status === 'awaiting') {
    return (
      <span
        className={cn(CHIP, 'border-[#BFD0F5] bg-sup-soft text-sup')}
        title={entry.followUpNote ?? 'Web Inquiry sent, no reply yet'}
      >
        <IconWait className="size-3.5" />
        {supplier.name} · waiting
      </span>
    );
  }

  if (entry.infoRequest && !entry.isInfoResolved) {
    return (
      <button
        type="button"
        onClick={onShowDetails}
        className={cn(CHIP, 'border-info-line bg-info-soft text-info')}
        title={entry.infoRequest}
      >
        <IconInfo className="size-3.5" />
        {supplier.name} · needs info
      </button>
    );
  }

  if (!entry.offer) {
    return (
      <span className={cn(CHIP, 'border-[#BFD0F5] bg-sup-soft text-sup')}>
        <IconWait className="size-3.5" />
        {supplier.name} · re-sent
      </span>
    );
  }

  const isOnHold = !entry.isSelected && Boolean(selectedSupplier(line));

  return (
    <button
      type="button"
      onClick={onSelect}
      title={entry.isSelected ? 'Selected' : isOnHold ? 'On hold · click to select instead' : 'Click to select'}
      className={cn(
        CHIP,
        'cursor-pointer',
        entry.isSelected
          ? 'border-ok bg-ok-soft text-ok'
          : isOnHold
            ? 'border-line bg-[#F9FAFB] text-ink3'
            : 'border-line bg-white hover:border-ink',
      )}
    >
      {entry.isSelected && <IconOk className="size-3.5" />}
      {supplier.name}{' '}
      <span className={cn('font-medium', entry.isSelected ? 'text-ok' : isOnHold ? 'text-ink3' : 'text-ink')}>
        {usd(entry.offer.unitPrice)}/{line.customerUnit}
      </span>{' '}
      · {formatLeadTime(entry.offer.leadTime)}
      {isOnHold && ' · hold'}
    </button>
  );
};
