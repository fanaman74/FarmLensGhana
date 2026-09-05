import { CloudRain, Droplets, Gauge, Wind } from 'lucide-react';
import LocationSearch, { type Place } from '../dashboard/LocationSearch';
import { buildAdvisories } from '../../lib/agriculture/advisoryRules';
import { useWeather } from './useWeather';
import { formatDay, weatherIcon, weatherLabel } from './weatherUtils';

const initial = { name: 'Kumasi', region: 'Ashanti', latitude: 6.6885, longitude: -1.6244 };

export default function WeatherWorkspace() {
  const state = useWeather(initial);
  const current = state.weather?.current;
  const today = state.weather?.daily[0];
  const advisories = buildAdvisories(state.weather?.daily ?? []);
  const todayHours = state.weather?.hourly.filter((hour) => hour.time >= state.weather!.current.time.slice(0,13) + ':00').slice(0, 24) ?? [];
  const maxRain = Math.max(0, ...todayHours.map((hour) => hour.rainfall ?? 0));

  const useLocation = () => navigator.geolocation?.getCurrentPosition((p) => state.setLocation({ name: 'Your location', region: `${p.coords.latitude.toFixed(3)}, ${p.coords.longitude.toFixed(3)}`, latitude: p.coords.latitude, longitude: p.coords.longitude }));
  return <div>
    <div className="weather-toolbar panel panel-pad"><LocationSearch onSelect={(place: Place) => state.setLocation(place)} /><button className="btn" onClick={useLocation}>Use my location</button></div>
    {state.loading && <div className="panel panel-pad content-loading"><div className="skeleton sk-lg"/><div className="skeleton sk-row"/></div>}
    {state.error && <div className="panel panel-pad error-state"><b>Forecast unavailable</b><p>{state.error}</p></div>}
    {current && today && <>
      <section className="weather-hero panel panel-pad">
        <div className="weather-place"><span className="weather-glyph">{weatherIcon(current.weatherCode)}</span><div><p className="eyebrow">Now in {state.location.name}</p><h2>{Math.round(current.temperature)}°C</h2><p>{weatherLabel(current.weatherCode)} · Feels like {Math.round(current.apparentTemperature)}°</p></div></div>
        <div className="stat-grid">
          <Stat icon={<CloudRain/>} label="Rain chance" value={`${today.precipitationProbability}%`} note="Daily maximum probability" />
          <Stat icon={<Droplets/>} label="Expected rain" value={`${today.rainfall.toFixed(1)} mm`} note="Forecast total today" />
          <Stat icon={<Gauge/>} label="Humidity" value={`${current.humidity}%`} note="Relative humidity at 2 m" />
          <Stat icon={<Wind/>} label="Wind / gust" value={`${current.windSpeed.toFixed(0)} / ${current.windGusts.toFixed(0)}`} note="km/h at 10 m" />
        </div>
      </section>
      <div className="weather-layout">
        <section className="panel panel-pad">
          <div className="section-heading"><div><h2>Seven-day outlook</h2><p>Forecasts indicate possibilities, not certainty.</p></div></div>
          <div className="daily-table">
            {state.weather?.daily.map((day, index) => <div className="daily-row" key={day.date}><strong>{index === 0 ? 'Today' : formatDay(day.date, true)}</strong><span className="daily-condition"><b>{weatherIcon(day.weatherCode)}</b>{weatherLabel(day.weatherCode)}</span><span><CloudRain size={14}/>{day.precipitationProbability}% · {day.rainfall.toFixed(1)} mm</span><span>{Math.round(day.maxTemperature)}° <i>{Math.round(day.minTemperature)}°</i></span></div>)}
          </div>
        </section>
        <section className="panel panel-pad">
          <div className="section-heading"><div><h2>Farming notices</h2><p>Each notice exposes its threshold.</p></div></div>
          <div className="notice-stack">{advisories.map((notice) => <article className={`notice ${notice.level}`} key={notice.id}><span className="notice-icon">{notice.level === 'positive' ? '✓' : '!'}</span><div><h4>{notice.title}</h4><p>{notice.message}</p><span className="rule">{notice.rule}</span></div></article>)}</div>
        </section>
      </div>
      <section className="panel panel-pad hourly-panel">
        <div className="section-heading"><div><h2>Hourly rainfall</h2><p>Rain amount and probability over the next 24 hours.</p></div><span className="chip"><Droplets size={13}/> mm per hour</span></div>
        <div className="rain-chart" role="img" aria-label={`Hourly rain chart. Peak forecast ${maxRain.toFixed(1)} millimetres.`}>
          {todayHours.map((hour, index) => <div className="rain-col" key={hour.time}><span className="rain-prob">{hour.precipitationProbability == null ? '—' : `${hour.precipitationProbability}%`}</span><div className="rain-bar" style={{ height: `${Math.max(2, ((hour.rainfall ?? 0) / (maxRain || 1)) * 100)}%` }}></div><small>{index % 3 === 0 ? new Date(hour.time + 'Z').toLocaleTimeString('en-GH', { hour: 'numeric', timeZone: 'Africa/Accra' }) : ''}</small></div>)}
        </div>
        <p className="chart-summary">Peak hourly rainfall is {maxRain.toFixed(1)} mm. Check the probability labels before planning time-sensitive work.</p>
      </section>
      <section className="source-bar source-panel"><span><strong>Provider:</strong> {state.source}</span><span><strong>Observation:</strong> {current.time} GMT</span><span><strong>Updated:</strong> {new Date(state.updatedAt).toLocaleString('en-GH', { timeZone: 'Africa/Accra' })}</span><span><strong>Model note:</strong> Grid forecast; local field conditions can differ.</span></section>
    </>}
  </div>;
}

function Stat({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string; note: string }) { return <div className="stat"><span className="stat-label">{icon}{label}</span><div className="stat-value">{value}</div><div className="stat-note">{note}</div></div>; }
