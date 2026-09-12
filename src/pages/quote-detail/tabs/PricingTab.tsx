import { useMemo } from 'react';

import {
  applyMargin,
  buildPricingRows,
  getPricingTotals,
  isBelowMarginFloor,
} from '@/entities/quote/lib/pricing';
import type { PricingRow } from '@/entities/quote/lib/pricing';
import { useQuoteDetail } from '@/pages/quote-detail/model/QuoteDetailContext';
import {
  MARGIN_OPTIONS,
  PRODUCT_CATEGORIES,
  STORE_TYPES,
} from '@/shared/config/constants';
import { titleCase, usd } from '@/shared/lib/format';
import { Input, Select } from '@/shared/ui/Field';
import { Tag } from '@/shared/ui/Tag';

const HEADERS = [
  'Item Description',
  'SS Qty · UOM',
  'Product Source',
  'Cost Price',
  'Margin (%)',
  'Unit Selling Price',
  'Total Price',
  'Check',
] as const;

/** Селектор постачальника у колонці Product Source — коли є з чого обирати. */
const SourceCell = ({ row }: { row: PricingRow }) => {
  const { suppliers, actions } = useQuoteDetail();
  const offers = row.line.suppliers.filter((entry) => entry.offer);

  if (offers.length === 0) return <span className="text-[13px]">{row.sourceLabel}</span>;

  const selected = offers.find((entry) => entry.isSelected);

  return (
    <Select
      value={selected?.supplierId ?? ''}
      onChange={(event) =>
        void actions.selectOffer(row.lineId, event.target.value || null)
      }
      aria-label="Choose supplier"
      className="max-w-[220px] px-1.5 py-[3px] text-xs"
    >
      <option value="">— choose supplier —</option>
      {offers.map((entry) => (
        <option key={entry.supplierId} value={entry.supplierId}>
          {suppliers.byId[entry.supplierId]?.name} · {usd(entry.offer!.unitPrice)}
        </option>
      ))}
    </Select>
  );
};

