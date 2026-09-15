import { useState } from 'react';

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

/** Жоден лист звідси не йде: це чернетка, яку людина потім відправить сама. */
const NOT_SENT = 'Not sent';

export interface InquiryModalProps {
  groups: InquiryGroup[];
  rfq: InquiryContext;
  onClose: () => void;
}

/**
 * Чернетки запитів постачальникам — по одній на постачальника.
 *
 * Зліва ті, кому доведеться писати; справа — що саме в них питають і чим.
 * Списку позицій тут немає: позиція сама по собі нікому не адресована, а
 * адресат один на всі свої позиції, і лист у нього теж один.
 *
 * Нічого не надсилає. «Send Web Inquiry» і «Cancel» роблять те саме — те, що
 * єдине тут чесно можна зробити: закривають вікно.
 */
export const InquiryModal = ({ groups, rfq, onClose }: InquiryModalProps) => {
  const [chosen, setChosen] = useState('');
  // Правки живуть, доки відкрите вікно, і окремо для кожного постачальника:
  // лист, переписаний під одного, не має наздогнати решту.
  const [edited, setEdited] = useState<Record<string, string>>({});

  const group = groups.find((one) => one.supplier === chosen) ?? groups[0];
  const lines = group?.rows ?? [];
  const text = group ? (edited[group.supplier] ?? inquiryText(group, rfq)) : '';
  const asked = groups.reduce((count, one) => count + one.rows.length, 0);

  return (
    <Modal
      open
      onClose={onClose}
      width="min(1000px,100%)"
      title="Send Web Inquiry"
      subtitle={`${groups.length} suggested supplier(s) · ${asked} JIT line(s)`}
      footer={
        <>
          <span className="text-[12px] text-ink4">
            One predefined POC template · editable per supplier
          </span>
          <span className="ml-auto" />
          <Button onClick={onClose}>Cancel</Button>
          {/* Та сама дія, що й «Cancel»: у POC лист нікуди не йде, і кнопка,
              яка вдавала б надсилання, брехала б про зроблену роботу. */}
          <Button variant="primary" onClick={onClose}>
            Send Web Inquiry
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
