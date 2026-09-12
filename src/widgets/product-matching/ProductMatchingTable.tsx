import { toTableRows, type MatchTableRow } from '@/entities/rfq/lib/matchRows';
import type { MatchLine } from '@/entities/rfq/model/types';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/Button';

/** Шапка групи колонок: «дані клієнта» проти «наш товар». */
const GROUP_TH =
  'border-b border-line px-3 py-2 text-left text-[11px] font-semibold tracking-[.06em] text-ink3';

const TH =
  'bg-[#F9FAFB] border-b border-line px-3 py-[9px] text-[12.5px] font-medium text-ink3 text-left';
/** Права межа всередині групи — тонка; на стику груп — така сама, як зовнішні. */
const TH_SEP = 'border-r border-line2';
const TH_GROUP_END = 'border-r border-line';

const TD = 'border-b border-line2 border-r border-line2 px-3 py-[9px] align-top';
const TD_GROUP_END = 'border-b border-line2 border-r border-line px-3 py-[9px] align-top';
const MONO = 'font-mono text-[12.5px]';

/** Колонки, під які даних ще немає. Порожньо, а не вигадано. */
const EMPTY = <span className="text-ink4">—</span>;

/** Колір самооцінки моделі: те саме порогове читання, що й у макеті. */
const confidenceTone = (value: number): string =>
  value >= 85 ? 'text-ok' : value >= 60 ? 'text-warn' : 'text-bad';

const Confidence = ({ value }: { value: number | null }) => {
  if (value === null) return EMPTY;
  const tone = confidenceTone(value);
  return (
    <>
      <span className={cn('font-medium', tone)}>{value} %</span>
      {/* Смужка повторює число візуально — око ловить її швидше за цифру. */}
      <i className="mt-[5px] block h-[5px] w-14 overflow-hidden rounded-[3px] bg-line2">
        <b
          className={cn('block h-[5px] bg-current', tone)}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </i>
    </>
  );
};

export interface ProductMatchingTableProps {
  lines: MatchLine[];
}

/**
 * Рядки RFQ поруч із тим, що ми знайшли в себе.
 *
 * Ліва половина — слова клієнта, як він їх написав, без перерахунків. Права —
 * наша. Одна позиція може дати кілька рядків: коли впевненого збігу немає,
 * показуються всі кандидати, яких розглядали.
 */
export const ProductMatchingTable = ({ lines }: ProductMatchingTableProps) => {
  const rows = toTableRows(lines);
  const matched = rows.filter((row) => row.itemCode && !row.isCandidate).length;

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      <div className="flex flex-wrap items-center gap-2.5 border-b border-line2 px-4 py-3">
        <b className="text-sm font-semibold">Product matching</b>
        <span className="text-[13px] text-ink3">
          {matched} of {lines.length} line(s) matched
        </span>
        <span className="ml-auto" />
        <Button className="px-3" onClick={() => undefined}>
          Accept all proposed
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1340px] border-separate border-spacing-0 text-[13.5px]">
          <thead>
            <tr>
              <th scope="colgroup" colSpan={5} className={cn(GROUP_TH, 'bg-[#F3F4F6]', TH_GROUP_END)}>
                CUSTOMER RFQ DATA
              </th>
              <th scope="colgroup" colSpan={8} className={cn(GROUP_TH, 'bg-[#F9FAFB]')}>
                MATCHED INTERNAL PRODUCT
              </th>
            </tr>
            <tr>
              <th scope="col" className={cn(TH, TH_SEP, 'whitespace-nowrap')}>
                Line #
              </th>
              <th scope="col" className={cn(TH, TH_SEP, 'whitespace-nowrap')}>
                Customer item code
              </th>
              <th scope="col" className={cn(TH, TH_SEP)}>
                Customer description
              </th>
              <th scope="col" className={cn(TH, TH_SEP, '!text-right')}>
                Qty
              </th>
              <th scope="col" className={cn(TH, TH_GROUP_END)}>
                UOM
              </th>
              <th scope="col" className={cn(TH, TH_SEP, 'whitespace-nowrap')}>
                Internal item code
              </th>
              <th scope="col" className={cn(TH, TH_SEP)}>
                Internal item description
              </th>
              <th scope="col" className={cn(TH, TH_SEP)}>
                Source
              </th>
              <th scope="col" className={cn(TH, TH_SEP)}>
                Internal UOM
              </th>
              <th scope="col" className={cn(TH, TH_SEP)}>
                Suggested supplier
              </th>
              <th scope="col" className={cn(TH, TH_SEP)}>
                AI confidence
              </th>
              <th scope="col" className={cn(TH, TH_SEP)}>
                Match status
              </th>
              <th scope="col" className={TH}>
                Confirmation
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={13} className="px-3 py-5 text-ink3">
                  This RFQ has no matched lines yet
                </td>
              </tr>
            )}

            {rows.map((row) => (
              <Row key={row.key} row={row} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const Row = ({ row }: { row: MatchTableRow }) => (
  <tr>
    <td className={cn(TD, 'text-ink3')}>{row.n}</td>
    <td className={cn(TD, MONO)}>{row.customerCode || EMPTY}</td>
    <td className={cn(TD, 'max-w-[300px]')}>{row.customerDescription}</td>
    <td className={cn(TD, 'text-right')}>{row.quantity || EMPTY}</td>
    <td className={TD_GROUP_END}>{row.uom || EMPTY}</td>
    <td className={cn(TD, MONO)}>{row.itemCode || EMPTY}</td>
    <td className={cn(TD, 'max-w-[320px]')}>{row.itemDescription || EMPTY}</td>
    <td className={TD}>{EMPTY}</td>
    <td className={TD}>{EMPTY}</td>
    <td className={cn(TD, 'max-w-[230px]')}>{EMPTY}</td>
    <td className={cn(TD, 'whitespace-nowrap')}>
      <Confidence value={row.confidence} />
    </td>
    <td className={TD}>{EMPTY}</td>
    <td className="border-b border-line2 px-3 py-2 align-top whitespace-nowrap">
      <Button size="xs" onClick={() => undefined}>
        Confirm
      </Button>
    </td>
  </tr>
);
