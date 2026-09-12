import { Fragment, type CSSProperties, type ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';
import type { CellContext, ColumnDef, ColumnVisibility } from '@/shared/ui/DataTable/types';
import { usePinnedColumns, type PinInfo } from '@/shared/ui/DataTable/usePinnedColumns';

export interface DataTableProps<TRow> {
  columns: ColumnDef<TRow>[];
  rows: TRow[];
  getRowKey: (row: TRow, index: number) => string;
  visibility: ColumnVisibility;
  minWidth?: number;
  focusedRowKey?: string | null;
  onRowClick?: (row: TRow, index: number) => void;
  rowClassName?: (row: TRow, index: number) => string | undefined;
  /** Розгорнутий блок деталей під рядком. */
  renderRowDetail?: (row: TRow, index: number) => ReactNode;
  /** Порожній рядок-роздільник перед групою (Sourcing). */
  isGroupStart?: (row: TRow, index: number) => boolean;
  emptyMessage?: string;
  isLoading?: boolean;
  className?: string;
  footer?: ReactNode;
}

const ALIGN = { left: 'text-left', right: 'text-right', center: 'text-center' } as const;

const pinStyle = (pin: PinInfo | undefined): CSSProperties | undefined =>
  pin
    ? { left: pin.left, width: pin.width, minWidth: pin.width, maxWidth: pin.width }
    : undefined;

const pinClass = (pin: PinInfo | undefined, extra = ''): string =>
  pin
    ? cn('sticky z-2', extra, pin.isLast && 'shadow-[6px_0_8px_-6px_rgba(17,24,39,.15)]')
    : '';

export const DataTable = <TRow,>({
  columns,
  rows,
  getRowKey,
  visibility,
  minWidth,
  focusedRowKey = null,
  onRowClick,
  rowClassName,
  renderRowDetail,
  isGroupStart,
  emptyMessage = 'Nothing here',
  isLoading = false,
  className,
  footer,
}: DataTableProps<TRow>) => {
  const visibleColumns = columns.filter((column) => visibility[column.key] !== false);
  const pins = usePinnedColumns(visibleColumns);

  return (
    <div className={cn('mx-4 mb-3 max-w-full overflow-auto rounded-[10px] border border-line', className)}>
      <table className="w-full border-separate border-spacing-0 text-sm" style={{ minWidth }}>
        <thead>
          <tr>
            {visibleColumns.map((column) => {
              const pin = pins.get(column.key);
              return (
                <th
                  key={column.key}
                  scope="col"
                  style={pinStyle(pin)}
                  className={cn(
                    'border-r border-b border-line bg-[#F9FAFB] px-3 py-2.5 text-[13px]',
                    'font-medium whitespace-nowrap text-ink3 last:border-r-0',
                    ALIGN[column.align ?? 'left'],
                    pinClass(pin, 'z-3 bg-[#F9FAFB]'),
                  )}
                >
                  {column.header}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {isLoading && (
            <tr>
              <td colSpan={visibleColumns.length} className="px-4 py-5 text-ink3">
                Loading…
              </td>
            </tr>
          )}

          {!isLoading && rows.length === 0 && (
            <tr>
              <td colSpan={visibleColumns.length} className="px-4 py-5 text-ink3">
                {emptyMessage}
              </td>
            </tr>
          )}

          {!isLoading &&
            rows.map((row, index) => {
              const key = getRowKey(row, index);
              const context: CellContext = { index, isFocused: key === focusedRowKey };
              const detail = renderRowDetail?.(row, index);

              return (
                <Fragment key={key}>
                  {isGroupStart?.(row, index) && index > 0 && (
                    <tr>
                      <td colSpan={visibleColumns.length} className="h-3.5 border-0 bg-white p-0" />
                    </tr>
                  )}
                  <tr
                    className={cn(
                      'group',
                      onRowClick && 'cursor-pointer',
                      context.isFocused ? '[&>td]:bg-focus-row' : 'hover:[&>td]:bg-[#FAFAFA]',
                      rowClassName?.(row, index),
                    )}
                    tabIndex={onRowClick ? 0 : undefined}
                    onClick={onRowClick ? () => onRowClick(row, index) : undefined}
                    onKeyDown={
                      onRowClick
                        ? (event) => {
                            if (event.key === 'Enter') onRowClick(row, index);
                          }
                        : undefined
                    }
                  >
                    {visibleColumns.map((column) => {
                      const span = column.rowSpan?.(row, context) ?? 1;
                      if (span === 'skip') return null;

                      const pin = pins.get(column.key);
                      return (
                        <td
                          key={column.key}
                          rowSpan={span > 1 ? span : undefined}
                          style={pinStyle(pin)}
                          className={cn(
                            'border-r border-b border-line2 px-3 py-2.5 align-top leading-[1.45] last:border-r-0',
                            ALIGN[column.align ?? 'left'],
                            pin && 'bg-white',
                            pinClass(pin),
                            column.cellClassName,
                          )}
                        >
                          {column.cell(row, context)}
                        </td>
                      );
                    })}
                  </tr>
                  {detail && (
                    <tr>
                      <td
                        colSpan={visibleColumns.length}
                        className="border-b border-line2 bg-[#FAFAFB] px-4 pt-3 pb-3.5"
                      >
                        {detail}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
        </tbody>

        {footer && <tfoot>{footer}</tfoot>}
      </table>
    </div>
  );
};
