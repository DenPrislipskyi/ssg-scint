import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';
import { IconChevron } from '@/shared/ui/icons';

export interface AccordionItemProps {
  open: boolean;
  onToggle: () => void;
  /** Ліворуч від заголовка — напрямок листа (from customer / sent / draft). */
  badge?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
}

export const AccordionItem = ({
  open,
  onToggle,
  badge,
  title,
  meta,
  children,
}: AccordionItemProps) => (
  <div className="border-b border-line2">
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-[13.5px] hover:bg-[#FAFAFA]"
    >
      <IconChevron
        className={cn('size-4 shrink-0 text-ink4 transition-transform', open && 'rotate-90')}
      />
      {badge}
      <b className="font-medium">{title}</b>
      {meta && <span className="ml-auto text-xs text-ink3">{meta}</span>}
    </button>
    {open && <div className="px-4 pt-0 pb-3.5 pl-[42px]">{children}</div>}
  </div>
);

export const DirectionBadge = ({ kind }: { kind: 'in' | 'out' | 'draft' }) => {
  const map = {
    in: { label: 'from customer', className: 'bg-sup-soft text-sup' },
    out: { label: 'sent', className: 'bg-sel text-ink2' },
    draft: { label: 'draft', className: 'bg-warn-soft text-warn' },
  } as const;
  const { label, className } = map[kind];
  return (
    <span className={cn('rounded-[5px] px-[7px] py-0.5 text-[11px] font-medium', className)}>
      {label}
    </span>
  );
};

/** Моноширинне тіло листа зі збереженням переносів. */
export const MailBody = ({ children }: { children: ReactNode }) => (
  <div className="rounded-lg border border-line2 bg-[#F9FAFB] px-3.5 py-3 font-mono text-[12.5px] leading-[1.55] whitespace-pre-wrap text-ink2">
    {children}
  </div>
);
