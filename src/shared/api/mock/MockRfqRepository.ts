import type { RfqRepository } from '@/entities/rfq/api/rfqRepository';
import type { MatchLine, RfqDetail, RfqId } from '@/entities/rfq/model/types';
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
          // Скільки відсотків слів запиту несе цей товар. Абсолютне число:
          // перший у списку більше не 100% просто за те, що він перший.
          confidence: 70,
          item: sheet('T69133100'),
        },
        {
          itemCode: 'T69114500',
          description: descriptionOf(sheet('T69114500')),
          confidence: 50,
          item: sheet('T69114500'),
        },
      ],
      confirmedItemCode: '',
      offerUnitPrice: null,
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
    },
  ],
};

export class MockRfqRepository implements RfqRepository {
  /** Підтвердження живуть тут, бо фікстура спільна для всіх викликів. */
  private readonly settled = new Map<number, string>();
  /** Ціни постачальників — так само: фікстура сама по собі незмінна. */
  private readonly quoted = new Map<number, number>();

  async getById(id: RfqId): Promise<RfqDetail> {
    await mockDelay(80);
    return { ...SAMPLE, id, lines: SAMPLE.lines.map((line) => this.showing(line)) };
  }

  /**
   * Позиція, показана як те, на чому її зупинили — так само, як це робить
   * бекенд: запис тримає лише код, а опис, джерело, одиниця й постачальник
   * живуть в аркуші, і читати їх треба звідти.
   */
  private showing(line: MatchLine): MatchLine {
    const offerUnitPrice = this.quoted.get(line.index) ?? null;
    const code = this.settled.get(line.index) ?? '';
    const product = code ? findInSheet(code) : undefined;
    if (!product) return { ...line, confirmedItemCode: code, offerUnitPrice };

    // Оцінка є тільки в того, хто був у списку: товар, обраний руками, людина
    // обрала сама, і покриття слів не було причиною.
    const scored = line.candidates.find((one) => one.itemCode === code);
    return {
      ...line,
      offerUnitPrice,
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

    if (unitPrice === null) this.quoted.delete(index);
    else this.quoted.set(index, unitPrice);
  }
}
