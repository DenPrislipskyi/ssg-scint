import { useEffect } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';

import { useBreadcrumb } from '@/app/AppLayout';
import { paths, RFQ_STAGE } from '@/app/router/paths';
import { useMargins } from '@/entities/rfq/hooks/useMargins';
import { useRfq } from '@/entities/rfq/hooks/useRfq';
import {
  NOT_APPROVED,
  pricingRows,
  shownMargins,
  whyNotFinalised,
} from '@/entities/rfq/lib/pricing';
import { confirmedCount, readyForSourcing, sourcingRows } from '@/entities/rfq/lib/sourcing';
import { pluralSuffix } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button';
import { Finalisation } from '@/widgets/finalisation/Finalisation';
import { Quotation } from '@/widgets/finalisation/Quotation';
import { Pricing } from '@/widgets/pricing/Pricing';
import { ProductMatchingTable } from '@/widgets/product-matching/ProductMatchingTable';
import { RfqStages, type StageState } from '@/widgets/rfq-stages/RfqStages';
import { SupplierSourcing } from '@/widgets/supplier-sourcing/SupplierSourcing';

/** Порожнє значення показуємо прочерком, а не ховаємо і не вигадуємо. */
const EMPTY = <span className="text-ink4">—</span>;

/**
 * Чому другий етап закритий. Формулювання про товар, а не про постачальника:
 * складській позиції постачальник не потрібен, а підтвердити її все одно
 * треба — інакше невідомо навіть, чи вона складська.
 */
const BLOCKED = 'Confirm a product for every line before sourcing suppliers';

/** Поле шапки RFQ: підпис зверху, значення під ним. */
const Field = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-0.5 text-[13px]">
    <span className="text-[12px] text-ink3">{label}</span>
    <b className="font-medium">{value || EMPTY}</b>
  </div>
);

export interface RfqDetailPageProps {
  /** Який етап показувати. Другий живе за власним маршрутом і каже це звідти. */
  stage?: number;
}

