import { createContext, use, useCallback, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface LightboxApi {
  open: (src: string, alt: string) => void;
}

const LightboxContext = createContext<LightboxApi | null>(null);

export const LightboxProvider = ({ children }: { children: ReactNode }) => {
  const [image, setImage] = useState<{ src: string; alt: string } | null>(null);

  const open = useCallback((src: string, alt: string) => setImage({ src, alt }), []);
  const api = useMemo(() => ({ open }), [open]);

  return (
    <LightboxContext value={api}>
      {children}
      {image &&
        createPortal(
          <div
            className="fixed inset-0 z-60 flex items-center justify-center bg-ink/70"
            onClick={() => setImage(null)}
            role="presentation"
          >
            <img
              src={image.src}
              alt={image.alt}
              className="max-h-[80vh] max-w-[80vw] rounded-xl bg-white"
            />
          </div>,
          document.body,
        )}
    </LightboxContext>
  );
};

export const useLightbox = (): LightboxApi => {
  const context = use(LightboxContext);
  if (!context) throw new Error('useLightbox must be used within LightboxProvider');
  return context;
};
