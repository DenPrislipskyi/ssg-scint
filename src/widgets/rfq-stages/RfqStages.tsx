import { Link } from 'react-router';

import { cn } from '@/shared/lib/cn';

/** Чотири етапи POC. Справжніх екранів поки два. */
const STAGES = [
  { n: 1, title: 'Product Matching' },
  { n: 2, title: 'Supplier Sourcing' },
  { n: 3, title: 'Pricing' },
  { n: 4, title: 'RFQ Finalisation' },
] as const;

/** Етап, якого в POC ще немає, каже про себе те саме, що й досі. */
const ABSENT = 'Not in this POC';

export interface StageState {
  /** Підпис під назвою. Без нього етап читається як «ще не в POC». */
  hint?: string;
  /** Куди веде. Без нього — нікуди: етап або поточний, або недоступний. */
  to?: string;
  /**
   * Чому туди не можна. Показуємо при наведенні — і водночас кажемо те саме
   * в підписі: підказка, яку видно лише навівши, не допомагає тому, хто не
   * здогадався навести.
   */
  blocked?: string;
}

export interface RfqStagesProps {
  /** Номер відкритого зараз етапу, 1..4. */
  current: number;
  /** Стан етапів за номером. Про що не сказано — того ще немає. */
  stages?: Partial<Record<number, StageState>>;
}

const BOX =
  'flex w-full items-center gap-2.5 rounded-[10px] border px-3.5 py-2.5 text-left text-[13.5px] font-medium';

export const RfqStages = ({ current, stages = {} }: RfqStagesProps) => (
  <ol className="m-0 mb-[14px] flex list-none flex-wrap gap-2 p-0">
    {STAGES.map(({ n, title }) => {
      const { hint, to, blocked } = stages[n] ?? {};
      const isCurrent = n === current;

      const body = (
        <>
          <span
            className={cn(
              'inline-flex size-[22px] shrink-0 items-center justify-center rounded-full',
              'text-[12px] font-semibold',
              isCurrent ? 'bg-white/20 text-white' : 'bg-[#F3F4F6] text-ink3',
            )}
          >
            {n}
          </span>
          <span>
            {title}
            <small
              className={cn(
                'block text-[11.5px] font-normal',
                isCurrent ? 'text-white/70' : 'text-ink3',
              )}
            >
              {hint ?? ABSENT}
            </small>
          </span>
        </>
      );

      return (
        <li
          key={n}
          aria-current={isCurrent ? 'step' : undefined}
          className="flex min-w-[180px] flex-1 basis-[200px]"
        >
          {to ? (
            <Link
              to={to}
              className={cn(BOX, 'border-line bg-white text-ink hover:bg-sel')}
              title={title}
            >
              {body}
            </Link>
          ) : (
            // Не `button disabled`: вимкнена кнопка в Chrome не отримує подій
            // миші, і підказка над нею просто не з'являється — а вона тут і є
            // відповіддю на «чому не відкривається».
            <span
              title={blocked}
              aria-disabled={blocked ? true : undefined}
              className={cn(
                BOX,
                isCurrent ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink',
                blocked && 'cursor-not-allowed',
              )}
            >
              {body}
            </span>
          )}
        </li>
      );
    })}
  </ol>
);
