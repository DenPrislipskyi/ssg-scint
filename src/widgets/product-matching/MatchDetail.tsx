import type { SheetProduct } from '@/entities/products/model/types';
import {
  asKey,
  customerCodeOf,
  internalUomOf,
  sourceOf,
  type MatchTableRow,
} from '@/entities/rfq/lib/matchRows';
import type { MatchCandidate } from '@/entities/rfq/model/types';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/Button';
import { Confidence } from '@/widgets/product-matching/Confidence';
import { ProductPicker } from '@/widgets/product-matching/ProductPicker';

/** Порожнє значення показуємо прочерком, а не ховаємо і не вигадуємо. */
const EMPTY = <span className="text-ink4">—</span>;

const Heading = ({ children }: { children: string }) => (
  <h4 className="m-0 mb-2 text-[11px] font-semibold tracking-[.06em] text-ink3 uppercase">
    {children}
  </h4>
);

const Panel = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-lg border border-line bg-white px-3.5 py-3">
    <Heading>{title}</Heading>
    {children}
  </div>
);

/** Один рядок порівняння: що написав клієнт і що каже наш аркуш. */
const Compare = ({
  field,
  customer,
  internal,
}: Record<'field' | 'customer' | 'internal', string>) => (
  <tr>
    <td className="border-b border-line2 py-[7px] pr-3 text-ink3 whitespace-nowrap">{field}</td>
    <td className="border-b border-line2 py-[7px] pr-3">{customer || EMPTY}</td>
    <td className="border-b border-line2 py-[7px]">{internal || EMPTY}</td>
  </tr>
);

/**
 * Чим цей кандидат є для цієї позиції.
 *
 * `code match` — не оцінка, а факт: аркуш файлить цей товар під тим самим
 * кодом клієнта, який стоїть у RFQ. Саме він робить видимим випадок, заради
 * якого весь екран існує: код веде сюди, а слова — деінде.
 */
const markOf = (candidate: MatchCandidate, row: MatchTableRow, first: boolean): string => {
  const sameCode =
    row.customerCode !== '' && asKey(customerCodeOf(candidate.item)) === asKey(row.customerCode);
  if (sameCode) return 'code match';
  return first ? 'best match' : 'alternative';
};

/** Один варіант зі списку. Кнопка, бо вибирати з нього доведеться людині. */
const Option = ({
  code,
  description,
  under,
  confidence,
  mark,
  chosen,
  onPick,
}: {
  code: string;
  description: string;
  under: string;
  confidence: number | null;
  mark: string;
  chosen: boolean;
  onPick?: () => void;
}) => (
  <Button
    className={cn(
      'mb-1.5 grid w-full grid-cols-[1fr_auto] items-start gap-x-3 gap-y-1 text-left',
      chosen ? 'border-ink bg-sel' : 'border-line bg-white',
    )}
    aria-pressed={chosen}
    onClick={onPick}
  >
    <span className="min-w-0">
      <span className="block truncate">{description || EMPTY}</span>
      <small className="mt-0.5 block font-mono text-[11.5px] font-normal text-ink3">
        {[code, under].filter(Boolean).join(' · ')}
      </small>
    </span>
    <span className="text-right whitespace-nowrap">
      <Confidence value={confidence} bar={false} />
      <small className="mt-0.5 block font-normal text-ink3">{mark}</small>
    </span>
  </Button>
);

export interface MatchDetailProps {
  row: MatchTableRow;
  /** Обрати одного з кандидатів. */
  onPick: (itemCode: string) => void;
  /** Обрати рядок аркуша, якого в кандидатах не було. */
  onPickManually: (product: SheetProduct) => void;
}

/**
 * Розгорнутий блок під позицією: що просив клієнт, як це лягає на наш аркуш,
 * і з чого тут можна вибирати.
 *
 * Топ-5 живе саме тут, а не в таблиці. У таблиці п'ять кандидатів однієї
 * позиції виглядають як п'ять позицій; тут — як список, з якого беруть один.
 */
export const MatchDetail = ({ row, onPick, onPickManually }: MatchDetailProps) => {
  // Те, що зараз праворуч, коли його немає в списку кандидатів: підтверджений
  // код, або товар, знайдений руками. Показуємо окремо, бо інакше панель
  // мовчала б про товар, який стоїть у рядку над нею.
  const listed = row.candidates.some((one) => one.itemCode === row.itemCode);
  const apart = !listed && row.itemCode !== '';
  const under = [sourceOf(row.item), internalUomOf(row.item)].filter(Boolean).join(' · ');

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(240px,1fr)_minmax(300px,1.2fr)_minmax(320px,1.4fr)]">
      <Panel title="Customer line">
        <div className="text-[13.5px]">{row.customerDescription || EMPTY}</div>
        <div className="mt-1.5 text-[12.5px] text-ink3">
          Code <span className="font-mono">{row.customerCode || '—'}</span> · {row.quantity || '—'}{' '}
          {row.uom}
        </div>
      </Panel>

      <Panel title="Customer vs internal fields">
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr className="text-ink3">
              <th className="border-b border-line2 py-[7px] pr-3 text-left font-medium">Field</th>
              <th className="border-b border-line2 py-[7px] pr-3 text-left font-medium">
                Customer
              </th>
              <th className="border-b border-line2 py-[7px] text-left font-medium">Internal</th>
            </tr>
          </thead>
          <tbody>
            <Compare field="Item code" customer={row.customerCode} internal={row.itemCode} />
            <Compare
              field="Description"
              customer={row.customerDescription}
              internal={row.itemDescription}
            />
            <Compare field="UOM" customer={row.uom} internal={internalUomOf(row.item)} />
            <Compare field="Quantity" customer={row.quantity} internal="" />
          </tbody>
        </table>
        {/* Пояснення бекенда, дослівно: саме воно відповідає на «чому тут це». */}
        <p className="mt-2 mb-0 text-[12.5px] leading-[1.5] text-ink3">{row.why || EMPTY}</p>
      </Panel>

      <Panel title="Candidates from item DB">
        {apart && (
          <Option
            code={row.itemCode}
            description={row.itemDescription}
            under={under}
            confidence={row.confidence}
            mark={row.how === 'code_confirmed' ? 'confirmed by code' : 'picked by hand'}
            chosen
          />
        )}

        {row.candidates.map((candidate, index) => (
          <Option
            key={candidate.itemCode}
            code={candidate.itemCode}
            description={candidate.description}
            under={[sourceOf(candidate.item), internalUomOf(candidate.item)]
              .filter(Boolean)
              .join(' · ')}
            confidence={candidate.confidence}
            mark={markOf(candidate, row, index === 0)}
            chosen={candidate.itemCode === row.itemCode}
            onPick={() => onPick(candidate.itemCode)}
          />
        ))}

        {!apart && row.candidates.length === 0 && (
          <p className="m-0 text-[12.5px] text-ink3">
            The sheet had nothing to offer for this line.
          </p>
        )}

        <ProductPicker showing={row.itemCode} onPick={onPickManually} />
      </Panel>
    </div>
  );
};
