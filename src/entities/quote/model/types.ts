import type { ItemCode, Unit } from '@/entities/catalog/model/types';
import type { SupplierId } from '@/entities/supplier/model/types';

export type QuoteId = string;
export type LineId = string;

export type FileType = 'EXCEL' | 'MTML' | 'PDF';
export type StoreType = 'TECHNICAL' | 'DECK' | 'SAFETY' | 'PROVISIONS' | 'STATIONARY';
export type ProductCategory = 'TECHNICAL' | 'DECK' | 'ENGINE' | 'SAFETY' | 'PROVISIONS';
export type Priority = 'NORMAL' | 'HIGH';

export interface QuoteHeader {
  id: QuoteId;
  quotationNumber: string;
  reference: string;
  customerName: string;
  customerCode: string;
  contactName: string;
  contactEmail: string;
  vesselName: string;
  imo: string;
  port: string;
  /** "15 Sep · 20ft" — дата відсічення разом із типом контейнера. */
  cutOff: string;
  storeType: StoreType;
  productCategory: ProductCategory;
  dueDate: string;
  receivedAt: string;
  priority: Priority;
  fileType: FileType;
  team: string;
  attachments: string[];
  /** Оригінальний текст RFQ-листа клієнта. */
  requestBody: string;
}

/* ─── Постачальники на рядку ───────────────────────────────────────── */

export type LineSupplierStatus = 'assigned' | 'awaiting' | 'replied';

export interface LeadTime {
  days: number;
  hours: number;
}

export interface SupplierOffer {
  unitPrice: number;
  leadTime: LeadTime;
  validity: string;
  remarks: string | null;
  /** Як постачальник сам описав товар — може відрізнятися від нашого опису. */
  supplierDescription: string;
  brand: string;
  unit: Unit;
  quotedQuantity: number;
}

export interface LineSupplier {
  supplierId: SupplierId;
  status: LineSupplierStatus;
  /** Пропозиція є лише коли постачальник відповів і назвав ціну. */
  offer: SupplierOffer | null;
  /** Постачальник відповів, але просить уточнення замість ціни. */
  infoRequest: string | null;
  isInfoResolved: boolean;
  isIgnored: boolean;
  isSelected: boolean;
  /** "Reminder sent just now" | "Called just now · promised today" */
  followUpNote: string | null;
  repliedAt: string | null;
}

/* ─── Рядок котирування ────────────────────────────────────────────── */

export type LineStatus =
  | 'ready'
  | 'chooseVariant'
  | 'notFound'
  | 'askedCustomer'
  | 'needsSupplier'
  | 'inquirySent'
  | 'selectSupplier'
  | 'supplierNeedsInfo'
  | 'supplierSelected'
  | 'excluded';

export type MessageAuthor = 'supplier' | 'customer' | 'cs';

export interface LineMessage {
  author: MessageAuthor;
  supplierId: SupplierId | null;
  at: string;
  text: string;
  attachment: string | null;
}

export interface QuoteLine {
  id: LineId;
  /** Опис так, як його надіслав клієнт. Не редагується системою. */
  customerDescription: string;
  customerCode: string;
  requestedQuantity: number;
  /** Одиниця клієнта — довільний рядок ("cm", "drum", "t"). */
  customerUnit: Unit;
  matchedItemCode: ItemCode | null;
  suggestedItemCodes: ItemCode[];
  /** Коди, які користувач відхилив — більше не пропонуються. */
  rejectedItemCodes: ItemCode[];
  suppliers: LineSupplier[];
  attachment: string | null;
  /** Ремарка з листа клієнта ("Portwest brand only"). */
  customerRemark: string | null;
  /** Що саме треба запитати у клієнта. */
  clarificationQuestion: string | null;
  note: string | null;
  isAsked: boolean;
  isExcluded: boolean;
  internalComment: string;
  messages: LineMessage[];
  /** Кількість у наших одиницях, введена вручну (перекриває автоконверсію). */
  manualShipSupplyQuantity: number | null;
  overriddenUnit: Unit | null;
}

