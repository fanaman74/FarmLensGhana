import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCitySnapshots, parseCitySnapshots } from '../src/lib/api/openMeteo';
import { ghanaBounds, ghanaCities } from '../src/data/ghanaCities';

const location = (temperature: number, rain: (number | null)[] = [1.2, 0, 4, 0, 0, 2, 0.5]) => ({
  latitude: 6.7, longitude: -1.6,
  current: { time: '2026-10-07T12:00', temperature_2m: temperature, relative_humidity_2m: 78, weather_code: 61, wind_speed_10m: 9.4, soil_moisture_3_to_9cm: 0.31 },
  daily: { time: rain.map((_, i) => `2026-10-0${i + 1}`), temperature_2m_max: rain.map(() => 31), temperature_2m_min: rain.map(() => 22), precipitation_probability_max: rain.map(() => 60), precipitation_sum: rain, et0_fao_evapotranspiration: rain.map(() => 3.8) },
});

afterEach(() => vi.unstubAllGlobals());

describe('city snapshots', () => {
  it('covers all sixteen regions with coordinates inside Ghana', () => {
    expect(new Set(ghanaCities.map((city) => city.region)).size).toBe(16);
    expect(new Set(ghanaCities.map((city) => city.id)).size).toBe(ghanaCities.length);
    const [[west, south], [east, north]] = ghanaBounds;
    for (const city of ghanaCities) {
      expect(city.latitude).toBeGreaterThanOrEqual(south); expect(city.latitude).toBeLessThanOrEqual(north);
      expect(city.longitude).toBeGreaterThanOrEqual(west); expect(city.longitude).toBeLessThanOrEqual(east);
    }
  });

  it('maps a multi-location response back to city ids in order', () => {
    const [a, b] = parseCitySnapshots(['accra', 'tamale'], [location(29), location(33)]);
    expect(a).toMatchObject({ id: 'accra', temperature: 29, rainToday: 1.2, rainChance: 60, soilMoisture: 0.31, et0: 3.8 });
    expect(a.rainWeek).toBeCloseTo(7.7);
    expect(b.id).toBe('tamale');
  });

  it('accepts the single-object shape and never invents a weekly rain total', () => {
    const [only] = parseCitySnapshots(['wa'], location(30, [2, null, 0, 0, 0, 0, 0]));
    expect(only.rainWeek).toBeNull();
    expect(only.rainToday).toBe(2);
  });

  it('rejects a response that does not line up with the requested cities', () => {
    expect(() => parseCitySnapshots(['accra', 'tamale'], [location(29)])).toThrow();
  });

  it('requests every city in one call and reports incomplete data', async () => {
    const mock = vi.fn().mockResolvedValue(Response.json([{ latitude: 1 }]));
    vi.stubGlobal('fetch', mock);
    const result = await getCitySnapshots([{ id: 'x-test', latitude: 9.9, longitude: -0.9 }]);
    expect(result.ok).toBe(false);
    const url = new URL(mock.mock.calls[0][0]);
    expect(url.searchParams.get('latitude')).toBe('9.9');
  });
});
