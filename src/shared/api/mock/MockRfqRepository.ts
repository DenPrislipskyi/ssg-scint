import type { RfqRepository } from '@/entities/rfq/api/rfqRepository';
import type { RfqDetail, RfqId } from '@/entities/rfq/model/types';
import { mockDelay } from '@/shared/api/mock/mockDelay';

/** Рядок аркуша, як він приходить у полі `item`. */
const row = (
  customerCode: string,
  itemCode: string,
  customerDescription: string,
  description: string,
  source: string,
  uom: string,
): Record<string, string> => ({
  'Customer Code': customerCode,
  'Item Code': itemCode,
  'Customer Description': customerDescription,
  'Item Description / SSG Description': description,
  'Product Source': source,
  UOM: uom,
});

const BOLT = row(
  '691284',
  'T69128400',
  'Hexagon Head Bolts Full Threaded (Bolt with Nut) M16*65',
  'HEX HEAD BOLT/NUT STEEL UNGALV, M16 X 65MM',
  'Stock',
  'SET',
);

/**
 * Один RFQ на фікстурах. Покриває три випадки, які малює екран: підтверджений
 * код, позицію з топ-5 кандидатів і позицію, якій аркуш не має чого дати.
 */
const SAMPLE: RfqDetail = {
  id: 'sample',
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
      itemDescription: 'HEX HEAD BOLT/NUT STEEL UNGALV, M16 X 65MM',
      item: BOLT,
      // Підтверджений код теж має оцінку: суддя порівнював рівно ці два
      // речення, тож формула рахує з тих самих слів.
      confidence: 71,
      how: 'code_confirmed',
      why: "The customer's code names this product and the descriptions agree (100%).",
      candidates: [],
      confirmedItemCode: '',
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
          description: 'HEX HEAD BOLT/NUT STEEL UNGALV, M20 X 80MM',
          // Скільки відсотків слів запиту несе цей товар. Абсолютне число:
          // перший у списку більше не 100% просто за те, що він перший.
          confidence: 70,
          item: row(
            '691331',
            'T69133100',
            'Hexagon Head Bolts Full Threaded (Bolt with Nut) M20*80',
            'HEX HEAD BOLT/NUT STEEL UNGALV, M20 X 80MM',
            'JIT',
            'SET',
          ),
        },
        {
          itemCode: 'T69114500',
          description: 'HEX HEAD BOLT/NUT STEEL UNGALV, M8 X 50MM',
          confidence: 50,
          item: row(
            '691145',
            'T69114500',
            'Hexagon Head Bolts Full Threaded (Bolt with Nut) M8*50',
            'HEX HEAD BOLT/NUT STEEL UNGALV, M8 X 50MM',
            'GPL',
            'SET',
          ),
        },
      ],
      confirmedItemCode: '',
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
    },
  ],
};

export class MockRfqRepository implements RfqRepository {
  /** Підтвердження живуть тут, бо фікстура спільна для всіх викликів. */
  private readonly settled = new Map<number, string>();

  async getById(id: RfqId): Promise<RfqDetail> {
    await mockDelay(80);
    return {
      ...SAMPLE,
      id,
      lines: SAMPLE.lines.map((line) => ({
        ...line,
        confirmedItemCode: this.settled.get(line.index) ?? '',
      })),
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
}
