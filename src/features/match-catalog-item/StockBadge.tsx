import { cn } from '@/shared/lib/cn';

/** Мітка наявності: зелена «in stock» або червона «JIT · no stock». */
export const StockBadge = ({ inStock, className }: { inStock: boolean; className?: string }) => (
  <span
    className={cn(
      'text-[11px] font-semibold tracking-wide',
      inStock ? 'text-ok' : 'text-bad',
      className,
    )}
  >
    {inStock ? 'in stock' : 'JIT · no stock'}
  </span>
);
