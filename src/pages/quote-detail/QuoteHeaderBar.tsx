import { Link } from 'react-router';

import { paths } from '@/app/router/paths';
import { useQuoteDetail } from '@/pages/quote-detail/model/QuoteDetailContext';
import { useCommunicationStore } from '@/pages/quote-detail/model/communicationStore';
import { Button } from '@/shared/ui/Button';
import { Tag } from '@/shared/ui/Tag';
import { IconHighPriority } from '@/shared/ui/icons';
import { useToast } from '@/shared/ui/Toast';

export const QuoteHeaderBar = () => {
  const { quote } = useQuoteDetail();
  const toast = useToast();
  const { isOpen, channel, toggle } = useCommunicationStore();

  const supplierCount = new Set(
    quote.lines.flatMap((line) => line.suppliers.map((supplier) => supplier.supplierId)),
  ).size;

  return (
    <div className="sticky top-14 z-15 -mx-6 mb-4 flex items-center gap-3 border-b border-line bg-bg px-6 py-3">
      <Link to={paths.rfqList}>
        <Button>← RFQ list</Button>
      </Link>

      <h1 className="m-0 text-2xl font-semibold tracking-tight">
        RFQ-{quote.header.reference}
      </h1>

      <span className="flex items-center gap-1.5">
        {quote.header.priority === 'HIGH' && (
          <span className="text-[#DC2626]" title="High priority">
            <IconHighPriority className="size-3.5" />
          </span>
        )}
        <Tag>{quote.header.fileType}</Tag>
        <Tag>Due {quote.header.dueDate}</Tag>
      </span>

      <span className="ml-auto" />

      <Button
        variant={isOpen && channel === 'customer' ? 'primary' : 'default'}
        badge={quote.mails.length}
        onClick={() => toggle('customer')}
      >
        Customer emails
      </Button>
      <Button
        variant={isOpen && channel === 'supplier' ? 'primary' : 'default'}
        badge={supplierCount || undefined}
        onClick={() => toggle('supplier')}
      >
        Supplier emails
      </Button>
      <Button onClick={() => toast.show(`${quote.header.attachments.length} attachment(s)`)}>
        Attachments {quote.header.attachments.length}
      </Button>
    </div>
  );
};
