import { useState } from 'react';

import { useRecordOffers } from '@/entities/rfq/hooks/useRecordOffers';
import { useSendInquiries } from '@/entities/rfq/hooks/useSendInquiries';
import { inquiryGroups } from '@/entities/rfq/lib/inquiry';
import {
  alreadySent,
  hasAnyReply,
  inquiryStatus,
  supplierThreads,
  wasAsked,
  type InquiryStatus,
} from '@/entities/rfq/lib/responses';
import type { SourcingRow } from '@/entities/rfq/lib/sourcing';
import type { RfqId, SentInquiry } from '@/entities/rfq/model/types';
import { pluralSuffix } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/Button';
import { InquiryModal } from '@/widgets/supplier-sourcing/InquiryModal';
import { ResponsesModal } from '@/widgets/supplier-sourcing/ResponsesModal';

/** Порожнє значення показуємо прочерком, а не ховаємо і не вигадуємо. */
const EMPTY = <span className="text-ink4">—</span>;

const TH =
  'bg-[#F9FAFB] border-b border-line px-3 py-[9px] text-[12.5px] font-medium text-ink3 text-left';
const TH_SEP = 'border-r border-line2';
const TD = 'border-b border-line2 border-r border-line2 px-3 py-[9px] align-top';
const MONO = 'font-mono text-[12.5px]';

/** Писати нема кому: жодна позиція не назвала постачальника. */
const NOBODY_TO_ASK = 'No supplier to write to';

/**
 * Чому кнопки заблоковані. Кожна фраза називає те, чого бракує, а не те, що
 * заборонено: людина, яка її читає, шукає, що зробити далі.
 */
const ALREADY_ASKED = 'The web inquiries for this RFQ have already been sent';
const NOTHING_CAME_BACK =
  'Load a sample supplier response first — there are no replies to read yet';
const NOBODY_ANSWERED = 'No supplier thread on this RFQ';

/**
 * Межі вигаданої ціни. Це імітація відповіді постачальника, а не оцінка:
 * листів ще ніхто не надсилає, і число тут показує, як виглядатиме екран,
 * коли вони почнуть приходити.
 */
const CHEAPEST = 1;
const DEAREST = 100;

/** Одна ціна: від 1.0 до 100.0, з однією цифрою після коми. */
const samplePrice = (): number =>
  Math.round((CHEAPEST + Math.random() * (DEAREST - CHEAPEST)) * 10) / 10;

const money = (value: number): string => `$${value.toFixed(1)}`;

const LOADED = 'Every line asked about already carries a supplier price';
// A supplier answers a letter: until the inquiries go out there is nobody to
// hear back from.
const SEND_FIRST = 'Send the web inquiries to the suppliers first';
const LOADING = 'Recording the prices…';
const NOTHING_TO_QUOTE = 'No JIT line to quote';

const SOURCING_COLUMNS = 7;
const OFFER_COLUMNS = 7;

export interface SupplierSourcingProps {
  rfqId: RfqId;
  /**
   * Чим підписано лист постачальнику: наш номер RFQ, судно й порт. Номер, а
   * не `rfqId`: той адресує запис, і в темі листа не каже нікому нічого.
   */
  reference: string;
  vessel: string;
  port: string;
  rows: SourcingRow[];
  /**
   * Листи, які вже пішли. Порожньо, поки ніхто не надсилав — і саме це, а не
   * прапорець на клієнті, гасить кнопку: запис переживає перезавантаження,
   * а прапорець ні.
   */
  inquiries: SentInquiry[];
}

/**
 * Другий етап: позиції, які хтось має нам привезти, і те, що постачальники
 * на них відповіли.
 *
 * Тут тільки JIT. Складські позиції не зникли — їх тут нема чого робити:
 * товар уже наш, і питати про нього нема кого. Саме тому рядків тут завжди
 * менше, ніж позицій у RFQ, і заголовок каже про це вголос.
 */
