import { pluralSuffix, dateOnly } from '@/shared/lib/format';
import type { CatalogData } from '@/entities/catalog/model/types';
import { getLineStatus } from '@/entities/quote/lib/lineState';
import type {
  LineStatus,
  Quote,
  QuoteLineCounts,
  QuoteListItem,
  QuoteStatus,
} from '@/entities/quote/model/types';

const SUPPLIER_STATUSES: LineStatus[] = [
  'needsSupplier',
  'inquirySent',
  'selectSupplier',
  'supplierSelected',
  'supplierNeedsInfo',
];

const countOf = (statuses: LineStatus[], target: LineStatus): number =>
  statuses.filter((status) => status === target).length;

const buildCounts = (statuses: LineStatus[], isTaken: boolean, active: number): QuoteLineCounts => {
  const inStock = countOf(statuses, 'ready');
  const variants = countOf(statuses, 'chooseVariant');
  const asked = countOf(statuses, 'askedCustomer');
  const needsSupplier = countOf(statuses, 'needsSupplier');

  // Поки котирування не взяли в роботу, «потрібен постачальник» рахується як «не знайдено».
  const withSuppliers = isTaken
    ? statuses.filter((status) => SUPPLIER_STATUSES.includes(status)).length
    : 0;
  const notFound = countOf(statuses, 'notFound') + (isTaken ? 0 : needsSupplier);
  const priced = inStock + countOf(statuses, 'supplierSelected');

  return {
    total: statuses.length,
    priced,
    unpriced: active - priced,
    inStock,
    withSuppliers,
    variants,
    notFound,
    asked,
  };
};

const outputDetail = (quote: Quote): string => {
  if (quote.header.fileType === 'MTML') return 'portal';
  return quote.outputType === 'customerExcel' ? 'customer Excel' : 'email';
};

const deriveStatus = (
  quote: Quote,
  statuses: LineStatus[],
  counts: QuoteLineCounts,
): { status: QuoteStatus; detail: string } => {
  if (!quote.isTaken) return { status: 'new', detail: '' };

  if (quote.orderStage) {
    return {
      status: 'order',
      detail: quote.orderStage === 'ready' ? 'SO · procurement' : 'SO created',
    };
  }
  if (quote.hasCustomerReply) return { status: 'replyReceived', detail: 'to quote' };
  if (quote.sentAt) return { status: 'quoteSent', detail: outputDetail(quote) };

  const needsInfo = countOf(statuses, 'supplierNeedsInfo');
  if (needsInfo > 0) {
    return { status: 'supplierNeedsInfo', detail: `${needsInfo} line${pluralSuffix(needsInfo)}` };
  }

  const open = counts.variants + counts.notFound;
  const awaiting = statuses.some((s) => s === 'inquirySent' || s === 'selectSupplier');

  if (counts.asked > 0 && open === 0 && !awaiting) {
    const lastSent = [...quote.mails]
      .reverse()
      .find((mail) => mail.kind === 'clarification' && mail.status === 'sent');
    return { status: 'clarificationSent', detail: lastSent?.at ?? '' };
  }

  if (open === 0 && counts.asked === 0 && awaiting) {
    const replied = quote.lines.reduce(
      (sum, line) => sum + line.suppliers.filter((s) => s.status === 'replied').length,
      0,
    );
    const total = quote.lines.reduce(
      (sum, line) => sum + line.suppliers.filter((s) => s.status !== 'assigned').length,
      0,
    );
    return { status: 'awaitingSuppliers', detail: `${replied} of ${total} replied` };
  }

  return { status: 'inProgress', detail: '' };
};

/** Згортає котирування в рядок реєстру Quote Overview. */
export const buildQuoteListItem = (quote: Quote, catalog: CatalogData): QuoteListItem => {
  const statuses = quote.lines.map((line) => getLineStatus(line, catalog));
  const activeCount = quote.lines.filter((line) => !line.isExcluded).length;
  const counts = buildCounts(statuses, quote.isTaken, activeCount);
  const { status, detail } = deriveStatus(quote, statuses, counts);

  return {
    id: quote.header.id,
    rowKey: quote.header.id,
    // Фікстури живуть без агента, тож і без його міток.
    labels: [],
    quotationNumber: quote.header.quotationNumber,
    reference: quote.header.reference,
    customerName: quote.header.customerName,
    vesselName: quote.header.vesselName,
    imo: quote.header.imo,
    port: quote.header.port,
    storeType: quote.header.storeType,
    productCategory: quote.header.productCategory,
    status,
    statusDetail: detail,
    priority: quote.header.priority,
    receivedOn: dateOnly(quote.header.receivedAt),
    dueDate: quote.header.dueDate,
    responsibleUser: quote.isTaken ? (quote.responsibleUser ?? '—') : '—',
    processingTime: quote.isTaken ? quote.processingTime : '—',
    counts,
    completionPercent: statuses.length
      ? Math.round((counts.priced / statuses.length) * 100)
      : 0,
  };
};
