import { SupplierChip } from '@/features/assign-suppliers/SupplierChip';
import { SupplierDropdown } from '@/features/assign-suppliers/SupplierDropdown';
import { isStockLine } from '@/entities/quote/lib/lineState';
import type { QuoteLine } from '@/entities/quote/model/types';
import { useQuoteDetail } from '@/pages/quote-detail/model/QuoteDetailContext';
import { useLineItemsStore } from '@/pages/quote-detail/model/lineItemsStore';
import { MAX_SUPPLIERS_PER_LINE } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';

export const SupplierCell = ({ line }: { line: QuoteLine }) => {
  const { catalog, suppliers, actions } = useQuoteDetail();
  const openDropdownLineId = useLineItemsStore((state) => state.supplierDropdownLineId);
  const openSupplierDropdown = useLineItemsStore((state) => state.openSupplierDropdown);
  const expand = useLineItemsStore((state) => state.expand);

  const isFull = line.suppliers.length >= MAX_SUPPLIERS_PER_LINE;
  // Для складських позицій кнопка приглушена — постачальник зазвичай не потрібен.
  const isQuiet = isStockLine(line, catalog) && line.suppliers.length === 0;

  return (
    <>
      {line.suppliers.map((entry) => {
        const supplier = suppliers.byId[entry.supplierId];
        if (!supplier) return null;
        return (
          <SupplierChip
            key={entry.supplierId}
            line={line}
            entry={entry}
            supplier={supplier}
            onRemove={() => void actions.removeLineSupplier(line.id, entry.supplierId)}
            onSelect={() => void actions.selectOffer(line.id, entry.supplierId)}
            onShowDetails={() => expand(line.id)}
          />
        );
      })}

      {isFull ? (
        <span className="text-[13px] text-ink4">
          {MAX_SUPPLIERS_PER_LINE} of {MAX_SUPPLIERS_PER_LINE}
        </span>
      ) : (
        <button
          type="button"
          onClick={() => openSupplierDropdown(line.id)}
          className={cn(
            'rounded-md border border-dashed border-line px-2 py-[3px] text-[13px] text-ink2',
            'hover:border-solid hover:bg-white',
            isQuiet && 'opacity-40',
          )}
        >
          + supplier
        </button>
      )}

      {openDropdownLineId === line.id && (
        <SupplierDropdown line={line} onDone={() => openSupplierDropdown(null)} />
      )}
    </>
  );
};
