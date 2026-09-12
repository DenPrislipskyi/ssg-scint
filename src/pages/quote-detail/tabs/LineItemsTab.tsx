import { useCallback, useMemo, useState } from 'react';

import { useClarificationDraft } from '@/features/clarification-draft';
import { ColumnSettings, useColumnVisibility } from '@/features/column-settings';
import { WebInquiryModal } from '@/features/send-web-inquiry/WebInquiryModal';
import { pendingInquiryStats } from '@/features/send-web-inquiry/webInquiryGroups';
import { searchCatalog } from '@/entities/catalog/lib/search';
import { getLineStatus, unresolvedInfoCount } from '@/entities/quote/lib/lineState';
import type { QuoteLine } from '@/entities/quote/model/types';
import { useQuoteDetail } from '@/pages/quote-detail/model/QuoteDetailContext';
import { useLineItemsStore } from '@/pages/quote-detail/model/lineItemsStore';
import { pluralSuffix } from '@/shared/lib/format';
import { useHotkeys } from '@/shared/lib/hooks/useHotkeys';
import { Button } from '@/shared/ui/Button';
import { DataTable } from '@/shared/ui/DataTable';
import { Kbd } from '@/shared/ui/Kbd';
import { useToast } from '@/shared/ui/Toast';
import { buildLineColumns } from '@/widgets/line-items-table/lineColumns';
import { LineDetailRow } from '@/widgets/line-items-table/LineDetailRow';

const SHORTCUTS: Array<[string[], string]> = [
  [['↑', '↓'], 'line'],
  [['1', '–', '3'], 'pick variant'],
  [['Enter'], 'search item'],
  [['Backspace'], 'clear match'],
  [['S'], 'suppliers'],
  [['E'], 'ask customer'],
  [['D'], 'details'],
  [['X'], 'exclude'],
];

