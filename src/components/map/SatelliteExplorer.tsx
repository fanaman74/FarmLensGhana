import { useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, CalendarDays, Cloud, Info, Layers3, Map as MapIcon, ScanLine, Sparkles } from 'lucide-react';
import FarmMap, { type FarmBoundarySummary } from './FarmMap';
import BoundarySummary from './BoundarySummary';
import LocationSearch, { type Place } from '../dashboard/LocationSearch';
import { crops } from '../../data/crops';

type Mode = 'crop' | 'scan' | 'ai';
type View = 'map' | 'analytics';

export default function SatelliteExplorer() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
    const selected = new URLSearchParams(window.location.search).get('crop');
    if (selected && crops.some((crop) => crop.slug === selected)) setCropSlug(selected);
  }, []);
  const [mode, setMode] = useState<Mode>('crop');
  const [view, setView] = useState<View>('map');
  const [location, setLocation] = useState({ name: 'Ghana', region: 'National view', latitude: 7.9465, longitude: -1.0232 });
  const [polygon, setPolygon] = useState<number[][]>([]);
  const [boundary, setBoundary] = useState<FarmBoundarySummary | null>(null);
  const [cropSlug, setCropSlug] = useState('maize');
  const [clouds, setClouds] = useState(30);
  const crop = useMemo(() => crops.find((item) => item.slug === cropSlug)!, [cropSlug]);

  return <div className="satellite-app">
    <div className="satellite-toolbar">
      <div className="mode-tabs" role="group" aria-label="Explorer mode">
        <button disabled={!ready} aria-pressed={mode === 'crop'} onClick={() => setMode('crop')}><Layers3/>Crop Explorer</button>
        <button disabled={!ready} aria-pressed={mode === 'scan'} onClick={() => setMode('scan')}><ScanLine/>Field Scan</button>
        <button disabled={!ready} aria-pressed={mode === 'ai'} onClick={() => setMode('ai')}><Sparkles/>AI Crop Map <small>Beta</small></button>
      </div>
      <div className="view-toggle" aria-label="Map or analytics view"><button aria-pressed={view === 'map'} onClick={() => setView('map')}><MapIcon/>Map</button><button aria-pressed={view === 'analytics'} onClick={() => setView('analytics')}><BarChart3/>Analytics</button></div>
    </div>
    <div className="satellite-grid">
      <section className={`satellite-map panel ${view === 'analytics' ? 'mobile-hidden' : ''}`}>
        <FarmMap latitude={location.latitude} longitude={location.longitude} zoom={6.4} drawing onPolygon={(coordinates) => { setPolygon(coordinates); if (!coordinates.length) setBoundary(null); }} onFinish={setBoundary} onLocation={(latitude, longitude) => setLocation({ name: 'Selected point', region: 'Ghana', latitude, longitude })}/>
        <div className="map-search-float"><LocationSearch compact onSelect={(place: Place) => setLocation(place)} /></div>
        <div className="imagery-status"><div><strong>Esri satellite basemap</strong><small>Analysis layer not requested</small></div></div>
      </section>
      <aside className={`satellite-panel panel panel-pad ${view === 'map' ? 'mobile-sheet' : ''}`}>
        {mode === 'crop' && <CropMode crop={crop} cropSlug={cropSlug} setCropSlug={setCropSlug} polygon={polygon} />}
        {mode === 'scan' && <ScanMode location={location} clouds={clouds} setClouds={setClouds} polygon={polygon} />}
        {mode === 'ai' && <AiMode polygon={polygon} />}
      </aside>
    </div>
    {boundary && <BoundarySummary boundary={boundary} title={`Boundary ready near ${location.name}`} locationName={location.name} locationRegion={location.region} cropName={crop.name} imageryNote="Esri satellite basemap; analysis layer is requested separately." />}
  </div>;
}

function CropMode({ crop, cropSlug, setCropSlug, polygon }: any) { return <>
  <p className="eyebrow">Explore a crop</p><h2 className="panel-title">What does {crop.name.toLowerCase()} need?</h2><p className="panel-subtitle">Compare broad crop requirements with live conditions for your chosen area.</p>
  <label className="label" htmlFor="crop-select">Crop or plant</label><select id="crop-select" className="input" value={cropSlug} onChange={(e) => setCropSlug(e.target.value)}>{crops.map((item) => <option value={item.slug} key={item.slug}>{item.name} · {item.scientificName}</option>)}</select>
  <p className="provider-note">Draft crop values and local names await source verification. Rainfall periods are unverified; compatibility assessment is disabled.</p>
  <div className="crop-feature"><span style={{background: crop.colour}}>{crop.icon}</span><div><strong>{crop.name}</strong><em>{crop.scientificName}</em><p>{crop.summary}</p></div></div>
  <div className="requirement-list"><div><span>Suitable temperature</span><b>{crop.temperature[0]}–{crop.temperature[1]}°C</b></div><div><span>Approx. annual rainfall</span><b>{crop.rainfall[0]}–{crop.rainfall[1]} mm</b></div><div><span>Preferred pH</span><b>{crop.ph[0]}–{crop.ph[1]}</b></div><div><span>Soil</span><b>{crop.soil}</b></div></div>
  <div className="provider-note"><Info/><p>{polygon.length ? 'Boundary ready. Connect an imagery provider to compare vegetation observations.' : 'Draw a farm boundary to prepare a vegetation comparison.'} NDVI or NDMI cannot prove crop species.</p></div>
  <a className="btn btn-primary full-btn" href={`/crops/${crop.slug}`}>Open complete crop guide</a>
</>; }

