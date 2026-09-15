import { cn } from '@/shared/lib/cn';

/** Колір скору пошуку: те саме порогове читання, що й у макеті. */
const tone = (value: number): string =>
  value >= 85 ? 'text-ok' : value >= 60 ? 'text-warn' : 'text-bad';

/**
 * Скор пошуку — відсоток від найкращого кандидата ТІЄЇ Ж позиції.
 *
 * Не ймовірність і не порівнюється між позиціями. Смужка повторює число
 * візуально: око ловить її швидше за цифру.
 */
export const Confidence = ({ value, bar = true }: { value: number | null; bar?: boolean }) => {
  if (value === null) return <span className="text-ink4">—</span>;
  const colour = tone(value);
  return (
    <>
      <span className={cn('font-medium', colour)}>{value} %</span>
      {bar && (
        <i className="mt-[5px] block h-[5px] w-14 overflow-hidden rounded-[3px] bg-line2">
          <b
            className={cn('block h-[5px] bg-current', colour)}
            style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
          />
        </i>
      )}
    </>
  );
};
