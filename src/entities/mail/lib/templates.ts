import { firstName, pluralSuffix } from '@/shared/lib/format';
import type { CatalogData } from '@/entities/catalog/model/types';
import { outboundQuantity } from '@/entities/quote/lib/shipSupplyQty';
import type { Quote, QuoteHeader, QuoteLine } from '@/entities/quote/model/types';

const SIGNATURE = 'Thanks and Best Regards,\nPriya N., Seven Seas Ship Supply – Singapore';

/**
 * Текст листа-уточнення. Два блоки: позиції, яких немає в каталозі, і позиції,
 * де є кілька варіантів і потрібне підтвердження клієнта.
 */
export const buildClarificationText = (
  lines: QuoteLine[],
  header: QuoteHeader,
  catalog: CatalogData,
): string => {
  const greeting = `Dear ${firstName(header.contactName)},\n\n`;
  if (lines.length === 0) return greeting;

  const unknown = lines.filter((line) => line.suggestedItemCodes.length === 0);
  const ambiguous = lines.filter((line) => line.suggestedItemCodes.length > 0);

  const unknownBlock = unknown.length
    ? `We could not identify the following item${pluralSuffix(unknown.length)} in our catalogue. ` +
      `Could you describe ${unknown.length > 1 ? 'them' : 'it'} differently or add brand / part number, size, or a sample image?\n\n` +
      unknown
        .map(
          (line) =>
            `– ${line.customerDescription}: ${line.clarificationQuestion ?? 'exact type / size'}`,
        )
        .join('\n') +
      '\n\n'
    : '';

  const ambiguousBlock = ambiguous.length
    ? 'For the following we have several options and need your confirmation:\n\n' +
      ambiguous
        .map((line) => {
          const options = line.suggestedItemCodes
            .map((code) => catalog.itemsByCode[code]?.name)
            .filter(Boolean)
            .join(' / ');
          return `– ${line.customerDescription}: ${options || line.clarificationQuestion || 'please confirm exact type / size'}`;
        })
        .join('\n') +
      '\n\n'
    : '';

  return `${greeting}Good Day\n\n${unknownBlock}${ambiguousBlock}All other lines are being priced and will follow.\n\n${SIGNATURE}`;
};

/** Шаблон Web Inquiry для одного постачальника. */
export const buildWebInquiryText = (header: QuoteHeader): string =>
  `Dear Sirs,\n\nKindly quote the items below for ${header.vesselName} / ${header.port}. ` +
  `Please offer the same unit of measure as requested and state your lead time and validity.\n\n` +
  `Best regards,\nSeven Seas Ship Supply – Singapore`;

/** Тіло Web Inquiry з переліком позицій — використовується в тредах постачальників. */
export const buildWebInquiryBody = (
  header: QuoteHeader,
  lines: QuoteLine[],
  catalog: CatalogData,
): string => {
  const items = lines
    .map((line, index) => {
      const { quantity, unit } = outboundQuantity(line, catalog);
      const name = line.matchedItemCode
        ? (catalog.itemsByCode[line.matchedItemCode]?.name ?? line.customerDescription)
        : line.customerDescription;
      return `${index + 1}. ${name} — ${quantity} ${unit}`;
    })
    .join('\n');

  return (
    `Dear Sirs,\n\nKindly quote the items below for ${header.vesselName} / ${header.port}. ` +
    `Please offer the same unit of measure as requested and state your lead time and validity.\n\n${items}`
  );
};

const notIncludedLines = (quote: Quote): QuoteLine[] =>
  quote.lines.filter(
    (line) =>
      !line.matchedItemCode && !line.isExcluded && !line.suppliers.some((s) => s.isSelected),
  );

/** Лист із котируванням. Текст залежить від обраного каналу доставки. */
export const buildQuotationEmail = (quote: Quote): { body: string; attachments: string[] } => {
  const { header } = quote;
  const name = firstName(header.contactName);

  if (quote.outputType === 'mtml') {
    return {
      body: `Quotation ${header.quotationNumber} posted to the customer portal (MTML). No email sent.`,
      attachments: [],
    };
  }

  if (quote.outputType === 'customerExcel') {
    return {
      body:
        `Dear ${name},\n\nGood Day\n\nPlease find your Excel populated with our prices, ` +
        `plus our PDF quotation ${header.quotationNumber}.\n\n` +
        `Payment terms and conditions remain the same. Currency: US Dollars.\n\nThanks and Best Regards,\nPriya N.`,
      attachments: [`${header.reference}_quoted.xlsx`, `${header.quotationNumber}.pdf`],
    };
  }

  const excluded = notIncludedLines(quote)
    .map((line) => `Not included: ${line.customerDescription} — awaiting your details.\n`)
    .join('');

  return {
    body:
      `Dear ${name},\n\nGood Day\n\nThank you for placing your inquiry with us. We are pleased to submit ` +
      `our best offer for your kind perusal. Kindly check our offer if match to your requirement.\n\n` +
      `Please note:\n• Payment terms and conditions remain the same.\n• Currency: US Dollars\n\n` +
      `${excluded}\n${SIGNATURE}`,
    attachments: [`${header.quotationNumber}.pdf`, `${header.quotationNumber}.xlsx`],
  };
};
