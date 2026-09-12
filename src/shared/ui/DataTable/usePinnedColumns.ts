import { useMemo } from 'react';

import type { ColumnDef } from '@/shared/ui/DataTable/types';

export interface PinInfo {
  left: number;
  width: number;
  /** Остання закріплена колонка отримує тінь, що відділяє її від прокрутки. */
  isLast: boolean;
}

/**
 * Обчислює `left`-зсув кожної закріпленої колонки наростаючим підсумком
 * по видимих колонках.
 */
export const usePinnedColumns = <TRow,>(visibleColumns: ColumnDef<TRow>[]) =>
  useMemo(() => {
    const pinned = visibleColumns.filter((column) => column.pinWidth != null);
    const lastKey = pinned.at(-1)?.key;

    const map = new Map<string, PinInfo>();
    let offset = 0;
    for (const column of pinned) {
      const width = column.pinWidth!;
      map.set(column.key, { left: offset, width, isLast: column.key === lastKey });
      offset += width;
    }
    return map;
  }, [visibleColumns]);
