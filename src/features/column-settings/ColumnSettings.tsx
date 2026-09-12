import { useState } from 'react';

import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/Button';
import type { ColumnDef, ColumnVisibility } from '@/shared/ui/DataTable';
import { Popover } from '@/shared/ui/Popover';

export interface ColumnSettingsProps<TRow> {
  columns: ColumnDef<TRow>[];
  visibility: ColumnVisibility;
  onToggle: (columnKey: string, visible: boolean) => void;
  label?: string;
  size?: 'xs' | 'md';
  /** Класи позиціювання поповера відносно контейнера. */
  popoverClassName?: string;
}

/** Універсальний вибір колонок — один компонент на всі таблиці застосунку. */
export const ColumnSettings = <TRow,>({
  columns,
  visibility,
  onToggle,
  label = 'Columns',
  size = 'md',
  popoverClassName = 'right-0 top-full mt-1.5 w-[260px]',
}: ColumnSettingsProps<TRow>) => {
  const [open, setOpen] = useState(false);
  const options = columns.filter((column) => column.header);

  return (
    <div className="relative inline-block">
      <Button size={size} onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        {label}
      </Button>
      <Popover open={open} onClose={() => setOpen(false)} className={popoverClassName}>
        <div className="px-3.5 pt-1.5 pb-0.5 text-[11px] tracking-wider text-ink4 uppercase">
          {label}
        </div>
        {options.map((column) => (
          <label
            key={column.key}
            className={cn(
              'flex cursor-pointer items-center gap-2 px-3.5 py-1.5 hover:bg-sel',
              column.locked && 'cursor-default opacity-60',
            )}
          >
            <input
              type="checkbox"
              checked={visibility[column.key] !== false}
              disabled={column.locked}
              onChange={(event) => onToggle(column.key, event.target.checked)}
            />
            <span>{column.header}</span>
            {column.locked && <span className="ml-auto text-ink4">· pinned</span>}
          </label>
        ))}
      </Popover>
    </div>
  );
};
