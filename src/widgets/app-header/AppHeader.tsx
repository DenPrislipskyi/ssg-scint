import { useNavigate } from 'react-router';

import { useRepositories } from '@/app/providers/RepositoriesProvider';
import { paths } from '@/app/router/paths';
import currentUser from '@/shared/api/mock/fixtures/current-user.json';
import { Button } from '@/shared/ui/Button';

export interface AppHeaderProps {
  /** Хлібна крихта праворуч від логотипа, напр. "› RFQ-E114_26". */
  breadcrumb?: string;
}

export const AppHeader = ({ breadcrumb }: AppHeaderProps) => {
  const { quotes } = useRepositories();
  const navigate = useNavigate();

  const resetDemo = async () => {
    await quotes.reset();
    window.location.assign(paths.rfqList);
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2.5 border-b border-line bg-white px-6">
      <button
        type="button"
        onClick={() => void navigate(paths.rfqList)}
        className="flex items-center gap-2 text-[15px] font-semibold"
      >
        <i className="inline-block size-4 rotate-45 scale-75 rounded bg-ink" aria-hidden />
        SSG RFQ
      </button>

      <span className="rounded-full border border-line px-2.5 py-0.5 text-xs font-medium tracking-[0.04em] text-ink3">
        POC
      </span>

      {breadcrumb && <span className="text-[13px] text-ink3">{breadcrumb}</span>}

      <div className="ml-auto flex items-center gap-2.5 text-[13px]">
        <Button size="xs" onClick={resetDemo} title="Prototype: clear saved state">
          Reset demo
        </Button>
        <span className="inline-block size-8 rounded-full bg-[#D1D5DB]" aria-hidden />
        <span>
          {currentUser.name}
          <small className="block text-xs text-ink3">{currentUser.team}</small>
        </span>
      </div>
    </header>
  );
};