function ScanMode({ location, clouds, setClouds, polygon }: { location: { name: string; region: string; latitude: number; longitude: number }; clouds: number; setClouds: (value: number) => void; polygon: number[][] }) {
  const [from, setFrom] = useState(dateOffset(-30)), [to, setTo] = useState(dateOffset(0));
  const [processing, setProcessing] = useState(false), [message, setMessage] = useState('');
  const [scenes, setScenes] = useState<{ id: string; date: string; cloud: number | null }[]>();
  const requestRef = useRef<AbortController | null>(null);
  useEffect(() => {
    requestRef.current?.abort();
    requestRef.current = null;
    setProcessing(false); setScenes(undefined); setMessage('');
    return () => requestRef.current?.abort();
  }, [location.latitude, location.longitude, from, to, clouds]);
  const scan = async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setProcessing(true); setMessage(''); setScenes(undefined);
    try {
      const response = await fetch('/api/satellite/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ latitude: location.latitude, longitude: location.longitude, from, to, cloud: clouds }), signal: controller.signal });
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok || !data || typeof data !== 'object' || !('scenes' in data) || !Array.isArray(data.scenes)) throw new Error(data && typeof data === 'object' && 'error' in data && typeof data.error === 'string' ? data.error : 'Satellite catalogue unavailable. Retry shortly.');
      if (requestRef.current === controller) setScenes(data.scenes as { id: string; date: string; cloud: number | null }[]);
    } catch (error) { if (!(error instanceof DOMException && error.name === 'AbortError') && requestRef.current === controller) setMessage(error instanceof Error ? error.message : 'Satellite catalogue unavailable. Retry shortly.'); }
    finally { if (requestRef.current === controller) { requestRef.current = null; setProcessing(false); } }
  };
  return <>
  <p className="eyebrow">Field scan</p><h2 className="panel-title">Find recent satellite scenes</h2><p className="panel-subtitle">Search the free Sentinel-2 catalogue for {location.name}.</p>
  <p className="meta">Catalogue records only: results are not rendered as imagery or used to identify crops. Clicking Search sends the selected coordinates ({location.latitude.toFixed(3)}, {location.longitude.toFixed(3)}), date range and cloud threshold to Element 84 Earth Search. The drawn boundary stays in this browser and is not sent to the catalogue. Results cover only the small ~4 km × 4 km window around the selected point, not national Ghana coverage.</p>
  <div className="form-grid"><label><span className="label"><CalendarDays/>From</span><input className="input" type="date" value={from} onChange={(event) => setFrom(event.target.value)}/></label><label><span className="label"><CalendarDays/>To</span><input className="input" type="date" value={to} onChange={(event) => setTo(event.target.value)}/></label></div>
  <label className="range-label" htmlFor="clouds"><span><Cloud/>Maximum cloud cover</span><b>{clouds}%</b></label><input id="clouds" className="range" type="range" min="0" max="80" value={clouds} onChange={(e) => setClouds(Number(e.target.value))}/>
  <div className="scan-checks"><span className="ready">✓ Location selected</span><span className={polygon.length ? 'ready' : ''}>{polygon.length ? '✓ Boundary retained locally' : 'Boundary optional'}</span><span>Sentinel-2 L2A · Earth Search</span></div>
  <button className="btn btn-primary full-btn" onClick={scan} disabled={processing}>{processing ? 'Searching catalogue…' : 'Search catalogue'}</button>
  {processing && <p role="status" className="meta">Checking Earth Search for matching scenes…</p>}
  {!processing && message && <p role="alert" className="meta">{message}</p>}
  {!processing && scenes && scenes.length === 0 && <p role="status" className="meta">No matching scenes found for these dates and cloud limit.</p>}
  {!processing && scenes && scenes.length > 0 && <div className="provider-note"><strong>{scenes.length} catalogue scene{scenes.length === 1 ? '' : 's'} found</strong>{scenes.map((scene) => <p className="meta" key={scene.id}><strong>{new Date(scene.date).toLocaleDateString('en-GH')}</strong> · cloud {scene.cloud == null ? 'unknown' : `${scene.cloud.toFixed(0)}%`}<br/>{scene.id}</p>)}</div>}
</>; }

function AiMode({ polygon }: { polygon: number[][] }) { return <>
  <div className="beta-lock"><span><Sparkles/></span><p>Beta capability</p></div><h2 className="panel-title">AI crop mapping requires a Ghana-trained model</h2><p className="panel-subtitle">The feature remains locked until a reachable model with documented Ghana evaluation is configured.</p>
  <div className="validation-list"><div><i>1</i><span><b>Representative labels</b><small>Regions, seasons, farm sizes and an “other” class</small></span></div><div><i>2</i><span><b>Spatially separated evaluation</b><small>Precision, recall, F1, confusion matrix and coverage</small></span></div><div><i>3</i><span><b>Validated deployment</b><small>Model ID, version, threshold and evaluation date</small></span></div></div>
  <button className="btn btn-primary full-btn" disabled>Model not available</button><a className="btn btn-ghost full-btn" href="/settings#olmoearth">Configure OlmoEarth</a>
  <div className="provider-note warning"><Info/><p>Foundation-model output alone must not be treated as crop identification. Predictions are decision support, never confirmed field truth.</p></div>
  {polygon.length > 0 && <span className="chip"><span className="chip-dot"/> Boundary retained locally</span>}
</>; }

function dateOffset(days: number) { const date = new Date(); date.setUTCDate(date.getUTCDate()+days); return date.toISOString().slice(0,10); }
