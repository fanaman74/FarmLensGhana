import { afterEach, expect, test, vi } from 'vitest';
import { getMonthlyWeather, parseMonthlyWeather } from '../src/lib/api/monthlyWeather';
const fixture = () => ({ latitude: 6.6, longitude: -1.5, daily: { time: Array.from({ length: 30 }, (_, i) => `2026-09-${String(i + 1).padStart(2, '0')}`), temperature_2m_max: Array(30).fill(29), temperature_2m_min: Array(30).fill(22), precipitation_sum: Array(30).fill(5) } });
afterEach(() => vi.unstubAllGlobals());
test('keeps 30 dated days and missing rain distinct from zero', () => {
  const raw = fixture(); raw.daily.precipitation_sum[3] = null;
  const result = parseMonthlyWeather(raw);
  expect(result.days).toHaveLength(30); expect(result.days[3].rain).toBeNull();
});
test('rejects truncated or invalid provider data', () => {
  const raw = fixture(); raw.daily.temperature_2m_max.pop();
  expect(() => parseMonthlyWeather(raw)).toThrow();
});
test('uses selected coordinates and distinct cached requests', async () => {
  const fetcher = vi.fn(async () => Response.json(fixture())); vi.stubGlobal('fetch', fetcher);
  await getMonthlyWeather(6.71, -1.62); await getMonthlyWeather(9.4, -.84); await getMonthlyWeather(6.71, -1.62);
  expect(fetcher).toHaveBeenCalledTimes(2);
  const urls = fetcher.mock.calls as unknown as [URL][];
  expect(urls[0][0].searchParams.get('latitude')).toBe('6.71');
  expect(urls[1][0].searchParams.get('latitude')).toBe('9.4');
  expect(urls[0][0].searchParams.get('models')).toBe('ecmwf_ec46_ensemble_mean');
});
