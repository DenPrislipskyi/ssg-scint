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
export const httpClient = <T>(path: string, options: RequestOptions = {}): Promise<T> =>
  send(path, options, async (response) =>
    response.status === 204 ? (undefined as T) : ((await response.json()) as T),
  );

/**
 * The same transport, for a file rather than JSON - a generated PDF.
 *
 * Errors come back exactly as `httpClient`'s do, so a caller handles a 409 on
 * a download the same way it handles one on a write.
 */
export const httpBlob = (path: string, options: RequestOptions = {}): Promise<Blob> =>
  send(path, options, (response) => response.blob());

/**
 * One request, read by `read` while the timeout still runs: a body that stalls
 * halfway is as much a hung request as a server that never answers.
 */
const send = async <T>(
  path: string,
  options: RequestOptions,
  read: (response: Response) => Promise<T>,
): Promise<T> => {
  const { body, timeoutMs = TIMEOUT_MS, headers, ...rest } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Content-Type only when there is content. A GET carrying it is no longer
    // a "simple" request, so the browser sends a preflight OPTIONS before every
    // read - a second round trip across the Atlantic for a header describing a
    // body that is not there.
    const hasBody = body !== undefined;

    const response = await fetch(`${env.apiBaseUrl}${path}`, {
      ...rest,
      signal: controller.signal,
      headers: { ...(hasBody ? { 'Content-Type': 'application/json' } : {}), ...headers },
      ...(hasBody ? { body: JSON.stringify(body) } : {}),
    });

    if (!response.ok) {
      const details = await response.json().catch(() => undefined);
      throw new ApiError(response.status, `Request failed: ${response.status}`, details);
    }
    return await read(response);
  } catch (error) {
    throw failure(error);
  } finally {
    clearTimeout(timer);
  }
};

/** Every way a request can fail, as the one error type callers handle. */
const failure = (error: unknown): ApiError => {
  if (error instanceof ApiError) return error;
  if (error instanceof DOMException && error.name === 'AbortError') {
    return new ApiError(408, 'Request timed out');
  }
  return new ApiError(0, error instanceof Error ? error.message : 'Network error');
};
