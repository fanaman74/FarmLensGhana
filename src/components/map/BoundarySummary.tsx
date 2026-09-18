import { useEffect, useMemo, useState } from 'react';
import type { WeatherData } from '../../lib/types';
import { fetchWeather } from '../../lib/api/fetchWeather';
import { formatDay, weatherIcon, weatherLabel } from '../weather/weatherUtils';
import type { FarmBoundarySummary } from './FarmMap';

interface Props {
  boundary: FarmBoundarySummary;
  title?: string;
  locationName?: string;
  locationRegion?: string;
  cropName?: string;
  imageryNote?: string;
}

export default function BoundarySummary({ boundary, title = 'Farm boundary ready', locationName, locationRegion, cropName, imageryNote }: Props) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherSource, setWeatherSource] = useState('Open-Meteo');
  const [weatherUpdatedAt, setWeatherUpdatedAt] = useState('');
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState('');
  const [retry, setRetry] = useState(0);
  const { latitude, longitude } = boundary.centroid;
  const vertices = boundary.coordinates.slice(0, -1);
  const extent = useMemo(() => {
    const lats = vertices.map(([, lat]) => lat);
    const lons = vertices.map(([lon]) => lon);
    return { north: Math.max(...lats), south: Math.min(...lats), east: Math.max(...lons), west: Math.min(...lons) };
  }, [vertices]);

  useEffect(() => {
    const controller = new AbortController();
    setWeatherLoading(true);
    setWeatherError('');
    fetchWeather(latitude, longitude, controller.signal)
      .then((result) => { if (!controller.signal.aborted) { setWeather(result.data); setWeatherSource(result.source); setWeatherUpdatedAt(result.fetchedAt); } })
      .catch((error) => { if (!controller.signal.aborted) setWeatherError(error instanceof Error ? error.message : 'Weather unavailable.'); })
      .finally(() => { if (!controller.signal.aborted) setWeatherLoading(false); });
    return () => controller.abort();
  }, [latitude, longitude, retry]);

  const currentHour = weather?.hourly.find((hour) => hour.time >= weather.current.time.slice(0, 13) + ':00');
  const today = weather?.daily[0];
  const weatherDate = weather?.current.time ? new Date(`${weather.current.time}Z`).toLocaleString('en-GH', { timeZone: 'Africa/Accra', dateStyle: 'medium', timeStyle: 'short' }) : '';

  return <section className="boundary-summary panel panel-pad" aria-live="polite">
    <div className="boundary-summary-head">
      <div>
        <p className="eyebrow">Selected area report</p>
        <h2>{title}</h2>
        <p className="panel-subtitle">A detailed snapshot for the boundary you just drew.</p>
      </div>
      <span className="chip"><span className="chip-dot" /> Saved in this browser</span>
    </div>

    <div className="boundary-report-section">
      <h3>Boundary measurements</h3>
      <dl className="boundary-report-list">
        <ReportRow label="Estimated area" value={`${boundary.areaHectares.toFixed(2)} hectares (${(boundary.areaHectares * 2.47105).toFixed(2)} acres)`} />
        <ReportRow label="Approximate perimeter" value={`${boundary.perimeterKm.toFixed(2)} km (${(boundary.perimeterKm * 0.621371).toFixed(2)} mi)`} />
        <ReportRow label="Boundary corners" value={`${boundary.vertexCount} map points`} />
        <ReportRow label="Centre point" value={`${latitude.toFixed(5)}° latitude, ${longitude.toFixed(5)}° longitude`} />
        <ReportRow label="Map extent" value={`N ${extent.north.toFixed(5)}° · S ${extent.south.toFixed(5)}° · E ${extent.east.toFixed(5)}° · W ${extent.west.toFixed(5)}°`} />
      </dl>
      <details className="boundary-coordinates">
        <summary>Show all boundary coordinates</summary>
        <ol>{vertices.map(([lon, lat], index) => <li key={`${lon}-${lat}-${index}`}><span>Corner {index + 1}</span><code>{lat.toFixed(6)}°, {lon.toFixed(6)}°</code></li>)}</ol>
      </details>
    </div>

    <div className="boundary-report-section">
      <h3>Selected place and farm context</h3>
      <dl className="boundary-report-list">
        <ReportRow label="Nearest selected place" value={locationName ?? 'Selected map area'} />
        <ReportRow label="Region" value={locationRegion ?? 'Ghana'} />
        <ReportRow label="Crop context" value={cropName ? `${cropName} guide selected` : 'No crop selected yet'} />
        <ReportRow label="Imagery status" value={imageryNote ?? 'Satellite basemap available; no analysis layer requested yet.'} />
        <ReportRow label="Boundary status" value="Retained locally in this browser; not uploaded automatically" />
      </dl>
    </div>

    <div className="boundary-report-section">
      <div className="boundary-section-heading"><div><h3>Weather and soil at the centre point</h3><p>Modelled conditions for the boundary centre, not field sensors.</p></div><span className="chip">{weatherSource}</span></div>
      {weatherLoading && <p className="meta">Loading a centre-point forecast…</p>}
      {!weatherLoading && weatherError && <div className="boundary-unavailable"><p>{weatherError}</p><button className="btn" onClick={() => setRetry((value) => value + 1)}>Retry weather</button></div>}
      {!weatherLoading && !weatherError && weather && today && <dl className="boundary-report-list">
        <ReportRow label={`Current (${weatherDate})`} value={`${weatherIcon(weather.current.weatherCode)} ${weather.current.temperature.toFixed(1)}°C · ${weatherLabel(weather.current.weatherCode)} · feels like ${weather.current.apparentTemperature.toFixed(1)}°C`} />
        <ReportRow label="Today" value={`${today.minTemperature.toFixed(1)}–${today.maxTemperature.toFixed(1)}°C · rain chance ${today.precipitationProbability}% · ${today.rainfall.toFixed(1)} mm rain · ET₀ ${today.et0.toFixed(1)} mm`} />
        <ReportRow label="Wind and humidity" value={`${weather.current.windSpeed.toFixed(1)} km/h wind · gusts ${weather.current.windGusts.toFixed(1)} km/h · ${weather.current.humidity}% humidity`} />
        <ReportRow label="Root-zone estimate" value={`${currentHour?.soilMoisture == null ? 'Moisture unavailable' : `${(currentHour.soilMoisture * 100).toFixed(1)}% volumetric water content`} · ${currentHour?.soilTemperature == null ? 'soil temperature unavailable' : `${currentHour.soilTemperature.toFixed(1)}°C at 6 cm`}`} />
        <ReportRow label="Forecast grid" value={`${weather.location.latitude.toFixed(3)}°, ${weather.location.longitude.toFixed(3)}° · ${weather.location.timezone}`} />
        <ReportRow label="Seven-day water balance" value={`${weather.daily.slice(0, 7).reduce((sum, day) => sum + day.rainfall, 0).toFixed(1)} mm rain · ${weather.daily.slice(0, 7).reduce((sum, day) => sum + day.et0, 0).toFixed(1)} mm ET₀`} />
        <ReportRow label="Forecast source" value={`${weatherSource} · retrieved ${weatherUpdatedAt ? new Date(weatherUpdatedAt).toLocaleString('en-GH', { timeZone: 'Africa/Accra' }) : 'recently'}`} />
        <ReportRow label="Next outlook day" value={`${formatDay(weather.daily[1]?.date ?? today.date, true)} · ${weather.daily[1]?.rainfall.toFixed(1) ?? today.rainfall.toFixed(1)} mm expected`} />
      </dl>}
      {!weatherLoading && !weatherError && weather && <div className="boundary-forecast-list">{weather.daily.slice(0, 7).map((day, index) => <div className="boundary-forecast-row" key={day.date}><strong>{index === 0 ? 'Today' : formatDay(day.date, true)}</strong><span>{weatherIcon(day.weatherCode)} {weatherLabel(day.weatherCode)} · {day.minTemperature.toFixed(0)}–{day.maxTemperature.toFixed(0)}°C</span><small>{day.precipitationProbability}% rain · {day.rainfall.toFixed(1)} mm · ET₀ {day.et0.toFixed(1)} mm</small></div>)}</div>}
    </div>

    <div className="boundary-report-section">
      <h3>What this boundary is ready for</h3>
      <ul className="boundary-readiness">
        <li><strong>Satellite Explorer</strong><span>Search recent Sentinel-2 catalogue scenes and inspect imagery around this area.</span><a className="btn" href="/satellite">Explore imagery</a></li>
        <li><strong>Weather</strong><span>Review the seven-day outlook and farming notices for the centre point.</span><a className="btn" href="/weather">Check weather</a></li>
        <li><strong>Soil</strong><span>Inspect modelled moisture, soil temperature, rainfall and ET₀.</span><a className="btn" href="/soil">Read soil</a></li>
      </ul>
    </div>

    <div className="boundary-report-section boundary-limitations">
      <h3>Important limitations</h3>
      <ul>
        <li>Area and perimeter are calculated from map clicks and are not a legal or surveyed measurement.</li>
        <li>Weather, soil moisture, soil temperature and evapotranspiration are gridded model estimates; local field conditions can differ.</li>
        <li>A drawn boundary does not identify crop species, ownership, planting date, yield or field condition.</li>
        <li>Analysis layers are only requested when you choose an analysis action; the polygon stays local until then.</li>
      </ul>
    </div>
  </section>;
}

function ReportRow({ label, value }: { label: string; value: string }) {
  return <div className="boundary-report-row"><dt>{label}</dt><dd>{value}</dd></div>;
}