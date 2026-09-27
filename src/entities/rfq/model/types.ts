/** Ідентифікатор RFQ — це id запису листа в агента. */
export type RfqId = string;

/**
 * Як саме знайшовся товар. Перше, що дивиться оператор.
 *
 *   code_confirmed  код клієнта назвав товар, і опис із ним збігся
 *   code_rejected   код назвав товар, опис не збігся — код відкинуто
 *   search          коду не було (або його немає в аркуші) — шукали словами
 *   none            аркушу нема чого запропонувати
 */
export type MatchRoute = 'code_confirmed' | 'code_rejected' | 'search' | 'none';

export interface MatchCandidate {
  itemCode: string;
  description: string;
  /**
   * 0-100, how sure matching is that this is what the line asked for. `null`
   * where the line could not be scored - shown as a dash, never as a number
   * nobody worked out. Shown to a person; nothing on the page decides on it.
   */
  confidence: number | null;
  /**
   * What the score rests on, in one sentence ("size not stated - one of
   * four"). Empty for a score with no reason to give.
   */
  why: string;
  /** Увесь рядок аркуша — кандидат заповнює ті самі колонки, що й збіг. */
  item: Record<string, string>;
}

/**
 * Один рядок RFQ: ліворуч те, що просив клієнт, праворуч те, що продаємо ми.
 * Дві половини навмисно не змішані — уся суть екрана в їх порівнянні.
 */
export interface MatchLine {
  /** Де вона стоїть на сторінці, 1..n. На це показує людина. */
  line: number;
  /**
   * Як цю позицію називає запис — власна нумерація читача всередині файла,
   * з якого вона прийшла. Саме нею адресується підтвердження: екран, який
   * перенумерує рядки, не має права перенаправити підтвердження на чужий товар.
   */
  index: number;
  customerCode: string;
  customerDescription: string;
  quantity: string;
  uom: string;

  itemCode: string;
  itemDescription: string;
  /** Уся решта колонок аркуша. Екран поки не показує, але дані вже є. */
  item: Record<string, string>;
  confidence: number | null;
  how: MatchRoute;
  why: string;
  candidates: MatchCandidate[];
  /**
   * Товар, на якому зупинилася людина. Порожньо, поки ніхто не зупинився —
   * і порожньо знову, коли передумали: це один стан, а не два.
   */
  confirmedItemCode: string;
  /**
   * Скільки постачальник просить за одну одиницю. `null`, поки ніхто не
   * відповів: нуль — це названа ціна, а «нам не відповіли» — не ціна взагалі,
   * і плутати їх на екрані цін не можна.
   */
  offerUnitPrice: number | null;
  /**
   * Коли ця ціна прийшла — ISO-рядок із бекенда. `null` там само, де й ціна:
   * екран відповідей датує лист постачальника саме цим, а лист, якого не
   * було, дати не має.
   */
  offerReceivedAt: string | null;
  /**
   * За скільки ця позиція продається — за одиницю, як воно стояло в мить
   * затвердження. `null`, поки ніхто не затвердив.
   *
   * Зберігається, а не перераховується, і в цьому весь сенс затвердження:
   * собівартість і націнка потім рухаються — постачальник перепитує ціну,
   * аркуш правлять, — а котирування, яке тихо йшло б за ними, перестало б
   * бути тим числом, яке назвали клієнтові.
   */
  approvedUnitPrice: number | null;
}

/** Затверджене котирування: коли й з якими націнками його підписали. */
export interface Approval {
  approvedAt: string;
  marginStock: number;
  marginJit: number;
}

/**
 * Лист, який ми надіслали одному постачальнику — такий, яким він пішов.
 *
 * Текст зберігається цілим, а не як шаблон із підстановками: перед
 * надсиланням його можна правити, і цінність має саме те речення, що пішло, а
 * не те, яке сьогоднішній шаблон зібрав би з тих самих позицій.
 */
export interface SentInquiry {
  /** Назва фірми — вона ж адреса й ключ: іншого ідентифікатора аркуш не несе. */
  supplier: string;
  body: string;
  /** Час сервера. Годинник браузера не має права датувати лист. */
  sentAt: string;
  /** Про які позиції питали, за їхнім номером у **записі**. */
  lines: number[];
}

export interface RfqDetail {
  id: RfqId;
  /**
   * Номер цього RFQ у нас — `RFQ-0042`. Порожньо для запису, зробленого
   * до того, як номери з'явилися.
   *
   * Не `id`: той адресує запис і в листі нікому нічого не каже. Цей — єдине,
   * що бачить клієнт і постачальник, і саме його вони назвуть у відповідь.
   */
  reference: string;
  customerName: string;
  vesselName: string;
  imo: string;
  port: string;
  receivedOn: string;
  subject: string;
  lines: MatchLine[];
  /**
   * Що вже запитали в постачальників. Порожньо, поки ніхто не надсилав — і
   * саме це не дає надіслати вдруге: листи йдуть один раз.
   */
  inquiries: SentInquiry[];
  /**
   * `null`, поки ніхто не затвердив ціни — і це все, що тримає четвертий
   * етап закритим. Назад дороги немає.
   */
  approval: Approval | null;
}
