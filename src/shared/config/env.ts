/** Типізований доступ до змінних оточення. Валідується один раз при старті. */

const MODES = ['mock', 'hybrid', 'http'] as const;
export type ApiMode = (typeof MODES)[number];

const readMode = (): ApiMode => {
  const raw = import.meta.env.VITE_API_MODE;
  return MODES.includes(raw as ApiMode) ? (raw as ApiMode) : 'mock';
};

export const env = {
  apiMode: readMode(),
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api',
  isDev: import.meta.env.DEV,
} as const;
