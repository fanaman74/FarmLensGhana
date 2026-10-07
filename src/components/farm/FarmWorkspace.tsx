import { useEffect, useState } from 'react';
import { CloudSun, Droplets, LayoutDashboard, Satellite, Sprout, Trash2 } from 'lucide-react';
import FarmMap, { type FarmBoundarySummary } from '../map/FarmMap';
import BoundarySummary from '../map/BoundarySummary';
import LocationSearch, { type Place } from '../dashboard/LocationSearch';
import WeatherWorkspace from '../weather/WeatherWorkspace';
import SoilWorkspace from '../soil/SoilWorkspace';
import RecentScenes from '../crops/RecentScenes';
import EarthEnginePanel, { type EarthLayer } from '../crops/EarthEnginePanel';
import CropWeatherCard from '../crops/CropWeatherCard';
import { crops } from '../../data/crops';
import { readSavedLocation, saveLocation } from '../../lib/location/savedLocation';
import { FARM_CHANGED, forgetFarm, readSavedFarm, renameFarm, saveFarm, type SavedFarm } from '../../lib/location/savedFarm';

const tabs = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'weather', label: 'Weather', icon: CloudSun },
  { id: 'soil', label: 'Soil', icon: Droplets },
  { id: 'satellite', label: 'Satellite', icon: Satellite },
  { id: 'crops', label: 'Crops', icon: Sprout },
] as const;
type Tab = typeof tabs[number]['id'];

const ghana = { name: 'Ghana', region: 'National view', latitude: 7.9465, longitude: -1.0232 };

// Zoom that fits a farm of this size comfortably inside the map.
function zoomForArea(hectares: number, latitude: number) {
  const sideMetres = Math.sqrt(Math.max(hectares, .01) * 10000);
  const metresPerPixel = sideMetres / Math.min(220, window.innerWidth * .35);
  // MapLibre zoom 0 spans 512 px, about 78 km per pixel at the equator.
  return Math.min(17, Math.max(11, Math.log2(78271.5 * Math.cos(latitude * Math.PI / 180) / metresPerPixel)));
}

export default function FarmWorkspace() {
  const [loaded, setLoaded] = useState(false);
  const [farm, setFarm] = useState<SavedFarm | null>(null);
  const [view, setView] = useState(ghana);
  const [tab, setTab] = useState<Tab>('overview');
  const [name, setName] = useState('');
  const [earthLayer, setEarthLayer] = useState<EarthLayer | null>(null);

  useEffect(() => {
    // A rename keeps the same boundary object, so tabs do not reload their data.
    const load = () => { const saved = readSavedFarm(); setFarm((previous) => previous && saved && JSON.stringify(previous.coordinates) === JSON.stringify(saved.coordinates) ? { ...previous, name: saved.name } : saved); setName(saved?.name ?? ''); };
    load();
    const saved = readSavedFarm();
    const place = readSavedLocation();
    if (saved) setView({ name: saved.name, region: 'Your farm', ...saved.centroid });
    else if (place) setView({ name: place.name, region: place.region ?? 'Ghana', latitude: place.latitude, longitude: place.longitude });
    const fromHash = window.location.hash.slice(1);
    if (tabs.some((item) => item.id === fromHash)) setTab(fromHash as Tab);
    setLoaded(true);
    window.addEventListener(FARM_CHANGED, load);
    return () => window.removeEventListener(FARM_CHANGED, load);
  }, []);

  const chooseTab = (next: Tab) => { setTab(next); history.replaceState(null, '', `#${next}`); };
  const finish = (summary: FarmBoundarySummary | null) => { if (summary) { setEarthLayer(null); saveFarm(summary); } };
  const place = farm ? { name: farm.name, region: 'Your farm', latitude: farm.centroid.latitude, longitude: farm.centroid.longitude } : null;

  return <div className="farm-workspace">
    <div className="farm-top">
      <section className="panel farm-map-panel">
        {loaded && <FarmMap latitude={view.latitude} longitude={view.longitude} zoom={farm ? zoomForArea(farm.areaHectares, farm.centroid.latitude) : view === ghana ? 6.4 : 13} focusZoom={13} drawing boundary={farm?.coordinates ?? []} rasterLayer={earthLayer} onFinish={finish} />}
        <div className="map-search-float"><LocationSearch compact current={view === ghana ? undefined : view.name} onSelect={(next: Place) => { setView(next); saveLocation(next); }} /></div>
      </section>
      <aside className="panel panel-pad farm-card">
        {!loaded ? <div className="skeleton sk-lg" /> : farm ? <>
          <p className="eyebrow">Saved in this browser</p>
          <label className="farm-name"><span className="label">Farm name</span><input className="input" value={name} maxLength={60} onChange={(event) => setName(event.target.value)} onBlur={() => { const next = renameFarm(name); if (next) setName(next.name); }} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} /></label>
          <dl className="farm-facts">
            <div><dt>Area</dt><dd>{farm.areaHectares.toFixed(2)} ha</dd><small>{(farm.areaHectares * 2.471).toFixed(1)} acres · map estimate</small></div>
            <div><dt>Perimeter</dt><dd>{farm.perimeterKm.toFixed(2)} km</dd><small>{farm.vertexCount} corners</small></div>
            <div><dt>Centre</dt><dd>{farm.centroid.latitude.toFixed(4)}°, {farm.centroid.longitude.toFixed(4)}°</dd><small>Used for weather and soil</small></div>
            <div><dt>Drawn</dt><dd>{new Date(farm.savedAt).toLocaleDateString('en-GH', { dateStyle: 'medium' })}</dd><small>Not a surveyed boundary</small></div>
          </dl>
          <p className="meta">To change the boundary, choose Draw farm on the map and add the new corners. Finishing replaces this farm.</p>
          <button className="btn btn-ghost" onClick={() => { if (window.confirm(`Remove ${farm.name} from this browser?`)) { forgetFarm(); setEarthLayer(null); } }}><Trash2 size={15} /> Remove farm</button>
        </> : <>
          <p className="eyebrow">My farm</p>
          <h2 className="panel-title">Draw your farm once</h2>
          <p className="panel-subtitle">Every tab below then uses the same boundary, and so do the Weather, Soil and Satellite pages.</p>
          <ol className="farm-steps">
            <li><b>Find the area</b><span>Search for the nearest town, then zoom in until you can see the field edges.</span></li>
            <li><b>Choose Draw farm</b><span>Click or tap each corner of the field in order.</span></li>
            <li><b>Choose Finish</b><span>The farm is saved in this browser only. Nothing is uploaded until a tab asks a data service about it.</span></li>
          </ol>
        </>}
      </aside>
    </div>

    {farm && place && <>
      <div className="farm-tabs" role="tablist" aria-label="Farm information">
        {tabs.map(({ id, label, icon: Icon }) => <button key={id} id={`farm-tab-${id}`} role="tab" aria-selected={tab === id} aria-controls="farm-tab-panel" onClick={() => chooseTab(id)}><Icon size={16} aria-hidden="true" />{label}</button>)}
      </div>
      <div id="farm-tab-panel" role="tabpanel" aria-labelledby={`farm-tab-${tab}`} className="farm-tab-panel" key={`${farm.coordinates.flat().join()}-${tab}`}>
        {tab === 'overview' && <BoundarySummary boundary={farm} title={farm.name} locationName={farm.name} locationRegion="Your farm" imageryNote={earthLayer ? earthLayer.title : 'Esri satellite basemap; load an Earth Engine layer from the Satellite tab.'} />}
        {tab === 'weather' && <WeatherWorkspace place={place} />}
        {tab === 'soil' && <SoilWorkspace place={place} />}
        {tab === 'satellite' && <SatelliteTab farm={farm} onLayer={setEarthLayer} />}
        {tab === 'crops' && <CropsTab place={place} />}
      </div>
    </>}
  </div>;
}

