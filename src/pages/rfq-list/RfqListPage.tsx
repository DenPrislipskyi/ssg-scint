import { useNavigate } from 'react-router';

import { paths } from '@/app/router/paths';
import { useQuotes } from '@/entities/quote/hooks/useQuotes';
import { useQuoteStream } from '@/entities/quote/hooks/useQuoteStream';
import { RfqTable } from '@/widgets/rfq-table/RfqTable';

export const RfqListPage = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useQuotes({});

  // Агент наповнює реєстр без участі користувача — слухаємо, коли з'явиться лист.
  useQuoteStream();

  return (
    <div className="mx-auto max-w-[1100px] p-6">
      <div className="mb-[18px] flex flex-wrap items-end gap-3">
        <div>
          <h1 className="m-0 mb-1 text-[22px] font-semibold tracking-[-.01em]">RFQ list</h1>
          <p className="m-0 text-[13px] text-ink3">
            Structured RFQ data has already been extracted upstream. Open an RFQ to process it
            through the four POC stages.
          </p>
        </div>
      </div>

      <RfqTable
        rows={data?.items ?? []}
        isLoading={isLoading}
        onOpen={(rfq) => void navigate(paths.rfq(rfq.rowKey))}
      />
    </div>
  );
};
