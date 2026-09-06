import { useEffect, useMemo, useState } from 'react';
import { BarChart3, CalendarDays, Cloud, Info, Layers3, Map as MapIcon, ScanLine, Sparkles } from 'lucide-react';
import FarmMap from './FarmMap';
import LocationSearch, { type Place } from '../dashboard/LocationSearch';
import { crops } from '../../data/crops';

type Mode = 'crop' | 'scan' | 'ai';
type View = 'map' | 'analytics';

const providers = [
  { id: 'earth-search', label: 'Earth Search', note: 'Free Sentinel-2 catalogue', ready: true },
];

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
  const [cropSlug, setCropSlug] = useState('maize');
  const [provider, setProvider] = useState('earth-search');
  const [layer, setLayer] = useState('true-colour');
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
        <FarmMap latitude={location.latitude} longitude={location.longitude} zoom={6.4} drawing onPolygon={setPolygon} onLocation={(latitude, longitude) => setLocation({ name: 'Selected point', region: 'Ghana', latitude, longitude })}/>
        <div className="map-search-float"><LocationSearch compact onSelect={(place: Place) => setLocation(place)} /></div>
        <div className="imagery-status"><div><strong>Esri satellite basemap</strong><small>Analysis layer not requested</small></div></div>
      </section>
      <aside className={`satellite-panel panel panel-pad ${view === 'map' ? 'mobile-sheet' : ''}`}>
        {mode === 'crop' && <CropMode crop={crop} cropSlug={cropSlug} setCropSlug={setCropSlug} polygon={polygon} />}
        {mode === 'scan' && <ScanMode provider={provider} setProvider={setProvider} layer={layer} setLayer={setLayer} clouds={clouds} setClouds={setClouds} polygon={polygon} />}
        {mode === 'ai' && <AiMode polygon={polygon} />}
      </aside>
    </div>
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

function ScanMode({ provider, setProvider, layer, setLayer, clouds, setClouds, polygon }: any) {
  const [from, setFrom] = useState(dateOffset(-30)), [to, setTo] = useState(dateOffset(0));
  const [processing, setProcessing] = useState(false), [message, setMessage] = useState('');
  const scan = async () => {
    setProcessing(true); setMessage('');
    try {
      setMessage('Use Crop Finder for the free recent Sentinel-2 catalogue. Paid provider processing has been removed.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Scene search failed.'); }
    finally { setProcessing(false); }
  };
  return <>
  <p className="eyebrow">Field scan</p><h2 className="panel-title">Inspect vegetation over time</h2><p className="panel-subtitle">Draw a field, choose a source and request only the layer you need.</p>
  <label className="label" htmlFor="provider">Imagery provider</label><select id="provider" className="input" value={provider} onChange={(e) => setProvider(e.target.value)}>{providers.map((item) => <option value={item.id} key={item.id}>{item.label} · {item.note}</option>)}</select>
  <div className="form-grid"><label><span className="label"><CalendarDays/>From</span><input className="input" type="date" value={from} onChange={(event) => setFrom(event.target.value)}/></label><label><span className="label"><CalendarDays/>To</span><input className="input" type="date" value={to} onChange={(event) => setTo(event.target.value)}/></label></div>
  <label className="label" htmlFor="layer">Layer</label><select id="layer" className="input" value={layer} onChange={(e) => setLayer(e.target.value)}><option value="true-colour">True colour</option><option value="false-colour">False colour</option><option value="ndvi">NDVI · vegetation vigour</option><option value="evi">EVI · enhanced vegetation</option><option value="ndmi">NDMI · canopy moisture</option><option value="ndwi">NDWI · surface water</option></select>
  <label className="range-label" htmlFor="clouds"><span><Cloud/>Maximum cloud cover</span><b>{clouds}%</b></label><input id="clouds" className="range" type="range" min="0" max="80" value={clouds} onChange={(e) => setClouds(Number(e.target.value))}/>
  <div className="scan-checks"><span className={polygon.length ? 'ready' : ''}>{polygon.length ? '✓' : '1'} Boundary {polygon.length ? 'ready' : 'needed'}</span><span>2 Provider credentials</span><span>3 Imagery search</span></div>
  <p className="meta">Free catalogue search is available on Crop Finder. Boundaries stay in this browser.</p>
  <button className="btn btn-primary full-btn" onClick={scan} disabled={!polygon.length || processing}>{processing ? 'Checking catalogue…' : !polygon.length ? 'Draw a boundary to continue' : 'Open free recent catalogue'}</button>
  <a className="btn btn-ghost full-btn" href="/crop-finder">Open Crop Finder</a>
  <p role="status" className="meta">{message}</p>
</>; }

function AiMode({ polygon }: { polygon: number[][] }) { return <>
  <div className="beta-lock"><span><Sparkles/></span><p>Beta capability</p></div><h2 className="panel-title">AI crop mapping requires a Ghana-trained model</h2><p className="panel-subtitle">The feature remains locked until a reachable model with documented Ghana evaluation is configured.</p>
  <div className="validation-list"><div><i>1</i><span><b>Representative labels</b><small>Regions, seasons, farm sizes and an “other” class</small></span></div><div><i>2</i><span><b>Spatially separated evaluation</b><small>Precision, recall, F1, confusion matrix and coverage</small></span></div><div><i>3</i><span><b>Validated deployment</b><small>Model ID, version, threshold and evaluation date</small></span></div></div>
  <button className="btn btn-primary full-btn" disabled>Model not available</button><a className="btn btn-ghost full-btn" href="/settings#olmoearth">Configure OlmoEarth</a>
  <div className="provider-note warning"><Info/><p>Foundation-model output alone must not be treated as crop identification. Predictions are decision support, never confirmed field truth.</p></div>
  {polygon.length > 0 && <span className="chip"><span className="chip-dot"/> Boundary retained locally</span>}
</>; }

function dateOffset(days: number) { const date = new Date(); date.setUTCDate(date.getUTCDate()+days); return date.toISOString().slice(0,10); }
