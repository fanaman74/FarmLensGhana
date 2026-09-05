/** Retry temporary failures only; never retain an HTTP error in browser cache. */
export async function fetchWeather(latitude: number, longitude: number, signal: AbortSignal) {
  for (let attempt = 0; attempt < 3; attempt++) {
    signal.throwIfAborted();
    let retryable = true;
    try {
      const response = await fetch(`/api/weather?latitude=${latitude}&longitude=${longitude}`, { signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]), cache: 'no-store' });
      retryable = [502, 503, 504].includes(response.status);
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(typeof result.error === 'string' ? result.error : result.error?.message ?? 'Weather unavailable. Please retry.');
      signal.throwIfAborted();
      return result;
    } catch (error) {
      signal.throwIfAborted();
      if (!retryable || attempt === 2) throw error;
      await new Promise<void>((resolve, reject) => {
        const abort = () => { clearTimeout(timer); reject(signal.reason); };
        const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, 500 * (attempt + 1));
        signal.addEventListener('abort', abort, { once: true });
      });
    }
  }
  throw new Error('Weather unavailable. Please retry.');
}
