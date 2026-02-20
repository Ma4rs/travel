export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      const isRetryable =
        lastError.message.includes("429") ||
        lastError.message.includes("5") ||
        lastError.message.includes("rate") ||
        lastError.message.includes("timeout");

      if (!isRetryable || attempt === maxRetries) throw lastError;

      const delay = baseDelayMs * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastError;
}

export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  maxRetries: number = 3
): Promise<Response> {
  return retryWithBackoff(async () => {
    const res = await fetch(url, options);
    if (res.status === 429 || res.status >= 500) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return res;
  }, maxRetries);
}
