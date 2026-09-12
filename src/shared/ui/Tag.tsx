import type { ReactNode } from 'react';

import type { Tone } from '@/entities/quote/lib/statusMeta';
import { cn } from '@/shared/lib/cn';
import { TONE } from '@/shared/ui/tone';

export interface TagProps {
  tone?: Tone;
  /** Заповнений варіант — для «Selected» у Sourcing. */
  solid?: boolean;
  className?: string;
  children: ReactNode;
}

export const Tag = ({ tone = 'muted', solid = false, className, children }: TagProps) => (
  <span
    className={cn(
      'inline-block rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap',
      solid ? 'bg-ok text-white' : TONE[tone].chip,
      className,
    )}
  >
    {children}
  </span>
);
