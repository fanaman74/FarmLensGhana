import { useMemo } from 'react';
import { CloudRain, Droplets, ThermometerSun } from 'lucide-react';
import { agronomyVerified, type Crop } from '../../data/crops';
import { compareCropWeather } from '../../lib/agriculture/cropSuitability';
import LocationSearch, { type Place } from '../dashboard/LocationSearch';
import { useWeather } from '../weather/useWeather';

export default function CropWeatherCard({ crop }: { crop: Crop }) {
  const state = useWeather({ name: 'Kumasi', region: 'Ashanti', latitude: 6.6885, longitude: -1.6244 });
  const match = useMemo(() => agronomyVerified ? compareCropWeather(crop, state.weather?.daily ?? []) : { score: 0, label: 'Crop requirements awaiting verification', reasons: ['Weather is available, but compatibility scoring is disabled until crop ranges and rainfall reference periods are verified.'] }, [crop, state.weather]);
  const rain = state.weather?.daily.reduce((sum, day) => sum + day.rainfall, 0) ?? 0;
  return <section className="panel panel-pad crop-weather">
    <div className="section-heading"><div><p className="eyebrow">Near {state.location.name}</p><h2>Local weather context</h2><p>Compatibility assessment awaits verified crop references.</p></div></div>
    <LocationSearch compact onSelect={(place: Place) => state.setLocation(place)}/>
    {state.loading && <div className="skeleton sk-row"/>}
    {state.error && <div className="error-state"><b>Forecast unavailable</b><p>{state.error}</p></div>}
    {state.weather && <><div className="compat-label" data-score={match.score >= 75 ? 'good' : 'watch'}>{match.label}</div><div className="compat-stats"><span><ThermometerSun/><b>{state.weather.daily[0].minTemperature.toFixed(0)}–{state.weather.daily[0].maxTemperature.toFixed(0)}°C</b><small>today</small></span><span><CloudRain/><b>{rain.toFixed(1)} mm</b><small>7-day forecast</small></span><span><Droplets/><b>{state.weather.daily.reduce((s,d)=>s+d.et0,0).toFixed(1)} mm</b><small>7-day ET₀</small></span></div><ul className="reason-list">{match.reasons.map((reason)=><li key={reason}>{reason}</li>)}</ul><p className="meta">This is not a guaranteed suitability assessment. Variety, crop stage, soil, pests and field management are not fully represented.</p></>}
  </section>;
}
