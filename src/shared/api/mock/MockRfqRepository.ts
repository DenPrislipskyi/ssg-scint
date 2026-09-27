import type { DraftApproval, DraftInquiry, RfqRepository } from '@/entities/rfq/api/rfqRepository';
import type {
  Approval,
  MatchLine,
  RfqDetail,
  RfqId,
  SentInquiry,
} from '@/entities/rfq/model/types';
import type { QuotationFormat } from '@/entities/rfq/lib/quotation';
import { descriptionOf, findInSheet } from '@/shared/api/mock/fixtures/sheet';
import { mockDelay } from '@/shared/api/mock/mockDelay';

const sheet = (itemCode: string): Record<string, string> => findInSheet(itemCode) ?? {};

const BOLT = sheet('T69128400');

/**
 * Один RFQ на фікстурах. Покриває три випадки, які малює екран: підтверджений
 * код, позицію з топ-5 кандидатів і позицію, якій аркуш не має чого дати.
 */
const SAMPLE: RfqDetail = {
  id: 'sample',
  reference: 'RFQ-0042',
  customerName: 'purchasing@almi.example.com',
  vesselName: 'MV ALMI GLOBE',
  imo: '9417751',
  port: 'Jebel Ali',
  receivedOn: '2026-09-11',
  subject: 'RFQ / MV ALMI GLOBE / Jebel Ali',
  lines: [
    {
      line: 1,
      index: 1,
      customerCode: '691284',
      customerDescription: 'Hexagon Head Bolts Full Threaded (Bolt with Nut) M16*65',
      quantity: '500',
      uom: 'set',
      itemCode: 'T69128400',
      itemDescription: descriptionOf(BOLT),
      item: BOLT,
      // Підтверджений код теж має оцінку: суддя порівнював рівно ці два
      // речення, тож формула рахує з тих самих слів.
      confidence: 71,
      how: 'code_confirmed',
      why: "The customer's code names this product and the descriptions agree (100%).",
      candidates: [],
      confirmedItemCode: '',
      offerUnitPrice: null,
      offerReceivedAt: null,
      approvedUnitPrice: null,
    },
    {
      line: 2,
      index: 2,
      customerCode: '',
      customerDescription: 'bolts hex head with nuts, M20 x 80, full thread',
      quantity: '12',
      uom: 'pcs',
      itemCode: '',
      itemDescription: '',
      item: {},
      confidence: null,
      how: 'search',
      why: 'The customer quoted no code, so the catalogue was searched by description.',
      candidates: [
        {
          itemCode: 'T69133100',
          description: descriptionOf(sheet('T69133100')),
          // The same product, and the size agrees; the grade is not stated.
          confidence: 70,
          why: 'Same bolt and size; the grade is not stated.',
          item: sheet('T69133100'),
        },
        {
          itemCode: 'T69114500',
          description: descriptionOf(sheet('T69114500')),
          confidence: 50,
          why: 'Same kind of bolt, but a different size.',
          item: sheet('T69114500'),
        },
      ],
      confirmedItemCode: '',
      offerUnitPrice: null,
      offerReceivedAt: null,
      approvedUnitPrice: null,
    },
    {
      line: 3,
      index: 3,
      customerCode: '',
      customerDescription: 'Marine diesel turbocharger cartridge NR34/S',
      quantity: '1',
      uom: 'pc',
      itemCode: '',
      itemDescription: '',
      item: {},
      confidence: null,
      how: 'none',
      why: 'The catalogue had nothing to offer for this line.',
      candidates: [],
      confirmedItemCode: '',
      offerUnitPrice: null,
      offerReceivedAt: null,
      approvedUnitPrice: null,
    },
  ],
  // Нікого ще не питали: фікстура — це RFQ, щойно доведений до другого етапу.
  inquiries: [],
  approval: null,
};

export class MockRfqRepository implements RfqRepository {
  /** Підтвердження живуть тут, бо фікстура спільна для всіх викликів. */
  private readonly settled = new Map<number, string>();
  /** Ціни постачальників — так само: фікстура сама по собі незмінна. */
  private readonly quoted = new Map<number, number>();
  /** Коли кожна з них прийшла. Бекенд ставить цей час сам, тож і тут. */
  private readonly received = new Map<number, string>();
  /** Листи, що пішли. Порожньо, поки ніхто не натискав Send Web Inquiry. */
  private sent: SentInquiry[] = [];
  /** Підпис під котируванням. `null`, поки ніхто не затверджував. */
  private signed: Approval | null = null;
  /** Затверджені ціни за одиницю, по номеру позиції в записі. */
  private readonly frozen = new Map<number, number>();

  async getById(id: RfqId): Promise<RfqDetail> {
    await mockDelay(80);
    return {
      ...SAMPLE,
      id,
      lines: SAMPLE.lines.map((line) => this.showing(line)),
      inquiries: [...this.sent],
      approval: this.signed,
    };
  }

