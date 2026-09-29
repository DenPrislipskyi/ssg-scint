import type {
  QuotationColumn,
  QuotationPanel,
  QuotationPreview,
  QuotationTotal,
} from '@/entities/rfq/model/types';
import { cn } from '@/shared/lib/cn';

// The PDF's own greys: headings at 0.753, rules at 0.827 of white.
const HEADING = 'bg-[#c0c0c0]';
const RULE = 'border border-[#d3d3d3]';
const CELL = cn(RULE, 'px-[3px] pt-[3px] pb-[5px] align-top');
const TITLE = 'text-[13px] font-bold';

// The two columns of panels, in the PDF's proportions: 384.2 and 376.9 points
// of the 780.2 the page is wide, and the gutter between them.
const PAIR = 'grid grid-cols-[49.25%_48.3%] justify-between';
// Label column widths: 108, 96 and 93 points of their panels.
const LEFT_LABEL = '28%';
const RIGHT_LABEL = '25.5%';
const TERMS_LABEL = '12%';

const ALIGN: Record<QuotationColumn['align'], string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

/**
 * The quotation as its PDF prints it, drawn from the same layout the PDF is.
 *
 * One page of any length: paper breaks a long table across pages and repeats
 * its heading, a screen scrolls, so nothing here splits. Everything else -
 * the letterhead, the grey panels, the columns and their widths, the totals -
 * is the PDF's, so what a person reads here is what the download will say.
 */
export const QuotationSheet = ({ preview }: { preview: QuotationPreview }) => (
  <div className="max-w-[1120px] px-7 py-6 font-[Helvetica,Arial,sans-serif] text-[11px] leading-[1.3] text-black">
    <Letterhead preview={preview} />

    <h3 className="my-2 text-center text-[16px] font-bold">{preview.banner}</h3>

    <div className="flex flex-col gap-[12px]">
      {preview.pairs.map(([left, right]) => (
        <div key={left.title} className={PAIR}>
          <Panel panel={left} label={LEFT_LABEL} />
          <Panel panel={right} label={RIGHT_LABEL} />
        </div>
      ))}
      <Panel panel={preview.terms} label={TERMS_LABEL} />
    </div>

    <Items preview={preview} />
    <Totals totals={preview.totals} />
  </div>
);

const Letterhead = ({ preview }: { preview: QuotationPreview }) => {
  const { letterhead, logo } = preview;
  return (
    <header className="flex items-start justify-between gap-6 leading-[1.6]">
      <div>
        <b className="block">{letterhead.name}</b>
        {/* The registration sits in a column of its own on the Singapore form. */}
        <div className="flex gap-[6ch]">
          <span>{letterhead.address}</span>
          {letterhead.registration && <span>{letterhead.registration}</span>}
        </div>
        <div>{letterhead.phone}</div>
        <div>
          E-Mail: {letterhead.email} INTERNET: {letterhead.web}
        </div>
      </div>
      {logo && <img src={logo} alt="Seven Seas" className="w-[24%] max-w-[260px] shrink-0" />}
    </header>
  );
};

const Panel = ({ panel, label }: { panel: QuotationPanel; label: string }) => (
  <table className="w-full border-collapse">
    <colgroup>
      <col style={{ width: label }} />
      <col />
    </colgroup>
    <thead>
      <tr>
        <th scope="colgroup" colSpan={2} className={cn(RULE, HEADING, TITLE, 'py-[2px]')}>
          {panel.title}
        </th>
      </tr>
    </thead>
    <tbody>
      {panel.rows.map(([name, value], index) => (
        <tr key={name} className={cn(panel.tall && index === panel.rows.length - 1 && 'h-[46px]')}>
          <th scope="row" className={cn(CELL, 'text-left font-bold')}>
            {name}
          </th>
          <td className={CELL}>{value}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

const Items = ({ preview }: { preview: QuotationPreview }) => {
  const { columns, rows, currency } = preview;
  const total = columns.reduce((sum, column) => sum + column.width, 0);
  // Three grey blocks, as on both desk forms: the title over the text
  // columns, an empty one over `Qty`, and the currency over the numbers.
  const text = Math.min(3, columns.length);
  const numbers = Math.max(0, columns.length - text - 1);

  return (
    <table className="mt-[14px] w-full border-collapse">
      <colgroup>
        {columns.map((column) => (
          <col key={column.name} style={{ width: `${(100 * column.width) / total}%` }} />
        ))}
      </colgroup>
      <thead>
        <tr className={HEADING}>
          <th scope="colgroup" colSpan={text} className={cn(TITLE, 'px-[3px] py-[2px] text-left')}>
            Line Items
          </th>
          <td className="border-x-2 border-white" />
          <th
            scope="colgroup"
            colSpan={numbers}
            className={cn(TITLE, 'px-[3px] py-[2px] text-right')}
          >
            Currency: {currency}
          </th>
        </tr>
        <tr>
          {columns.map((column, index) => (
            <th
              key={column.name}
              scope="col"
              className={cn(CELL, 'font-bold', index === 0 ? 'text-left' : 'text-center')}
            >
              {column.name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={`${index}:${row[0]}`}>
            {row.map((value, cell) => (
              <td
                key={columns[cell]?.name ?? cell}
                className={cn(CELL, ALIGN[columns[cell]?.align ?? 'left'])}
              >
                {value}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const Totals = ({ totals }: { totals: QuotationTotal[] }) => (
  <div className="mt-[14px] flex justify-end">
    <table className="w-[48.3%] border-collapse">
      <colgroup>
        <col style={{ width: '48%' }} />
        <col />
      </colgroup>
      <tbody>
        {totals.map((total) => (
          <tr key={total.label} className={cn(total.shaded && HEADING)}>
            <th scope="row" className={cn(CELL, 'text-left', total.strong ? TITLE : 'font-normal')}>
              {total.label}
            </th>
            <td className={cn(CELL, 'text-right', total.strong && TITLE)}>{total.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
