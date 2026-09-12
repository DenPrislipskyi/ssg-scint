import type { HTMLAttributes } from 'react';

import { cn } from '@/shared/lib/cn';

export const Card = ({ className, ...rest }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('max-w-full overflow-hidden rounded-xl border border-line bg-white', className)}
    {...rest}
  />
);
