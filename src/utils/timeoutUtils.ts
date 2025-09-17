/**
 * Utility function to add timeout to fetch requests
 * @param fetchPromise - The fetch promise to wrap with timeout
 * @param timeoutMs - Timeout in milliseconds (default: 10000ms = 10s)
 * @returns Promise that rejects with timeout error if the request takes too long
 */
export function withTimeout<T>(
  fetchPromise: Promise<T>,
  timeoutMs: number = 30000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Request timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    fetchPromise
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

/**
 * Creates a fetch request with timeout
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @param timeoutMs - Timeout in milliseconds (default: 10000ms = 10s)
 * @returns Promise that rejects with timeout error if the request takes too long
 */
export function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 30000
): Promise<Response> {
  const fetchPromise = fetch(url, options);
  return withTimeout(fetchPromise, timeoutMs);
}
