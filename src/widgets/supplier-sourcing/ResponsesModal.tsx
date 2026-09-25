import { useState } from 'react';

import { lineNote } from '@/entities/rfq/lib/inquiry';
import {
  formatMoment,
  threadReply,
  type OfferedLine,
  type SupplierThread,
} from '@/entities/rfq/lib/responses';
import { pluralSuffix } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';

const TH =
  'bg-[#F9FAFB] border-b border-line px-[9px] py-[7px] text-[11.5px] font-medium text-ink3 text-left';
const TD = 'border-b border-line2 px-[9px] py-[7px] align-top';

/** Лист, який ще не пішов. Час, якого немає, показувати нема як. */
const NOT_SENT = 'not sent yet';

const REPLIED = 'Replied';
const PENDING = 'Pending';

const FOOTNOTE =
  'These values populate the Supplier offers table — select an offer there to set the JIT cost.';

const money = (value: number): string => `$${value.toFixed(1)}`;

export interface ResponsesModalProps {
  threads: SupplierThread[];
  /** Номер RFQ — те, за чим постачальник знаходить лист у відповіді. */
  reference: string;
  onClose: () => void;
}

/**
 * Листування з постачальниками: що ми надіслали і що прийшло у відповідь.
 *
 * Обидві половини читаються поруч навмисно — питання, на яке цей екран
 * відповідає, завжди про різницю між ними: постачальник назвав ціну на те, про
 * що його питали, чи на щось інше.
 *
 * Відповіді тут **вигадані**, як і ціни в них. Лист нікуди не йшов, і той, кому
 * він не пішов, нічого не відповідав. Справжні відповіді витіснять і цей текст,
 * і генерацію цін поряд із ним.
 */
