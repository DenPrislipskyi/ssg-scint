import { NavLink, useParams } from 'react-router';

import { QUOTE_TABS, QUOTE_TAB_LABELS, paths, type QuoteTab } from '@/app/router/paths';
import { engagedSuppliers } from '@/entities/quote/lib/lineState';
import { useQuoteDetail } from '@/pages/quote-detail/model/QuoteDetailContext';
import { cn } from '@/shared/lib/cn';

export const QuoteTabs = () => {
  const { quote } = useQuoteDetail();
  const { quoteId = '' } = useParams();

  const counts: Partial<Record<QuoteTab, number>> = {
    lines: quote.lines.length,
    sourcing: quote.lines.filter((line) => engagedSuppliers(line).length > 0).length,
  };

  return (
    <nav className="flex gap-1 border-b border-line2 px-4 pt-2" role="tablist">
      {QUOTE_TABS.map((tab) => (
        <NavLink
          key={tab}
          to={paths.rfqTab(quoteId, tab)}
          className={({ isActive }) =>
            cn(
              '-mb-px border-b-2 px-3 py-2.5 text-sm font-medium no-underline',
              isActive ? 'border-ink text-ink' : 'border-transparent text-ink2 hover:text-ink',
            )
          }
        >
          {QUOTE_TAB_LABELS[tab]}
          {counts[tab] ? <span className="ml-1.5 text-ink3">{counts[tab]}</span> : null}
        </NavLink>
      ))}
    </nav>
  );
};