export const PricingTab = () => {
  const { quote, catalog, actions } = useQuoteDetail();

  const rows = useMemo(() => buildPricingRows(quote, catalog), [catalog, quote]);
  const totals = useMemo(() => getPricingTotals(rows, quote), [quote, rows]);
  const belowFloor = isBelowMarginFloor(quote);

  const cell = 'border-b border-line2 px-3 py-2.5 align-top';

  return (
    <>
      <div className="px-4 pt-3.5 text-[13px] text-ink2">
        <b>
          {totals.pricedCount} of {rows.length}
        </b>{' '}
        lines priced
        {totals.unpricedCount > 0 ? (
          <>
            {' '}
            · <b>{totals.unpricedCount} without price</b> — will go to the quote as clarification
          </>
        ) : (
          ' · ready to send'
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 px-4 pt-2.5 pb-2.5 text-[13px]">
        <span className="text-ink2">Store Type</span>
        <Select
          value={quote.pricing.storeType}
          onChange={(event) =>
            void actions.updatePricing({
              storeType: event.target.value as (typeof STORE_TYPES)[number],
            })
          }
          aria-label="Store type"
        >
          {STORE_TYPES.map((type) => (
            <option key={type} value={type}>
              {titleCase(type)}
            </option>
          ))}
        </Select>

        <span className="ml-2.5 text-ink2">Product Category</span>
        <Select
          value={quote.pricing.productCategory}
          onChange={(event) =>
            void actions.updatePricing({
              productCategory: event.target.value as (typeof PRODUCT_CATEGORIES)[number],
            })
          }
          aria-label="Product category"
        >
          {PRODUCT_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {titleCase(category)}
            </option>
          ))}
        </Select>

        <span className="ml-2.5 text-ink2">Margin for Stock</span>
        <Select
          value={quote.pricing.stockMargin}
          onChange={(event) => void actions.updatePricing({ stockMargin: +event.target.value })}
          aria-label="Margin for stock items"
        >
          {MARGIN_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <span className="ml-2.5 text-ink2">Margin for non-Stock</span>
        <Select
          value={quote.pricing.nonStockMargin}
          onChange={(event) => void actions.updatePricing({ nonStockMargin: +event.target.value })}
          aria-label="Margin for non-stock items"
        >
          {MARGIN_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <span className="ml-2.5 text-ink2">Freight Cost Distribution</span>
        <Select
          value={quote.pricing.freightDistribution}
          onChange={(event) =>
            void actions.updatePricing({
              freightDistribution: event.target.value as 'none' | 'perLine',
            })
          }
          aria-label="Freight cost distribution"
        >
          <option value="none">None</option>
          <option value="perLine">Per line</option>
        </Select>
        <Input
          className="w-[90px] text-right"
          value={quote.pricing.freightAmount}
          onChange={(event) =>
            void actions.updatePricing({ freightAmount: Number(event.target.value) || 0 })
          }
          aria-label="Freight amount"
        />

        {belowFloor && <Tag tone="bad">Below 10 % floor · manager approval</Tag>}
      </div>

      <div className="mx-4 mb-3 overflow-auto rounded-[10px] border border-line">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              {HEADERS.map((header, index) => (
                <th
                  key={header}
                  className={`border-r border-b border-line bg-[#F9FAFB] px-3 py-2.5 text-[13px] font-medium whitespace-nowrap text-ink3 last:border-r-0 ${index >= 3 && index <= 6 ? 'text-right' : 'text-left'}`}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              if (row.cost == null) {
                return (
                  <tr key={row.lineId} className="opacity-60">
                    <td className={cell}>{row.itemName}</td>
                    <td className={`${cell} text-right`}>
                      {row.customerQuantity} {row.customerUnit}
                    </td>
                    <td className={`${cell} text-[13px]`}>
                      <SourceCell row={row} />
                    </td>
                    <td className={`${cell} text-right`}>—</td>
                    <td className={`${cell} text-right`}>—</td>
                    <td className={`${cell} text-right`}>—</td>
                    <td className={`${cell} text-right`}>—</td>
                    <td className={cell}>{row.check && <Tag tone={row.check.tone}>{row.check.label}</Tag>}</td>
                  </tr>
                );
              }

              const margin = row.isStock ? quote.pricing.stockMargin : quote.pricing.nonStockMargin;
              const unitPrice = applyMargin(row.cost, margin);

              return (
                <tr key={row.lineId}>
                  <td className={cell}>{row.itemName}</td>
                  <td className={`${cell} text-right`}>
                    {row.quantity} {row.unit}
                    {row.unit !== row.customerUnit && (
                      <div className="text-[13px] text-ink4">
                        cust. {row.customerQuantity} {row.customerUnit}
                      </div>
                    )}
                  </td>
                  <td className={`${cell} text-[13px]`}>
                    <SourceCell row={row} />
                  </td>
                  <td className={`${cell} text-right`}>
                    {usd(row.cost)}
                    <div className="text-[13px] text-ink4">per {row.unit}</div>
                  </td>
                  <td className={`${cell} text-right`}>{Math.round(margin * 100)}</td>
                  <td className={`${cell} text-right`}>{usd(unitPrice)}</td>
                  <td className={`${cell} text-right`}>{usd(unitPrice * row.quantity)}</td>
                  <td className={cell}>{row.check && <Tag tone={row.check.tone}>{row.check.label}</Tag>}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={6} className={`${cell} text-right text-ink2`}>
                Freight / Transport Cost
              </td>
              <td className={`${cell} text-right`}>{usd(totals.freight)}</td>
              <td className={cell} />
            </tr>
            <tr>
              <td colSpan={6} className="border-t border-ink px-3 py-2.5 text-right font-semibold">
                Total Sales (Gross)
              </td>
              <td className="border-t border-ink px-3 py-2.5 text-right font-semibold">
                {usd(totals.grossTotal)}
              </td>
              <td className="border-t border-ink" />
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
};
