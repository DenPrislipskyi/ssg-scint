import { CatalogCombobox } from '@/features/match-catalog-item/CatalogCombobox';
import { StockBadge } from '@/features/match-catalog-item/StockBadge';
import type { CatalogItem } from '@/entities/catalog/model/types';
import type { QuoteLine } from '@/entities/quote/model/types';
import { useQuoteDetail } from '@/pages/quote-detail/model/QuoteDetailContext';
import { useLineItemsStore } from '@/pages/quote-detail/model/lineItemsStore';
import { Button } from '@/shared/ui/Button';

export interface ItemCellProps {
  line: QuoteLine;
  onAskCustomer: () => void;
}

/**
 * Клітинка зіставлення з каталогом — має чотири стани:
 * зіставлено / є варіанти / порожньо / відкритий пошук.
 */
export const ItemCell = ({ line, onAskCustomer }: ItemCellProps) => {
  const { catalog, actions } = useQuoteDetail();
  const comboboxLineId = useLineItemsStore((state) => state.comboboxLineId);
  const openCombobox = useLineItemsStore((state) => state.openCombobox);
  const openSupplierDropdown = useLineItemsStore((state) => state.openSupplierDropdown);

  const pick = async (item: CatalogItem) => {
    openCombobox(null);
    await actions.updateLine(line.id, { matchedItemCode: item.code });
  };

  if (comboboxLineId === line.id) {
    return (
      <CatalogCombobox
        line={line}
        onPick={pick}
        onNotFound={async () => {
          openCombobox(null);
          await actions.rejectSuggestions(line.id);
        }}
        onAskCustomer={() => {
          openCombobox(null);
          onAskCustomer();
        }}
        onToggleExclude={async () => {
          openCombobox(null);
          await actions.updateLine(line.id, { isExcluded: !line.isExcluded });
        }}
      />
    );
  }

  if (line.matchedItemCode) {
    const item = catalog.itemsByCode[line.matchedItemCode];
    if (!item) return <span className="text-ink4">Unknown item {line.matchedItemCode}</span>;

    return (
      <div className="flex items-start gap-1.5">
        <button
          type="button"
          onClick={() => openCombobox(line.id)}
          title={item.name}
          className="-m-[3px] flex flex-1 flex-col items-start gap-px rounded-md border border-transparent p-[3px] px-1.5 text-left hover:border-line hover:bg-white"
        >
          <span className="line-clamp-2-box max-w-[360px]">{item.name}</span>
          <span className="flex w-full items-baseline gap-2 font-mono text-xs text-ink3">
            {item.code}
            <StockBadge inStock={item.inStock} className="ml-auto" />
          </span>
        </button>
        <button
          type="button"
          onClick={() => void actions.clearLineItem(line.id)}
          title="Not this item — clear"
          aria-label="Clear matched item"
          className="rounded p-0.5 px-1 text-base leading-none text-ink4 hover:bg-bad-soft hover:text-bad"
        >
          ×
        </button>
      </div>
    );
  }

  if (line.suggestedItemCodes.length > 0) {
    return (
      <ul className="m-0 list-none p-0">
        {line.suggestedItemCodes.map((code, index) => {
          const item = catalog.itemsByCode[code];
          if (!item) return null;
          return (
            <li key={code}>
              <button
                type="button"
                onClick={() => void pick(item)}
                className="-mx-1.5 grid w-[calc(100%+12px)] grid-cols-[1fr_auto] items-baseline gap-2.5 rounded-md px-1.5 py-1 text-left hover:bg-sel"
              >
                <span className="max-w-[340px]">
                  <span className="mr-1 inline-block min-w-[18px] text-xs text-ink4">
                    {index + 1}
                  </span>
                  {item.name}
                  <br />
                  <span className="font-mono text-xs text-ink3">{item.code}</span>
                </span>
                <StockBadge inStock={item.inStock} className="whitespace-nowrap" />
              </button>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={() => openCombobox(line.id)}
            className="px-1.5 py-1 text-[13px] text-ink2 underline underline-offset-[3px]"
          >
            Search item master…
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={() => void actions.rejectSuggestions(line.id)}
            className="px-1.5 py-1 text-[13px] text-ink3 hover:text-bad"
          >
            None of these · not found
          </button>
        </li>
      </ul>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => openCombobox(line.id)}
        className="-m-[3px] rounded-md border border-transparent p-[3px] px-1.5 text-ink4 hover:border-line hover:bg-white"
      >
        Search item master…
      </button>
      {!line.isAsked && (
        <div className="mt-1 text-[13px] text-ink3">
          Not in item master →{' '}
          <Button size="xs" onClick={() => openSupplierDropdown(line.id)}>
            + supplier
          </Button>{' '}
          or{' '}
          <Button size="xs" onClick={onAskCustomer}>
            ask customer
          </Button>
        </div>
      )}
    </>
  );
};
