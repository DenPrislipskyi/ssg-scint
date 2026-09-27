import { useApprovePricing } from '@/entities/rfq/hooks/useApprovePricing';
import {
  ALREADY_APPROVED,
  APPROVE_BLOCKED,
  pricedCount,
  pricingRows,
  quoteTotal,
  readyToApprove,
  toApproval,
  whyNotFinalised,
  type Margins,
  type PricingRow,
} from '@/entities/rfq/lib/pricing';
import type { Approval, MatchLine, RfqId } from '@/entities/rfq/model/types';
import { pluralSuffix, usd } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/Button';
import { Explained } from '@/shared/ui/Explained';

/** Порожнє значення показуємо прочерком, а не ховаємо і не вигадуємо. */
const EMPTY = <span className="text-ink4">—</span>;

const TH =
  'bg-[#F9FAFB] border-b border-line px-3 py-[9px] text-[12.5px] font-medium text-ink3 text-left';
const TH_SEP = 'border-r border-line2';
const TD = 'border-b border-line2 border-r border-line2 px-3 py-[9px] align-top';
const MONO = 'font-mono text-[12.5px]';

/** Постачальник ще не назвав ціни, і порахувати з цього нічого не можна. */
const AWAITING = 'awaiting supplier';

const COLUMNS = 10;

/** Скільки знаків після коми має націнка в полі. Пів відсотка — як у макеті. */
const MARGIN_STEP = 0.5;
const MOST_A_MARGIN_IS = 1000;

const APPROVING = 'Approving…';

export interface PricingProps {
  rfqId: RfqId;
  lines: MatchLine[];
  /** Підпис під котируванням. `null` — його ще не ставили. */
  approval: Approval | null;
  onContinue: () => void;
  /**
   * Націнки, з якими рахувати. Приходять ззовні, бо ті самі числа стоять і в
   * підписі етапу над таблицею — а одне число у двох станах перестає бути
   * одним числом.
   */
  margins: Margins;
  onMargins: (margins: Margins) => void;
}

/**
 * Третій етап: у що це обійдеться клієнту.
 *
 * Тут уперше в одній таблиці всі позиції разом — і складські, і привезені.
 * На другому етапі їх ділили, бо питати треба було лише про одні; рахунок
 * виставляють за все замовлення, і позиція, що не потрапила б у підсумок, —
 * це позиція, за яку ніхто не заплатить.
 *
 * Націнка живе, доки відкрита сторінка. Вона не записується: у POC це спосіб
 * подивитися, як зміниться сума, а не рішення, яке хтось ухвалив.
 */
export const Pricing = ({
  rfqId,
  lines,
  approval,
  margins,
  onMargins,
  onContinue,
}: PricingProps) => {
  const approve = useApprovePricing(rfqId);
  const rows = pricingRows(lines, margins);
  const priced = pricedCount(rows);
  const total = quoteTotal(rows);

  // Підписано — числа більше не належать цьому екрану. Поля замикаються, і
  // кнопка теж: другий підпис зрушив би ціну, яку клієнтові вже могли назвати.
  const signed = approval !== null;
  const cannotApprove = signed
    ? ALREADY_APPROVED
    : readyToApprove(rows)
      ? undefined
      : APPROVE_BLOCKED;
  // Та сама відповідь, що й у четвертого етапу в шапці: питання одне, і дві
  // фрази про нього розійшлися б першої ж правки.
  const cannotContinue = whyNotFinalised(rows, signed);

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      <div className="flex flex-wrap items-center gap-3.5 border-b border-line2 px-4 py-3">
        <b className="text-sm font-semibold">Pricing</b>
        <MarginField
          label="In-Stock margin %"
          value={margins.stock}
          locked={signed}
          onChange={(stock) => onMargins({ ...margins, stock })}
        />
        <MarginField
          label="JIT margin %"
          value={margins.jit}
          locked={signed}
          onChange={(jit) => onMargins({ ...margins, jit })}
        />
        <span className="text-[13px] text-ink3">
          In-Stock margin {margins.stock} % · JIT margin {margins.jit} % · In-Stock cost from Item
          DB, JIT cost from the selected supplier offer
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] border-separate border-spacing-0 text-[13.5px]">
          <thead>
            <tr>
              <th scope="col" className={cn(TH, TH_SEP, 'whitespace-nowrap')}>
                Line #
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
              <th scope="col" className={cn(TH, TH_SEP, '!text-right')}>
                Qty
              </th>
              <th scope="col" className={cn(TH, TH_SEP)}>
                UOM
              </th>
              <th scope="col" className={cn(TH, TH_SEP, '!text-right whitespace-nowrap')}>
                Cost price
              </th>
              <th scope="col" className={cn(TH, TH_SEP, '!text-right')}>
                Margin %
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
                  Nothing to price — this RFQ has no lines
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

      <div className="flex flex-wrap items-center gap-2.5 border-t border-line2 px-4 py-3">
        <span className="text-[12.5px] text-ink3">
          {priced} of {rows.length} line{pluralSuffix(rows.length)} priced
        </span>
        <span className="ml-auto" />
        {/* Підпис іде перед переходом, а не після: четвертий етап показує
            затверджені числа, і відкритий до підпису він показував би те, що
            ще може змінитися. */}
        <Button
          // Той самий вигляд, що й у `Confirmed ✓` на екрані мапінгу: там теж
          // `disabled` означає «нема чого робити», а не «недоступно», і
          // вицвітання зробило б зелений із макета сірим.
          className={cn(
            'px-3',
            signed && 'border-ok bg-ok-soft text-ok hover:bg-ok-soft disabled:opacity-100',
          )}
          disabled={cannotApprove !== undefined || approve.isPending}
          {...(cannotApprove ? { title: cannotApprove } : {})}
          onClick={() => approve.mutate(toApproval(rows, margins))}
        >
          {approve.isPending ? APPROVING : signed ? 'Approved ✓' : 'Approve'}
        </Button>
        <Button
          variant="primary"
          className="px-3"
          disabled={cannotContinue !== undefined}
          {...(cannotContinue ? { title: cannotContinue } : {})}
          onClick={onContinue}
        >
          Continue to RFQ Finalisation →
        </Button>
      </div>
    </div>
  );
};

