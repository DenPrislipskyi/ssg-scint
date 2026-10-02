/**
 * Which form the quotation goes out in.
 *
 * `SG standard` and `UAE standard` are our two offices' letterheads - as a
 * PDF (the UAE one adds discount and VAT columns) and as the desk's own
 * `Quote.xlsm` workbook. `Customer file (.xlsx)` is the customer's own
 * spreadsheet layout, filled in. Each format names who it
 * speaks for: a format with nobody behind it is a button promising a document
 * that will not come.
 */
export type QuotationFormat = 'SG standard' | 'UAE standard' | 'Customer file (.xlsx)';

export const QUOTATION_FORMATS: readonly QuotationFormat[] = [
  'SG standard',
  'UAE standard',
  'Customer file (.xlsx)',
];

/** What a format downloads as. */
export type QuotationFile = 'pdf' | 'excel';

interface FormatSpec {
  /** The line under the preview's title. */
  byline: string;
  /**
   * Whose description the lines carry. Ours on our letterhead - the customer
   * receives the name of what is being sold to them. Theirs in their own file,
   * as our sheet records it - the same `Customer description` column the
   * fourth stage shows, so the customer finds their own lines in it.
   */
  description: 'internal' | 'customer';
  /** The files this format comes as. */
  files: readonly QuotationFile[];
  /**
   * What the Excel file is called after the RFQ number. The two offices'
   * workbooks are named apart, so downloading both does not leave the second
   * as `(1)` beside the first.
   */
  excelSuffix: string;
  /**
   * Who signs the letter the quotation goes out with: the legal name the
   * office's letterhead carries. The customer's own file has no letterhead,
   * and it goes out from Singapore.
   */
  signature: string;
}

const SINGAPORE = 'Seven Seas Maritime Services (Singapore) Pte. Ltd';
const DUBAI = 'Seven Seas Shipchandlers (L.L.C)';

const FORMATS: Record<QuotationFormat, FormatSpec> = {
  'SG standard': {
    byline: 'Seven Seas Group · Singapore',
    description: 'internal',
    files: ['pdf', 'excel'],
    excelSuffix: 'quotation_sg.xlsm',
    signature: SINGAPORE,
  },
  // The prototype's own wording: the Dubai office quotes for Fujairah too.
  'UAE standard': {
    byline: 'Seven Seas Group · Dubai / Fujairah',
    description: 'internal',
    files: ['pdf', 'excel'],
    excelSuffix: 'quotation_uae.xlsm',
    signature: DUBAI,
  },
  'Customer file (.xlsx)': {
    byline: "Populated into the customer's own file structure",
    description: 'customer',
    files: ['excel'],
    excelSuffix: 'customer_file.xlsx',
    signature: SINGAPORE,
  },
};

export const issuerOf = (format: QuotationFormat): string => FORMATS[format].byline;

export const descriptionSourceOf = (format: QuotationFormat): FormatSpec['description'] =>
  FORMATS[format].description;

export const PICK_FORMAT = 'Pick a quotation format first';

const ONLY: Record<QuotationFile, string> = {
  pdf: 'goes out as PDF only',
  excel: 'is Excel only',
};

/**
 * Why this file cannot be downloaded in this format, or `null` when it can.
 *
 * One function for both buttons, so the two tooltips cannot drift apart: a
 * format that does not come as this file says which one it does come as.
 */
export const whyNotDownloadable = (
  format: QuotationFormat | null,
  file: QuotationFile,
): string | null => {
  if (format === null) return PICK_FORMAT;
  const { files } = FORMATS[format];
  if (files.includes(file)) return null;
  return `${format} ${ONLY[files[0] ?? file]}`;
};

/** The files this format comes as - the ones the letter attaches by default. */
export const quotationFiles = (format: QuotationFormat): readonly QuotationFile[] =>
  FORMATS[format].files;

/**
 * The letter the quotation goes out with, before anybody edits it.
 *
 * Addressed to the address the RFQ came from: that is all we know of the
 * customer - the agent reads a mailbox, not a customer registry, and a name
 * guessed off it would be wrong for exactly the customers whose mail matters
 * most. With no address it falls back to the plain form.
 */
export const quotationLetter = (customer: string, format: QuotationFormat): string =>
  [
    `Dear ${customer || 'Sir or Madam'},`,
    '',
    'Good Day.',
    '',
    'Thank you for placing your inquiry with us.',
    '',
    'We are pleased to submit our best offer for your kind perusal. ' +
      'Kindly check our offer against your requirements.',
    '',
    'Best regards,',
    FORMATS[format].signature,
  ].join('\n');

/** Whether this format's Excel file is the customer's layout or the desk's workbook. */
export const isCustomerLayout = (format: QuotationFormat): boolean =>
  FORMATS[format].description === 'customer';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * "25 Sep 2026" - the day of approval, not today.
 *
 * A quotation is dated by the day its prices were named: opened a week later,
 * it would otherwise quietly get a week younger with not one number changed.
 *
 * Month names are spelled here rather than by `Intl`: `en-GB` writes `Sept`
 * in newer ICU, and the same document would read differently from browser to
 * browser.
 *
 * Empty for anything that is not a date, rather than `Invalid Date` under the
 * number.
 */
export const quotationDate = (approvedAt: string): string => {
  const at = new Date(approvedAt);
  if (!approvedAt || Number.isNaN(at.getTime())) return '';
  return `${at.getDate()} ${MONTHS[at.getMonth()]} ${at.getFullYear()}`;
};

/**
 * The terms line under the table, word for word from the prototype.
 *
 * The port goes in because "delivered" with no place is a promise with nowhere
 * to keep it; with no port the sentence simply does not mention one.
 */
export const quotationTerms = (port: string): string =>
  `Prices in USD${port ? `, delivered ${port}` : ''}. Validity 30 days. ` +
  'Values in this preview are the confirmed values from Product Matching, ' +
  'Supplier Sourcing and Pricing.';

/**
 * "RFQ-0042_quotation.pdf", "RFQ-0042_quotation_uae.xlsm",
 * "RFQ-0042_customer_file.xlsx" - the names the backend gives the same files.
 *
 * Named here rather than read off `Content-Disposition`: the API is on another
 * origin, and a browser hides that header from a cross-origin script unless
 * the server exposes it. Only characters no file system trips over are kept.
 */
export const quotationFileName = (
  reference: string,
  format: QuotationFormat,
  file: QuotationFile,
): string => {
  const stem = reference.replace(/[^A-Za-z0-9._-]/g, '') || 'quotation';
  return `${stem}_${file === 'pdf' ? 'quotation.pdf' : FORMATS[format].excelSuffix}`;
};