  /**
   * Позиція, показана як те, на чому її зупинили — так само, як це робить
   * бекенд: запис тримає лише код, а опис, джерело, одиниця й постачальник
   * живуть в аркуші, і читати їх треба звідти.
   */
  private showing(line: MatchLine): MatchLine {
    const offerUnitPrice = this.quoted.get(line.index) ?? null;
    const offerReceivedAt = this.received.get(line.index) ?? null;
    const approvedUnitPrice = this.frozen.get(line.index) ?? null;
    const code = this.settled.get(line.index) ?? '';
    const product = code ? findInSheet(code) : undefined;
    if (!product) {
      return {
        ...line,
        confirmedItemCode: code,
        offerUnitPrice,
        offerReceivedAt,
        approvedUnitPrice,
      };
    }

    // Оцінка є тільки в того, хто був у списку: товар, обраний руками, людина
    // обрала сама, і покриття слів не було причиною.
    const scored = line.candidates.find((one) => one.itemCode === code);
    return {
      ...line,
      offerUnitPrice,
      offerReceivedAt,
      approvedUnitPrice,
      confirmedItemCode: code,
      itemCode: code,
      itemDescription: descriptionOf(product),
      item: product,
      confidence: scored?.confidence ?? null,
    };
  }

  async confirm(_id: RfqId, index: number, itemCode: string | null): Promise<void> {
    await mockDelay(30);
    const line = SAMPLE.lines.find((one) => one.index === index);
    if (!line) throw new Error(`No line ${index}`);

    if (itemCode === null) {
      this.settled.delete(index);
      return;
    }

    // Жодного відбору за списком кандидатів: п'ять кандидатів - це пропозиція,
    // і товар, знайдений руками, за визначенням не з них. Чи існує такий товар
    // узагалі, перевіряє бекенд проти аркуша.
    this.settled.set(index, itemCode);
  }

  async price(_id: RfqId, index: number, unitPrice: number | null): Promise<void> {
    await mockDelay(30);
    const line = SAMPLE.lines.find((one) => one.index === index);
    if (!line) throw new Error(`No line ${index}`);

    // Ціна й мить, коли вона прийшла, — один факт: рядок без ціни, але з
    // датою читався б як відповідь, яку ми загубили.
    if (unitPrice === null) {
      this.quoted.delete(index);
      this.received.delete(index);
      return;
    }
    this.quoted.set(index, unitPrice);
    this.received.set(index, new Date().toISOString());
  }

  async sendInquiries(_id: RfqId, inquiries: DraftInquiry[]): Promise<void> {
    await mockDelay(30);
    // Один раз, як і на бекенді: повторне надсилання переписало б текст, який
    // постачальник цієї миті читає.
    if (this.sent.length > 0) throw new Error('These inquiries have already gone');

    const sentAt = new Date().toISOString();
    this.sent = inquiries.map((one) => ({ ...one, lines: [...one.lines], sentAt }));
  }

  async approve(_id: RfqId, approval: DraftApproval): Promise<void> {
    await mockDelay(30);
    // Один раз, як і на бекенді: назад дороги немає.
    if (this.signed) throw new Error('This pricing has already been approved');

    const missing = SAMPLE.lines.filter(
      (line) => !approval.lines.some((one) => one.index === line.index),
    );
    if (missing.length > 0) throw new Error('No price for every line');

    for (const { index, unitPrice } of approval.lines) this.frozen.set(index, unitPrice);
    this.signed = {
      approvedAt: new Date().toISOString(),
      marginStock: approval.marginStock,
      marginJit: approval.marginJit,
    };
  }

  /**
   * A stand-in file, not a quotation: the document is drawn by the backend,
   * and a second renderer here would be a second form to keep in step with
   * the desk's. What this does hold to is the backend's rule - nothing to
   * download before approval.
   */
  async quotationPdf(_id: RfqId, format: QuotationFormat): Promise<Blob> {
    await mockDelay(30);
    if (!this.signed) throw new Error('This pricing has not been approved yet');
    return new Blob([`%PDF-1.4\n% mock quotation, ${format}\n`], { type: 'application/pdf' });
  }

  /** A stand-in as well: the backend fills the desk's workbook. */
  async quoteWorkbook(_id: RfqId, format: QuotationFormat): Promise<Blob> {
    await mockDelay(30);
    if (!this.signed) throw new Error('This pricing has not been approved yet');
    return new Blob([`mock quote workbook, ${format}`], {
      type: 'application/vnd.ms-excel.sheet.macroEnabled.12',
    });
  }

  /** A stand-in as well, for the same reason: the backend fills the template. */
  async customerFile(_id: RfqId): Promise<Blob> {
    await mockDelay(30);
    if (!this.signed) throw new Error('This pricing has not been approved yet');
    return new Blob(['mock customer file'], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  }
}