export const SupplierSourcing = ({
  rfqId,
  reference,
  vessel,
  port,
  rows,
  inquiries,
}: SupplierSourcingProps) => {
  const [inquiring, setInquiring] = useState(false);
  const [reading, setReading] = useState(false);
  const sending = useSendInquiries(rfqId);
  // Один лист на постачальника, а не на позицію: двічі писати тому самому про
  // ту саму поставку — це той випадок, заради якого групування тут і є.
  const groups = inquiryGroups(rows);
  const rfq = { reference, vessel, port };
  const threads = supplierThreads(rows, inquiries, rfq);

  // Надсилають один раз. Друга розсилка переписала б текст, який постачальник
  // цієї миті читає, тож кнопка гасне — і гасне вона від запису, а не від
  // того, що хтось уже натискав у цій вкладці.
  const sent = alreadySent(inquiries);
  const cannotAsk = groups.length === 0 ? NOBODY_TO_ASK : sent ? ALREADY_ASKED : undefined;

  // Читати нема чого, поки ніхто не назвав ціни: вікно показало б наш лист і
  // порожнє місце під ним, а питання, заради якого його відкривають, — саме
  // про те, що відповіли.
  const cannotRead =
    threads.length === 0 ? NOBODY_ANSWERED : hasAnyReply(rows) ? undefined : NOTHING_CAME_BACK;

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      <div className="flex flex-wrap items-center gap-2.5 border-b border-line2 px-4 py-3">
        <b className="text-sm font-semibold">Supplier sourcing · JIT products</b>
        <span className="text-[13px] text-ink3">
          {rows.length} JIT line{pluralSuffix(rows.length)} · In-Stock lines skip sourcing
        </span>
        <span className="ml-auto" />
        <Button
          variant="primary"
          className="px-3"
          disabled={cannotAsk !== undefined}
          {...(cannotAsk ? { title: cannotAsk } : {})}
          onClick={() => setInquiring(true)}
        >
          Send Web Inquiry
        </Button>
        <Button
          className="px-3"
          disabled={cannotRead !== undefined}
          {...(cannotRead ? { title: cannotRead } : {})}
          onClick={() => setReading(true)}
        >
          Supplier Responses
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-separate border-spacing-0 text-[13.5px]">
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
              <th scope="col" className={cn(TH, TH_SEP, '!text-right')}>
                Qty
              </th>
              <th scope="col" className={cn(TH, TH_SEP)}>
                UOM
              </th>
              <th scope="col" className={cn(TH, TH_SEP)}>
                Suggested supplier
              </th>
              <th scope="col" className={TH}>
                Inquiry status
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={SOURCING_COLUMNS} className="px-3 py-5 text-ink3">
                  No JIT lines on this RFQ — every product comes from stock
                </td>
              </tr>
            )}

            {rows.map((row) => (
              <tr key={row.key}>
                <td className={cn(TD, 'text-ink3 whitespace-nowrap')}>{row.line}</td>
                <td className={cn(TD, MONO)}>{row.itemCode || EMPTY}</td>
                <td className={cn(TD, 'max-w-[360px]')}>{row.itemDescription || EMPTY}</td>
                <td className={cn(TD, 'text-right')}>{row.quantity || EMPTY}</td>
                <td className={TD}>{row.uom || EMPTY}</td>
                <td className={cn(TD, 'max-w-[230px]')}>{row.supplier || EMPTY}</td>
                <td className="border-b border-line2 px-3 py-[9px] align-top">
                  <Status value={inquiryStatus(row, inquiries)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SupplierOffers rfqId={rfqId} rows={rows} inquiries={inquiries} />

      {/* Монтується лише відкритим: вибраний постачальник і правки в листі —
          це стан однієї спроби, і наступного разу він має починатися чистим. */}
      {inquiring && (
        <InquiryModal
          groups={groups}
          rfq={rfq}
          sending={sending.isPending}
          onSend={(drafts) => sending.mutate(drafts, { onSuccess: () => setInquiring(false) })}
          onClose={() => setInquiring(false)}
        />
      )}

      {/* Так само монтується лише відкритим: обраний постачальник — це стан
          одного читання, і наступного разу воно має починатися зверху. */}
      {reading && (
        <ResponsesModal threads={threads} reference={reference} onClose={() => setReading(false)} />
      )}
    </div>
  );
};

/**
 * Відповіді постачальників — по рядку на ту саму позицію, що й вище.
 *
 * Постачальник, товар, одиниця й кількість тут не нові: це те, про що його
 * питали. Нове рівно одне — ціна, і поки її ніхто не називав, у колонці
 * прочерк. «Load sample supplier response» проставляє вигадані ціни один
 * раз і записує їх у запис: відповідь постачальника — це те, на що потім
 * виставляють рахунок, і вона не має права зникати разом із вкладкою.
 *
 * Другого разу кнопка не працює, бо ціни вже є: перепитувати постачальника,
 * який відповів, означало б стерти число, яке вже хтось прочитав.
 */
const SupplierOffers = ({
  rfqId,
  rows,
  inquiries,
}: {
  rfqId: RfqId;
  rows: SourcingRow[];
  inquiries: SentInquiry[];
}) => {
  const offers = useRecordOffers(rfqId);
  // Ціни читаються із запису, а не з пам'яті сторінки: відповідь постачальника
  // переживає перезавантаження, і питати про неї двічі не можна.
  //
  // Питаємо тільки тих, хто ще не відповів. Це і є «другий клік нічого не
  // робить» — коли відповіли всі, питати нема кого, — і водночас єдиний
  // спосіб дописати решту, якщо половина записів не дійшла: перезапит не
  // чіпає числа, які вже хтось прочитав.
  //
  // And only those somebody wrote to: a line no letter went out for has no
  // supplier who could be answering.
  const silent = rows.filter((row) => row.unitPrice === null && wasAsked(row, inquiries));

  const reason =
    rows.length === 0
      ? NOTHING_TO_QUOTE
      : !alreadySent(inquiries)
        ? SEND_FIRST
        : silent.length === 0
          ? LOADED
          : offers.isPending
            ? LOADING
            : undefined;

  return (
    <div className="border-t border-line bg-[#FAFAFB] px-4 py-3.5">
      <div className="mb-2.5 flex flex-wrap items-center gap-2.5">
        <h4 className="m-0 text-[11px] font-semibold tracking-[.06em] text-ink3 uppercase">
          Supplier offers
        </h4>
        <span className="text-[12px] text-ink4">
          {rows.length} JIT line{pluralSuffix(rows.length)} without a confirmed cost
        </span>
        <span className="ml-auto" />
        <Button
          size="xs"
          disabled={reason !== undefined}
          {...(reason ? { title: reason } : {})}
          onClick={() =>
            offers.mutate(silent.map((row) => ({ index: row.index, unitPrice: samplePrice() })))
          }
        >
          Load sample supplier response
        </Button>
      </div>

      <div className="overflow-x-auto rounded-[10px] border border-line bg-white">
        <table className="w-full min-w-[980px] border-separate border-spacing-0 text-[13px]">
          <thead>
            <tr>
              <th scope="col" className={cn(TH, TH_SEP, 'whitespace-nowrap')}>
                Line #
              </th>
              <th scope="col" className={cn(TH, TH_SEP)}>
                Supplier
              </th>
              <th scope="col" className={cn(TH, TH_SEP)}>
                Product / specification
              </th>
              <th scope="col" className={cn(TH, TH_SEP, 'whitespace-nowrap')}>
                Supplier UOM
              </th>
              <th scope="col" className={cn(TH, TH_SEP, '!text-right')}>
                Available qty
              </th>
              <th scope="col" className={cn(TH, TH_SEP, '!text-right whitespace-nowrap')}>
                Supplier unit price
              </th>
              <th scope="col" className={TH} />
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={OFFER_COLUMNS} className="px-3 py-5 text-ink3">
                  Nothing to quote — no JIT line on this RFQ
                </td>
              </tr>
            )}

            {rows.map((row) => (
              <tr key={row.key}>
                <td className={cn(TD, 'text-ink3 whitespace-nowrap')}>{row.line}</td>
                <td className={cn(TD, 'max-w-[230px]')}>{row.supplier || EMPTY}</td>
                <td className={cn(TD, 'max-w-[300px] text-ink2')}>
                  {row.itemDescription || EMPTY}
                </td>
                <td className={TD}>{row.uom || EMPTY}</td>
                <td className={cn(TD, 'text-right')}>{row.quantity || EMPTY}</td>
                <td className={cn(TD, 'text-right font-medium')}>
                  {row.unitPrice === null ? EMPTY : money(row.unitPrice)}
                </td>
                <td className="border-b border-line2 px-3 py-[9px] align-top" />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const STATUS_TONE: Record<Exclude<InquiryStatus, ''>, string> = {
  Sent: 'bg-sup-soft text-sup',
  Received: 'bg-ok-soft text-ok',
};

/** A line's inquiry status as a small pill; nothing at all before it is sent. */
const Status = ({ value }: { value: InquiryStatus }) =>
  value === '' ? null : (
    <span
      className={cn(
        'inline-block rounded-full px-2 py-0.5 text-[12px] font-medium',
        STATUS_TONE[value],
      )}
    >
      {value}
    </span>
  );
