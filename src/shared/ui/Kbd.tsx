import type { ReactNode } from 'react';

export const Kbd = ({ children }: { children: ReactNode }) => (
  <kbd className="rounded border border-b-2 border-line bg-white px-1.5 font-sans text-ink2">
    {children}
  </kbd>
);
