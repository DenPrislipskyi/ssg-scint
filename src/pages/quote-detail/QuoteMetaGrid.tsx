import { titleCase } from '@/shared/lib/format';
import { useQuoteDetail } from '@/pages/quote-detail/model/QuoteDetailContext';

export const QuoteMetaGrid = () => {
  const { quote } = useQuoteDetail();
  const { header } = quote;

  const fields: Array<[string, string]> = [
    ['Customer Name', header.customerName],
    ['Customer Code', header.customerCode],
    ['Vessel Name', `${header.vesselName} · IMO ${header.imo}`],
    ['Port', header.port],
    ['Cut-off', header.cutOff],
    ['Store Type', titleCase(header.storeType)],
    ['Product Category', titleCase(header.productCategory)],
    ['Quote Team', header.team],
    ['Contact', header.contactName],
  ];

  return (
    <dl className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-x-5 gap-y-1.5 border-b border-line2 px-4 py-3.5 text-[13px]">
      {fields.map(([label, value]) => (
        <div key={label} className="flex flex-col gap-px">
          <dt className="text-xs text-ink3">{label}</dt>
          <dd className={`m-0 font-medium ${label === 'Customer Code' ? 'font-mono' : ''}`}>
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
};