export const RfqDetailPage = ({ stage = RFQ_STAGE.matching }: RfqDetailPageProps) => {
  const { rfqId = '' } = useParams();
  const navigate = useNavigate();
  const rfq = useRfq(rfqId);
  // Тут, а не в таблиці: ці самі числа стоять у підписі третього етапу, і
  // дві копії розійшлися б першого ж натискання.
  const [edited, setMargins] = useMargins(rfqId, rfq.lines);
  const { setBreadcrumb } = useBreadcrumb();

  const reference = rfq.reference;

  useEffect(() => {
    setBreadcrumb(`› ${reference || '—'}`);
    return () => setBreadcrumb('');
  }, [reference, setBreadcrumb]);

  const vessel = rfq.imo ? `${rfq.vesselName} · IMO ${rfq.imo}` : rfq.vesselName;

  const total = rfq.lines.length;
  const settled = confirmedCount(rfq.lines);
  const ready = readyForSourcing(rfq.lines);
  const jit = sourcingRows(rfq.lines);
  const onSourcing = stage === RFQ_STAGE.sourcing;
  const onPricing = stage === RFQ_STAGE.pricing;
  const onFinal = stage === RFQ_STAGE.finalisation;
  // Підпис під котируванням — усе, що відмикає четвертий етап. Він у записі,
  // тож переживає перезавантаження, на відміну від прапорця на клієнті.
  const approved = rfq.approval !== null;
  // Після підпису — ті числа, з якими рахували, а не ті, що лишилися в
  // аркуші: інакше екран пояснював би затверджену ціну націнкою, яка її не
  // давала, і після перезавантаження суперечив би сам собі.
  const margins = shownMargins(rfq.approval, edited);
  // Чому четвертий етап закритий — тією самою фразою, що й кнопка переходу
  // на третьому: питання одне, і людина має почути одну відповідь.
  const unfinished = whyNotFinalised(pricingRows(rfq.lines, margins), approved);

  const left = total - settled;
  const stages: Partial<Record<number, StageState>> = {
    [RFQ_STAGE.matching]: {
      hint: `${settled} of ${total} line${pluralSuffix(total)} confirmed`,
      ...(onSourcing || onPricing || onFinal ? { to: paths.rfq(rfqId) } : {}),
    },
    // Два різні етапи, а не один із прапорцем: відкритий каже, скільки роботи
    // попереду, закритий — чого бракує, щоб її почати.
    [RFQ_STAGE.sourcing]: ready
      ? {
          hint: `${jit.length} JIT line${pluralSuffix(jit.length)} to source`,
          ...(onSourcing ? {} : { to: paths.rfqSourcing(rfqId) }),
        }
      : {
          hint: `${left} line${pluralSuffix(left)} still to confirm`,
          blocked: BLOCKED,
        },
    // Той самий ключ, що й у другого етапу, і це навмисно: ціну складської
    // позиції видно, щойно вона доведена до товару, а JIT-рядок без відповіді
    // каже про це сам. Чекати на постачальників, щоб показати те, що вже
    // відомо, означало б ховати половину рахунку.
    [RFQ_STAGE.pricing]: ready
      ? {
          // Чим рахують, а не скільки лишилося: кількість позицій уже стоїть
          // у першому етапі, а націнку звідси видно, не відкриваючи екрана.
          hint: `In-Stock ${margins.stock} % · JIT ${margins.jit} %`,
          ...(onPricing ? {} : { to: paths.rfqPricing(rfqId) }),
        }
      : {
          hint: `${left} line${pluralSuffix(left)} still to confirm`,
          blocked: BLOCKED,
        },
    // Відмикається підписом, а не підтвердженням позицій: цей екран показує
    // затверджені числа, і відкритий до підпису він показував би те, що ще
    // може змінитися.
    [RFQ_STAGE.finalisation]: ready
      ? approved
        ? {
            hint: `${total} line${pluralSuffix(total)} confirmed`,
            ...(onFinal ? {} : { to: paths.rfqFinalisation(rfqId) }),
          }
        : {
            // Підпис під назвою каже, чого бракує, а підказка — те саме
            // розгорнуто: підказка, яку видно лише навівши, не допомагає тому,
            // хто не здогадався навести.
            hint: unfinished === NOT_APPROVED ? 'Awaiting approval' : 'Awaiting supplier prices',
            blocked: unfinished ?? '',
          }
      : {
          hint: `${left} line${pluralSuffix(left)} still to confirm`,
          blocked: BLOCKED,
        },
  };

  // Закритий етап мусить бути закритий і за посиланням: інакше підказка в
  // шапці — лише прохання не заходити, а адресний рядок його обходить.
  if ((onSourcing || onPricing || onFinal) && !ready) {
    return <Navigate to={paths.rfq(rfqId)} replace />;
  }
  // Гейт четвертого етапу теж не обходиться адресним рядком: підказка, яку
  // можна обійти, вводила б в оману.
  if (onFinal && !approved) return <Navigate to={paths.rfqPricing(rfqId)} replace />;

  return (
    <div className="mx-auto max-w-[1520px] px-6 pt-5 pb-10">
      <div className="mb-[14px] flex items-center gap-3">
        <Button className="px-3" onClick={() => void navigate(paths.rfqList)}>
          ← RFQ list
        </Button>
        <h1 className="m-0 text-[20px] font-semibold tracking-[-.01em]">{reference || EMPTY}</h1>
      </div>

      <div className="mb-[14px] grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-x-[22px] gap-y-1.5 rounded-xl border border-line bg-white px-4 py-3.5">
        <Field label="RFQ reference" value={reference} />
        <Field label="Customer" value={rfq.customerName} />
        <Field label="Vessel" value={vessel} />
        <Field label="Customer RFQ reference" value="" />
        <Field label="RFQ lines" value="" />
      </div>

      <RfqStages current={stage} stages={stages} />

      {onPricing && (
        <Pricing
          rfqId={rfqId}
          lines={rfq.lines}
          approval={rfq.approval}
          margins={margins}
          onMargins={setMargins}
          onContinue={() => void navigate(paths.rfqFinalisation(rfqId))}
        />
      )}
      {onFinal && (
        <div className="grid gap-[14px]">
          <Finalisation lines={rfq.lines} />
          {/* Keyed by RFQ: the picked format belongs to this document, and
              moving to another must not show it on a letterhead nobody picked. */}
          <Quotation
            key={rfqId}
            rfqId={rfqId}
            reference={reference}
            customer={rfq.customerName}
            vessel={vessel}
            port={rfq.port}
            approvedAt={rfq.approval?.approvedAt ?? ''}
            lines={rfq.lines}
          />
        </div>
      )}
      {onSourcing && (
        <SupplierSourcing
          rfqId={rfqId}
          reference={reference}
          vessel={rfq.vesselName}
          port={rfq.port}
          rows={jit}
          inquiries={rfq.inquiries}
        />
      )}
      {!onSourcing && !onPricing && !onFinal && (
        <ProductMatchingTable rfqId={rfqId} lines={rfq.lines} />
      )}
    </div>
  );
};
