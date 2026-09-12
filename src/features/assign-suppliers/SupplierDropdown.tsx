import { useEffect, useRef } from 'react';

import { productFamily } from '@/entities/catalog/lib/family';
import { rankSuppliersForFamily, NO_RANK } from '@/entities/supplier/lib/ranking';
import type { SupplierId } from '@/entities/supplier/model/types';
import type { QuoteLine } from '@/entities/quote/model/types';
import { useQuoteDetail } from '@/pages/quote-detail/model/QuoteDetailContext';
import { useLineItemsStore } from '@/pages/quote-detail/model/lineItemsStore';
import { MAX_SUPPLIERS_PER_LINE } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { percentBackground } from '@/shared/lib/colorScale';
import { Button } from '@/shared/ui/Button';
import { useToast } from '@/shared/ui/Toast';

const RankBadge = ({ rank }: { rank: number }) =>
  rank < NO_RANK ? (
    <span className="mr-1.5 inline-block min-w-[18px] rounded border border-line px-1 text-center text-[11px] text-ink3">
      #{rank}
    </span>
  ) : null;

export interface SupplierDropdownProps {
  line: QuoteLine;
  onDone: () => void;
}

/**
 * Вибір постачальників для рядка.
 * Список ранжований за історією в родині товару; заблоковані — приховані.
 */
export const SupplierDropdown = ({ line, onDone }: SupplierDropdownProps) => {
  const { suppliers, actions } = useQuoteDetail();
  const toast = useToast();
  const query = useLineItemsStore((state) => state.supplierQuery);
  const setQuery = useLineItemsStore((state) => state.setSupplierQuery);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const family = productFamily(line.matchedItemCode);
  const assignedIds = line.suppliers.map((supplier) => supplier.supplierId);
  const ranked = rankSuppliersForFamily(suppliers.all, family, assignedIds, query);

  const toggleSupplier = async (supplierId: SupplierId) => {
    const existing = line.suppliers.find((supplier) => supplier.supplierId === supplierId);

    if (existing) {
      // Уже надіслані запити не можна відкликати простим зняттям галочки.
      if (existing.status !== 'assigned') return;
      await actions.removeLineSupplier(line.id, supplierId);
      return;
    }

    if (line.suppliers.length >= MAX_SUPPLIERS_PER_LINE) {
      toast.show(`Max ${MAX_SUPPLIERS_PER_LINE} suppliers per line`);
      return;
    }
    await actions.setLineSuppliers(line.id, [...assignedIds, supplierId]);
  };

  return (
    <div className="absolute top-full left-3 z-5 w-[360px] overflow-hidden rounded-[10px] border border-line bg-white text-[13.5px] shadow-[0_10px_30px_rgba(17,24,39,.12)]">
      {line.customerRemark && (
        <div className="mx-2.5 mt-2 flex items-center gap-1.5 rounded-md border border-info-line bg-info-soft px-2 py-0.5 text-xs text-[#7C2D12]">
          ✎ Customer: {line.customerRemark}
        </div>
      )}

      <input
        ref={inputRef}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Supplier…"
        autoComplete="off"
        aria-label="Search suppliers"
        className="w-full border-b border-line px-3 py-2.5 text-sm outline-none"
      />

      <div className="max-h-[260px] overflow-auto">
        {ranked.map(({ supplier, rank, isAssigned }) => {
          const entry = line.suppliers.find((item) => item.supplierId === supplier.id);
          const isLocked = Boolean(entry && entry.status !== 'assigned');
          const isFull = !isAssigned && line.suppliers.length >= MAX_SUPPLIERS_PER_LINE;

          return (
            <div
              key={supplier.id}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => !isLocked && void toggleSupplier(supplier.id)}
              className={cn(
                'grid grid-cols-[auto_1fr_auto] items-center gap-2.5 border-b border-line2 px-3 py-2',
                isLocked ? 'cursor-default' : 'cursor-pointer hover:bg-sel',
              )}
            >
              <input
                type="checkbox"
                checked={isAssigned}
                disabled={isLocked || isFull}
                tabIndex={-1}
                readOnly
              />
              <span>
                <RankBadge rank={rank} />
                {supplier.name}
                {isLocked && (
                  <span className="text-xs text-ink3">
                    {' '}
                    · {entry?.status === 'awaiting' ? 'waiting' : 'replied'}
                  </span>
                )}
              </span>
              <span
                className={cn(
                  'rounded px-1.5 py-px text-xs text-ink',
                  percentBackground(supplier.onTimePercent),
                )}
              >
                {supplier.onTimePercent} %
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-1.5 border-t border-line bg-[#F9FAFB] px-3 py-2">
        <Button size="xs" onMouseDown={(e) => e.preventDefault()} onClick={onDone}>
          Done
        </Button>
        <span className="text-[13px] text-ink4">
          {line.suppliers.length} of {MAX_SUPPLIERS_PER_LINE} · ranked by history for{' '}
          {family || 'this family'}
        </span>
      </div>
    </div>
  );
};
