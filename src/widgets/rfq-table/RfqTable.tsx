import type { QuoteListItem } from '@/entities/quote/model/types';
import { Button } from '@/shared/ui/Button';

const TH_BASE = 'bg-[#F9FAFB] border-b border-line';
const TH = `${TH_BASE} px-3.5 py-2.5 text-[13px] font-medium text-ink3`;
const TD = 'border-b border-line2 px-3.5 py-[11px]';

/** Колонки, під які даних ще немає. Порожньо, а не вигадано. */
const EMPTY = <span className="text-ink4">—</span>;

/** Судно та його IMO одним рядком; IMO може бути ще невідомим агенту. */
const vesselLabel = (rfq: QuoteListItem): string =>
  rfq.imo ? `${rfq.vesselName} · IMO ${rfq.imo}` : rfq.vesselName;

export interface RfqTableProps {
  rows: QuoteListItem[];
  onOpen: (rfq: QuoteListItem) => void;
  isLoading?: boolean;
}

/**
 * Список RFQ.
 *
 * Свідомо не використовує DataTable: тут немає ані закріплених колонок, ані
 * налаштування видимості, ані розгорток — звичайна таблиця простіша й точніша.
 */
export const RfqTable = ({ rows, onOpen, isLoading = false }: RfqTableProps) => (
  <div className="overflow-hidden rounded-xl border border-line bg-white">
    <table className="w-full border-separate border-spacing-0 text-sm leading-[1.4]">
      <thead>
        <tr>
          <th scope="col" className={`${TH} text-left`}>
            RFQ reference
          </th>
          <th scope="col" className={`${TH} text-left`}>
            Customer
          </th>
          <th scope="col" className={`${TH} text-left`}>
            Vessel
          </th>
          <th scope="col" className={`${TH} text-left`}>
            Customer RFQ ref
          </th>
          <th scope="col" className={`${TH} text-right`}>
            Lines
          </th>
          <th className={TH_BASE} aria-label="Actions" />
        </tr>
      </thead>

      <tbody>
        {isLoading && (
          <tr>
            <td colSpan={6} className="px-3.5 py-5 text-ink3">
              Loading…
            </td>
          </tr>
        )}

        {!isLoading && rows.length === 0 && (
          <tr>
            <td colSpan={6} className="px-3.5 py-5 text-ink3">
              No RFQs yet
            </td>
          </tr>
        )}

        {!isLoading &&
          rows.map((rfq) => (
            <tr key={rfq.rowKey}>
              <td className={`${TD} font-mono text-[12.5px]`}>{rfq.reference || EMPTY}</td>
              <td className={`${TD} font-medium`}>{rfq.customerName}</td>
              <td className={`${TD} text-ink2`}>{vesselLabel(rfq) || EMPTY}</td>
              <td className={`${TD} text-ink2`}>{EMPTY}</td>
              <td className={`${TD} text-right`}>{rfq.lineCount}</td>
              <td className="border-b border-line2 px-3.5 py-[9px] text-right">
                <Button variant="primary" onClick={() => onOpen(rfq)}>
                  Open RFQ
                </Button>
              </td>
            </tr>
          ))}
      </tbody>
    </table>
  </div>
);
