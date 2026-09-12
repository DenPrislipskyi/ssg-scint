import { useEffect, useRef } from 'react';

export type HotkeyHandler = (event: KeyboardEvent) => void;

export interface UseHotkeysOptions {
  /** Вимикає всі обробники (напр. коли відкрито модалку). */
  enabled?: boolean;
  /** Ігнорувати натискання всередині полів вводу. За замовчуванням true. */
  ignoreFormFields?: boolean;
}

const FORM_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

const isFormField = (target: EventTarget | null): boolean => {
  const element = target as HTMLElement | null;
  return Boolean(element && (FORM_TAGS.has(element.tagName) || element.isContentEditable));
};

/**
 * Глобальні клавіатурні скорочення з єдиною точкою вимкнення.
 * Ключі мапи — `event.key` у нижньому регістрі ("arrowdown", "enter", "s").
 */
export const useHotkeys = (
  handlers: Record<string, HotkeyHandler>,
  { enabled = true, ignoreFormFields = true }: UseHotkeysOptions = {},
): void => {
  const saved = useRef(handlers);

  useEffect(() => {
    saved.current = handlers;
  });

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (ignoreFormFields && isFormField(event.target)) return;

      const handler = saved.current[event.key.toLowerCase()];
      handler?.(event);
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [enabled, ignoreFormFields]);
};
