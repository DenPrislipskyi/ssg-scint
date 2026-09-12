import type { Tone } from '@/entities/quote/lib/statusMeta';

/**
 * Кольори міток агента.
 *
 * Ключ — назва категорії Outlook у нижньому регістрі: саме її агент ставить
 * листу і саме її оператор бачить у поштовій скриньці, тож ярлик у таблиці й
 * ярлик у пошті читаються як одне й те саме.
 *
 * Невідома мітка показується сірою під власною назвою. Агент може отримати
 * нову категорію без релізу фронтенду — сховати такий лист було б гірше.
 */
const TONE_BY_LABEL: Record<string, Tone> = {
  'ssg rfq': 'ok',
  'ssg review': 'warn',
  'ssg error': 'bad',
  'ssg not sent': 'sup',
  'ssg no action': 'muted',
};

export const labelTone = (label: string): Tone =>
  TONE_BY_LABEL[label.trim().toLowerCase()] ?? 'muted';
