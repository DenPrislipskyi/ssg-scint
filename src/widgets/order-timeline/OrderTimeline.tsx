import { ORDER_STEPS, currentOrderStep } from '@/widgets/order-timeline/orderStage';
import type { Quote } from '@/entities/quote/model/types';
import { cn } from '@/shared/lib/cn';

export const OrderTimeline = ({ quote }: { quote: Quote }) => {
  const current = currentOrderStep(quote);

  return (
    <ol className="mb-3 flex list-none p-0 text-xs">
      {ORDER_STEPS.map((step, index) => (
        <li
          key={step}
          className={cn(
            'border border-l-0 border-line bg-white px-3 py-1.5 text-ink3',
            'first:rounded-l-lg first:border-l last:rounded-r-lg',
            index < current && 'bg-ok-soft text-ok',
            index === current && 'border-ink bg-ink text-white',
          )}
        >
          {step}
        </li>
      ))}
    </ol>
  );
};
