import { useEffect, useMemo } from 'react';

import { useTablePrefsStore, type TableKey } from '@/shared/model/tablePrefsStore';
import { defaultVisibility, type ColumnDef, type ColumnVisibility } from '@/shared/ui/DataTable';

export interface ColumnVisibilityApi {
  visibility: ColumnVisibility;
  toggle: (columnKey: string, visible: boolean) => void;
}

/** Зв'язує визначення колонок таблиці з персистентними налаштуваннями. */
export const useColumnVisibility = <TRow,>(
  table: TableKey,
  columns: ColumnDef<TRow>[],
): ColumnVisibilityApi => {
  const stored = useTablePrefsStore((state) => state.visibility[table]);
  const setVisibility = useTablePrefsStore((state) => state.setVisibility);
  const ensureDefaults = useTablePrefsStore((state) => state.ensureDefaults);

  const defaults = useMemo(() => defaultVisibility(columns), [columns]);

  useEffect(() => {
    ensureDefaults(table, defaults);
  }, [defaults, ensureDefaults, table]);

  const visibility = useMemo(() => ({ ...defaults, ...stored }), [defaults, stored]);

  return {
    visibility,
    toggle: (columnKey, visible) => setVisibility(table, columnKey, visible),
  };
};
