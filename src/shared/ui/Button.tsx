import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

type Variant = 'default' | 'primary' | 'blue' | 'warning' | 'ghost';
type Size = 'xs' | 'md' | 'lg';

const VARIANT: Record<Variant, string> = {
  default: 'border-line bg-white text-ink hover:bg-sel',
  primary: 'border-ink bg-ink text-white hover:bg-black',
  blue: 'border-sup bg-sup text-white hover:bg-[#1E40AF] disabled:bg-[#93A6D8] disabled:border-[#93A6D8]',
  warning: 'border-info bg-info text-white hover:bg-[#9A3412]',
  ghost: 'border-transparent bg-transparent text-ink2 hover:bg-sel',
};

const SIZE: Record<Size, string> = {
  xs: 'px-2.5 py-1 text-xs rounded-md',
  // Розміри з макета v2: 7px по вертикалі, рядок 1.4.
  md: 'px-3.5 py-[7px] text-[13px] rounded-lg leading-[1.4]',
  lg: 'px-4 py-2.5 text-sm rounded-lg',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Лічильник праворуч від тексту (напр. кількість постачальників). */
  badge?: ReactNode;
}

export const Button = ({
  variant = 'default',
  size = 'md',
  badge,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) => (
  <button
    type={type}
    className={cn(
      'inline-flex items-center gap-1.5 border font-medium leading-tight whitespace-nowrap',
      'transition-colors disabled:cursor-default disabled:opacity-40',
      VARIANT[variant],
      SIZE[size],
      className,
    )}
    {...rest}
  >
    {children}
    {badge != null && badge !== '' && (
      <span
        className={cn(
          'ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold',
          variant === 'blue' || variant === 'primary' ? 'bg-white/25' : 'bg-sel text-ink',
        )}
      >
        {badge}
      </span>
    )}
  </button>
);
