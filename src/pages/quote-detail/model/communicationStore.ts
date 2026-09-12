import { create } from 'zustand';

import type { SupplierId } from '@/entities/supplier/model/types';

export type CommunicationChannel = 'customer' | 'supplier';

interface CommunicationState {
  isOpen: boolean;
  channel: CommunicationChannel;
  activeSupplierId: SupplierId | null;
  /** id відкритого листа в акордеоні; null — усі згорнуті. */
  openMailId: string | null;

  toggle: (channel: CommunicationChannel) => void;
  open: (channel: CommunicationChannel, mailId?: string) => void;
  close: () => void;
  setSupplier: (supplierId: SupplierId) => void;
  setOpenMail: (mailId: string | null) => void;
}

/** Ефемерний стан правої панелі — навмисно не персиститься. */
export const useCommunicationStore = create<CommunicationState>((set) => ({
  isOpen: false,
  channel: 'customer',
  activeSupplierId: null,
  openMailId: null,

  toggle: (channel) =>
    set((state) =>
      state.isOpen && state.channel === channel
        ? { isOpen: false }
        : { isOpen: true, channel },
    ),
  open: (channel, mailId) =>
    set((state) => ({ isOpen: true, channel, openMailId: mailId ?? state.openMailId })),
  close: () => set({ isOpen: false }),
  setSupplier: (activeSupplierId) => set({ activeSupplierId }),
  setOpenMail: (openMailId) => set({ openMailId }),
}));
