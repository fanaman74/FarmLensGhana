import type { DailyForecast } from '../types';

export interface Advisory {
  id: string;
  level: 'positive' | 'watch' | 'warning';
  title: string;
  message: string;
  rule: string;
}

export function buildAdvisories(days: DailyForecast[]): Advisory[] {
  if (!days.length) return [];
  const nextThree = days.slice(0, 3);
  const rain = nextThree.reduce((total, day) => total + day.rainfall, 0);
  const maxRainChance = Math.max(...nextThree.map((day) => day.precipitationProbability));
  const maxTemperature = Math.max(...nextThree.map((day) => day.maxTemperature));
  const maxWind = Math.max(...nextThree.map((day) => day.windSpeed));
  const notices: Advisory[] = [];

  if (rain >= 12 && rain <= 55 && maxRainChance >= 55) {
    notices.push({ id: 'planting-window', level: 'positive', title: 'Possible planting window', message: 'Rain is forecast across the next three days. Check field moisture before planting.', rule: `Shown when 3-day rain is 12–55 mm and peak rain probability is at least 55%. Current: ${rain.toFixed(1)} mm, ${maxRainChance}%.` });
  }
  if (maxTemperature >= 34) {
    notices.push({ id: 'heat', level: 'warning', title: 'Heat-stress risk', message: 'High daytime temperatures may stress young plants, livestock and field workers.', rule: `Shown when a 3-day maximum reaches 34°C. Current peak: ${maxTemperature.toFixed(1)}°C.` });
  }
  if (maxRainChance >= 65 || maxWind >= 25) {
    notices.push({ id: 'spray', level: 'watch', title: 'Review spraying time', message: 'Rain or wind could reduce spray effectiveness. Use the hourly view and follow the product label.', rule: `Shown when rain probability reaches 65% or wind reaches 25 km/h. Current: ${maxRainChance}%, ${maxWind.toFixed(1)} km/h.` });
  }
  if (!notices.length) {
    notices.push({ id: 'monitor', level: 'watch', title: 'Keep checking conditions', message: 'No threshold-based notice is active. Forecasts can change; inspect your field before acting.', rule: 'Fallback shown when no planting, heat or spray threshold is met.' });
  }
  return notices;
}
