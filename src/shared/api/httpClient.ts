import { env } from '@/shared/config/env';
import { ApiError } from '@/shared/api/ApiError';

const TIMEOUT_MS = 15_000;

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  timeoutMs?: number;
}

/**
 * Тонка обгортка над fetch: базовий URL, JSON, таймаут і єдиний тип помилки.
 * Ніякої доменної логіки — тільки транспорт.
 */
export const httpClient = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const { body, timeoutMs = TIMEOUT_MS, headers, ...rest } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${env.apiBaseUrl}${path}`, {
      ...rest,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...headers },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    if (!response.ok) {
      const details = await response.json().catch(() => undefined);
      throw new ApiError(response.status, `Request failed: ${response.status}`, details);
    }

    return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(408, 'Request timed out');
    }
    throw new ApiError(0, error instanceof Error ? error.message : 'Network error');
  } finally {
    clearTimeout(timer);
  }
};
