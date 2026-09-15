import type { SourcingRow } from '@/entities/rfq/lib/sourcing';
import { pluralSuffix } from '@/shared/lib/format';

/** Хто підписує запит. Один десk на весь POC, тому й один підпис. */
const SIGNATURE = 'Seven Seas Group — Singapore';

export interface InquiryGroup {
  /**
   * Назва постачальника — вона ж ключ. Іншого ідентифікатора аркуш не несе:
   * у рядку стоїть саме ім'я фірми, і двох фірм з одним іменем у ньому немає.
   */
  supplier: string;
  rows: SourcingRow[];
}

/**
 * Позиції, згруповані по постачальниках — **один лист на постачальника**.
 *
 * Два різні товари в одного постачальника — це один запит із двома рядками, а
 * не два запити. Два листи підряд від того самого відправника про ту саму
 * поставку читаються як помилка, і відповідають на них так само: один раз, на
 * той, що трапився під руку.
 *
 * Позиції без постачальника випадають: писати нема кому. Вони не зникають
 * з екрана — на нього вони й далі виходять із прочерком у колонці.
 */
export const inquiryGroups = (rows: SourcingRow[]): InquiryGroup[] => {
  const groups = new Map<string, InquiryGroup>();

  for (const row of rows) {
    if (!row.supplier) continue;
    const group = groups.get(row.supplier) ?? { supplier: row.supplier, rows: [] };
    group.rows.push(row);
    groups.set(row.supplier, group);
  }

  return [...groups.values()];
};

/** Які позиції в цього постачальника — коротко, для списку зліва. */
export const lineNote = (group: InquiryGroup): string =>
  `line${pluralSuffix(group.rows.length)} ${group.rows.map((row) => row.line).join(', ')}`;

export interface InquiryContext {
  /** Наш номер цього RFQ — те, за чим лист знайдеться у відповіді. */
  reference: string;
  vessel: string;
  port: string;
}

/**
 * Лист одному постачальнику, як його склав би десk.
 *
 * Питає рівно про те, чого бракує, щоб порахувати ціну: що саме він постачає,
 * у яких одиницях, скільки має і почім. Порожнє судно чи порт не лишають по
 * собі дірки в реченні — лист без судна просто про нього не згадує.
 */
export const inquiryText = (group: InquiryGroup, rfq: InquiryContext): string => {
  const subject = ['Web Inquiry', rfq.reference, rfq.vessel].filter(Boolean).join(' · ');
  const forVessel = rfq.vessel ? ` for ${rfq.vessel}` : '';
  const toPort = rfq.port ? `, delivery ${rfq.port}` : '';

  const items = group.rows.map(
    (row) =>
      `${row.line}. ${row.itemCode} · ${row.itemDescription} — ` +
      [row.quantity, row.uom].filter(Boolean).join(' '),
  );

  return [
    `Subject: ${subject}`,
    '',
    `Dear ${group.supplier},`,
    '',
    `Kindly quote the following item(s)${forVessel}${toPort}.`,
    'Please confirm product / specification, your unit of measure, available quantity and unit price.',
    '',
    ...items,
    '',
    'Best regards,',
    SIGNATURE,
  ].join('\n');
};
