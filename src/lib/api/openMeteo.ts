import { z } from 'zod';
import type { ProviderResult, WeatherData } from '../types';

const numberOrNull = z.number().nullable();
const arrayOfNumbers = z.array(numberOrNull);

const forecastSchema = z.object({
  latitude: z.number(), longitude: z.number(), timezone: z.string(),
  current: z.object({
    time: z.string(), temperature_2m: z.number(), apparent_temperature: z.number(),
    relative_humidity_2m: z.number(), precipitation: z.number(), weather_code: z.number(),
    wind_speed_10m: z.number(), wind_gusts_10m: z.number()
  }),
  hourly: z.object({
    time: z.array(z.string()), temperature_2m: arrayOfNumbers, relative_humidity_2m: arrayOfNumbers,
    precipitation_probability: arrayOfNumbers, precipitation: arrayOfNumbers,
    soil_temperature_6cm: arrayOfNumbers, soil_moisture_3_to_9cm: arrayOfNumbers
  }),
  daily: z.object({
    time: z.array(z.string()), weather_code: arrayOfNumbers, temperature_2m_max: arrayOfNumbers,
    temperature_2m_min: arrayOfNumbers, precipitation_probability_max: arrayOfNumbers,
    precipitation_sum: arrayOfNumbers, et0_fao_evapotranspiration: arrayOfNumbers,
    wind_speed_10m_max: arrayOfNumbers, wind_gusts_10m_max: arrayOfNumbers
  })
});

const geocodeSchema = z.object({
  results: z.array(z.object({
    id: z.number(), name: z.string(), latitude: z.number(), longitude: z.number(),
    admin1: z.string().optional(), admin2: z.string().optional(), country_code: z.string()
  })).optional()
});

const cache = new Map<string, { expires: number; data: unknown }>();

async function fetchJson(url: URL, timeoutMs = 9000): Promise<unknown> {
  const key = url.toString();
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.data;
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: { Accept: 'application/json', 'User-Agent': 'FarmLens-Ghana/0.1' } });
  if (!response.ok) throw new Error(`Upstream returned ${response.status}`);
  const data: unknown = await response.json();
  cache.set(key, { expires: Date.now() + 10 * 60 * 1000, data });
  return data;
}

export async function getWeather(latitude: number, longitude: number): Promise<ProviderResult<WeatherData>> {
  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', String(latitude));
    url.searchParams.set('longitude', String(longitude));
    url.searchParams.set('timezone', 'Africa/Accra');
    url.searchParams.set('forecast_days', '7');
    url.searchParams.set('current', 'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_gusts_10m');
    url.searchParams.set('hourly', 'temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,soil_temperature_6cm,soil_moisture_3_to_9cm');
    url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,et0_fao_evapotranspiration,wind_speed_10m_max,wind_gusts_10m_max');
    const parsed = forecastSchema.safeParse(await fetchJson(url));
    if (!parsed.success) return { ok: false, error: { code: 'missing_data', message: 'The weather provider returned incomplete data.', retryable: true } };
    const raw = parsed.data;
    // Do not turn missing provider measurements into apparent zero rainfall.
    const value = (array: (number | null)[], index: number) => {
      const result = array[index];
      if (result == null) throw new Error('Incomplete daily forecast');
      return result;
    };
    const data: WeatherData = {
      location: { latitude: raw.latitude, longitude: raw.longitude, timezone: raw.timezone },
      current: {
        time: raw.current.time, temperature: raw.current.temperature_2m, apparentTemperature: raw.current.apparent_temperature,
        humidity: raw.current.relative_humidity_2m, precipitation: raw.current.precipitation,
        weatherCode: raw.current.weather_code, windSpeed: raw.current.wind_speed_10m, windGusts: raw.current.wind_gusts_10m
      },
      daily: raw.daily.time.map((date, index) => ({
        date, weatherCode: value(raw.daily.weather_code, index), maxTemperature: value(raw.daily.temperature_2m_max, index),
        minTemperature: value(raw.daily.temperature_2m_min, index), precipitationProbability: value(raw.daily.precipitation_probability_max, index),
        rainfall: value(raw.daily.precipitation_sum, index), et0: value(raw.daily.et0_fao_evapotranspiration, index),
        windSpeed: value(raw.daily.wind_speed_10m_max, index), windGusts: value(raw.daily.wind_gusts_10m_max, index)
      })),
      hourly: raw.hourly.time.map((time, index) => ({
        time, temperature: raw.hourly.temperature_2m[index] ?? null, humidity: raw.hourly.relative_humidity_2m[index] ?? null,
        precipitationProbability: raw.hourly.precipitation_probability[index] ?? null, rainfall: raw.hourly.precipitation[index] ?? null,
        soilTemperature: raw.hourly.soil_temperature_6cm[index] ?? null, soilMoisture: raw.hourly.soil_moisture_3_to_9cm[index] ?? null
      })), observedAt: raw.current.time
    };
    return { ok: true, data, source: 'Open-Meteo', fetchedAt: new Date().toISOString() };
  } catch (error) {
    const isTimeout = error instanceof DOMException && error.name === 'TimeoutError';
    return { ok: false, error: { code: isTimeout ? 'timeout' : 'unavailable', message: isTimeout ? 'Weather request timed out.' : 'Weather data is temporarily unavailable.', retryable: true } };
  }
}

export async function geocodeGhana(query: string) {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', query);
  url.searchParams.set('count', '8');
  url.searchParams.set('language', 'en');
  url.searchParams.set('countryCode', 'GH');
  const parsed = geocodeSchema.safeParse(await fetchJson(url));
  if (!parsed.success) throw new Error('Invalid geocoding response');
  return (parsed.data.results ?? []).filter((item) => item.country_code === 'GH').map((item) => ({ id: item.id, name: item.name, region: item.admin1 ?? item.admin2 ?? 'Ghana', latitude: item.latitude, longitude: item.longitude }));
}