function SatelliteTab({ farm, onLayer }: { farm: SavedFarm; onLayer: (layer: EarthLayer | null) => void }) {
  return <div className="farm-columns">
    <section className="panel panel-pad"><EarthEnginePanel crop="annual" latitude={farm.centroid.latitude} longitude={farm.centroid.longitude} polygon={farm.coordinates} onLayer={onLayer} /><p className="meta">A loaded layer appears on the farm map above.</p></section>
    <section className="panel panel-pad"><RecentScenes latitude={farm.centroid.latitude} longitude={farm.centroid.longitude} /><a className="btn" href="/satellite">Open the full Satellite Explorer</a></section>
  </div>;
}

function CropsTab({ place }: { place: { name: string; region: string; latitude: number; longitude: number } }) {
  const [slug, setSlug] = useState(crops[0].slug);
  const crop = crops.find((item) => item.slug === slug) ?? crops[0];
  return <div className="farm-columns">
    <section className="panel panel-pad">
      <label><span className="label">Crop</span><select className="input" value={slug} onChange={(event) => setSlug(event.target.value)}>{crops.map((item) => <option key={item.slug} value={item.slug}>{item.icon} {item.name}</option>)}</select></label>
      <h2>{crop.icon} {crop.name}</h2>
      <p className="meta">{crop.summary}</p>
      <dl className="farm-facts">
        <div><dt>Temperature</dt><dd>{crop.temperature[0]}–{crop.temperature[1]}°C</dd></div>
        <div><dt>Annual rainfall</dt><dd>{crop.rainfall[0]}–{crop.rainfall[1]} mm</dd></div>
        <div><dt>Soil pH</dt><dd>{crop.ph[0]}–{crop.ph[1]}</dd></div>
        <div><dt>Soil</dt><dd>{crop.soil}</dd></div>
      </dl>
      <p className="provider-note">Draft reference ranges awaiting source verification. Check with your local extension officer before deciding what to plant.</p>
      <a className="btn" href={`/crops/${crop.slug}`}>Read the {crop.name.toLowerCase()} guide</a>
    </section>
    <CropWeatherCard key={crop.slug} crop={crop} place={place} />
  </div>;
}

