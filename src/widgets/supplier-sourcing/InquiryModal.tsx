import { useState } from 'react';

import type { DraftInquiry } from '@/entities/rfq/api/rfqRepository';
import {
  inquiryText,
  lineNote,
  type InquiryContext,
  type InquiryGroup,
} from '@/entities/rfq/lib/inquiry';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';

const TH =
  'bg-[#F9FAFB] border-b border-line px-[9px] py-[7px] text-[12px] font-medium text-ink3 text-left';
const TD = 'border-b border-line2 px-[9px] py-[7px] align-top';

/** Поки не надіслали. Після надсилання вікно закривається, і напис не живе. */
const NOT_SENT = 'Not sent';

const SENDING = 'Sending…';

export interface InquiryModalProps {
  groups: InquiryGroup[];
  rfq: InquiryContext;
  onClose: () => void;
  /**
   * Записати листи такими, якими вони на цю мить є — разом із правками.
   *
   * Вікно не вирішує, що станеться далі: воно знає лише, що саме пішло.
   * Закриває його той, хто надсилає, і лише коли запис узяв.
   */
  onSend: (inquiries: DraftInquiry[]) => void;
  /** Доки запис іде. Друге натискання надіслало б ту саму розсилку двічі. */
  sending?: boolean;
}

/**
 * Чернетки запитів постачальникам — по одній на постачальника.
 *
 * Зліва ті, кому доведеться писати; справа — що саме в них питають і чим.
 * Списку позицій тут немає: позиція сама по собі нікому не адресована, а
 * адресат один на всі свої позиції, і лист у нього теж один.
 *
 * Sends nothing by mail - the sheet holds no supplier addresses. `Send Web
 * Inquiry` records every letter as it stands, once for the RFQ; `Cancel` only
 * closes the window.
 */
export const InquiryModal = ({
  groups,
  rfq,
  onClose,
  onSend,
  sending = false,
}: InquiryModalProps) => {
  const [chosen, setChosen] = useState('');
  // Правки живуть, доки відкрите вікно, і окремо для кожного постачальника:
  // лист, переписаний під одного, не має наздогнати решту.
  const [edited, setEdited] = useState<Record<string, string>>({});

  const group = groups.find((one) => one.supplier === chosen) ?? groups[0];
  const lines = group?.rows ?? [];
  const bodyOf = (one: InquiryGroup): string => edited[one.supplier] ?? inquiryText(one, rfq);
  const text = group ? bodyOf(group) : '';
  const asked = groups.reduce((count, one) => count + one.rows.length, 0);

  // Усі листи, не лише відкритий: натискають один раз, і решта постачальників
  // від цього не перестає чекати на свій. Позиції адресуються номером у
  // записі — вікно, яке перенумерує рядки, не має права переадресувати лист.
  const send = () =>
    onSend(
      groups.map((one) => ({
        supplier: one.supplier,
        body: bodyOf(one),
        lines: one.rows.map((row) => row.index),
      })),
    );

  return (
    <Modal
      open
      onClose={onClose}
      // Хрестика в шапці немає, як і в макеті: закрити вже є чим — у
      // підвалі, і два хрестики на одну дію читаються як дві різні.
      showCloseButton={false}
      width="min(1000px,100%)"
      title="Send Web Inquiry"
      subtitle={`${groups.length} suggested supplier(s) · ${asked} JIT line(s)`}
      footer={
        <>
          <span className="text-[12px] text-ink4">
            One predefined POC template · editable per supplier
          </span>
          <span className="ml-auto" />
          <Button onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          {/* Нікуди не йде і в поштовому сенсі не піде: записується те, що
              людина склала й натиснула «надіслати». Саме це потім питають —
              постачальнику, який назвав не той товар, відповідають листом,
              який йому надіслали, а не шаблоном, з якого він почався. */}
          <Button variant="primary" onClick={send} disabled={sending}>
            {sending ? SENDING : 'Send Web Inquiry'}
          </Button>
        </>
      }
    >
      {/* Від краю до краю, як у макеті: поля модалки тут знімаються, а кожна
          колонка додає свої. */}
      <div className="-mx-[18px] -my-3.5 grid grid-cols-1 sm:grid-cols-[260px_minmax(0,1fr)]">
        <div className="border-b border-line2 bg-[#FAFAFB] p-3 sm:border-r sm:border-b-0">
          <Heading>Suggested suppliers</Heading>
          {groups.map((one) => {
            const on = one.supplier === group?.supplier;
            return (
              <Button
                key={one.supplier}
                aria-pressed={on}
                onClick={() => setChosen(one.supplier)}
                className={cn(
                  'mb-1.5 block w-full text-left last:mb-0',
                  on ? 'border-ink bg-sel' : 'border-line bg-white',
                )}
              >
                <b className="block font-medium">{one.supplier}</b>
                <small className="mt-0.5 block font-normal text-ink4">
                  {lineNote(one)} · {NOT_SENT}
                </small>
              </Button>
            );
          })}
        </div>

        <div className="max-h-[64vh] overflow-auto px-4 py-3.5">
          <Heading>Products for {group?.supplier ?? '—'}</Heading>
          <table className="mb-3.5 w-full border-separate border-spacing-0 text-[13px]">
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
              {lines.map((row) => (
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

          <Heading>Supplier email template</Heading>
          <textarea
            aria-label="Supplier email template"
            value={text}
            onChange={(event) =>
              group && setEdited((drafts) => ({ ...drafts, [group.supplier]: event.target.value }))
            }
            className="min-h-[210px] w-full resize-y rounded-lg border border-line px-[13px] py-[11px] font-mono text-[12px] leading-[1.55] text-ink2"
          />
        </div>
      </div>
    </Modal>
  );
};

const Heading = ({ children }: { children: React.ReactNode }) => (
  <h4 className="m-0 mb-2 text-[11px] font-semibold tracking-[.06em] text-ink3 uppercase">
    {children}
  </h4>
);
