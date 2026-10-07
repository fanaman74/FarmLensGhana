import { useEffect, useMemo, useState } from 'react';
import type { WeatherData } from '../../lib/types';
import type { FarmReport, ReportSection } from '../../lib/api/farmReport';
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
  const [report, setReport] = useState<FarmReport | null>(null);
  const [reportLoading, setReportLoading] = useState(true);
  const [reportError, setReportError] = useState('');
  const [reportRetry, setReportRetry] = useState(0);
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

  useEffect(() => {
    const controller = new AbortController();
    setReport(null); setReportLoading(true); setReportError('');
    fetch('/api/farm/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'Polygon', coordinates: [boundary.coordinates] }), signal: controller.signal })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.fetchedAt) throw new Error(typeof data?.error === 'string' ? data.error : 'Farm data is unavailable right now.');
        if (!controller.signal.aborted) setReport(data as FarmReport);
      })
      .catch((error) => { if (!controller.signal.aborted) setReportError(error instanceof Error ? error.message : 'Farm data is unavailable right now.'); })
      .finally(() => { if (!controller.signal.aborted) setReportLoading(false); });
    return () => controller.abort();
  }, [boundary.coordinates, reportRetry]);

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
      <span className="chip"><span className="chip-dot" /> {reportLoading ? 'Gathering farm data…' : report ? 'Farm data loaded' : 'Farm data unavailable'}</span>
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
        {report?.place.ok ? <>
          <ReportRow label="Community" value={report.place.data.community ?? 'No named community mapped nearby'} />
          <ReportRow label="District" value={report.place.data.district ?? 'Not recorded in OpenStreetMap'} />
          <ReportRow label="Region" value={report.place.data.region ?? locationRegion ?? 'Ghana'} />
          <ReportRow label="Mapped address" value={report.place.data.displayName} />
        </> : <>
          <ReportRow label="Nearest selected place" value={locationName ?? 'Selected map area'} />
          <ReportRow label="Region" value={locationRegion ?? 'Ghana'} />
          {report && !report.place.ok && <ReportRow label="Place lookup" value={report.place.error} />}
        </>}
        <ReportRow label="Crop context" value={cropName ? `${cropName} guide selected` : 'No crop selected yet'} />
        <ReportRow label="Imagery status" value={imageryNote ?? 'Satellite basemap available; no analysis layer requested yet.'} />
        <ReportRow label="Boundary status" value="Kept on this page only; it is not saved to an account" />
      </dl>
    </div>

    {reportLoading && <div className="boundary-report-section"><p className="meta" role="status">Gathering terrain, soil, land cover, climate and imagery data for this boundary…</p></div>}
    {!reportLoading && reportError && <div className="boundary-report-section boundary-unavailable"><p>{reportError}</p><button className="btn" onClick={() => setReportRetry((value) => value + 1)}>Retry farm data</button></div>}
    {report && <FarmDataSections report={report} areaHectares={boundary.areaHectares} />}

    <div className="boundary-report-section">
      <div className="boundary-section-heading"><div><h3>Weather and soil at the centre point</h3><p>Modelled conditions for the boundary centre, not field sensors.</p></div><span className="chip">{weatherSource}</span></div>
      {weatherLoading && <p className="meta">Loading a centre-point forecast…</p>}
      {!weatherLoading && weatherError && <div className="boundary-unavailable"><p>{weatherError}</p><button className="btn" onClick={() => setRetry((value) => value + 1)}>Retry weather</button></div>}
      {!weatherLoading && !weatherError && weather && today && <dl className="boundary-report-list">
        <ReportRow label={`Current (${weatherDate})`} value={`${weatherIcon(weather.current.weatherCode)} ${weather.current.temperature.toFixed(1)}°C · ${weatherLabel(weather.current.weatherCode)} · feels like ${weather.current.apparentTemperature.toFixed(1)}°C`} />
        <ReportRow label="Today" value={`${today.minTemperature.toFixed(1)}–${today.maxTemperature.toFixed(1)}°C · rain chance ${today.precipitationProbability}% · ${today.rainfall.toFixed(1)} mm rain · ET₀ ${today.et0.toFixed(1)} mm`} />
        <ReportRow label="Wind and humidity" value={`${weather.current.windSpeed.toFixed(1)} km/h wind · gusts ${weather.current.windGusts.toFixed(1)} km/h · ${weather.current.humidity}% humidity`} />
        <ReportRow label="Soil moisture (model)" value={[['3–9 cm', currentHour?.soilMoisture], ['9–27 cm', currentHour?.soilMoistureMid], ['27–81 cm', currentHour?.soilMoistureDeep]].map(([depth, value]) => `${depth}: ${value == null ? 'unavailable' : `${((value as number) * 100).toFixed(1)}%`}`).join(' · ') + ' volumetric water content'} />
        <ReportRow label="Soil temperature (model)" value={`${currentHour?.soilTemperature == null ? 'unavailable' : `${currentHour.soilTemperature.toFixed(1)}°C`} at 6 cm · ${currentHour?.soilTemperatureDeep == null ? 'unavailable' : `${currentHour.soilTemperatureDeep.toFixed(1)}°C`} at 18 cm`} />
        <ReportRow label="Forecast grid" value={`${weather.location.latitude.toFixed(3)}°, ${weather.location.longitude.toFixed(3)}° · ${weather.location.timezone}`} />
        <ReportRow label="Seven-day water balance" value={`${weather.daily.slice(0, 7).reduce((sum, day) => sum + day.rainfall, 0).toFixed(1)} mm rain · ${weather.daily.slice(0, 7).reduce((sum, day) => sum + day.et0, 0).toFixed(1)} mm ET₀`} />
        <ReportRow label="Forecast source" value={`${weatherSource} · retrieved ${weatherUpdatedAt ? new Date(weatherUpdatedAt).toLocaleString('en-GH', { timeZone: 'Africa/Accra' }) : 'recently'}`} />
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
        <li>When you finish a boundary, its corners are sent to Esri (land cover) and Earth Search (imagery), and its centre point to OpenStreetMap, Open-Meteo, ISRIC and NASA POWER. Nothing is stored by FarmLens.</li>
        <li>Soil properties and land cover are model predictions from satellite and survey data. Use a laboratory soil test before buying lime or fertiliser.</li>
      </ul>
    </div>
  </section>;
}

