/**
 * Одноразовий генератор фікстур із HTML-прототипу.
 *
 * Читає `scint-rfq-prototype-v4.9.html`, виконує його data-секцію в ізольованому
 * контексті і зберігає результат як JSON у доменній формі проєкту.
 *
 * Запуск: npm run fixtures:build
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(ROOT, 'scint-rfq-prototype-v4.9.html');
const OUT_DIR = join(ROOT, 'src/shared/api/mock/fixtures');
const ASSET_DIR = join(ROOT, 'public/mock-assets');

const html = readFileSync(SOURCE, 'utf8');

/* ─── 1. Вирізаємо data-секцію прототипу ─────────────────────────────── */

const slice = (from, to) => {
  const start = html.indexOf(from);
  const end = html.indexOf(to);
  if (start === -1 || end === -1) throw new Error(`Anchor not found: ${from} .. ${to}`);
  return html.slice(start, end);
};

const line = (prefix) => {
  const start = html.indexOf(prefix);
  if (start === -1) throw new Error(`Anchor not found: ${prefix}`);
  return html.slice(start, html.indexOf('\n', start));
};

const block = (prefix, terminator) => {
  const start = html.indexOf(prefix);
  if (start === -1) throw new Error(`Anchor not found: ${prefix}`);
  const end = html.indexOf(terminator, start);
  return html.slice(start, end + terminator.length);
};

const source = [
  // C, KEEP, sc(), tc(), UNITS, PACK, byCode, fam, SUP, byS, rankOf, DEMO, HDR, o(), initial()
  slice('const C=[', 'const KEY="ssg-proto-v20"'),
  line('const UNITF={'),
  line('const UNITLIST=['),
  line('const CS={nordic:'),
  'globalThis.__out = { C, UNITS, PACK, SUP, DEMO, HDR, UNITF, UNITLIST, CS, sc, initial: initial() };',
].join('\n');

const sandbox = { globalThis: {}, localStorage: undefined, console };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'prototype-data.js' });
const raw = sandbox.__out;

/* ─── 2. Перетворення у доменні моделі ───────────────────────────────── */

/**
 * Правки, привнесені дизайном «SSG RFQ POC (v2)»: там клієнти і судно названі
 * інакше, ніж у першому прототипі. Тримаємо їх тут, щоб `fixtures:build`
 * лишався відтворюваним і не потребував ручного редагування JSON.
 */
const V2_HEADER_OVERRIDES = {
  nordic: { customerName: 'Nordic Aurora Shipping', vesselName: 'MV LIA' },
  cpl: { customerName: 'Pacific Grace Management' },
};

const upper = (value) => String(value ?? '').toUpperCase();
const lineId = (quoteId, index) => `${quoteId}-L${index + 1}`;

/**
 * Нормалізація опису рядка — той самий крок, який прототип робив у рантаймі:
 * SCREAMING CASE приводиться до звичайного регістру, службовий префікс XX прибирається.
 */
const normalizeDescription = (description) => {
  const normalized = description === description.toUpperCase() ? raw.sc(description) : description;
  return normalized.replace(/^XX/, '');
};

const catalogItems = raw.C.map((item) => ({
  code: item.c,
  name: item.n,
  inStock: item.s === 1,
  costPrice: item.p,
  unit: item.u ?? 'pcs',
}));

const packSpecs = Object.entries(raw.PACK).map(([code, spec]) => ({
  code,
  unit: spec.u,
  quantity: spec.n,
}));

const unitConversions = Object.entries(raw.UNITF).map(([pair, factor]) => {
  const [from, to] = pair.split('>');
  return { from, to, factor };
});

const suppliers = raw.SUP.map((supplier) => ({
  id: supplier.id,
  name: supplier.n,
  email: supplier.email,
  onTimePercent: supplier.ot,
  rankByFamily: { ...supplier.rank },
  blockedFamilies: supplier.blk ?? [],
  historyNote: supplier.hist,
}));

const toLeadTime = (lead) => (lead ? { days: lead.d ?? 0, hours: lead.h ?? 0 } : null);

