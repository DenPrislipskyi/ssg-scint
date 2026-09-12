import { createContext, use, useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { TOAST_DURATION_MS } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';

interface ToastApi {
  show: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((text: string) => {
    setMessage(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setMessage(null), TOAST_DURATION_MS);
  }, []);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext value={api}>
      {children}
      {createPortal(
        <div
          role="status"
          aria-live="polite"
          className={cn(
            'pointer-events-none fixed bottom-[18px] left-1/2 z-50 -translate-x-1/2',
            'rounded-lg bg-ink px-3.5 py-2.5 text-[13px] text-white transition-opacity',
            message ? 'opacity-100' : 'opacity-0',
          )}
        >
          {message}
        </div>,
        document.body,
      )}
    </ToastContext>
  );
};

export const useToast = (): ToastApi => {
  const context = use(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};
