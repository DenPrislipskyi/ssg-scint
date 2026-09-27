import { useState } from 'react';

import { useDownloadQuotation } from '@/entities/rfq/hooks/useDownloadQuotation';
import { finalRows, finalTotal, type FinalRow } from '@/entities/rfq/lib/finalisation';
import {
  descriptionSourceOf,
  issuerOf,
  QUOTATION_FORMATS,
  quotationDate,
  quotationTerms,
  whyNotDownloadable,
  type QuotationFile,
  type QuotationFormat,
} from '@/entities/rfq/lib/quotation';
import type { MatchLine, RfqId } from '@/entities/rfq/model/types';
import { cn } from '@/shared/lib/cn';
import { usd } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button';

/** An empty value shows as a dash - neither hidden nor made up. */
const EMPTY = <span className="text-ink4">—</span>;

const TH = 'border-b border-line px-2 py-[7px] text-left font-medium text-ink3';
const TD = 'border-b border-line2 px-2 py-[7px] align-top';
const FOOT = 'border-t border-ink px-2 py-[9px] text-right font-semibold';

/** `#`, code, description, qty, unit, price, amount - `Pack` left out on purpose. */
const COLUMNS = 7;

export interface QuotationProps {
  rfqId: RfqId;
  reference: string;
  customer: string;
  /** Already with its IMO, as the RFQ header shows it. */
  vessel: string;
  port: string;
  /** When the pricing was approved. The document is dated by it. */
  approvedAt: string;
  lines: MatchLine[];
}

/**
 * `Generate quotation`: the same approved quotation, as the customer sees it.
 *
 * Computes nothing: the rows and the total are the same `finalRows` /
 * `finalTotal` as the table above. Two counts of one quotation on one screen
 * would part ways at the first edit, and nobody could tell which of them goes
 * to the customer.
 *
 * The preview appears once a format is picked: until then it is not known
 * whose letterhead the document goes out on, and a document without a sender
 * is a draft easily taken for a finished one.
 */
export const Quotation = ({ rfqId, reference, ...document }: QuotationProps) => {
  const [format, setFormat] = useState<QuotationFormat | null>(null);
  const download = useDownloadQuotation(rfqId, reference);

  /** One download button. Each format comes as one file; the other says why not. */
  const downloadButton = (file: QuotationFile, label: string, variant: 'default' | 'primary') => {
    const why = whyNotDownloadable(format, file);
    const busy = download.isPending && download.variables?.file === file;
    return (
      <Button
        variant={variant}
        disabled={why !== null || download.isPending}
        title={why ?? undefined}
        onClick={() => format !== null && download.mutate({ format, file })}
      >
        {busy ? `Preparing ${file === 'pdf' ? 'PDF' : 'Excel'}…` : label}
      </Button>
    );
  };

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      <div className="flex flex-wrap items-center gap-2.5 border-b border-line2 px-4 py-3">
        <b className="text-sm font-semibold">Generate quotation</b>
        <span className="ml-auto" />
        {download.isError && (
          // Said beside the button that failed, not in a toast that is gone
          // before anyone reads it.
          <span role="alert" className="text-[13px] text-bad">
            Could not generate the file — try again
          </span>
        )}
        {QUOTATION_FORMATS.map((option) => (
          <Button
            key={option}
            aria-pressed={format === option}
            className={cn(format === option && 'border-ink bg-sel')}
            onClick={() => setFormat(option)}
          >
            {option}
          </Button>
        ))}
        {downloadButton('excel', 'Download Excel', 'default')}
        {downloadButton('pdf', 'Download PDF', 'primary')}
      </div>

      {format !== null && <Document format={format} reference={reference} {...document} />}
    </div>
  );
};

const Document = ({
  format,
  reference,
  customer,
  vessel,
  port,
  approvedAt,
  lines,
}: Omit<QuotationProps, 'rfqId'> & { format: QuotationFormat }) => {
  const rows = finalRows(lines);
  const total = finalTotal(rows);

  // `Customer RFQ ref` stays blank for now, as it does in the RFQ header: the
  // customer's number is in their subject line, and reading it out of there is
  // not something we do yet.
  const header = [
    { label: 'Customer', value: customer },
    { label: 'Vessel', value: vessel },
    { label: 'Customer RFQ ref', value: '' },
    { label: 'Delivery port', value: port },
  ];

  return (
    <div className="max-w-[900px] px-7 py-6">
      <div className="mb-3.5 flex items-end justify-between border-b-2 border-ink pb-2.5">
        <div>
          <h3 className="m-0 text-[17px] font-bold">Quotation · {format}</h3>
          <span className="text-[12.5px] text-ink3">{issuerOf(format)}</span>
        </div>
        <div className="text-right text-[12.5px] text-ink2">
          {reference || EMPTY}
          <span className="block text-ink4">{quotationDate(approvedAt)}</span>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-x-5 gap-y-1.5 text-[12.5px]">
        {header.map((field) => (
          <div key={field.label}>
            <span className="block text-[11.5px] text-ink3">{field.label}</span>
            <b className="font-medium">{field.value || EMPTY}</b>
          </div>
        ))}
      </div>

      <table className="w-full border-separate border-spacing-0 text-[12.5px]">
        <thead>
          <tr>
            <th scope="col" className={TH}>
              #
            </th>
            <th scope="col" className={TH}>
              Customer code
            </th>
            <th scope="col" className={TH}>
              Description
            </th>
            <th scope="col" className={cn(TH, '!text-right')}>
              Qty
            </th>
            <th scope="col" className={TH}>
              UOM
            </th>
            <th scope="col" className={cn(TH, '!text-right')}>
              Unit price
            </th>
            <th scope="col" className={cn(TH, '!text-right')}>
              Amount
            </th>
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={COLUMNS} className={cn(TD, 'text-ink3')}>
                This RFQ has no lines to quote
              </td>
            </tr>
          )}

          {rows.map((row) => (
            <Row
              key={row.key}
              row={row}
              customerWords={descriptionSourceOf(format) === 'customer'}
            />
          ))}
        </tbody>

        <tfoot>
          <tr>
            <td colSpan={COLUMNS - 2} className={FOOT}>
              Total (USD)
            </td>
            <td colSpan={2} className={FOOT}>
              {usd(total)}
            </td>
          </tr>
        </tfoot>
      </table>

      <p className="mt-4 text-[12px] leading-[1.6] text-ink2">{quotationTerms(port)}</p>
    </div>
  );
};

/**
 * The customer's code beside the description, so they can find the line in
 * their own request. Whose description depends on the format: ours on our
 * letterhead, theirs (as our sheet records it) in their own file.
 */
const Row = ({ row, customerWords }: { row: FinalRow; customerWords: boolean }) => (
  <tr>
    <td className={cn(TD, 'text-ink3')}>{row.line}</td>
    <td className={cn(TD, 'font-mono text-[11.5px]')}>{row.customerCode || EMPTY}</td>
    <td className={TD}>
      {(customerWords ? row.customerDescription : row.itemDescription) || EMPTY}
    </td>
    <td className={cn(TD, 'text-right')}>{row.quantity || EMPTY}</td>
    <td className={TD}>{row.uom || EMPTY}</td>
    <td className={cn(TD, 'text-right whitespace-nowrap')}>
      {row.unitPrice === null ? EMPTY : usd(row.unitPrice)}
    </td>
    <td className={cn(TD, 'text-right whitespace-nowrap')}>
      {row.total === null ? EMPTY : usd(row.total)}
    </td>
  </tr>
);
