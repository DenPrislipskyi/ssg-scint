import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';

import { useBreadcrumb } from '@/app/AppLayout';
import { paths } from '@/app/router/paths';
import { useRfq } from '@/entities/rfq/hooks/useRfq';
import { Button } from '@/shared/ui/Button';
import { ProductMatchingTable } from '@/widgets/product-matching/ProductMatchingTable';
import { RfqStages } from '@/widgets/rfq-stages/RfqStages';

/** Порожнє значення показуємо прочерком, а не ховаємо і не вигадуємо. */
const EMPTY = <span className="text-ink4">—</span>;

/** Поле шапки RFQ: підпис зверху, значення під ним. */
const Field = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-0.5 text-[13px]">
    <span className="text-[12px] text-ink3">{label}</span>
    <b className="font-medium">{value || EMPTY}</b>
  </div>
);

export const RfqDetailPage = () => {
  const { rfqId = '' } = useParams();
  const navigate = useNavigate();
  const rfq = useRfq(rfqId);
  const { setBreadcrumb } = useBreadcrumb();

  // Референс RFQ у нас поки порожній — агент його не віддає.
  const reference = '';

  useEffect(() => {
    setBreadcrumb(`› ${reference || '—'}`);
    return () => setBreadcrumb('');
  }, [reference, setBreadcrumb]);

  const vessel = rfq.imo ? `${rfq.vesselName} · IMO ${rfq.imo}` : rfq.vesselName;

  return (
    <div className="mx-auto max-w-[1520px] px-6 pt-5 pb-10">
      <div className="mb-[14px] flex items-center gap-3">
        <Button className="px-3" onClick={() => void navigate(paths.rfqList)}>
          ← RFQ list
        </Button>
        <h1 className="m-0 text-[20px] font-semibold tracking-[-.01em]">{reference || EMPTY}</h1>
      </div>

      <div className="mb-[14px] grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-x-[22px] gap-y-1.5 rounded-xl border border-line bg-white px-4 py-3.5">
        <Field label="RFQ reference" value="" />
        <Field label="Customer" value={rfq.customerName} />
        <Field label="Vessel" value={vessel} />
        <Field label="Customer RFQ reference" value="" />
        <Field label="RFQ lines" value="" />
      </div>

      <RfqStages detail={`${rfq.lines.length} line(s) to confirm`} />

      <ProductMatchingTable lines={rfq.lines} />
    </div>
  );
};
