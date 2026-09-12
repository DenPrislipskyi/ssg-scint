import type { RfqRepository } from '@/entities/rfq/api/rfqRepository';
import type { RfqDetail, RfqId } from '@/entities/rfq/model/types';
import { mockDelay } from '@/shared/api/mock/mockDelay';

/**
 * Один RFQ на фікстурах. Покриває три випадки, які малює екран: збіг за кодом,
 * збіг за словами і позицію без збігу, показану через кандидатів.
 */
const SAMPLE: RfqDetail = {
  id: 'sample',
  customerName: 'purchasing@almiship.com',
  vesselName: 'MV ALMI GLOBE',
  imo: '9417751',
  port: 'Jebel Ali',
  receivedOn: '2026-09-11',
  subject: 'RFQ / MV ALMI GLOBE / Jebel Ali',
  lines: [
    {
      line: 1,
      customerCode: '691284',
      customerDescription: 'Hexagon Head Bolts Full Threaded (Bolt with Nut) M16*65',
      quantity: '500',
      uom: 'set',
      itemCode: 'T69128400',
      itemDescription: 'HEX HEAD BOLT/NUT STEEL UNGALV, M16 X 65MM',
      item: {},
      confidence: 96,
      how: 'code_confirmed',
      why: 'Same bolt, same size.',
      candidates: [
        {
          itemCode: 'T69128400',
          description: 'HEX HEAD BOLT/NUT STEEL UNGALV, M16 X 65MM',
          confidence: 96,
        },
      ],
    },
    {
      line: 2,
      customerCode: '',
      customerDescription: 'Marine diesel turbocharger cartridge NR34/S',
      quantity: '1',
      uom: 'pc',
      itemCode: '',
      itemDescription: '',
      item: {},
      confidence: null,
      how: 'none',
      why: 'None of the candidates is a turbocharger cartridge.',
      candidates: [
        { itemCode: 'T33113021', description: 'HOSE FIRE MED APPROVED 20BAR', confidence: 32 },
        { itemCode: 'T17068103', description: 'FILTER ELEMENT DIESEL', confidence: 18 },
      ],
    },
  ],
};

export class MockRfqRepository implements RfqRepository {
  async getById(id: RfqId): Promise<RfqDetail> {
    await mockDelay(80);
    return { ...SAMPLE, id };
  }
}
