import type { QuoteOutputType } from '@/entities/quote/model/types';
import { useQuoteDetail } from '@/pages/quote-detail/model/QuoteDetailContext';
import { cn } from '@/shared/lib/cn';
import { Input, Select } from '@/shared/ui/Field';

interface OutputOption {
  value: QuoteOutputType;
  title: string;
  description: string;
  /** MTML доступний лише коли RFQ прийшов через портал. */
  requiresMtml?: boolean;
}

const OPTIONS: OutputOption[] = [
  {
    value: 'mtml',
    title: 'MTML → customer portal',
    description: 'Sent automatically from SCINT. No email, no Excel.',
    requiresMtml: true,
  },
  {
    value: 'email',
    title: 'Email · PDF + Excel',
    description: 'Export from SCINT, attach to your email template, add cc.',
  },
  {
    value: 'customerExcel',
    title: "Customer's Excel",
    description: 'Populate the customer’s own file with our prices, send by email.',
  },
];

/** Канал доставки котирування. Визначає і текст листа, і набір вкладень. */
export const OutputTypeSelector = () => {
  const { quote, actions } = useQuoteDetail();
  const isMtmlQuote = quote.header.fileType === 'MTML';
  const current: QuoteOutputType = quote.outputType ?? (isMtmlQuote ? 'mtml' : 'email');

  return (
    <div className="grid gap-3 px-4 pb-3.5 md:grid-cols-3">
      {OPTIONS.map((option) => {
        const isEnabled = !option.requiresMtml || isMtmlQuote;
        const isActive = current === option.value;

        return (
          <button
            key={option.value}
            type="button"
            disabled={!isEnabled}
            aria-pressed={isActive}
            onClick={() => void actions.setOutputType(option.value)}
            className={cn(
              'rounded-[10px] border px-3.5 py-3 text-left text-[13px]',
              isActive ? 'border-ink shadow-[0_0_0_1px_var(--color-ink)]' : 'border-line',
              isEnabled ? 'cursor-pointer' : 'cursor-default opacity-45',
            )}
          >
            <b className="mb-1 block">{option.title}</b>
            <span className="text-xs text-ink3">{option.description}</span>

            {option.value === 'email' && isActive && (
              <div
                className="mt-2 flex flex-wrap items-center gap-1.5"
                onClick={(event) => event.stopPropagation()}
              >
                <span className="text-[13px] text-ink2">Template</span>
                <Select className="px-2 py-1" aria-label="Email template">
                  <option>Priya · Technical quote</option>
                  <option>Priya · Provisions</option>
                </Select>
                <span className="text-[13px] text-ink2">cc</span>
                <Input
                  className="w-[170px] px-2 py-1"
                  defaultValue="supply.singapore@, r.tan@"
                  aria-label="Carbon copy"
                />
              </div>
            )}

            {option.value === 'mtml' && isActive && (
              <div className="mt-1.5 text-[13px] text-ink4">
                Warnings (zero price / unresolved lines) are shown before sending; draft quotes with
                clarifications can skip them.
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};