const toLineSupplier = (entry, fallbackUnit, fallbackQty) => {
  const status = { new: 'assigned', wait: 'awaiting', repl: 'replied' }[entry.st];
  const hasOffer = entry.st === 'repl' && entry.p != null;
  return {
    supplierId: entry.id,
    status,
    offer: hasOffer
      ? {
          unitPrice: entry.p,
          leadTime: toLeadTime(entry.lead) ?? { days: 0, hours: 0 },
          validity: entry.valid ?? '',
          remarks: entry.c ?? null,
          supplierDescription: entry.sd ?? '',
          brand: entry.brand ?? '',
          unit: entry.uom ?? fallbackUnit,
          quotedQuantity: entry.qq ?? fallbackQty,
        }
      : null,
    infoRequest: entry.info ?? null,
    isInfoResolved: Boolean(entry.resolved),
    isIgnored: Boolean(entry.ignored),
    isSelected: Boolean(entry.sel),
    followUpNote: entry.rem ?? null,
    repliedAt: entry.at ?? null,
  };
};

const toQuoteLine = (line, index, quoteId) => ({
  id: lineId(quoteId, index),
  customerDescription: normalizeDescription(line.desc),
  customerCode: line.cc ?? '',
  requestedQuantity: line.qty,
  customerUnit: line.uom,
  matchedItemCode: line.item ?? null,
  suggestedItemCodes: line.sug ?? [],
  rejectedItemCodes: line.rej ?? [],
  suppliers: (line.sups ?? []).map((s) => toLineSupplier(s, line.uom, line.qty)),
  attachment: line.att ?? null,
  customerRemark: line.crem ?? null,
  clarificationQuestion: line.q ?? null,
  note: line.note ?? null,
  isAsked: Boolean(line.asked),
  isExcluded: Boolean(line.excl),
  internalComment: line.qc ?? '',
  messages: (line.thread ?? []).map((m) => ({
    author: { sup: 'supplier', cust: 'customer', cs: 'cs' }[m.who] ?? 'cs',
    supplierId: m.sup ?? null,
    at: m.at,
    text: m.text,
    attachment: m.att ?? null,
  })),
  manualShipSupplyQuantity: line.ssm ?? null,
  overriddenUnit: line.su ?? null,
});

const MAIL_KIND = { in: 'inbound', clar: 'clarification', quote: 'quotation', reply: 'customerReply' };

const toMail = (mail, index, quoteId, header, lines) => ({
  id: `${quoteId}-M${index + 1}`,
  kind: MAIL_KIND[mail.k],
  status: mail.st === 'draft' ? 'draft' : 'sent',
  title: mail.t ?? null,
  at: mail.at ?? '',
  // Вхідний лист у прототипі брав тіло з заголовка котирування.
  body: mail.k === 'in' ? header.body : (mail.body ?? ''),
  attachments: mail.k === 'in' ? (header.att ?? []) : (mail.att ?? []),
  lineIds: (mail.lines ?? []).map((i) => lines[i]?.id).filter(Boolean),
  proposedUpdates: (mail.upd ?? []).map((u) => ({
    lineId: lines[u.i]?.id ?? '',
    before: u.was,
    after: u.now,
    itemCode: u.code ?? null,
    attachment: u.att ?? null,
    isApplied: Boolean(u.done),
  })),
  revision: mail.rev ?? null,
  isAnswerToClarification: Boolean(mail.toClar),
});

const OUTPUT_TYPE = { mtml: 'mtml', email: 'email', cust: 'customerExcel' };

const PROCESSING_TIME = { nordic: '22 h', cpl: '18 h', thome: '18 h', meridian: '3 h' };

