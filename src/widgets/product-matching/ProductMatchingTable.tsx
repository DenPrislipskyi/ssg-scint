import { Fragment, useState } from 'react';

import { useConfirmMatch } from '@/entities/rfq/hooks/useConfirmMatch';

import type { SheetProduct } from '@/entities/products/model/types';
import {
  asChoice,
  asManualChoice,
  internalUomOf,
  sourceOf,
  toTableRows,
  withChoice,
  type ChosenProduct,
  type MatchTableRow,
} from '@/entities/rfq/lib/matchRows';
import type { MatchLine, RfqId } from '@/entities/rfq/model/types';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/Button';
import { Confidence } from '@/widgets/product-matching/Confidence';
import { MatchDetail } from '@/widgets/product-matching/MatchDetail';

/** Порожнє значення показуємо прочерком, а не ховаємо і не вигадуємо. */
const EMPTY = <span className="text-ink4">—</span>;

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

const COLUMNS = 13;

/** Як знайшовся товар — словами, які читає оператор. Під статусом, бо це
 *  відповідь на «звідки він узявся», а не на «що з ним вирішили». */
const ROUTE: Record<string, string> = {
  code_confirmed: 'Code confirmed',
  code_rejected: 'Code overruled',
  search: 'By description',
  none: 'Not found',
};

export interface ProductMatchingTableProps {
  rfqId: RfqId;
  lines: MatchLine[];
}

/**
 * Рядки RFQ поруч із тим, що ми знайшли в себе.
 *
 * Ліва половина — слова клієнта, як він їх написав, без перерахунків. Права —
 * наша, і в ній рівно один товар: підтверджений, або найкращий кандидат як
 * пропозиція. Одна позиція RFQ — один рядок таблиці, завжди.
 *
 * Решта кандидатів не зникла: вона під рядком, який на неї розкривається.
 * П'ять кандидатів однієї позиції, розкладені в таблицю, читаються як п'ять
 * позицій замовлення — а це не те, що просив клієнт.
 */
