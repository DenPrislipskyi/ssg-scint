import type { Tone } from '@/entities/quote/lib/statusMeta';

/**
 * Єдиний мапер семантичного тону в класи Tailwind.
 * Компоненти беруть класи звідси і ніколи не пишуть кольори самі.
 */
export const TONE: Record<Tone, { text: string; chip: string; border: string }> = {
  ok: { text: 'text-ok', chip: 'bg-ok-soft text-ok', border: 'border-ok' },
  warn: { text: 'text-warn', chip: 'bg-warn-soft text-warn', border: 'border-warn' },
  bad: { text: 'text-bad', chip: 'bg-bad-soft text-bad', border: 'border-bad' },
  sup: { text: 'text-sup', chip: 'bg-sup-soft text-sup', border: 'border-sup' },
  ns: { text: 'text-ns', chip: 'bg-ns-soft text-ns', border: 'border-ns' },
  info: { text: 'text-info', chip: 'bg-info-soft text-info', border: 'border-info-line' },
  muted: { text: 'text-ink4', chip: 'bg-sel text-ink2', border: 'border-line' },
};
