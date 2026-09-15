import { useState } from 'react';

import { useProducts } from '@/entities/products/hooks/useProducts';
import type { SheetProduct } from '@/entities/products/model/types';
import { internalUomOf, sourceOf } from '@/entities/rfq/lib/matchRows';
import { shownSupplier } from '@/entities/rfq/lib/sourcing';
import { useDebouncedValue } from '@/shared/lib/hooks/useDebouncedValue';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Field';

/** Скільки рядків аркуша показуємо за раз. Далі уточнюють фільтрами. */
const PAGE = 50;
/** Мілісекунди тиші перед запитом. Фільтри набирають по літері. */
const QUIET = 250;

export interface ProductPickerProps {
  /** Код товару, що зараз стоїть праворуч у рядку. Підсвічується у списку. */
  showing: string;
  onPick: (product: SheetProduct) => void;
}

/**
 * Весь аркуш, і два поля, щоб у ньому щось знайти.
 *
 * Список кандидатів вище — це п'ять товарів, які запропонував пошук. Коли
 * жоден із них не той, шукати треба самому, і шукають деск двома способами:
 * за нашим кодом, коли його знають, і за словами, коли ні. Тому поля два, а
 * не одне: половина коду і половина слова разом звужують швидше, ніж будь-яке
 * з них окремо.
 *
 * Згорнутий за замовчуванням. Аркуш не запитується, поки його не відкрили:
 * більшість позицій закриваються кандидатом, і тягнути сотні рядків на кожну
 * розгорнуту позицію було б платою за те, чим не скористалися.
 */
export const ProductPicker = ({ showing, onPick }: ProductPickerProps) => {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');

  const filters = {
    code: useDebouncedValue(code, QUIET),
    description: useDebouncedValue(description, QUIET),
    limit: PAGE,
  };
  const { page, isFetching } = useProducts(filters, open);

  if (!open) {
    return (
      <Button size="xs" className="mt-1.5 w-full" onClick={() => setOpen(true)}>
        Or pick manually
      </Button>
    );
  }

  return (
    <div className="mt-1.5 rounded-lg border border-line bg-white p-2">
      <div className="mb-2 flex items-center gap-1.5">
        <Input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="Item code"
          className="w-[40%] font-mono text-[12px]"
          aria-label="Filter by item code"
        />
        <Input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Item description"
          className="flex-1 text-[12px]"
          aria-label="Filter by item description"
        />
        <Button size="xs" variant="ghost" onClick={() => setOpen(false)}>
          Close
        </Button>
      </div>

      <div className="max-h-[220px] overflow-y-auto">
        {page.items.map((product, index) => (
          <button
            // Позиція в ключі, а не сам код: коли аркуш віддавав один товар
            // двічі, React отримував два однакові ключі, і список показував
            // залишки попереднього фільтра — набрано `t11`, у списку `T31`.
            // Бекенд це вже схлопує; ключ не має від цього залежати.
            key={`${index}:${product.itemCode}`}
            type="button"
            aria-pressed={product.itemCode === showing}
            onClick={() => onPick(product)}
            className={cn(
              'block w-full rounded-md border px-2 py-1.5 text-left text-[12.5px]',
              'mb-1 last:mb-0 hover:bg-sel',
              product.itemCode === showing ? 'border-ink bg-sel' : 'border-line2 bg-white',
            )}
          >
            <span className="block truncate">{product.description}</span>
            <small className="block font-mono text-[11.5px] text-ink3">
              {[product.itemCode, sourceOf(product.item), internalUomOf(product.item)]
                .filter(Boolean)
                .join(' · ')}
            </small>
            {/* Вибрати рядок аркуша — це й вибрати постачальника: видно, кого
                саме, ще до того, як позицію на ньому зупинили. Складський
                товар мовчить — постачальник там ми самі. */}
            {shownSupplier(product.item) && (
              <small className="block truncate text-[11.5px] text-ink3">
                Supplier · {shownSupplier(product.item)}
              </small>
            )}
          </button>
        ))}

        {page.items.length === 0 && (
          <p className="m-0 px-1 py-2 text-[12.5px] text-ink3">
            {isFetching ? 'Looking…' : 'No product in the sheet matches both filters.'}
          </p>
        )}
      </div>

      {/* Скільки підійшло, а не скільки видно: список, який каже «50», коли їх
          чотириста, привчає перестати уточнювати. */}
      {page.total > page.items.length && (
        <p className="m-0 px-1 pt-1.5 text-[12px] text-ink3">
          Showing {page.items.length} of {page.total} — narrow the filters to see the rest.
        </p>
      )}
    </div>
  );
};
