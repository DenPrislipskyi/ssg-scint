import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/Button';
import { IconClose } from '@/shared/ui/icons';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** Приглушений підпис праворуч від заголовка. */
  subtitle?: ReactNode;
  footer?: ReactNode;
  width?: string;
  showCloseButton?: boolean;
  children: ReactNode;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

export const Modal = ({
  open,
  onClose,
  title,
  subtitle,
  footer,
  width = 'min(980px,100%)',
  showCloseButton = true,
  children,
}: ModalProps) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    // Фокус-пастка: Esc закриває, Tab циклиться всередині модалки.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !boxRef.current) return;

      const items = [...boxRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (items.length === 0) return;

      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    boxRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = overflow;
      restoreFocusRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-auto bg-ink/35 px-4 py-10"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        style={{ width }}
        className="rounded-xl bg-white shadow-[0_20px_60px_rgba(17,24,39,.25)]"
      >
        <header className="flex items-center gap-2.5 border-b border-line px-[18px] py-3.5">
          <h2 className="m-0 text-base font-semibold">{title}</h2>
          {subtitle && <span className="text-[13px] text-ink3">{subtitle}</span>}
          {showCloseButton && (
            <Button size="xs" className="ml-auto" onClick={onClose} aria-label="Close">
              <IconClose className="size-3.5" />
            </Button>
          )}
        </header>
        <div className={cn('max-h-[70vh] overflow-auto px-[18px] py-3.5')}>{children}</div>
        {footer && (
          <footer className="flex items-center gap-2 border-t border-line px-[18px] py-3">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
};
