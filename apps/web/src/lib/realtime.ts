export interface PollingOptions {
  intervalMs?: number;
  maxAttempts?: number;
  onUpdate: (data: unknown) => void;
  onError?: (error: Error) => void;
}

export function createPoller<T>(fetchFn: () => Promise<T>, options: PollingOptions) {
  const {
    intervalMs = 30000,
    maxAttempts = Infinity,
    onUpdate,
    onError,
  } = options;

  let attempts = 0;
  let timerId: ReturnType<typeof setInterval> | null = null;
  let isRunning = false;

  const poll = async () => {
    if (isRunning || attempts >= maxAttempts) return;
    isRunning = true;

    try {
      const data = await fetchFn();
      attempts++;
      onUpdate(data);
    } catch (error) {
      if (onError && isRetryable(error)) {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    } finally {
      isRunning = false;
    }
  };

  const start = () => {
    if (timerId) return;
    void poll();
    timerId = setInterval(poll, intervalMs);
  };

  const stop = () => {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  };

  const reset = () => {
    stop();
    attempts = 0;
    isRunning = false;
  };

  return { start, stop, reset, poll };
}

function isRetryable(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("fetch failed") ||
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("http 408") ||
    message.includes("http 429") ||
    message.includes("http 500") ||
    message.includes("http 502") ||
    message.includes("http 503") ||
    message.includes("http 504")
  );
}
