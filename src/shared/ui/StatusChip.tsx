import type { StatusMeta } from '@/entities/quote/lib/statusMeta';
import { cn } from '@/shared/lib/cn';
import { TONE } from '@/shared/ui/tone';

export interface StatusChipProps {
  meta: StatusMeta;
  /** Додатковий приглушений суфікс, напр. "2 of 3". */
  suffix?: string;
  className?: string;
}

export const StatusChip = ({ meta, suffix, className }: StatusChipProps) => {
  const { Icon } = meta;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-[7px] text-[13px] font-medium whitespace-nowrap',
        TONE[meta.tone].text,
        className,
      )}
    >
      <Icon className="size-4 shrink-0" />
      {meta.label}
      {suffix && <span className="font-normal text-ink3">{suffix}</span>}
    </span>
  );
};
