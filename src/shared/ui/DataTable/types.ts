import type { ReactNode } from 'react';

export interface CellContext {
  /** Позиція рядка у відрендереному списку. */
  index: number;
  isFocused: boolean;
}

export type RowSpan = number | 'skip';

export interface ColumnDef<TRow> {
  key: string;
  header: ReactNode;
  cell: (row: TRow, context: CellContext) => ReactNode;
  align?: 'left' | 'right' | 'center';
  /** Ширина в px. Наявність означає, що колонка закріплена зліва. */
  pinWidth?: number;
  /** Колонку не можна приховати (чекбокс disabled). */
  locked?: boolean;
  defaultVisible?: boolean;
  /** Клас для `<td>` — напр. обмеження ширини опису. */
  cellClassName?: string;
  /**
   * Групування рядків: скільки рядків займає клітинка.
   * 'skip' — не рендерити зовсім (клітинку вже намалював попередній рядок).
   */
  rowSpan?: (row: TRow, context: CellContext) => RowSpan;
}

export type ColumnVisibility = Record<string, boolean>;

export const defaultVisibility = <TRow,>(columns: ColumnDef<TRow>[]): ColumnVisibility =>
  Object.fromEntries(columns.map((column) => [column.key, column.defaultVisible ?? true]));