const Row = ({ row }: { row: PricingRow }) => (
  <tr>
    <td className={cn(TD, 'text-ink3 whitespace-nowrap')}>{row.line}</td>
    <td className={cn(TD, MONO)}>{row.itemCode || EMPTY}</td>
    <td className={cn(TD, 'max-w-[320px]')}>{row.itemDescription || EMPTY}</td>
    <td className={cn(TD, 'whitespace-nowrap')}>
      <SourceBadge source={row.source} jit={row.jit} />
    </td>
    <td className={cn(TD, 'text-right')}>{row.quantity || EMPTY}</td>
    <td className={TD}>{row.uom || EMPTY}</td>
    {/* Прочерк і причина під ним: порожня клітинка в колонці цін читається як
        нуль, а тут ніхто ще нічого не називав. */}
    <td className={cn(TD, 'text-right whitespace-nowrap')}>
      {row.cost === null ? (
        <>
          {EMPTY}
          <small className="mt-0.5 block text-[11px] text-ink4">{AWAITING}</small>
        </>
      ) : (
        usd(row.cost)
      )}
    </td>
    <td className={cn(TD, 'text-right whitespace-nowrap')}>
      {row.margin} %
      <small className="mt-0.5 block text-[11px] text-ink4">
        {row.jit ? 'JIT margin' : 'In-Stock margin'}
      </small>
    </td>
    <td className={cn(TD, 'text-right whitespace-nowrap')}>
      {row.unitPrice === null ? EMPTY : usd(row.unitPrice)}
    </td>
    <td className="border-b border-line2 px-3 py-[9px] text-right align-top font-medium whitespace-nowrap">
      {row.total === null ? EMPTY : usd(row.total)}
    </td>
  </tr>
);

/** Плашка джерела — та сама, що на екрані мапінгу. */
const SourceBadge = ({ source, jit }: { source: string; jit: boolean }) =>
  source ? (
    <span
      className={cn(
        'inline-block rounded-md px-2 py-0.5 text-[12px] font-medium',
        jit ? 'bg-sup-soft text-sup' : 'bg-ok-soft text-ok',
      )}
    >
      {source}
    </span>
  ) : (
    EMPTY
  );

/**
 * Націнка одного джерела. Одне поле на всі його рядки, бо аркуш називає для
 * них одне число — колонка на рядок показувала б вибір, якого не роблять.
 */
const MarginField = ({
  label,
  value,
  locked,
  onChange,
}: {
  label: string;
  value: number;
  /** Ціни вже підписані, і націнка, яка їх дала, більше не змінюється. */
  locked: boolean;
  onChange: (value: number) => void;
}) => (
  // Та сама підказка й те саме формулювання, що на кнопці: нативну браузер
  // тримає близько секунди, а дві фрази про одне читалися б як дві причини.
  //
  // На всьому полі разом із підписом, а не на самому `input`: питання «чому
  // не змінюється» виникає, коли курсор іще підходить до числа.
  <Explained title={locked ? ALREADY_APPROVED : undefined}>
    <label className="inline-flex items-center gap-2 text-[13px] text-ink2">
      {label}
      <input
        type="number"
        step={MARGIN_STEP}
        min={0}
        max={MOST_A_MARGIN_IS}
        value={value}
        readOnly={locked}
        aria-readonly={locked}
        onChange={(event) => {
          // Порожнє поле — це людина, що стирає, щоб набрати інше число, а не
          // націнка, якої немає. До наступного символу тримаємо нуль.
          const next = Number(event.target.value);
          onChange(Number.isFinite(next) ? next : 0);
        }}
        className={cn(
          'w-20 rounded-md border border-line px-2 py-1.5 text-right text-[13px]',
          locked ? 'cursor-default bg-sel text-ink3' : 'bg-white',
        )}
      />
    </label>
  </Explained>
);
