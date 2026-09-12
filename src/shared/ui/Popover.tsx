import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';
import { useClickOutside } from '@/shared/lib/hooks/useClickOutside';

export interface PopoverProps {
  open: boolean;
  onClose: () => void;
  className?: string;
  children: ReactNode;
}

/**
 * Спливаюча панель, спозиційована відносно найближчого `relative`-предка.
 * Позиція задається класами (`right-0 top-full` тощо) через `className`.
 */
export const Popover = ({ open, onClose, className, children }: PopoverProps) => {
  const ref = useClickOutside<HTMLDivElement>(onClose, open);
  if (!open) return null;

  return (
    <div
      ref={ref}
      className={cn(
        'absolute z-30 rounded-xl border border-line bg-white py-2 text-[13px]',
        'shadow-[0_10px_30px_rgba(17,24,39,.12)]',
        className,
      )}
    >
      {children}
    </div>
  );
};
