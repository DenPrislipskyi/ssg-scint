import { useEffect, useMemo, useRef } from 'react';

import { highlightMatches, searchCatalog } from '@/entities/catalog/lib/search';
import type { CatalogItem } from '@/entities/catalog/model/types';
import type { QuoteLine } from '@/entities/quote/model/types';
import { useQuoteDetail } from '@/pages/quote-detail/model/QuoteDetailContext';
import { useLineItemsStore } from '@/pages/quote-detail/model/lineItemsStore';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/Button';
import { StockBadge } from '@/features/match-catalog-item/StockBadge';

const Highlighted = ({ text, query }: { text: string; query: string }) => (
  <>
    {highlightMatches(text, query).map((segment, index) =>
      segment.isMatch ? (
        <mark key={index} className="bg-warn-soft not-italic">
          {segment.text}
        </mark>
      ) : (
        <span key={index}>{segment.text}</span>
      ),
    )}
  </>
);

export interface CatalogComboboxProps {
  line: QuoteLine;
  onPick: (item: CatalogItem) => void;
  onNotFound: () => void;
  onAskCustomer: () => void;
  onToggleExclude: () => void;
}

/** Пошук по item master з групами «Predicted» / «Item master» і клавіатурою. */
export const CatalogCombobox = ({
  line,
  onPick,
  onNotFound,
  onAskCustomer,
  onToggleExclude,
}: CatalogComboboxProps) => {
  const { catalog } = useQuoteDetail();
  const query = useLineItemsStore((state) => state.catalogQuery);
  const setQuery = useLineItemsStore((state) => state.setCatalogQuery);
  const highlighted = useLineItemsStore((state) => state.highlightedIndex);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = useMemo(
    () => searchCatalog(query, line.suggestedItemCodes, catalog.items, catalog.itemsByCode),
    [catalog, line.suggestedItemCodes, query],
  );

  // Індекс у плоскому списку потрібен для клавіатурної навігації через обидві групи.
  const flatIndexByCode = new Map(results.flat.map((item, index) => [item.code, index]));

  const renderOption = (item: CatalogItem) => {
    const index = flatIndexByCode.get(item.code) ?? 0;
    return (
      <div
        key={item.code}
        role="option"
        aria-selected={index === highlighted}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => onPick(item)}
        className={cn(
          'grid cursor-pointer grid-cols-[1fr_auto] gap-2.5 border-b border-line2 px-3 py-2 last:border-b-0',
          index === highlighted ? 'bg-sel' : 'hover:bg-sel',
        )}
      >
        <span>
          <Highlighted text={item.name} query={query} />
          <br />
          <span className="font-mono text-xs text-ink3">
            <Highlighted text={item.code} query={query} />
          </span>
        </span>
        <StockBadge inStock={item.inStock} className="whitespace-nowrap" />
      </div>
    );
  };

  return (
    <div className="absolute top-[5px] right-2 left-2 z-5">
      <input
        ref={inputRef}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search item master (Item Description / Item Code)…"
        autoComplete="off"
        aria-label="Search item master"
        className="w-full rounded-lg border border-ink bg-white px-2.5 py-2 text-sm shadow-[0_0_0_3px_rgba(17,24,39,.08)] outline-none"
      />

      <div
        role="listbox"
        className="absolute top-full right-0 left-0 mt-1 max-h-[340px] overflow-auto rounded-[10px] border border-line bg-white text-sm shadow-[0_10px_30px_rgba(17,24,39,.12)]"
      >
        {results.predicted.length > 0 && (
          <div className="sticky top-0 border-b border-line2 bg-[#F9FAFB] px-3 py-1.5 text-[11px] font-medium tracking-wider text-ink4 uppercase">
            Predicted
          </div>
        )}
        {results.predicted.map(renderOption)}

        {results.master.length > 0 && (
          <div className="sticky top-0 border-b border-line2 bg-[#F9FAFB] px-3 py-1.5 text-[11px] font-medium tracking-wider text-ink4 uppercase">
            Item master
          </div>
        )}
        {results.master.map(renderOption)}

        {results.flat.length === 0 && <div className="px-3 py-2.5 text-ink3">Nothing matches</div>}

        <div className="flex items-center gap-1.5 border-t border-line bg-[#F9FAFB] px-3 py-2">
          <Button size="xs" onMouseDown={(e) => e.preventDefault()} onClick={onNotFound}>
            Not found
          </Button>
          <Button size="xs" onMouseDown={(e) => e.preventDefault()} onClick={onAskCustomer}>
            Ask customer
          </Button>
          <Button size="xs" onMouseDown={(e) => e.preventDefault()} onClick={onToggleExclude}>
            {line.isExcluded ? 'Include' : 'Exclude'}
          </Button>
          <span className="ml-auto text-[13px] text-ink4">Enter select · Esc close</span>
        </div>
      </div>
    </div>
  );
};
