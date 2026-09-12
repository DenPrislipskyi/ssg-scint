import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { ColumnVisibility } from '@/shared/ui/DataTable';

export type TableKey = 'quotes' | 'lines' | 'sourcing';

interface TablePrefsState {
  visibility: Record<TableKey, ColumnVisibility>;
  setVisibility: (table: TableKey, columnKey: string, visible: boolean) => void;
  ensureDefaults: (table: TableKey, defaults: ColumnVisibility) => void;
}

/**
 * Налаштування видимості колонок. Єдиний стор, що переживає перезавантаження —
 * решта UI-стану навмисно ефемерна.
 */
export const useTablePrefsStore = create<TablePrefsState>()(
  persist(
    (set, get) => ({
      visibility: { quotes: {}, lines: {}, sourcing: {} },

      setVisibility: (table, columnKey, visible) =>
        set((state) => ({
          visibility: {
            ...state.visibility,
            [table]: { ...state.visibility[table], [columnKey]: visible },
          },
        })),

      ensureDefaults: (table, defaults) => {
        const current = get().visibility[table];
        const missing = Object.keys(defaults).filter((key) => !(key in current));
        if (missing.length === 0) return;

        set((state) => ({
          visibility: {
            ...state.visibility,
            [table]: { ...defaults, ...state.visibility[table] },
          },
        }));
      },
    }),
    { name: 'scint-table-prefs-v1', version: 1 },
  ),
);
