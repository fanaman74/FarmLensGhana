import { describe, expect, it } from 'vitest';
import { kelvinToCelsius, ndmi, ndvi } from '../src/lib/agriculture/indices';
import { buildAdvisories } from '../src/lib/agriculture/advisoryRules';
import type { DailyForecast } from '../src/lib/types';

const day = (overrides: Partial<DailyForecast> = {}): DailyForecast => ({ date: '2026-09-04', weatherCode: 3, maxTemperature: 30, minTemperature: 22, precipitationProbability: 40, rainfall: 2, et0: 3, windSpeed: 8, windGusts: 12, ...overrides });

describe('agricultural calculations', () => {
  it('converts Kelvin soil values to Celsius', () => expect(kelvinToCelsius(300)).toBe(26.85));
  it('calculates NDVI and NDMI using normalized differences', () => { expect(ndvi(.8,.2)).toBeCloseTo(.6); expect(ndmi(.7,.3)).toBeCloseTo(.4); });
  it('returns null for an invalid zero denominator', () => expect(ndvi(0,0)).toBeNull());
  it('makes heat and spray advice traceable to thresholds', () => { const notices = buildAdvisories([day({maxTemperature:35, precipitationProbability:70}), day(), day()]); expect(notices.map((n)=>n.id)).toContain('heat'); expect(notices.map((n)=>n.id)).toContain('spray'); expect(notices.every((n)=>n.rule.length>10)).toBe(true); });
});
