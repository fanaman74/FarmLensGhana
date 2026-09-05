import { z } from 'zod';
const values = z.array(z.number().nullable()).length(30);
const schema = z.object({ latitude: z.number(), longitude: z.number(), daily: z.object({ time: z.array(z.iso.date()).length(30), temperature_2m_max: values, temperature_2m_min: values, precipitation_sum: values }) });
export function parseMonthlyWeather(input: unknown) {
  const raw = schema.parse(input);
  return { grid: { latitude: raw.latitude, longitude: raw.longitude }, days: raw.daily.time.map((date, i) => ({ date, high: raw.daily.temperature_2m_max[i], low: raw.daily.temperature_2m_min[i], rain: raw.daily.precipitation_sum[i] })) };
}
export type MonthlyWeather = ReturnType<typeof parseMonthlyWeather> & { fetchedAt: string };
const cache = new Map<string, { expires: number; data: MonthlyWeather }>();
export async function getMonthlyWeather(latitude: number, longitude: number): Promise<MonthlyWeather> {
  const key = `${latitude},${longitude}`;
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.data;
  const url = new URL('https://seasonal-api.open-meteo.com/v1/seasonal');
  url.search = new URLSearchParams({ latitude: String(latitude), longitude: String(longitude), forecast_days: '30', timezone: 'Africa/Accra', models: 'ecmwf_ec46_ensemble_mean', daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum' }).toString();
  const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error('Monthly outlook provider unavailable.');
  const data = { ...parseMonthlyWeather(await response.json()), fetchedAt: new Date().toISOString() };
  if (cache.size >= 200) cache.delete(cache.keys().next().value!);
  cache.set(key, { expires: Date.now() + 600_000, data });
  return data;
}
