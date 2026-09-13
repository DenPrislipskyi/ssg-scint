import { buildPricingRows, customerUnitPrice, getPricingTotals, withPrices } from '@/entities/quote/lib/pricing';
import { selectedSupplier } from '@/entities/quote/lib/lineState';
import { useQuoteDetail } from '@/pages/quote-detail/model/QuoteDetailContext';
import { titleCase, usd } from '@/shared/lib/format';

const HEADERS = [
  'Customer Description',
  'Quotation Description',
  'Qty',
  'UOM',
  'Unit Selling Price',
  'Total Price',
] as const;

/** Прев'ю документа котирування — те, що побачить клієнт у PDF. */
export const QuoteDocument = () => {
  const { quote, catalog } = useQuoteDetail();
  const { header } = quote;

  const rows = buildPricingRows(quote, catalog);
  const priced = withPrices(rows, quote);
  const totals = getPricingTotals(rows, quote);

  const notIncluded = quote.lines.filter(
    (line) => !line.matchedItemCode && !line.isExcluded && !selectedSupplier(line),
  );

  const cell = 'border-b border-line2 px-3 py-2.5 align-top';

  return (
    <div className="max-w-[860px] px-8 py-7 text-[13.5px]">
      <header className="mb-3.5 flex justify-between border-b-2 border-ink pb-2.5">
        <div>
          <h3 className="m-0 text-[17px]">Seven Seas Ship Supply – Singapore</h3>
          <div className="text-[13px] text-ink2">supply.singapore@sevenseas.example.com</div>
        </div>
        <div className="text-right">
          <b>Quotation {header.quotationNumber}</b>
          <div className="text-[13px] text-ink2">
            {quote.sentAt ?? 'draft'} · valid till 14 days · Reference # {header.reference}
          </div>
        </div>
      </header>

      <p className="mb-2.5 text-[13px]">
        {header.customerName} · {header.vesselName} · IMO {header.imo} · Port {header.port} · Store
        Type {titleCase(quote.pricing.storeType)} · Product Category{' '}
        {titleCase(quote.pricing.productCategory)}
      </p>

      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            {HEADERS.map((label, index) => (
              <th
                key={label}
                className={`border-b border-line bg-[#F9FAFB] px-3 py-2.5 text-[13px] font-medium text-ink3 ${index >= 2 && index !== 3 ? 'text-right' : 'text-left'}`}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {priced.map((row) => (
            <tr key={row.lineId}>
              <td className={`${cell} text-[13px] text-ink2`}>{row.line.customerDescription}</td>
              <td className={cell}>
                {row.itemName}
                {row.unit !== row.customerUnit && (
                  <div className="text-[13px] text-ink4">
                    supplied as {row.quantity} {row.unit}
                  </div>
                )}
              </td>
              <td className={`${cell} text-right`}>{row.customerQuantity}</td>
              <td className={cell}>{row.customerUnit}</td>
              <td className={`${cell} text-right`}>{usd(customerUnitPrice(row))}</td>
              <td className={`${cell} text-right`}>{usd(row.total)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={5} className={`${cell} text-right text-ink2`}>
              Freight
            </td>
            <td className={`${cell} text-right`}>{usd(totals.freight)}</td>
          </tr>
          <tr>
            <td colSpan={5} className="border-t border-ink px-3 py-2.5 text-right font-semibold">
              Total Sale incl VAT
            </td>
            <td className="border-t border-ink px-3 py-2.5 text-right font-semibold">
              {usd(totals.grossTotal)}
            </td>
          </tr>
        </tfoot>
      </table>

      <div className="mt-4 text-[12.5px] leading-normal text-ink2">
        {notIncluded.map((line) => (
          <span key={line.id}>
            {line.customerDescription} not included — awaiting your{' '}
            {line.clarificationQuestion ?? 'confirmation'}.
            <br />
          </span>
        ))}
        Delivery subject to cut-off {header.cutOff}. Payment terms and conditions remain the same.
        Currency: US Dollars.
      </div>
    </div>
  );
};
