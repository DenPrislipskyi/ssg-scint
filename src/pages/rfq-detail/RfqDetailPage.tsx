import { useEffect } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';

import { useBreadcrumb } from '@/app/AppLayout';
import { paths, RFQ_STAGE } from '@/app/router/paths';
import { useMargins } from '@/entities/rfq/hooks/useMargins';
import { useRfq } from '@/entities/rfq/hooks/useRfq';
import { confirmedCount, readyForSourcing, sourcingRows } from '@/entities/rfq/lib/sourcing';
import { pluralSuffix } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button';
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
  const [margins, setMargins] = useMargins(rfqId, rfq.lines);
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

  const left = total - settled;
  const stages: Partial<Record<number, StageState>> = {
    [RFQ_STAGE.matching]: {
      hint: `${settled} of ${total} line${pluralSuffix(total)} confirmed`,
      ...(onSourcing || onPricing ? { to: paths.rfq(rfqId) } : {}),
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
  };

  // Закритий етап мусить бути закритий і за посиланням: інакше підказка в
  // шапці — лише прохання не заходити, а адресний рядок його обходить.
  if ((onSourcing || onPricing) && !ready) return <Navigate to={paths.rfq(rfqId)} replace />;

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

      {onPricing && <Pricing lines={rfq.lines} margins={margins} onMargins={setMargins} />}
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
      {!onSourcing && !onPricing && <ProductMatchingTable rfqId={rfqId} lines={rfq.lines} />}
    </div>
  );
};
