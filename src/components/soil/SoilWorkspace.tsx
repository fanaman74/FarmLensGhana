import { Activity, Droplets, FlaskConical, Layers3, ThermometerSun } from 'lucide-react';
import FarmMap from '../map/FarmMap';
import LocationSearch, { type Place } from '../dashboard/LocationSearch';
import { useWeather } from '../weather/useWeather';
import MonthlyOutlook from './MonthlyOutlook';

const initial = { name: 'Kumasi', region: 'Ashanti', latitude: 6.6885, longitude: -1.6244 };

export default function SoilWorkspace() {
  const state = useWeather(initial);
  const currentHour = state.weather?.hourly.find((hour) => hour.time >= state.weather!.current.time.slice(0,13) + ':00');
  const rain7 = state.weather?.daily.reduce((sum, day) => sum + day.rainfall, 0) ?? 0;
  const et7 = state.weather?.daily.reduce((sum, day) => sum + day.et0, 0) ?? 0;
  const moisture = currentHour?.soilMoisture;
  const soilTemperature = currentHour?.soilTemperature;
  const values = (state.weather?.hourly.slice(0, 168).filter((_, index) => index % 6 === 0).map((hour) => hour.soilMoisture).filter((n): n is number => n !== null)) ?? [];
  const min = Math.min(...values, .1), max = Math.max(...values, .4);

  return <div className="soil-workspace">
    <div className="weather-toolbar panel panel-pad"><LocationSearch onSelect={(place: Place) => state.setLocation(place)} /><span className="chip"><span className="chip-dot"/> Model estimate</span></div>
    <div className="soil-grid">
      <section className="soil-map panel"><FarmMap latitude={state.location.latitude} longitude={state.location.longitude} drawing onLocation={(latitude, longitude) => state.setLocation({ name: 'Selected field', region: `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`, latitude, longitude })} /></section>
      <section className="panel panel-pad soil-insights">
        <div className="section-heading"><div><p className="eyebrow">Near {state.location.name}</p><h2>Root-zone snapshot</h2><p>Modelled conditions—not field sensors.</p></div></div>
        {state.loading && <div className="skeleton sk-lg"/>}
        {state.error && <div className="error-state"><b>Soil estimates unavailable</b><p>{state.error}</p></div>}
        {state.weather && <>
          <div className="soil-primary"><Droplets/><span><small>Moisture · 3–9 cm</small><strong>{moisture == null ? 'Unavailable' : `${(moisture * 100).toFixed(1)}%`}</strong><em>volumetric water content</em></span></div>
          <div className="stat-grid soil-stats">
            <SoilStat icon={<ThermometerSun/>} label="Soil temp · 6 cm" value={soilTemperature == null ? '—' : `${soilTemperature.toFixed(1)}°C`} />
            <SoilStat icon={<Droplets/>} label="Rain · 7 days" value={`${rain7.toFixed(1)} mm`} />
            <SoilStat icon={<Activity/>} label="ET₀ · 7 days" value={`${et7.toFixed(1)} mm`} />
            <SoilStat icon={<Layers3/>} label="Depth" value="3–9 cm" />
          </div>
          <div className="section-heading trend-head"><div><h3>Seven-day moisture trend</h3><p>Six-hour intervals from the forecast model.</p></div></div>
          <div className="line-chart" role="img" aria-label={`Modelled soil moisture ranges from ${(min*100).toFixed(1)} to ${(max*100).toFixed(1)} percent.`}>
            <svg viewBox="0 0 600 180" preserveAspectRatio="none"><defs><linearGradient id="soilArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8ee9d2" stopOpacity=".45"/><stop offset="1" stopColor="#8ee9d2" stopOpacity="0"/></linearGradient></defs>{values.length > 1 && <><path d={`${path(values, min, max)} L600,180 L0,180 Z`} fill="url(#soilArea)"/><path d={path(values, min, max)} fill="none" stroke="#a8f0d8" strokeWidth="3" vectorEffect="non-scaling-stroke"/></>}</svg>
            <div><span>{(max*100).toFixed(0)}%</span><span>{(min*100).toFixed(0)}%</span></div>
          </div>
          <div className="interpretation"><FlaskConical/><div><strong>{interpretMoisture(moisture)}</strong><p>Texture, crop rooting depth and recent irrigation can change what this means in your field. Confirm by inspection.</p></div></div>
        </>}
      </section>
    </div>
    <MonthlyOutlook location={state.location} />
    <section className="soil-bottom">
      <div className="panel panel-pad unavailable-card"><div className="ndmi-orb">NDMI</div><div><h3>Vegetation water-stress layer</h3><p>Use Google Earth Engine to calculate cloud-masked NDMI for a drawn field. No index is being inferred from weather data.</p><a className="btn" href="/settings#integrations">Configure Earth Engine</a></div></div>
      <div className="panel panel-pad disclaimer-card"><FlaskConical/><div><h3>Use field evidence too</h3><p>These are weather-model estimates for an area, not direct sensor readings or laboratory results. Check soil by hand, inspect roots and drainage, and use laboratory testing for nutrient or pH decisions.</p></div></div>
    </section>
    {state.weather && <div className="source-bar source-panel"><span><strong>Provider:</strong> Open-Meteo</span><span><strong>Model values:</strong> soil moisture, soil temperature, ET₀</span><span><strong>Updated:</strong> {new Date(state.updatedAt).toLocaleString('en-GH', { timeZone: 'Africa/Accra' })}</span></div>}
  </div>;
}

function path(values: number[], min: number, max: number) { const range = max-min || 1; return values.map((value,index) => `${index ? 'L' : 'M'}${(index/(values.length-1))*600},${160-((value-min)/range)*130}`).join(' '); }
function interpretMoisture(value?: number | null) { if (value == null) return 'Not enough data to interpret'; if (value < .15) return 'Surface-root zone may be relatively dry'; if (value > .4) return 'Surface-root zone may be relatively wet'; return 'Moderate modelled moisture'; }
function SoilStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="stat"><span className="stat-label">{icon}{label}</span><div className="stat-value">{value}</div></div>; }
