import { useRef, useState } from 'react';

import {
  quotationFileName,
  quotationFiles,
  quotationLetter,
  type QuotationFormat,
} from '@/entities/rfq/lib/quotation';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/Button';

/** An empty value shows as a dash - neither hidden nor made up. */
const EMPTY = <span className="text-ink4">—</span>;

/** A generated file has no size yet: it is made when the letter goes. */
const GENERATED = 'Generated on send';

export interface QuotationEmailProps {
  format: QuotationFormat;
  reference: string;
  /** The address the RFQ came from - the letter goes back to it. */
  customer: string;
  /** The mailbox the RFQ came in to - the letter goes out from it. */
  mailbox: string;
}

/**
 * One file on the letter. `size` is only there for a file somebody attached
 * by hand: the generated ones do not exist until they are downloaded.
 */
interface Attachment {
  id: string;
  name: string;
  size: number | null;
}

/**
 * The letter the quotation goes out with: who to, from where, with which
 * files and in what words.
 *
 * Nothing here is kept or sent - it is the POC's picture of the last step.
 * A file attached by hand stays in the browser as a name and a size; its
 * bytes are never read. Remount it per format (`key`): a different format is
 * a different document, signed by a different office.
 */
export const QuotationEmail = ({ format, reference, customer, mailbox }: QuotationEmailProps) => {
  const [attachments, setAttachments] = useState<Attachment[]>(() =>
    quotationFiles(format).map((file) => ({
      id: `generated:${file}`,
      name: quotationFileName(reference, format, file),
      size: null,
    })),
  );
  const [message, setMessage] = useState(() => quotationLetter(customer, format));
  const picker = useRef<HTMLInputElement>(null);
  const added = useRef(0);

  const attach = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const next = Array.from(files, (file) => ({
      id: `added:${(added.current += 1)}`,
      name: file.name,
      size: file.size,
    }));
    setAttachments((current) => [...current, ...next]);
  };

  return (
    // Who it goes to, what goes with it and the send button on the left; the
    // letter gets the wide column beside them, so all of it is in view at once.
    <div className="grid border-b border-line2 md:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="grid content-start gap-[18px] border-b border-line2 bg-[#F9FAFB] px-4 py-3.5 md:border-r md:border-b-0">
        <section className="grid gap-2">
          <h4 className="m-0 text-[13px] font-semibold">Recipients</h4>
          <dl className="m-0 grid gap-2">
            <Address label="From" value={mailbox} />
            <Address label="To" value={customer} />
          </dl>
        </section>

        <section className="grid gap-2">
          <h4 className="m-0 flex items-center gap-2 text-[13px] font-semibold">
            Attachments
            <span className="text-[12px] font-medium text-ink3">{attachments.length}</span>
          </h4>
          {attachments.length === 0 ? (
            <p className="m-0 text-[13px] text-ink3">No files attached</p>
          ) : (
            <ul className="m-0 grid list-none gap-1.5 p-0">
              {attachments.map((file) => (
                <li
                  key={file.id}
                  className="flex items-center gap-[9px] rounded-lg border border-line bg-white px-2 py-[7px]"
                >
                  <FileBadge name={file.name} />
                  <span className="grid min-w-0 flex-1">
                    <span title={file.name} className="truncate font-mono text-[12.5px]">
                      {file.name}
                    </span>
                    <span className="text-[11.5px] text-ink4">
                      {file.size === null ? GENERATED : fileSize(file.size)}
                    </span>
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${file.name}`}
                    className="cursor-pointer rounded px-1.5 text-[15px] leading-none text-ink3 hover:bg-sel hover:text-ink"
                    onClick={() =>
                      setAttachments((current) => current.filter((one) => one.id !== file.id))
                    }
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => picker.current?.click()}
            className="grid w-full cursor-pointer place-items-center gap-0.5 rounded-lg border border-dashed border-line bg-transparent p-3 text-center text-[12.5px] text-ink3 hover:border-ink4 hover:bg-white hover:text-ink2"
          >
            <b className="font-medium text-ink">+ Attach file</b>
            Any file from your computer
          </button>
          <input
            ref={picker}
            type="file"
            multiple
            hidden
            aria-label="Attach file"
            onChange={(event) => {
              attach(event.target.files);
              // The same file picked twice in a row is still a second pick.
              event.target.value = '';
            }}
          />
        </section>

        <Button variant="primary" className="w-full" disabled>
          Send to customer
        </Button>
      </aside>

      <section className="grid content-start gap-2 px-4 py-3.5">
        <h4 className="m-0 text-[13px] font-semibold">Message</h4>
        <textarea
          aria-label="Email message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="min-h-[260px] w-full resize-y rounded-lg border border-line bg-white px-[13px] py-[11px] text-[13px] leading-[1.55] text-ink2"
        />
      </section>
    </div>
  );
};

/** One address of the letter, in its own small box. */
const Address = ({ label, value }: { label: string; value: string }) => (
  <div className="grid gap-0.5 rounded-lg border border-line bg-white px-[11px] py-[9px]">
    <dt className="text-[12px] text-ink3">{label}</dt>
    <dd className="m-0 font-mono text-[12.5px] break-all">{value || EMPTY}</dd>
  </div>
);

/** What kind of file it is, at a glance: PDF red, a spreadsheet green, the rest grey. */
const FileBadge = ({ name }: { name: string }) => {
  const extension = name.split('.').pop()?.toLowerCase() ?? '';
  const [label, colours] =
    extension === 'pdf'
      ? ['PDF', 'bg-bad-soft text-bad']
      : ['xls', 'xlsx', 'xlsm', 'csv'].includes(extension)
        ? ['XLS', 'bg-ok-soft text-ok']
        : [extension.slice(0, 4).toUpperCase() || 'FILE', 'bg-sel text-ink3'];
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid h-[30px] w-[30px] flex-none place-items-center rounded-md font-mono text-[9.5px] font-semibold tracking-[.03em]',
        colours,
      )}
    >
      {label}
    </span>
  );
};

/** "12 KB", "1.4 MB" - enough to tell a file from another, no more. */
const fileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
