import { resolveShipSupplyQuantity } from '@/entities/quote/lib/shipSupplyQty';
import type { QuoteLine } from '@/entities/quote/model/types';
import { useQuoteDetail } from '@/pages/quote-detail/model/QuoteDetailContext';
import { cn } from '@/shared/lib/cn';
import { Input, Select } from '@/shared/ui/Field';

/** Пояснення під полем кількості: як саме вона отримана. */
const conversionHint = (line: QuoteLine, ssq: ReturnType<typeof resolveShipSupplyQuantity>) => {
  if (ssq.isManual) return 'manual';
  if (ssq.isSameUnit || ssq.isUnknown) return null;
  if (ssq.pack) return `1 ${ssq.unit} = ${ssq.pack.quantity} ${ssq.pack.unit}`;
  const factor = ssq.factor && ssq.factor !== 1 ? ` ×${ssq.factor}` : '';
  return `${line.customerUnit} → ${ssq.unit}${factor}`;
};

export const ShipSupplyQtyCell = ({ line }: { line: QuoteLine }) => {
  const { catalog, actions } = useQuoteDetail();

  if (!line.matchedItemCode) return <span className="text-ink4">—</span>;

  const ssq = resolveShipSupplyQuantity(line, catalog);
  const hint = conversionHint(line, ssq);

  return (
    <>
      <span className="relative inline-block">
        {ssq.isUnknown && (
          <i
            className="absolute top-1/2 left-2 -translate-y-1/2 cursor-help text-[13px] font-bold text-warn not-italic"
            title={`Couldn't convert '${line.customerUnit}' → '${ssq.unit}' automatically (no rule for this unit). Quantity is the customer's — enter ours and pick the unit.`}
          >
            !
          </i>
        )}
        <Input
          value={ssq.quantity ?? ''}
          onChange={(event) => {
            const parsed = Number.parseFloat(event.target.value);
            void actions.updateLine(line.id, {
              manualShipSupplyQuantity: Number.isNaN(parsed) ? null : parsed,
            });
          }}
          aria-label="Ship supply quantity"
          className={cn(
            'py-[3px] text-right',
            ssq.isUnknown ? 'w-[90px] border-[#F5D889] pl-[22px]' : 'w-[74px] px-1.5',
          )}
        />
      </span>
      {hint && <div className="text-[13px] text-ink4">{hint}</div>}
    </>
  );
};

export const ItemUnitCell = ({ line }: { line: QuoteLine }) => {
  const { catalog, actions } = useQuoteDetail();

  if (!line.matchedItemCode) return <span className="text-ink4">—</span>;

  const item = catalog.itemsByCode[line.matchedItemCode];
  const itemUnit = item?.unit ?? 'pcs';
  const ssq = resolveShipSupplyQuantity(line, catalog);
  const customerUnit = line.customerUnit.toLowerCase();
  const current = ssq.unit ?? itemUnit;
  const isMismatch = current !== customerUnit;

  const options = [...new Set([current, itemUnit, customerUnit, ...catalog.units])].filter(Boolean);

  return (
    <Select
      value={current}
      onChange={(event) => void actions.updateLine(line.id, { overriddenUnit: event.target.value })}
      aria-label="Item unit of measure"
      title={
        ssq.isUnknown
          ? `No conversion found for '${line.customerUnit}' — pick our unit`
          : current !== itemUnit
            ? `Item master unit is ${itemUnit}`
            : undefined
      }
      className={cn(
        'px-1.5 py-[3px]',
        ssq.isUnknown ? 'text-warn' : isMismatch ? 'font-medium text-bad' : '',
      )}
    >
      {options.map((unit) => (
        <option key={unit} value={unit}>
          {unit}
          {unit === itemUnit ? ' · item' : unit === customerUnit ? ' · customer' : ''}
        </option>
      ))}
    </Select>
  );
};