export const ProductMatchingTable = ({ rfqId, lines }: ProductMatchingTableProps) => {
  const confirm = useConfirmMatch(rfqId);
  // Підтверджено людиною, а не знайдено агентом: лічильник угорі рахує роботу,
  // яка лишилася, і знайдене без підтвердження її не зменшує.
  const matched = lines.filter((line) => line.confirmedItemCode).length;
  // Одна відкрита позиція за раз: розгорнуті всі одразу — це та сама стіна
  // кандидатів, від якої цей екран і йде.
  const [openKey, setOpenKey] = useState<string | null>(null);
  // Що оператор вибрав із топ-5, по одному на позицію. Порожньо означає «те,
  // що запропонував пошук», а не «нічого»: рядок без вибору показує першого
  // кандидата, бо позиція без товару праворуч — це позиція, яку нічим читати.
  const [chosen, setChosen] = useState<Record<string, ChosenProduct>>({});

  // Що показувати праворуч: вибір оператора, а без нього — підтверджене, а
  // без нього — те, що запропонував пошук.
  // Праворуч стоїть вибір оператора, а без нього — те, що прийшло з бекенда:
  // підтверджений товар або пропозиція пошуку.
  const rows = toTableRows(lines).map((row) => withChoice(row, chosen[row.key]));

  /** Інший товар знімає підтвердження: не можна лишити «Matched» на тому, чого
   *  на екрані вже немає. Той самий — не чіпаємо, бо нічого не змінилося. */
  const pick = (row: MatchTableRow, product: ChosenProduct) => {
    setChosen((picked) => ({ ...picked, [row.key]: product }));
    if (row.confirmedItemCode && row.confirmedItemCode !== product.itemCode) {
      confirm.mutate({ index: row.index, itemCode: null });
    }
  };

  /**
   * Кожна позиція, яку лишилося підтвердити, на тому товарі, що зараз у неї
   * праворуч. Позиції без товару пропускаємо: підтверджувати нема чого, і
   * порожній код усе одно не пройшов би перевірку аркушем.
   */
  const proposed = rows
    .filter((row) => !row.confirmedItemCode && row.itemCode)
    .map((row) => ({ index: row.index, itemCode: row.itemCode }));

  /** Кандидат зі списку. Його дані вже на руках — шукати нема чого. */
  const pickCandidate = (row: MatchTableRow, itemCode: string) => {
    const candidate = row.candidates.find((one) => one.itemCode === itemCode);
    if (candidate) pick(row, asChoice(candidate));
  };

  const pickManually = (row: MatchTableRow, product: SheetProduct) =>
    pick(row, asManualChoice(product));

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      <div className="flex flex-wrap items-center gap-2.5 border-b border-line2 px-4 py-3">
        <b className="text-sm font-semibold">Product matching</b>
        <span className="text-[13px] text-ink3">
          {matched} of {lines.length} line(s) matched
        </span>
        <span className="ml-auto" />
        <span className="text-[12px] text-ink4">Click a line to review its match</span>
        <Button
          className="px-3"
          disabled={proposed.length === 0}
          onClick={() => confirm.mutate(proposed)}
        >
          Accept all proposed
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1340px] border-separate border-spacing-0 text-[13.5px]">
          <thead>
            <tr>
              <th
                scope="colgroup"
                colSpan={5}
                className={cn(GROUP_TH, 'bg-[#F3F4F6]', TH_GROUP_END)}
              >
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
                <td colSpan={COLUMNS} className="px-3 py-5 text-ink3">
                  This RFQ has no matched lines yet
                </td>
              </tr>
            )}

            {rows.map((row) => (
              <Fragment key={row.key}>
                <Row
                  row={row}
                  open={openKey === row.key}
                  onToggle={() => setOpenKey(openKey === row.key ? null : row.key)}
                  onConfirm={() => confirm.mutate({ index: row.index, itemCode: row.itemCode })}
                />
                {openKey === row.key && (
                  <tr>
                    <td
                      colSpan={COLUMNS}
                      className="border-b border-line2 bg-[#FAFAFB] px-4 py-3.5"
                    >
                      <MatchDetail
                        row={row}
                        onPick={(itemCode) => pickCandidate(row, itemCode)}
                        onPickManually={(product) => pickManually(row, product)}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/**
 * Один рядок таблиці — одна позиція RFQ.
 *
 * Ліва половина — слова клієнта, включно з кодом, який написав саме він.
 * Права читається з рядка аркуша, який несе цю позицію: підтвердженого або
 * запропонованого. Скільки ще кандидатів за ним стоїть, каже лічильник у
 * колонці статусу; побачити їх можна, розкривши рядок.
 */
const Row = ({
  row,
  open,
  onToggle,
  onConfirm,
}: {
  row: MatchTableRow;
  open: boolean;
  onToggle: () => void;
  onConfirm: () => void;
}) => {
  const confirmed = row.confirmedItemCode !== '';
  return (
    <tr
      className={cn('cursor-pointer', open ? '[&>td]:bg-sel' : 'hover:[&>td]:bg-[#FAFAFA]')}
      tabIndex={0}
      aria-expanded={open}
      onClick={onToggle}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onToggle();
        }
      }}
    >
      <td className={cn(TD, 'text-ink3 whitespace-nowrap')}>{row.line}</td>
      <td className={cn(TD, MONO)}>{row.customerCode || EMPTY}</td>
      <td className={cn(TD, 'max-w-[300px]')}>{row.customerDescription}</td>
      <td className={cn(TD, 'text-right')}>{row.quantity || EMPTY}</td>
      <td className={TD_GROUP_END}>{row.uom || EMPTY}</td>
      <td className={cn(TD, MONO)}>{row.itemCode || EMPTY}</td>
      <td className={cn(TD, 'max-w-[320px]')}>{row.itemDescription || EMPTY}</td>
      <td className={cn(TD, 'whitespace-nowrap')}>{sourceOf(row.item) || EMPTY}</td>
      <td className={TD}>{internalUomOf(row.item) || EMPTY}</td>
      <td className={cn(TD, 'max-w-[230px]')}>{EMPTY}</td>
      <td className={cn(TD, 'whitespace-nowrap')}>
        <Confidence value={row.confidence} />
      </td>
      <td className={cn(TD, 'whitespace-nowrap')} title={row.why}>
        <b className={cn('font-medium', confirmed ? 'text-ok' : 'text-warn')}>
          {confirmed ? 'Matched' : 'Review Needed'}
        </b>
        <small className="mt-[3px] block text-[12px] text-ink3">
          {ROUTE[row.how] ?? '—'}
          {row.candidates.length > 1 && ` · ${row.candidates.length} candidate(s)`}
        </small>
      </td>
      <td className="border-b border-line2 px-3 py-2 align-top whitespace-nowrap">
        <Button
          size="xs"
          variant={confirmed ? 'default' : 'primary'}
          // `disabled` тут означає «нема чого робити», а не «недоступно»:
          // підтверджене вже підтверджене. Тому вимикаємо вицвітання, інакше
          // зелений із макета читався б як сірий.
          className={cn(
            confirmed && 'border-ok bg-ok-soft text-ok hover:bg-ok-soft disabled:opacity-100',
          )}
          disabled={confirmed || !row.itemCode}
          onClick={(event) => {
            event.stopPropagation();
            onConfirm();
          }}
        >
          {confirmed ? 'Confirmed ✓' : 'Confirm'}
        </Button>
      </td>
    </tr>
  );
};
