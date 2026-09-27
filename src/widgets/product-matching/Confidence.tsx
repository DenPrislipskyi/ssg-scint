import { cn } from '@/shared/lib/cn';

/** The score's colour: the same thresholds the mock-up reads it by. */
const tone = (value: number): string =>
  value >= 85 ? 'text-ok' : value >= 60 ? 'text-warn' : 'text-bad';

/**
 * How sure matching is that a product is what the line asked for, 0-100.
 *
 * Absolute, so it reads the same on every line; the backend works it out from
 * what it observed about the product (`confidence.py`). `null` - not scored -
 * is a dash. The bar repeats the number: the eye catches it faster.
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
