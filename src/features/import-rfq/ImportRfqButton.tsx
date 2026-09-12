import { useId, useState } from 'react';

import { useToast } from '@/shared/ui/Toast';

/**
 * Імпорт RFQ з файлу клієнта.
 *
 * У POC файл не парситься — структуровані дані приходять з upstream-системи,
 * тож кнопка лише фіксує вибраний файл і повідомляє про це.
 */
export const ImportRfqButton = () => {
  const toast = useToast();
  const inputId = useId();
  const [fileName, setFileName] = useState('');

  return (
    <label
      htmlFor={inputId}
      className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-white px-3.5 py-2 text-[13px] font-medium"
    >
      Import RFQ (.xlsx)
      <input
        id={inputId}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          setFileName(file.name);
          toast.show(`${file.name} uploaded — parsing is out of POC scope`);
          event.target.value = '';
        }}
      />
      {fileName && <small className="text-xs font-normal text-ink4">{fileName}</small>}
    </label>
  );
};
