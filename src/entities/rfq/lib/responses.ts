import {
  inquiryGroups,
  inquiryText,
  replyText,
  type InquiryContext,
} from '@/entities/rfq/lib/inquiry';
import type { SourcingRow } from '@/entities/rfq/lib/sourcing';
import type { SentInquiry } from '@/entities/rfq/model/types';

/** Один рядок таблиці, яку постачальник прислав у відповідь. */
export interface OfferedLine {
  key: string;
  line: number;
  /** Товар, про який питали — наш опис. Постачальник відповідає про нього. */
  specification: string;
  uom: string;
  /**
   * Скільки він має. Стільки ж, скільки просили: це імітація відповіді, і
   * постачальник, який раптом «має» іншу кількість, вигадував би переговори,
   * яких не було.
   */
  availableQty: string;
  unitPrice: number;
}

/** Листування з одним постачальником — наш лист і його відповідь. */
export interface SupplierThread {
  supplier: string;
  rows: SourcingRow[];
  /**
   * Текст, який пішов. Для ненадісланого — шаблон, за яким він піде: вікно
   * показує те саме, що людина щойно бачила, а не порожнечу.
   */
  outbound: string;
  /** `null`, поки ніхто не надсилав. Саме це відрізняє «not sent yet». */
  sentAt: string | null;
  /** Порожньо, поки жодної ціни від нього немає: відповіді ще не було. */
  offered: OfferedLine[];
  /** Коли відповідь прийшла — мить, коли з'явилася перша з його цін. */
  repliedAt: string | null;
}

/**
 * Листування по кожному постачальнику цього RFQ.
 *
 * Групування те саме, що й у запитах, і навмисно: екран відповідей показує ті
 * самі листи, що й вікно надсилання, а два різні групування давали б два
 * різні списки постачальників на тому самому RFQ.
 *
 * Збережений лист має перевагу над шаблоном скрізь, де він є: питання «що ми
 * надіслали» має відповідь лише в тому, що надіслали, а шаблон з того часу
 * міг змінитися.
 */
export const supplierThreads = (
  rows: SourcingRow[],
  inquiries: SentInquiry[],
  rfq: InquiryContext,
): SupplierThread[] => {
  const sent = new Map(inquiries.map((one) => [one.supplier, one]));

  return inquiryGroups(rows).map((group) => {
    const letter = sent.get(group.supplier);
    // Ціна є — значить, відповів. Нуль тут неможливий: бекенд його не
    // приймає, а `null` означає, що не відповіли, і це не ціна.
    const answered = group.rows.filter((row) => row.unitPrice !== null);

    return {
      supplier: group.supplier,
      rows: group.rows,
      outbound: letter?.body ?? inquiryText(group, rfq),
      sentAt: letter?.sentAt ?? null,
      offered: answered.map((row) => ({
        key: row.key,
        line: row.line,
        specification: row.itemDescription,
        uom: row.uom,
        availableQty: [row.quantity, row.uom].filter(Boolean).join(' '),
        unitPrice: row.unitPrice as number,
      })),
      // Найраніша з його цін: лист один, і прийшов він тоді, коли прийшла
      // перша з них. Остання датувала б відповідь дописуванням, яке сталося
      // після обриву й не є новим листом.
      repliedAt: earliest(answered.map((row) => row.receivedAt)),
    };
  });
};

const earliest = (moments: (string | null)[]): string | null => {
  const known = moments.filter((one): one is string => one !== null);
  if (known.length === 0) return null;
  return known.reduce((first, one) => (one < first ? one : first));
};

/** Чи вже є що читати: хоч одна ціна на цьому RFQ. */
export const hasAnyReply = (rows: SourcingRow[]): boolean =>
  rows.some((row) => row.unitPrice !== null);

/** Whether a letter went out about this line - a supplier can only answer one. */
export const wasAsked = (row: SourcingRow, inquiries: SentInquiry[]): boolean =>
  inquiries.some((one) => one.lines.includes(row.index));

/**
 * Where a line's inquiry stands: `Received` once a supplier's price is on it,
 * `Sent` once a letter went out about it, and nothing before either - the
 * status of an inquiry nobody sent is not a status.
 */
export type InquiryStatus = 'Sent' | 'Received' | '';

export const inquiryStatus = (row: SourcingRow, inquiries: SentInquiry[]): InquiryStatus => {
  if (row.unitPrice !== null) return 'Received';
  return wasAsked(row, inquiries) ? 'Sent' : '';
};

/** Чи листи вже пішли. Вони йдуть один раз, і це — та сама перевірка. */
export const alreadySent = (inquiries: SentInquiry[]): boolean => inquiries.length > 0;

/** Текст відповіді цього постачальника. Тримається тут, бо це той самий екран. */
export const threadReply = (thread: SupplierThread, reference: string): string =>
  replyText(thread.supplier, reference);

const WHEN: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
};

/**
 * «25 Sept 2026, 11:31» — як у прототипі.
 *
 * Порожньо для моменту, якого немає, і для рядка, який не є датою: бекенд
 * віддає ISO, але дата, зібрана з чогось іншого, показала б `Invalid Date`
 * там, де людина шукає час листа.
 */
export const formatMoment = (moment: string | null): string => {
  if (!moment) return '';
  const at = new Date(moment);
  return Number.isNaN(at.getTime()) ? '' : at.toLocaleString('en-GB', WHEN);
};
