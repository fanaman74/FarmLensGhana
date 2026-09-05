import { useEffect, useRef, useState } from 'react';
export interface EarthLayer { tileUrl: string; bounds: number[]; title: string; from: string; to: string; latestObservation: string; imageCount: number; threshold: number | null; expiresAt: string; caveat: string; }
const date = (days: number) => new Date(Date.now()+days*86400000).toISOString().slice(0,10);
export default function EarthEnginePanel({ crop, latitude, longitude, polygon, onLayer }: { crop: string; latitude: number; longitude: number; polygon: number[][]; onLayer: (layer: EarthLayer | null) => void }) {
  const [kind, setKind] = useState(crop === 'cocoa' ? 'cocoa' : crop === 'oil-palm' ? 'palm' : 'annual');
  const [from, setFrom] = useState(date(-30)), [to, setTo] = useState(date(0)), [threshold, setThreshold] = useState(.65);
  const [result, setResult] = useState<EarthLayer | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);
  useEffect(() => { abort.current?.abort(); setResult(null); setBusy(false); onLayer(null); }, [polygon, onLayer]);
  const clear = () => { abort.current?.abort(); setBusy(false); setResult(null); onLayer(null); setError(''); };
  const load = async () => {
    clear(); const controller = new AbortController(); abort.current = controller; setBusy(true);
    try {
      const response = await fetch('/api/earth-engine/map', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal, body: JSON.stringify({ kind, latitude, longitude, from, to, threshold, year: 2024, ...(polygon.length ? { geometry: { type: 'Polygon', coordinates: [polygon] } } : {}) }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Map request failed.');
      if (!controller.signal.aborted) { setResult(data); onLayer(data); }
    } catch (error) { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Map unavailable.'); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  };
  const tree = kind === 'cocoa' || kind === 'palm';
  return <section className="earth-engine-panel"><h3>Earth Engine analysis</h3>
    <label className="label" htmlFor="ee-kind">Data layer</label><select id="ee-kind" className="input" value={kind} onChange={e => { clear(); setKind(e.target.value); }}><option value="annual">Dynamic World · recent crops probability</option><option value="cocoa">Forest Data Partnership · cocoa 2024</option><option value="palm">Forest Data Partnership · palm 2024</option><option value="radar">Sentinel-1 · cloud-resilient VH radar</option></select>
    <p className="meta">{tree ? 'Dedicated tree-crop model 2025b; observations from 2024, not live planting.' : kind === 'annual' ? 'Generic annual-crop activity only. Does not distinguish individual crops or identify cashew.' : 'Radar signal, not a species classifier.'}</p>
    {!tree && <div className="form-grid"><label><span className="label">From</span><input className="input" type="date" value={from} onChange={e => { clear(); setFrom(e.target.value); }}/></label><label><span className="label">Through</span><input className="input" type="date" value={to} max={date(0)} onChange={e => { clear(); setTo(e.target.value); }}/></label></div>}
    {kind !== 'radar' && <label className="label">Display probability ≥ {threshold.toFixed(2)}<input className="range" type="range" min="0.3" max="0.95" step="0.05" value={threshold} onChange={e => { clear(); setThreshold(Number(e.target.value)); }}/></label>}
    <p className="meta">{polygon.length ? 'Uses your drawn boundary.' : 'Uses a 4 × 4 km window centred on the selected town.'} Loading sends this area to Google Earth Engine and uses the administrator's project quota. No exports or training jobs are started.</p>
    <button className="btn btn-primary" disabled={busy} onClick={load}>{busy ? 'Processing Earth Engine layer…' : 'Load Earth Engine layer'}</button>
    {error && <p className="error-state" role="alert">{error}</p>}
    {result && <div role="status"><h4>{result.title}</h4><p className="meta">Period: {result.from} – {result.to} · {result.imageCount} source images · latest source timestamp: {result.latestObservation.slice(0,10)} · Map expires {new Date(result.expiresAt).toLocaleTimeString()}; reload to refresh.</p><p className="provider-note">{result.caveat}</p><button className="btn" onClick={clear}>Remove analysis layer</button></div>}
  </section>;
}