const quotes = Object.entries(raw.initial.quotes).map(([id, state]) => {
  const header = raw.HDR[id];
  const lines = state.lines.map((line, index) => toQuoteLine(line, index, id));
  return {
    header: {
      id,
      quotationNumber: header.q,
      reference: header.ref,
      customerName: V2_HEADER_OVERRIDES[id]?.customerName ?? header.c,
      customerCode: header.code,
      contactName: header.contact,
      contactEmail: header.email,
      vesselName: V2_HEADER_OVERRIDES[id]?.vesselName ?? header.ves,
      imo: header.imo,
      port: header.port,
      cutOff: header.cut,
      storeType: upper(header.type),
      productCategory: upper(header.cat),
      dueDate: header.due,
      receivedAt: header.rec,
      priority: header.pr === 'HIGH' ? 'HIGH' : 'NORMAL',
      fileType: header.ft,
      team: header.team,
      attachments: header.att,
      requestBody: header.body,
    },
    isTaken: Boolean(state.touched),
    isDeclined: Boolean(state.declined),
    responsibleUser: state.touched ? (raw.CS[id] ?? null) : null,
    processingTime: PROCESSING_TIME[id] ?? '—',
    lines,
    mails: state.mails.map((mail, index) => toMail(mail, index, id, header, lines)),
    inquiries: (state.inq ?? []).map((inq, index) => ({
      id: `${id}-WI${index + 1}`,
      sentAt: inq.at,
      supplierId: inq.sup,
      lineIds: inq.lines.map((i) => lines[i]?.id).filter(Boolean),
      attachments: (inq.att ?? []).filter(Boolean),
    })),
    pricing: {
      storeType: upper(header.type),
      productCategory: upper(header.cat),
      stockMargin: 0.14,
      nonStockMargin: 0.14,
      freightDistribution: 'none',
      freightAmount: 310,
    },
    outputType: state.outType ? OUTPUT_TYPE[state.outType] : null,
    sentAt: state.sent ?? null,
    hasCustomerReply: (state.thread ?? []).length > 0,
    revisedAt: state.revised ?? null,
    acceptedAt: state.accepted ?? null,
    orderStage: state.order ?? null,
    marginDecision: null,
  };
});

const demoSupplierReplies = Object.entries(raw.DEMO).map(([supplierId, reply]) => ({
  supplierId,
  unitPrice: reply.p ?? null,
  leadTime: toLeadTime(reply.lead),
  validity: reply.valid ?? '',
  remarks: reply.c ?? null,
  supplierDescription: reply.sd ?? '',
  brand: reply.brand ?? '',
  unit: reply.uom ?? null,
  quantityFactor: reply.qqx ?? 1,
  infoRequest: reply.info ?? null,
}));

/* ─── 3. Вкладене фото з base64 ──────────────────────────────────────── */

const photoMatch = html.match(/"(IMG_\d+\.jpg)":"data:image\/jpeg;base64,([A-Za-z0-9+/=]+)"/);
mkdirSync(ASSET_DIR, { recursive: true });
if (photoMatch) {
  writeFileSync(join(ASSET_DIR, photoMatch[1]), Buffer.from(photoMatch[2], 'base64'));
}

/* ─── 4. Запис ───────────────────────────────────────────────────────── */

mkdirSync(OUT_DIR, { recursive: true });
const write = (name, data) => {
  writeFileSync(join(OUT_DIR, name), `${JSON.stringify(data, null, 2)}\n`);
  const count = Array.isArray(data) ? data.length : Object.keys(data).length;
  console.log(`  ${name.padEnd(28)} ${String(count).padStart(3)} записів`);
};

console.log('Генерація фікстур із прототипу:');
write('catalog-items.json', catalogItems);
write('pack-specs.json', packSpecs);
write('unit-conversions.json', unitConversions);
write('unit-list.json', raw.UNITLIST);
write('suppliers.json', suppliers);
write('quotes.json', quotes);
write('demo-supplier-replies.json', demoSupplierReplies);
write('current-user.json', {
  name: 'Priya N.',
  // Підпис під іменем у хедері — формулювання з дизайну v2.
  team: 'Supply Singapore',
  email: 'supply.singapore@sevenseasgroup.com',
});
if (photoMatch) console.log(`  public/mock-assets/${photoMatch[1]}`);
