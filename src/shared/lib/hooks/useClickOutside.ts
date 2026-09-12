import { useEffect, useRef, type RefObject } from 'react';

/**
 * Викликає handler при кліку поза елементом.
 * Слухає mousedown, щоб спрацювати раніше, ніж елемент зникне з DOM.
 */
export const useClickOutside = <T extends HTMLElement>(
  handler: () => void,
  enabled = true,
): RefObject<T | null> => {
  const ref = useRef<T | null>(null);
  const savedHandler = useRef(handler);

  useEffect(() => {
    savedHandler.current = handler;
  });

  useEffect(() => {
    if (!enabled) return;

    const onPointerDown = (event: MouseEvent) => {
      const node = ref.current;
      if (node && !node.contains(event.target as Node)) savedHandler.current();
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [enabled]);

  return ref;
};
