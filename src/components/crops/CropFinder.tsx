import { useEffect, useState } from 'react';
import LocationSearch, { type Place } from '../dashboard/LocationSearch';
import FarmMap, { type FarmBoundarySummary } from '../map/FarmMap';
import BoundarySummary from '../map/BoundarySummary';
import { crops } from '../../data/crops';
import RecentScenes from './RecentScenes';
import EarthEnginePanel, { type EarthLayer } from './EarthEnginePanel';
import { readSavedLocation, saveLocation } from '../../lib/location/savedLocation';

export default function CropFinder() {
  const [place, setPlace] = useState<Place>();
  const [slug, setSlug] = useState('');
  // Start from the place last chosen in any workspace; a new search replaces it.
  useEffect(() => { const saved = readSavedLocation(); if (saved) setPlace({ id: 0, name: saved.name, region: saved.region ?? 'Ghana', latitude: saved.latitude, longitude: saved.longitude }); }, []);
  const [search, setSearch] = useState<{ place: Place; crop: typeof crops[number] }>();
  const [polygon, setPolygon] = useState<number[][]>([]);
  const [boundary, setBoundary] = useState<FarmBoundarySummary | null>(null);
  const [earthLayer, setEarthLayer] = useState<EarthLayer | null>(null);
  const crop = crops.find(item => item.slug === slug);
  return <div className="crop-finder">
    <section className="panel panel-pad finder-form">
      <div><p className="label">1. Select town / district</p><LocationSearch current={place?.name} onSelect={value => { setPlace(value); saveLocation(value); setSearch(undefined); }} />{place && <p className="meta">Selected: {place.name}, {place.region}</p>}</div>
      <label><span className="label">2. Choose crop</span><select className="input" value={slug} onChange={event => { setSlug(event.target.value); setSearch(undefined); }}><option value="" disabled>Select a crop</option>{crops.map(item => <option key={item.slug} value={item.slug}>{item.icon} {item.name}</option>)}</select></label>
      <button className="btn btn-primary" disabled={!place || !crop} onClick={() => { if (place && crop) { setPolygon([]); setBoundary(null); setEarthLayer(null); setSearch({ place, crop }); } }}>Explore crop area</button>
    </section>
    {!search && <section className="panel panel-pad"><h2>Start with a location and crop</h2><p>{!place ? 'Search for a town or district, then pick it from the list.' : !crop ? 'Now choose a crop, then select Explore crop area.' : 'Select Explore crop area to open the map.'} Searches use a place centre, not an official district boundary.</p></section>}
    {search && <div className="soil-grid">
      <section className="panel finder-map"><FarmMap key={`${search.place.id}-${search.crop.slug}`} latitude={search.place.latitude} longitude={search.place.longitude} zoom={12} drawing cropland rasterLayer={earthLayer} onPolygon={setPolygon} onFinish={setBoundary} /></section>
      <aside className="panel panel-pad">
        <p className="eyebrow">Near {search.place.name}, {search.place.region}</p><h2>{search.crop.name} imagery search</h2>
        {!earthLayer && <p className="provider-note"><strong>Overlay: 2025 annual cropland.</strong> This is not a {search.crop.name.toLowerCase()} detection layer, current planting evidence, or surveyed field boundaries.</p>}
        <p>Esri / Impact Observatory / Microsoft land cover highlights the generic crops class at 10 m resolution. Tree crops may be classified as trees: do not use this mask to exclude cocoa, oil palm or cashew.</p>
        <EarthEnginePanel key={`${search.place.id}-${search.crop.slug}`} crop={search.crop.slug} latitude={search.place.latitude} longitude={search.place.longitude} polygon={polygon} onLayer={setEarthLayer} />
        <h3>Individual annual-crop classification</h3><p>Maize, rice and other annual species still require a locally evaluated classifier. Generic cropland and radar layers do not identify the crop.</p>
        <p className="meta">Esri imagery is a basemap with varying capture dates. Pan and zoom to inspect the area; Draw farm connects the corners you select. A drawn boundary does not identify its crop.</p>
        <a className="btn" href={`/crops/${search.crop.slug}`}>Read the {search.crop.name.toLowerCase()} guide</a>
        <p className="meta"><a href="https://livingatlas.arcgis.com/landcover/" target="_blank" rel="noreferrer">2025 land-cover source</a></p>
        <RecentScenes key={search.place.id} latitude={search.place.latitude} longitude={search.place.longitude} />
        {['cocoa', 'oil-palm'].includes(search.crop.slug) && <div className="provider-note"><h3>Dedicated tree-crop layer</h3><p>Forest Data Partnership model 2025b offers probabilities through 2024. Use the Earth Engine panel to request this layer after server authentication is configured. A probability threshold is not proof of crop presence.</p><a href={`https://developers.google.com/earth-engine/datasets/catalog/projects_forestdatapartnership_assets_${search.crop.slug === 'cocoa' ? 'cocoa' : 'palm'}_model_2025b`} target="_blank" rel="noreferrer">Dataset and access details</a></div>}
      </aside>
    </div>}
    {search && boundary && <BoundarySummary boundary={boundary} title={`Boundary ready near ${search.place.name}`} locationName={search.place.name} locationRegion={search.place.region} cropName={search.crop.name} imageryNote={earthLayer ? earthLayer.title : '2025 annual cropland basemap; no dedicated crop layer requested.'} />}
  </div>;
}
