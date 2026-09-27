import { useState, type CSSProperties, type ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

/** Скільки місця підказка просить під собою, щоб вирішити, куди розкритися. */
const ROOM = 56;
const GAP = 6;

export interface ExplainedProps {
  /** Що сказати. Порожньо — обгортка нічого не додає. */
  title: string | undefined;
  children: ReactNode;
  className?: string;
}

/**
 * Елемент із підказкою, яку нічим не обрізати й не треба чекати.
 *
 * Потрібна вона майже завжди на тому, що **не** працює: вимкнена кнопка,
 * закритий етап. Нативний `title` для цього не годиться двічі — вимкнена
 * кнопка в Chrome не отримує подій миші взагалі, а там, де отримує, браузер
 * тримає підказку близько секунди, і цю затримку не налаштувати.
 *
 * `position: fixed`, а не `absolute`, і це не косметика: картки віджетів
 * мають `overflow-hidden`, а кнопки стоять у їхньому підвалі. Абсолютна
 * підказка виглядала з-під кнопки темною смужкою на кілька пікселів — не
 * прочитати й не зрозуміти, що це.
 *
 * Координати рахуються при наведенні, бо CSS не знає, де елемент.
 * Розкривається вниз, а біля нижнього краю вікна — вгору.
 */
export const Explained = ({ title, children, className }: ExplainedProps) => {
  const [at, setAt] = useState<CSSProperties | null>(null);
  if (!title) return <>{children}</>;

  const show = (event: React.PointerEvent<HTMLSpanElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const above = box.bottom + ROOM > window.innerHeight;
    setAt({
      // Правим краєм до правого краю елемента: підказка росте всередину
      // сторінки, а не за її межі.
      right: Math.round(window.innerWidth - box.right),
      top: Math.round(above ? box.top - GAP : box.bottom + GAP),
      ...(above ? { transform: 'translateY(-100%)' } : {}),
    });
  };

  return (
    <span
      className={cn('relative inline-flex cursor-default', className)}
      onPointerEnter={show}
      onPointerLeave={() => setAt(null)}
    >
      {children}
      <span
        role="tooltip"
        style={at ?? undefined}
        className={cn(
          'pointer-events-none fixed z-50 max-w-[260px] rounded-md bg-ink px-2 py-1',
          'text-[12px] leading-snug font-normal whitespace-normal text-white',
          at ? 'block' : 'hidden',
        )}
      >
        {title}
      </span>
    </span>
  );
};
