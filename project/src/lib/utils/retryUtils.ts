/**
 * Utilitário para retry com backoff exponencial
 */
export async function withRetries<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Backoff exponencial: 1s, 2s, 4s...
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Utilitário para retry com timeout
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number = 10000
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    return await fn();
  } finally {
    clearTimeout(timeoutId);
  }
}
