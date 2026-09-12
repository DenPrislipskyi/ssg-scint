/** Імітує мережеву затримку, щоб UI одразу проєктувався з урахуванням завантаження. */
export const mockDelay = (ms = 140): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
