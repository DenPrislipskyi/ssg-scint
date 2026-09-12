import { QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { createQueryClient } from '@/app/providers/queryClient';
import { RepositoriesProvider } from '@/app/providers/RepositoriesProvider';
import { LightboxProvider } from '@/shared/ui/Lightbox';
import { ToastProvider } from '@/shared/ui/Toast';

export const AppProviders = ({ children }: { children: ReactNode }) => {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <RepositoriesProvider>
        <ToastProvider>
          <LightboxProvider>{children}</LightboxProvider>
        </ToastProvider>
      </RepositoriesProvider>
    </QueryClientProvider>
  );
};
