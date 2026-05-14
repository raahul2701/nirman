export async function retryWithBackoff<T>(operation: () => Promise<T>, retries = 3, baseDelayMs = 500): Promise<T> {
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= retries) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      attempt += 1;
      if (attempt > retries) break;
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * attempt));
    }
  }

  throw lastError;
}
