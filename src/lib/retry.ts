export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 2000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      const msg = lastError.message;
      const isRetryable =
        msg.includes("429") ||
        msg.includes("500") ||
        msg.includes("502") ||
        msg.includes("503") ||
        msg.includes("504") ||
        msg.includes("rate") ||
        msg.includes("timeout");

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
  maxRetries: number = 2
): Promise<Response> {
  return retryWithBackoff(async () => {
    const res = await fetch(url, options);
    if (res.status === 429 || res.status >= 500) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return res;
  }, maxRetries, 3000);
}
