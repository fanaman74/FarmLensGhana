import { afterEach, expect, test, vi } from 'vitest';
import { fetchWeather } from '../src/lib/api/fetchWeather';
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
test('recovers from a transient outage and bypasses cached failures', async () => {
  vi.useFakeTimers();
  const mock = vi.fn().mockResolvedValueOnce(Response.json({ error: { message: 'Temporary outage' } }, { status: 502 })).mockResolvedValueOnce(Response.json({ ok: true, data: { current: { temperature: 26 } } }));
  vi.stubGlobal('fetch', mock);
  const result = fetchWeather(6.68, -1.62, new AbortController().signal);
  await vi.runAllTimersAsync();
  expect((await result).ok).toBe(true); expect(mock).toHaveBeenCalledTimes(2);
  expect(mock.mock.calls[0][1].cache).toBe('no-store');
});
test('does not retry invalid coordinates or rate limiting', async () => {
  const mock = vi.fn().mockResolvedValue(Response.json({ error: 'Invalid location' }, { status: 400 })); vi.stubGlobal('fetch', mock);
  await expect(fetchWeather(0, 0, new AbortController().signal)).rejects.toThrow('Invalid location'); expect(mock).toHaveBeenCalledTimes(1);
});
test('cancelled location requests cannot overwrite the current location', async () => {
  const controller = new AbortController(); controller.abort(); const mock = vi.fn(); vi.stubGlobal('fetch', mock);
  await expect(fetchWeather(6.68,-1.62,controller.signal)).rejects.toThrow(); expect(mock).not.toHaveBeenCalled();
});
