import { finalRows, finalTotal, type FinalRow } from '@/entities/rfq/lib/finalisation';
import type { MatchLine } from '@/entities/rfq/model/types';
import { usd } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';

/** Порожнє значення показуємо прочерком, а не ховаємо і не вигадуємо. */
const EMPTY = <span className="text-ink4">—</span>;

const TH =
  'bg-[#F9FAFB] border-b border-line px-3 py-[9px] text-[12.5px] font-medium text-ink3 text-left';
const TH_SEP = 'border-r border-line2';
const TD = 'border-b border-line2 border-r border-line2 px-3 py-[9px] align-top';
const MONO = 'font-mono text-[12.5px]';

const SUBTITLE = 'Values below are the confirmed values from stages 1–3';

const COLUMNS = 9;

export interface FinalisationProps {
  lines: MatchLine[];
}

/**
 * Четвертий етап: те саме замовлення, зведене докупи.
 *
 * Нічого не вирішує і нічого не рахує заново. Ціни тут — **підписані**, а не
 * ті, що екран порахував би сьогодні: собівартість і націнка після підпису
 * ще рухаються, а котирування, яке назвали клієнтові, — ні.
 */
export const Finalisation = ({ lines }: FinalisationProps) => {
  const rows = finalRows(lines);
  const total = finalTotal(rows);

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      <div className="flex flex-wrap items-baseline gap-2.5 border-b border-line2 px-4 py-3">
        <b className="text-sm font-semibold">Confirmed RFQ data · internal review</b>
        <span className="text-[13px] text-ink3">{SUBTITLE}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] border-separate border-spacing-0 text-[13.5px]">
          <thead>
            <tr>
              <th scope="col" className={cn(TH, TH_SEP, 'whitespace-nowrap')}>
                Line #
              </th>
              <th scope="col" className={cn(TH, TH_SEP)}>
                Customer item code
              </th>
              <th scope="col" className={cn(TH, TH_SEP)}>
                Customer description
              </th>
              <th scope="col" className={cn(TH, TH_SEP)}>
                Internal item code
              </th>
              <th scope="col" className={cn(TH, TH_SEP)}>
                Internal item description
              </th>
              <th scope="col" className={cn(TH, TH_SEP, '!text-right')}>
                Qty
              </th>
              <th scope="col" className={cn(TH, TH_SEP)}>
                UOM
              </th>
              <th scope="col" className={cn(TH, TH_SEP, '!text-right whitespace-nowrap')}>
                Unit selling price
              </th>
              <th scope="col" className={cn(TH, '!text-right whitespace-nowrap')}>
                Total selling price
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={COLUMNS} className="px-3 py-5 text-ink3">
                  Nothing to review — this RFQ has no lines
                </td>
              </tr>
            )}

            {rows.map((row) => (
              <Row key={row.key} row={row} />
            ))}
          </tbody>

          {rows.length > 0 && (
            <tfoot>
              <tr>
                <td
                  colSpan={COLUMNS - 1}
                  className="border-t border-line px-3 py-[11px] text-right font-medium"
                >
                  Total quote amount
                </td>
                <td className="border-t border-line px-3 py-[11px] text-right font-semibold">
                  {usd(total)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

const Row = ({ row }: { row: FinalRow }) => (
  <tr>
    <td className={cn(TD, 'text-ink3 whitespace-nowrap')}>{row.line}</td>
    <td className={cn(TD, MONO)}>{row.customerCode || EMPTY}</td>
    <td className={cn(TD, 'max-w-[280px]')}>{row.customerDescription || EMPTY}</td>
    <td className={cn(TD, MONO)}>{row.itemCode || EMPTY}</td>
    <td className={cn(TD, 'max-w-[300px]')}>{row.itemDescription || EMPTY}</td>
    <td className={cn(TD, 'text-right')}>{row.quantity || EMPTY}</td>
    <td className={TD}>{row.uom || EMPTY}</td>
    <td className={cn(TD, 'text-right whitespace-nowrap')}>
      {row.unitPrice === null ? EMPTY : usd(row.unitPrice)}
    </td>
    <td className="border-b border-line2 px-3 py-[9px] text-right align-top font-medium whitespace-nowrap">
      {row.total === null ? EMPTY : usd(row.total)}
    </td>
  </tr>
);
