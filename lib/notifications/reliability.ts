type RetryOptions = {
  retries: number;
  baseDelayMs: number;
  timeoutMs: number;
  label: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timeout after ${timeoutMs}ms`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function retryWithTimeout<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  let attempt = 0;
  let lastError: unknown = null;
  while (attempt <= options.retries) {
    try {
      return await withTimeout(fn(), options.timeoutMs, options.label);
    } catch (error) {
      lastError = error;
      if (attempt === options.retries) break;
      const backoff = options.baseDelayMs * Math.pow(2, attempt);
      console.warn(`[notifications] retry ${options.label}`, {
        attempt: attempt + 1,
        retries: options.retries,
        backoffMs: backoff,
        error: error instanceof Error ? error.message : String(error),
      });
      await sleep(backoff);
      attempt += 1;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
