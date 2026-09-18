import { ArrowRight, CloudRain, Droplets, Gauge, Leaf, Navigation, Wind } from 'lucide-react';
import FarmMap from '../map/FarmMap';
import { useWeather } from '../weather/useWeather';
import { weatherIcon, weatherLabel, formatDay } from '../weather/weatherUtils';
import { buildAdvisories } from '../../lib/agriculture/advisoryRules';

const initial = { name: 'Kumasi', region: 'Ashanti', latitude: 6.6885, longitude: -1.6244 };

export default function HomeDashboard() {
  const { location, setLocation, weather, source, updatedAt, loading, error, retry } = useWeather(initial);
  const current = weather?.current;
  const today = weather?.daily[0];
  const notices = buildAdvisories(weather?.daily ?? []);

  return <div className="dashboard-shell">
    <section className="map-stage panel">
      <FarmMap latitude={location.latitude} longitude={location.longitude} onLocation={(latitude, longitude) => setLocation({ name: 'Selected field', region: `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`, latitude, longitude })} />
      <div className="map-overlay intro-card">
        <div className="eyebrow">Field intelligence for Ghana</div>
        <h1>See what your land<br />is telling you.</h1>
        <p>Local forecasts, modelled soil conditions and satellite context—together in one calm view.</p>
      </div>
      <div className="map-overlay map-location"><Navigation size={14} /><span>{location.name}<small>{location.region}</small></span></div>
    </section>

    <aside className="dashboard-side panel panel-pad" aria-live="polite">
      <div className="side-top">
        <div><p className="eyebrow">Today near</p><h2>{location.name}</h2><p>{location.region}</p></div>
        <a className="circle-link" href="/weather" aria-label="Open full weather"><ArrowRight size={19} /></a>
      </div>
      {loading && <LoadingWeather />}
      {error && <div className="error-state"><span>Weather signal interrupted</span><p>{error}</p><button className="btn" onClick={retry}>Try again</button></div>}
      {!loading && current && today && <>
        <div className="current-weather">
          <span className="weather-glyph" role="img" aria-label={weatherLabel(current.weatherCode)}>{weatherIcon(current.weatherCode)}</span>
          <div><strong>{Math.round(current.temperature)}°</strong><span>{weatherLabel(current.weatherCode)}</span></div>
          <div className="high-low"><span>H {Math.round(today.maxTemperature)}°</span><span>L {Math.round(today.minTemperature)}°</span></div>
        </div>
        <div className="weather-metrics">
          <Metric icon={<CloudRain />} label="Rain chance" value={`${today.precipitationProbability}%`} />
          <Metric icon={<Droplets />} label="Expected rain" value={`${today.rainfall.toFixed(1)} mm`} />
          <Metric icon={<Wind />} label="Wind" value={`${current.windSpeed.toFixed(0)} km/h`} />
          <Metric icon={<Gauge />} label="Humidity" value={`${current.humidity}%`} />
        </div>
        <div className="mini-forecast">
          {weather.daily.slice(1, 6).map((day) => <div key={day.date}><span>{formatDay(day.date)}</span><b>{weatherIcon(day.weatherCode)}</b><small>{Math.round(day.maxTemperature)}° <i>{Math.round(day.minTemperature)}°</i></small></div>)}
        </div>
        <div className="divider" />
        <div className="section-heading compact-heading"><div><h3>Field notes</h3><p>Rules based on the visible forecast</p></div><Leaf size={18} /></div>
        <div className="notice-stack">
          {notices.slice(0, 2).map((notice) => <article className={`notice ${notice.level}`} key={notice.id}><span className="notice-icon">{notice.level === 'positive' ? '✓' : '!'}</span><div><h4>{notice.title}</h4><p>{notice.message}</p><details><summary>Why am I seeing this?</summary><span className="rule">{notice.rule}</span></details></div></article>)}
        </div>
      </>}
      <div className="source-bar side-source"><span><strong>Source</strong> {source}</span><span><strong>Updated</strong> {updatedAt ? new Intl.DateTimeFormat('en-GH', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Accra' }).format(new Date(updatedAt)) : '—'}</span></div>
    </aside>
  </div>;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div><span>{icon}{label}</span><strong>{value}</strong></div>;
}

function LoadingWeather() {
  return <div className="loading-weather" aria-label="Loading weather"><div className="skeleton sk-lg"/><div className="weather-metrics">{[1,2,3,4].map((n) => <div className="skeleton sk-card" key={n}/>)}</div><div className="skeleton sk-row"/></div>;
}