function ReportRow({ label, value }: { label: string; value: string }) {
  return <div className="boundary-report-row"><dt>{label}</dt><dd>{value}</dd></div>;
}

function SourceChip({ section }: { section: ReportSection<unknown> }) {
  return <span className="chip" title={section.ok ? section.resolution : undefined}>{section.source}</span>;
}

function Unavailable({ section }: { section: ReportSection<unknown> }) {
  return section.ok ? null : <p className="meta">{section.error}</p>;
}

const format = (value: number | null | undefined, digits = 1, unit = '') => value == null ? '—' : `${value.toFixed(digits)}${unit}`;

function FarmDataSections({ report, areaHectares }: { report: FarmReport; areaHectares: number }) {
  const { elevation, landCover, soil, climate, scenes } = report;
  const maxRain = climate.ok ? Math.max(1, ...climate.data.months.map((month) => month.rainfallMm ?? 0)) : 1;
  const date = (value: string) => new Date(value).toLocaleDateString('en-GH', { timeZone: 'Africa/Accra', dateStyle: 'medium' });
  return <>
    <div className="boundary-report-section">
      <div className="boundary-section-heading"><div><h3>Land cover inside the boundary</h3><p>Share of 10 m satellite pixels in each class{landCover.ok ? `, ${landCover.data.year} map` : ''}.</p></div><SourceChip section={landCover} /></div>
      <Unavailable section={landCover} />
      {landCover.ok && <>
        <dl className="boundary-report-list">
          <ReportRow label="Cropland" value={`${landCover.data.croplandPercent.toFixed(1)}% of the boundary (about ${(areaHectares * landCover.data.croplandPercent / 100).toFixed(2)} ha)${landCover.data.baseline ? ` · ${landCover.data.baseline.croplandPercent.toFixed(1)}% in ${landCover.data.baseline.year}` : ''}`} />
        </dl>
        <div className="farm-bars">{landCover.data.classes.map((item) => <div className="farm-bar-row" key={item.code}><span>{item.name}</span><span className="farm-bar"><i style={{ width: `${item.percent}%` }} /></span><b>{item.percent.toFixed(1)}%</b></div>)}</div>
      </>}
    </div>

    <div className="boundary-report-section">
      <div className="boundary-section-heading"><div><h3>Soil properties</h3><p>Modelled topsoil (0–30 cm) at the farm centre, not a laboratory test.</p></div><SourceChip section={soil} /></div>
      <Unavailable section={soil} />
      {soil.ok && <>
        <dl className="boundary-report-list">
          <ReportRow label="Texture" value={`${soil.data.textureClass ?? 'Unknown'} · sand ${format(soil.data.properties.sand.topsoil, 0, '%')}, silt ${format(soil.data.properties.silt.topsoil, 0, '%')}, clay ${format(soil.data.properties.clay.topsoil, 0, '%')}`} />
          <ReportRow label="pH (water)" value={`${format(soil.data.properties.phh2o.topsoil, 1)}${soil.data.phClass ? ` · ${soil.data.phClass}` : ''}`} />
          <ReportRow label="Organic carbon" value={format(soil.data.properties.soc.topsoil, 1, ' g/kg')} />
          <ReportRow label="Total nitrogen" value={format(soil.data.properties.nitrogen.topsoil, 2, ' g/kg')} />
          <ReportRow label="Cation exchange capacity" value={format(soil.data.properties.cec.topsoil, 1, ' cmol(c)/kg')} />
          <ReportRow label="Bulk density" value={format(soil.data.properties.bdod.topsoil, 2, ' g/cm³')} />
        </dl>
        <details className="boundary-coordinates">
          <summary>Show values by depth</summary>
          <table className="farm-table"><thead><tr><th>Property</th>{soil.data.properties.phh2o.byDepth.map((item) => <th key={item.depth}>{item.depth}</th>)}</tr></thead>
            <tbody>{Object.entries(soil.data.properties).map(([key, property]) => <tr key={key}><td>{property.label}{property.unit ? ` (${property.unit})` : ''}</td>{property.byDepth.map((item) => <td key={item.depth}>{format(item.value, key === 'nitrogen' || key === 'bdod' ? 2 : 1)}</td>)}</tr>)}</tbody>
          </table>
        </details>
      </>}
    </div>

    <div className="boundary-report-section">
      <div className="boundary-section-heading"><div><h3>Terrain</h3><p>Elevation sampled at the centre, corners and inside the boundary.</p></div><SourceChip section={elevation} /></div>
      <Unavailable section={elevation} />
      {elevation.ok && <dl className="boundary-report-list">
        <ReportRow label="Elevation at centre" value={`${elevation.data.centre} m above sea level`} />
        <ReportRow label="Range across the farm" value={`${elevation.data.min}–${elevation.data.max} m (${elevation.data.max - elevation.data.min} m difference, ${elevation.data.samples} samples)`} />
      </dl>}
    </div>

    <div className="boundary-report-section">
      <div className="boundary-section-heading"><div><h3>Long-term climate</h3><p>Average year{climate.ok && climate.data.period ? ` over ${climate.data.period}` : ''} for the farm's area.</p></div><SourceChip section={climate} /></div>
      <Unavailable section={climate} />
      {climate.ok && <>
        <dl className="boundary-report-list">
          <ReportRow label="Average annual rainfall" value={climate.data.annualRainfallMm == null ? '—' : `${climate.data.annualRainfallMm.toLocaleString('en-GH')} mm`} />
          <ReportRow label="Wettest month" value={`${climate.data.wettestMonth ?? '—'} · ${climate.data.monthsOver100mm} month${climate.data.monthsOver100mm === 1 ? '' : 's'} average 100 mm or more`} />
        </dl>
        <div className="farm-climate" role="img" aria-label={`Average monthly rainfall: ${climate.data.months.map((month) => `${month.month} ${month.rainfallMm ?? 'unknown'} mm`).join(', ')}`}>
          {climate.data.months.map((month) => <div key={month.month} title={`${month.month}: ${month.rainfallMm ?? '—'} mm rain · ${format(month.minTemperature, 0)}–${format(month.maxTemperature, 0)}°C · ${format(month.humidity, 0)}% humidity`}><i style={{ height: `${((month.rainfallMm ?? 0) / maxRain) * 100}%` }} /><small>{month.month[0]}</small></div>)}
        </div>
        <details className="boundary-coordinates">
          <summary>Show monthly averages</summary>
          <table className="farm-table"><thead><tr><th>Month</th><th>Rain (mm)</th><th>Min–max °C</th><th>Humidity</th><th>Sunlight (kWh/m²/day)</th></tr></thead>
            <tbody>{climate.data.months.map((month) => <tr key={month.month}><td>{month.month}</td><td>{month.rainfallMm ?? '—'}</td><td>{format(month.minTemperature, 1)}–{format(month.maxTemperature, 1)}</td><td>{format(month.humidity, 0, '%')}</td><td>{format(month.solar, 2)}</td></tr>)}</tbody>
          </table>
        </details>
      </>}
    </div>

    <div className="boundary-report-section">
      <div className="boundary-section-heading"><div><h3>Recent satellite passes</h3><p>Sentinel-2 scenes covering this boundary{scenes.ok ? ` in the last ${scenes.data.searchedDays} days` : ''}.</p></div><SourceChip section={scenes} /></div>
      <Unavailable section={scenes} />
      {scenes.ok && <dl className="boundary-report-list">
        <ReportRow label="Scenes found" value={`${scenes.data.total}`} />
        <ReportRow label="Latest pass" value={scenes.data.latest ? `${date(scenes.data.latest.date)} · ${scenes.data.latest.cloud == null ? 'cloud unknown' : `${scenes.data.latest.cloud.toFixed(0)}% cloud`}` : 'None in this period'} />
        <ReportRow label="Latest clear pass (≤20% cloud)" value={scenes.data.latestClear ? `${date(scenes.data.latestClear.date)} · ${scenes.data.latestClear.cloud!.toFixed(0)}% cloud` : 'None in this period; cloud is common in the rainy season'} />
      </dl>}
    </div>
  </>;
}
