import type { Crop } from '../../data/crops';
import type { DailyForecast } from '../types';

export interface Compatibility {
  score: number;
  label: 'Within reference range' | 'Watch conditions' | 'Outside reference range';
  reasons: string[];
}

export function compareCropWeather(crop: Crop, days: DailyForecast[]): Compatibility {
  if (!days.length) return { score: 0, label: 'Watch conditions', reasons: ['Forecast unavailable.'] };
  const meanMax = days.reduce((sum, day) => sum + day.maxTemperature, 0) / days.length;
  const rain = days.reduce((sum, day) => sum + day.rainfall, 0);
  const weeklyReference = crop.rainfall.map((value) => value / 52) as [number, number];
  let score = 100;
  const reasons: string[] = [];
  if (meanMax < crop.temperature[0] || meanMax > crop.temperature[1]) {
    score -= 45;
    reasons.push(`Mean forecast maximum (${meanMax.toFixed(1)}°C) is outside the broad ${crop.temperature[0]}–${crop.temperature[1]}°C reference range.`);
  } else reasons.push('Forecast temperature sits within the broad reference range.');
  if (rain < weeklyReference[0] * 0.5) {
    score -= 30;
    reasons.push('Forecast rain is low compared with an even weekly share of annual water needs.');
  } else if (rain > weeklyReference[1] * 2) {
    score -= 20;
    reasons.push('Heavy rain could increase waterlogging or disease risk.');
  } else reasons.push('Forecast rain is not an obvious mismatch, but crop stage and soil storage matter.');
  return { score, label: score >= 75 ? 'Within reference range' : score >= 45 ? 'Watch conditions' : 'Outside reference range', reasons };
}