export const ResponsesModal = ({ threads, reference, onClose }: ResponsesModalProps) => {
  const [chosen, setChosen] = useState('');
  const thread = threads.find((one) => one.supplier === chosen) ?? threads[0];
  const replied = threads.filter((one) => one.offered.length > 0).length;

  return (
    <Modal
      open
      onClose={onClose}
      // Хрестика в шапці немає, як і в макеті: закрити вже є чим — у
      // підвалі, і два хрестики на одну дію читаються як дві різні.
      showCloseButton={false}
      width="min(1180px,100%)"
      title="Supplier responses · RFQ communication"
      subtitle={`${threads.length} supplier thread${pluralSuffix(threads.length)} · ${replied} replied`}
      footer={
        <>
          <span className="text-[12px] text-ink4">
            Simulated replies · the prices are the ones already on the record
          </span>
          <span className="ml-auto" />
          <Button onClick={onClose}>Close</Button>
        </>
      }
    >
      <div className="-mx-[18px] -my-3.5 grid grid-cols-1 sm:grid-cols-[270px_minmax(0,1fr)]">
        <div className="border-b border-line2 bg-[#FAFAFB] p-3 sm:border-r sm:border-b-0">
          <Heading>Suppliers</Heading>
          {threads.map((one) => {
            const on = one.supplier === thread?.supplier;
            const answered = one.offered.length > 0;
            return (
              <Button
                key={one.supplier}
                aria-pressed={on}
                onClick={() => setChosen(one.supplier)}
                className={cn(
                  // `whitespace-normal` знімає заборону з базової кнопки:
                  // назва фірми буває довшою за колонку, і нерозривний рядок
                  // виштовхував би бейдж за межі кнопки, поверх листа поруч.
                  'mb-1.5 block w-full text-left whitespace-normal last:mb-0',
                  on ? 'border-ink bg-sel' : 'border-line bg-white',
                )}
              >
                <span className="flex items-center gap-2">
                  {/* `min-w-0`, інакше довге ім'я не дає себе обрізати і
                      росте, скільки треба, — разом із усім, що праворуч. */}
                  <b className="min-w-0 flex-1 font-medium break-words">{one.supplier}</b>
                  <span
                    className={cn(
                      'shrink-0 rounded-md px-[7px] py-px text-[11.5px] font-medium',
                      answered ? 'bg-[#E3F4EF] text-[#0E7C66]' : 'bg-[#FEF3C7] text-[#A16207]',
                    )}
                  >
                    {answered ? REPLIED : PENDING}
                  </span>
                </span>
                <small className="mt-0.5 block text-[11.5px] font-normal text-ink4">
                  {one.rows.length} item{pluralSuffix(one.rows.length)} ·{' '}
                  {answered ? `RE: ${reference}` : lineNote(one)}
                </small>
              </Button>
            );
          })}
        </div>

        <div className="max-h-[66vh] overflow-auto">
          {thread && (
            <>
              <section className="border-b border-line2 px-[18px] py-3.5">
                <Letter
                  who="Seven Seas (you)"
                  tone="text-[#1D4ED8]"
                  about={`— ${reference} · ${thread.rows.length} item${pluralSuffix(thread.rows.length)}`}
                  when={thread.sentAt ? `sent ${formatMoment(thread.sentAt)}` : NOT_SENT}
                  body={thread.outbound}
                />
                <Asked rows={thread} />
              </section>

              {thread.offered.length > 0 ? (
                <section className="bg-[#FAFAFB] px-[18px] py-3.5">
                  <Letter
                    who={thread.supplier}
                    tone="text-[#6D28D9]"
                    about={`— RE: ${reference}`}
                    when={formatMoment(thread.repliedAt)}
                    body={threadReply(thread, reference)}
                  />
                  <Offered lines={thread.offered} />
                  <p className="mt-2.5 mb-0 text-[12px] text-ink3">{FOOTNOTE}</p>
                </section>
              ) : (
                <p className="m-0 bg-[#FAFAFB] px-[18px] py-4 text-[13px] text-ink3">
                  No reply from {thread.supplier} yet — load a sample supplier response to receive
                  the offer.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};

/** Шапка листа й сам лист. Обидва боки листування виглядають однаково. */
const Letter = ({
  who,
  tone,
  about,
  when,
  body,
}: {
  who: string;
  tone: string;
  about: string;
  when: string;
  body: string;
}) => (
  <>
    <div className="mb-2.5 flex flex-wrap items-baseline gap-2">
      <b className={cn('text-[13.5px]', tone)}>{who}</b>
      <span className="text-[13px] text-ink3">{about}</span>
      <span className="ml-auto" />
      <span className="text-[12.5px] text-ink4">{when}</span>
    </div>
    {/* `pre`, бо абзаци листа — це його форма: злиті в один рядок вони
        перестають читатися як лист. */}
    <pre className="m-0 font-sans text-[13px] leading-[1.6] whitespace-pre-wrap">{body}</pre>
  </>
);

/** Про що питали — ті самі колонки, що й у вікні надсилання. */
const Asked = ({ rows }: { rows: SupplierThread }) => (
  <table className="mt-2.5 w-full border-separate border-spacing-0 text-[12.5px]">
    <thead>
      <tr>
        <th scope="col" className={cn(TH, 'whitespace-nowrap')}>
          Line #
        </th>
        <th scope="col" className={cn(TH, 'whitespace-nowrap')}>
          Internal item code
        </th>
        <th scope="col" className={TH}>
          Internal item description
        </th>
        <th scope="col" className={cn(TH, '!text-right')}>
          Qty
        </th>
        <th scope="col" className={TH}>
          UOM
        </th>
      </tr>
    </thead>
    <tbody>
      {rows.rows.map((row) => (
        <tr key={row.key}>
          <td className={cn(TD, 'text-ink3')}>{row.line}</td>
          <td className={cn(TD, 'font-mono text-[12px]')}>{row.itemCode}</td>
          <td className={TD}>{row.itemDescription}</td>
          <td className={cn(TD, 'text-right')}>{row.quantity}</td>
          <td className={TD}>{row.uom}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

/**
 * Що відповіли. Ті самі товари, та сама кількість — нове рівно одне, ціна.
 * Саме тому колонки тут інші: постачальник відповідає своїми словами про
 * те, про що його питали.
 */
const Offered = ({ lines }: { lines: OfferedLine[] }) => (
  <table className="mt-2.5 w-full border-separate border-spacing-0 bg-white text-[12.5px]">
    <thead>
      <tr>
        <th scope="col" className={cn(TH, 'whitespace-nowrap')}>
          Line #
        </th>
        <th scope="col" className={TH}>
          Product / specification
        </th>
        <th scope="col" className={cn(TH, 'whitespace-nowrap')}>
          Supplier UOM
        </th>
        <th scope="col" className={cn(TH, '!text-right whitespace-nowrap')}>
          Available qty
        </th>
        <th scope="col" className={cn(TH, '!text-right')}>
          Unit price
        </th>
      </tr>
    </thead>
    <tbody>
      {lines.map((one) => (
        <tr key={one.key}>
          <td className={cn(TD, 'text-ink3')}>{one.line}</td>
          <td className={TD}>{one.specification}</td>
          <td className={TD}>{one.uom}</td>
          <td className={cn(TD, 'text-right')}>{one.availableQty}</td>
          <td className={cn(TD, 'text-right font-medium')}>{money(one.unitPrice)}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

const Heading = ({ children }: { children: React.ReactNode }) => (
  <h4 className="m-0 mb-2 text-[11px] font-semibold tracking-[.06em] text-ink3 uppercase">
    {children}
  </h4>
);