/* ─── Листування ───────────────────────────────────────────────────── */

export type MailKind = 'inbound' | 'clarification' | 'quotation' | 'customerReply';
export type MailStatus = 'draft' | 'sent';

export interface ProposedUpdate {
  lineId: LineId;
  before: string;
  after: string;
  itemCode: ItemCode | null;
  attachment: string | null;
  isApplied: boolean;
}

export interface Mail {
  id: string;
  kind: MailKind;
  status: MailStatus;
  title: string | null;
  at: string;
  body: string;
  attachments: string[];
  /** Рядки, яких стосується уточнення. */
  lineIds: LineId[];
  proposedUpdates: ProposedUpdate[];
  revision: string | null;
  isAnswerToClarification: boolean;
}

export interface WebInquiry {
  id: string;
  sentAt: string;
  supplierId: SupplierId;
  lineIds: LineId[];
  attachments: string[];
}

/* ─── Котирування ──────────────────────────────────────────────────── */

export type OrderStage = null | 'created' | 'ready';
export type QuoteOutputType = 'mtml' | 'email' | 'customerExcel';
export type MarginDecision = 'apply12' | 'keep' | null;

export interface QuotePricingSettings {
  storeType: StoreType;
  productCategory: ProductCategory;
  stockMargin: number;
  nonStockMargin: number;
  freightDistribution: 'none' | 'perLine';
  freightAmount: number;
}

export interface Quote {
  header: QuoteHeader;
  /** Хтось узяв котирування в роботу. */
  isTaken: boolean;
  /** Користувач відмовився бути відповідальним — не питати повторно. */
  isDeclined: boolean;
  responsibleUser: string | null;
  processingTime: string;
  lines: QuoteLine[];
  mails: Mail[];
  inquiries: WebInquiry[];
  pricing: QuotePricingSettings;
  outputType: QuoteOutputType | null;
  sentAt: string | null;
  hasCustomerReply: boolean;
  revisedAt: string | null;
  acceptedAt: string | null;
  orderStage: OrderStage;
  marginDecision: MarginDecision;
}

/* ─── Реєстр котирувань ────────────────────────────────────────────── */

export type QuoteStatus =
  | 'new'
  | 'inProgress'
  | 'awaitingSuppliers'
  | 'supplierNeedsInfo'
  | 'clarificationSent'
  | 'quoteSent'
  | 'replyReceived'
  | 'order';

export interface QuoteLineCounts {
  total: number;
  priced: number;
  unpriced: number;
  inStock: number;
  withSuppliers: number;
  variants: number;
  notFound: number;
  asked: number;
}

export interface QuoteListItem {
  /** null — рядок без сторінки деталей (лист агента ще не став котируванням). */
  id: QuoteId | null;
  /** Стабільний ключ рядка: id запису агента або номер котирування. */
  rowKey: string;
  /** Мітки, які агент поставив листу в Outlook. Порожньо — мітки ще немає. */
  labels: string[];
  quotationNumber: string;
  reference: string;
  customerName: string;
  vesselName: string;
  /** null — агент не відкривав лист і не знає цього поля. */
  imo: string | null;
  port: string;
  /** null — агент не відкривав лист і не знає цього поля. */
  storeType: StoreType | null;
  productCategory: ProductCategory | null;
  status: QuoteStatus;
  statusDetail: string;
  priority: Priority;
  receivedOn: string;
  dueDate: string;
  responsibleUser: string;
  processingTime: string;
  /** null — позиції не рахували. Це не те саме, що «жодної позиції». */
  counts: QuoteLineCounts | null;
  completionPercent: number | null;
  /**
   * Скільки позицій у цього RFQ — рівно стільки рядків має його таблиця
   * Product matching.
   *
   * Окремо від `counts`: тому потрібна розбивка на оплачені, складські й
   * варіанти, а агент не знає жодної з них, і розбивка з самих нулів читалася б
   * як уже зроблена робота.
   */
  lineCount: number;
}
