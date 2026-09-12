import { cn } from '@/shared/lib/cn';

/** Чотири етапи POC. Активний зараз лише перший. */
const STAGES = [
  { n: 1, title: 'Product Matching' },
  { n: 2, title: 'Supplier Sourcing' },
  { n: 3, title: 'Pricing' },
  { n: 4, title: 'RFQ Finalisation' },
] as const;

export interface RfqStagesProps {
  /** Підпис під активним етапом. Решта етапів підпису не мають — їх ще нема. */
  detail: string;
}

export const RfqStages = ({ detail }: RfqStagesProps) => (
  <ol className="m-0 mb-[14px] flex list-none flex-wrap gap-2 p-0">
    {STAGES.map((stage) => {
      const isActive = stage.n === 1;
      return (
        <li
          key={stage.n}
          aria-current={isActive ? 'step' : undefined}
          className={cn(
            'flex min-w-[180px] flex-1 basis-[200px] items-center gap-2.5 rounded-[10px]',
            'border px-3.5 py-2.5 text-left text-[13.5px] font-medium',
            isActive ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink',
          )}
        >
          <span
            className={cn(
              'inline-flex size-[22px] shrink-0 items-center justify-center rounded-full',
              'text-[12px] font-semibold',
              isActive ? 'bg-white/20 text-white' : 'bg-[#F3F4F6] text-ink3',
            )}
          >
            {stage.n}
          </span>
          <span>
            {stage.title}
            <small
              className={cn(
                'block text-[11.5px] font-normal',
                isActive ? 'text-white/70' : 'text-ink3',
              )}
            >
              {isActive ? detail : 'Not in this POC'}
            </small>
          </span>
        </li>
      );
    })}
  </ol>
);
