import type { FarmBoundarySummary } from './FarmMap';

interface Props {
  boundary: FarmBoundarySummary;
  title?: string;
}

export default function BoundarySummary({ boundary, title = 'Farm boundary ready' }: Props) {
  return <section className="boundary-summary panel panel-pad" aria-live="polite">
    <div className="boundary-summary-head">
      <div>
        <p className="eyebrow">Next step</p>
        <h2>{title}</h2>
        <p className="panel-subtitle">Your drawn area is ready to use across the field tools.</p>
      </div>
      <span className="chip"><span className="chip-dot" /> Saved in this browser</span>
    </div>
    <div className="boundary-stats">
      <div className="boundary-stat"><strong>{boundary.areaHectares.toFixed(2)} ha</strong><small>Estimated area</small></div>
      <div className="boundary-stat"><strong>{boundary.perimeterKm.toFixed(2)} km</strong><small>Approx. perimeter</small></div>
      <div className="boundary-stat"><strong>{boundary.vertexCount}</strong><small>Boundary corners</small></div>
      <div className="boundary-stat"><strong>{boundary.centroid.latitude.toFixed(3)}°, {boundary.centroid.longitude.toFixed(3)}°</strong><small>Centre point</small></div>
    </div>
    <div className="boundary-next">
      <div><strong>What you can do next</strong><p>Use Satellite Explorer to search recent Sentinel-2 scenes, Weather to check the local forecast, or Soil to compare modelled root-zone conditions.</p></div>
      <div className="boundary-links"><a className="btn" href="/satellite">Explore imagery</a><a className="btn" href="/weather">Check weather</a><a className="btn" href="/soil">Read soil</a></div>
    </div>
    <p className="meta boundary-disclaimer">This is an approximate geometry from map clicks, not a surveyed boundary. The polygon stays in this browser until you choose an analysis action.</p>
  </section>;
}
