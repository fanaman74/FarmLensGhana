import { useEffect, useState } from 'react';
import type { ActiveLocation } from '../weather/useWeather';
import type { MonthlyWeather } from '../../lib/api/monthlyWeather';
export default function MonthlyOutlook({ location }: { location: ActiveLocation }) {
  const [result, setResult] = useState<{ key: string; data?: MonthlyWeather; error?: string }>();
  const [retry, setRetry] = useState(0);
  const key = `${location.latitude},${location.longitude}`;
  useEffect(() => {
    const controller = new AbortController();
    setResult(undefined);
    fetch(`/api/weather/monthly?latitude=${location.latitude}&longitude=${location.longitude}`, { signal: controller.signal })
      .then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error ?? 'Outlook unavailable.'); return data; })
      .then(data => { if (!controller.signal.aborted) setResult({ key, data }); })
      .catch(error => { if (!controller.signal.aborted) setResult({ key, error: error.message }); });
    return () => controller.abort();
  }, [key, location.latitude, location.longitude, retry]);
  const current = result?.key === key ? result : undefined;
  return <section className="panel panel-pad monthly-outlook" aria-label="Monthly weather outlook">
    <div className="section-heading"><div><p className="eyebrow">Next 30 days · {location.name}, {location.region}</p><h2>Monthly predicted weather</h2><p>ECMWF EC46 ensemble mean · regional planning outlook</p></div><span className="chip">Approx. 36 km grid</span></div>
    <p className="provider-note">Predictions become less certain further ahead. These are non-bias-corrected area estimates, not a field-level forecast or a guarantee of rain. Use short-range weather for daily operations.</p>
    {!current && <p role="status">Loading the outlook for {location.name}…</p>}
    {current?.error && <div role="alert" className="error-state"><p>{current.error}</p><button className="btn" onClick={() => setRetry(n => n + 1)}>Retry monthly outlook</button></div>}
    {current?.data && <><div className="monthly-days">{current.data.days.map(day => <article className="outlook-day" key={day.date}>
      <time dateTime={day.date}>{new Date(day.date + 'T12:00:00Z').toLocaleDateString('en-GH', { month: 'short', day: 'numeric', timeZone: 'Africa/Accra' })}</time>
      <strong>{day.high == null ? '—' : `${day.high.toFixed(0)}°`} <small>/ {day.low == null ? '—' : `${day.low.toFixed(0)}°`}</small></strong>
      <span>{day.rain == null ? 'Rain unavailable' : `${day.rain.toFixed(1)} mm rain`}</span>
    </article>)}</div><p className="meta">Selected: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)} · Model grid: {current.data.grid.latitude.toFixed(3)}, {current.data.grid.longitude.toFixed(3)} · Retrieved {new Date(current.data.fetchedAt).toLocaleString('en-GH', { timeZone: 'Africa/Accra' })} GMT · <a href="https://open-meteo.com/en/docs/seasonal-forecast-api" target="_blank" rel="noreferrer">Open-Meteo / ECMWF methodology</a></p></>}
  </section>;
}
