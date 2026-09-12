/** Нормалізована помилка транспортного шару. */
export class ApiError extends Error {
  readonly status: number;
  readonly details: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export class NotImplementedError extends Error {
  constructor(method: string) {
    super(`${method} is not implemented yet — connect the backend endpoint first.`);
    this.name = 'NotImplementedError';
  }
}