export const LineItemsTab = () => {
  const { quote, catalog, suppliers, actions } = useQuoteDetail();
  const toast = useToast();
  const draft = useClarificationDraft();

  const [isInquiryOpen, setInquiryOpen] = useState(false);

  const store = useLineItemsStore();
  const { focusedLineId, comboboxLineId, supplierDropdownLineId, expandedLineId } = store;

  const askCustomer = useCallback((line: QuoteLine) => void draft.addLines([line]), [draft]);

  const columns = useMemo(
    () =>
      buildLineColumns({
        catalog,
        suppliers,
        draftLineIds: draft.draftLineIds,
        expandedLineId,
        onToggleDetails: store.toggleExpanded,
        onAskCustomer: askCustomer,
      }),
    [askCustomer, catalog, draft.draftLineIds, expandedLineId, store.toggleExpanded, suppliers],
  );

  const { visibility, toggle } = useColumnVisibility('lines', columns);

  /* ─── Клавіатура ─────────────────────────────────────────────────── */

  const focusedIndex = Math.max(
    0,
    quote.lines.findIndex((line) => line.id === focusedLineId),
  );
  const focusedLine = quote.lines[focusedIndex];

  const moveFocus = (delta: number) => {
    const next = quote.lines[Math.min(quote.lines.length - 1, Math.max(0, focusedIndex + delta))];
    if (next) store.focus(next.id);
  };

  // Скорочення в самому комбобоксі.
  const comboLine = quote.lines.find((line) => line.id === comboboxLineId);
  const comboResults = useMemo(
    () =>
      comboLine
        ? searchCatalog(
            store.catalogQuery,
            comboLine.suggestedItemCodes,
            catalog.items,
            catalog.itemsByCode,
          ).flat
        : [],
    [catalog, comboLine, store.catalogQuery],
  );

  useHotkeys(
    {
      arrowdown: (event) => {
        event.preventDefault();
        store.setHighlightedIndex(Math.min(comboResults.length - 1, store.highlightedIndex + 1));
      },
      arrowup: (event) => {
        event.preventDefault();
        store.setHighlightedIndex(Math.max(0, store.highlightedIndex - 1));
      },
      enter: (event) => {
        const item = comboResults[store.highlightedIndex];
        if (!item || !comboLine) return;
        event.preventDefault();
        store.openCombobox(null);
        void actions.updateLine(comboLine.id, { matchedItemCode: item.code });
      },
      escape: () => store.openCombobox(null),
    },
    { enabled: comboboxLineId != null, ignoreFormFields: false },
  );

  useHotkeys(
    {
      escape: () => store.openSupplierDropdown(null),
      enter: () => store.openSupplierDropdown(null),
    },
    { enabled: supplierDropdownLineId != null, ignoreFormFields: false },
  );

  useHotkeys(
    {
      arrowdown: (event) => {
        event.preventDefault();
        moveFocus(1);
      },
      arrowup: (event) => {
        event.preventDefault();
        moveFocus(-1);
      },
      enter: (event) => {
        if (!focusedLine) return;
        event.preventDefault();
        store.openCombobox(focusedLine.id);
      },
      backspace: (event) => {
        if (!focusedLine?.matchedItemCode) return;
        event.preventDefault();
        void actions.clearLineItem(focusedLine.id);
      },
      s: () => focusedLine && store.openSupplierDropdown(focusedLine.id),
      e: () => focusedLine && askCustomer(focusedLine),
      d: () => focusedLine && store.toggleExpanded(focusedLine.id),
      x: () =>
        focusedLine &&
        void actions.updateLine(focusedLine.id, { isExcluded: !focusedLine.isExcluded }),
      ...Object.fromEntries(
        ['1', '2', '3', '4', '5'].map((key) => [
          key,
          () => {
            if (!focusedLine || focusedLine.matchedItemCode) return;
            const code = focusedLine.suggestedItemCodes[Number(key) - 1];
            if (code) void actions.updateLine(focusedLine.id, { matchedItemCode: code });
          },
        ]),
      ),
    },
    { enabled: comboboxLineId == null && supplierDropdownLineId == null },
  );

  /* ─── Підсумковий рядок ──────────────────────────────────────────── */

  const statuses = quote.lines
    .filter((line) => !line.isExcluded)
    .map((line) => getLineStatus(line, catalog));
  const count = (predicate: (status: (typeof statuses)[number]) => boolean) =>
    statuses.filter(predicate).length;

  const priced = count((s) => s === 'ready' || s === 'supplierSelected');
  const waiting = count((s) => s === 'inquirySent');
  const toSelect = count((s) => s === 'selectSupplier');
  const open = count((s) => s === 'chooseVariant' || s === 'notFound' || s === 'needsSupplier');
  const asked = count((s) => s === 'askedCustomer');
  const unresolved = unresolvedInfoCount(quote.lines);

  const inquiry = pendingInquiryStats(quote);
  const canSimulateReplies = quote.lines.some((line) =>
    line.suppliers.some(
      (entry) =>
        entry.status === 'awaiting' ||
        (entry.status === 'replied' && !entry.offer && entry.isInfoResolved),
    ),
  );

  const addLine = async () => {
    const description = window.prompt('Customer description of the new item');
    if (!description) return;
    await actions.addLine(description);
    toast.show('Line added — search the item master or assign a supplier');
  };

  return (
    <>
      <div className="relative flex flex-wrap items-center gap-3 px-4 pt-3.5 pb-2.5">
        <Button
          variant="blue"
          size="lg"
          disabled={inquiry.supplierCount === 0}
          badge={inquiry.supplierCount || undefined}
          title={
            inquiry.supplierCount
              ? `${inquiry.supplierCount} supplier${pluralSuffix(inquiry.supplierCount)} · ${inquiry.lineCount} line${pluralSuffix(inquiry.lineCount)} not yet sent`
              : 'Assign suppliers on the lines first'
          }
          onClick={() => setInquiryOpen(true)}
        >
          Send Web Inquiry
        </Button>

        {draft.autoLineIds.size > 0 && (
          <Button badge={draft.autoLineIds.size} onClick={() => void draft.openDraft()}>
            Clarification draft
          </Button>
        )}

        {canSimulateReplies && (
          <Button
            title="Prototype only"
            onClick={async () => {
              const received = await actions.simulateSupplierReplies();
              toast.show(received ? `${received} supplier replies received` : 'Nothing waiting');
            }}
          >
            ⟳ Receive supplier replies (demo)
          </Button>
        )}

        <span className="ml-auto text-[13px] text-ink2">
          {[
            `${priced} of ${statuses.length} priced`,
            waiting && `${waiting} waiting for suppliers`,
            toSelect && `${toSelect} to select in Sourcing`,
            unresolved && `${unresolved} supplier remark${pluralSuffix(unresolved)} unresolved`,
            asked && `${asked} asked customer`,
            open && `${open} open`,
          ]
            .filter(Boolean)
            .join(' · ')}
        </span>

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
        rows={quote.lines}
        getRowKey={(line) => line.id}
        visibility={visibility}
        minWidth={1320}
        focusedRowKey={focusedLineId}
        onRowClick={(line) => store.focus(line.id)}
        rowClassName={(line) => (line.isExcluded ? 'opacity-55' : undefined)}
        renderRowDetail={(line) =>
          expandedLineId === line.id ? (
            <LineDetailRow line={line} onAskCustomer={() => askCustomer(line)} />
          ) : null
        }
        footer={
          <tr>
            <td colSpan={20} className="p-0">
              <button
                type="button"
                onClick={addLine}
                className="w-full bg-white px-4 py-2.5 text-left text-ink3 hover:bg-sel"
              >
                + Click here to add a new row
              </button>
            </td>
          </tr>
        }
      />

      <div className="flex flex-wrap gap-3.5 px-4 py-2 text-xs text-ink3">
        {SHORTCUTS.map(([keys, label]) => (
          <span key={label} className="flex items-center gap-0.5">
            {keys.map((key) => (key === '–' ? <span key={key}>–</span> : <Kbd key={key}>{key}</Kbd>))}
            <span className="ml-1">{label}</span>
          </span>
        ))}
      </div>

      <WebInquiryModal open={isInquiryOpen} onClose={() => setInquiryOpen(false)} />
    </>
  );
};
