import { useState } from 'react';

import { sheetMargins, type Margins } from '@/entities/rfq/lib/pricing';
import type { MatchLine, RfqId } from '@/entities/rfq/model/types';

/**
 * Націнки, з якими рахують цей RFQ, і спосіб їх змінити.
 *
 * Живуть, доки відкрита сторінка. У POC це спосіб подивитися, як зміниться
 * сума, а не рішення, яке хтось ухвалив: записувати його нікуди, бо нікому
 * далі воно поки не йде.
 *
 * Стан тут, а не в таблиці, бо ці числа видно у двох місцях одразу — у полі
 * над таблицею і в підписі етапу над нею, — і дві копії розійшлися б першого
 * ж натискання.
 */
export const useMargins = (
  rfqId: RfqId,
  lines: MatchLine[],
): readonly [Margins, (margins: Margins) => void] => {
  const [edited, setEdited] = useState<Margins | null>(null);
  const [shownFor, setShownFor] = useState(rfqId);

  // Інший RFQ — інший аркуш і, взагалі кажучи, інші числа. Правка, що
  // пережила б перехід, порахувала б чуже замовлення з націнкою, якої йому
  // ніхто не ставив, і ніде про це не сказала б.
  if (shownFor !== rfqId) {
    setShownFor(rfqId);
    setEdited(null);
  }

  // Поки ніхто не правив — те, що назвав аркуш.
  return [edited ?? sheetMargins(lines), setEdited] as const;
};
