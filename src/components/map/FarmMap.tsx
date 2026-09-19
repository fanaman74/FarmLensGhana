import { useEffect, useRef, useState } from 'react';
import { AttributionControl, Map as MapLibreMap, Marker, type GeoJSONSource, type MapMouseEvent } from 'maplibre-gl';
import { Crosshair, Layers3, Minus, Plus, RotateCcw } from 'lucide-react';
import { validateFarmPolygon } from '../../lib/geo/geojson';
type FeatureCollection = Extract<Parameters<GeoJSONSource['setData']>[0], { type: 'FeatureCollection' }>;

export interface FarmBoundarySummary {
  coordinates: number[][];
  areaHectares: number;
  perimeterKm: number;
  vertexCount: number;
  centroid: { latitude: number; longitude: number };
}

interface Props {
  latitude: number;
  longitude: number;
  zoom?: number;
  drawing?: boolean;
  highlights?: FeatureCollection;
  cropland?: boolean;
  rasterLayer?: { tileUrl: string; bounds: number[]; title: string } | null;
  onLocation?: (latitude: number, longitude: number) => void;
  onPolygon?: (coordinates: number[][]) => void;
  onFinish?: (summary: FarmBoundarySummary | null) => void;
}

const imageryStyle = {
  version: 8 as const,
  sources: { imagery: { type: 'raster' as const, tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, attribution: 'Esri World Imagery' } },
  layers: [{ id: 'imagery', type: 'raster' as const, source: 'imagery' }]
};

function distanceKm(a: number[], b: number[]) {
  const radians = (value: number) => value * Math.PI / 180;
  const dLat = radians(b[1] - a[1]);
  const dLon = radians(b[0] - a[0]);
  const latA = radians(a[1]);
  const latB = radians(b[1]);
  const haversine = Math.sin(dLat / 2) ** 2 + Math.cos(latA) * Math.cos(latB) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export default function FarmMap({ latitude, longitude, zoom = 7, drawing = false, highlights, cropland = false, rasterLayer, onLocation, onPolygon, onFinish }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const pointsRef = useRef<number[][]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [ready, setReady] = useState(false);
  const [styleReady, setStyleReady] = useState(false);
  const [pointCount, setPointCount] = useState(0);
  const [mapError, setMapError] = useState('');
  const [drawMessage, setDrawMessage] = useState('');
  const [screenPoints, setScreenPoints] = useState<number[][]>([]);
  const [screenCursor, setScreenCursor] = useState<number[] | null>(null);
  const callbacks = useRef({ onLocation, onPolygon, onFinish, highlights });
  callbacks.current = { onLocation, onPolygon, onFinish, highlights };

  useEffect(() => {
    if (!container.current || mapRef.current) return;
    const map = new MapLibreMap({ container: container.current, style: imageryStyle, center: [longitude, latitude], zoom, attributionControl: false });
    map.on('error', () => setMapError('A map imagery layer could not load. Check your connection; missing tiles do not mean crops are absent.'));
    map.on('idle', () => { if (map.areTilesLoaded()) setMapError(''); });
    map.addControl(new AttributionControl({ compact: true }), 'bottom-left');
    markerRef.current = new Marker({ color: '#b8ef65' }).setLngLat([longitude, latitude]).addTo(map);
    map.on('style.load', () => {
      setStyleReady(true);
      if (cropland) {
        const params = new URLSearchParams({ f: 'image', bboxSR: '3857', imageSR: '3857', size: '256,256', format: 'png32', interpolation: 'RSP_NearestNeighbor', mosaicRule: JSON.stringify({ where: 'Year=2025' }), renderingRule: JSON.stringify({ rasterFunction: 'Isolate Crops for Visualization and Analysis' }) });
        map.addSource('cropland-2025', { type: 'raster', tiles: [`https://ic.imagery1.arcgis.com/arcgis/rest/services/Sentinel2_10m_LandCover/ImageServer/exportImage?${params}&bbox={bbox-epsg-3857}`], tileSize: 256, bounds: [-3.5, 4.5, 1.5, 11.5], attribution: 'Esri / Impact Observatory / Microsoft · land cover 2025' });
        map.addLayer({ id: 'cropland-2025', type: 'raster', source: 'cropland-2025', paint: { 'raster-opacity': .7 } });
      }
      map.addSource('farm-polygon', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({ id: 'farm-fill', type: 'fill', source: 'farm-polygon', paint: { 'fill-color': '#b8ef65', 'fill-opacity': .22 } });
      map.addLayer({ id: 'farm-line', type: 'line', source: 'farm-polygon', paint: { 'line-color': '#e8ffb9', 'line-width': 2.5, 'line-dasharray': [2, 1] } });
      map.addLayer({ id: 'farm-vertices', type: 'circle', source: 'farm-polygon', filter: ['==', '$type', 'Point'], paint: { 'circle-radius': 5, 'circle-color': '#ffffff', 'circle-stroke-color': '#436422', 'circle-stroke-width': 2 } });
      map.addSource('crop-highlights', { type: 'geojson', data: callbacks.current.highlights ?? { type: 'FeatureCollection', features: [] } });
      map.addLayer({ id: 'crop-fill', type: 'fill', source: 'crop-highlights', paint: { 'fill-color': '#ffc857', 'fill-opacity': .45 } });
      map.addLayer({ id: 'crop-outline', type: 'line', source: 'crop-highlights', paint: { 'line-color': '#ffc857', 'line-width': 3 } });
      updatePolygon(map, pointsRef.current);
    });
    map.on('click', (event: MapMouseEvent) => {
      // A completed boundary should not lock the map into its old polygon.
      // Any click outside an active drawing session selects a new location and clears stale geometry.
      if (container.current?.dataset.drawing !== 'true') {
        if (pointsRef.current.length) {
          pointsRef.current = [];
          setPointCount(0);
          setDrawMessage('');
          updatePolygon(map, []);
          callbacks.current.onPolygon?.([]);
          callbacks.current.onFinish?.(null);
        }
        callbacks.current.onLocation?.(event.lngLat.lat, event.lngLat.lng);
        markerRef.current?.setLngLat(event.lngLat);
        return;
      }
      if (container.current?.dataset.drawing === 'true') {
        if (pointsRef.current.length >= 499) { setDrawMessage('Maximum 499 corners. Finish or undo a corner.'); return; }
        pointsRef.current = [...pointsRef.current, [event.lngLat.lng, event.lngLat.lat]];
        setPointCount(pointsRef.current.length);
        updatePolygon(map, pointsRef.current);
      }
    });
    map.on('mousemove', (event: MapMouseEvent) => {
      if (container.current?.dataset.drawing === 'true' && pointsRef.current.length) updatePolygon(map, pointsRef.current, [event.lngLat.lng, event.lngLat.lat]);
    });
    map.on('move', () => updatePolygon(map, pointsRef.current));
    map.on('resize', () => updatePolygon(map, pointsRef.current));
    mapRef.current = map;
    setReady(true);
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    markerRef.current?.setLngLat([longitude, latitude]);
    mapRef.current?.easeTo({ center: [longitude, latitude], duration: 650 });
  }, [latitude, longitude]);

  useEffect(() => {
    (mapRef.current?.getSource('crop-highlights') as GeoJSONSource | undefined)?.setData(highlights ?? { type: 'FeatureCollection', features: [] });
  }, [highlights]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady) return;
    if (map.getLayer('earth-engine')) map.removeLayer('earth-engine');
    if (map.getSource('earth-engine')) map.removeSource('earth-engine');
    if (map.getLayer('cropland-2025')) map.setLayoutProperty('cropland-2025', 'visibility', rasterLayer ? 'none' : 'visible');
    if (rasterLayer) {
      map.addSource('earth-engine', { type: 'raster', tiles: [window.location.origin+rasterLayer.tileUrl], bounds: rasterLayer.bounds as [number,number,number,number], minzoom: 8, maxzoom: 17, tileSize: 256, attribution: rasterLayer.title });
      map.addLayer({ id: 'earth-engine', type: 'raster', source: 'earth-engine', paint: { 'raster-opacity': .8 } }, 'farm-fill');
      map.fitBounds([[rasterLayer.bounds[0],rasterLayer.bounds[1]],[rasterLayer.bounds[2],rasterLayer.bounds[3]]], { padding: 50, maxZoom: 15 });
    }
  }, [rasterLayer, styleReady]);

  const updatePolygon = (map: MapLibreMap, points: number[][], cursor?: number[]) => {
    // Screen-space feedback remains visible even while WebGL tiles/workers load.
    const project = (point: number[]) => { const pixel = map.project([point[0], point[1]]); return [pixel.x, pixel.y]; };
    setScreenPoints(points.map(project));
    setScreenCursor(cursor ? project(cursor) : null);
    const data: FeatureCollection = { type: 'FeatureCollection', features: points.map(point => ({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: point } })) };
    if (points.length >= 2) data.features.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: points } });
    if (points.length >= 3) data.features.push({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[...points, points[0]]] } });
    if (cursor && points.length) data.features.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [points.at(-1)!, cursor] } });
    (map.getSource('farm-polygon') as GeoJSONSource | undefined)?.setData(data);
  };

  const finishPolygon = () => {
    const ring = [...pointsRef.current, pointsRef.current[0]];
    const result = validateFarmPolygon({ type: 'Polygon', coordinates: [ring] }, { min: .01, max: 3000 });
    if (!result.ok) { setDrawMessage(result.message); return; }
    const vertices = ring.slice(0, -1);
    const centroid = vertices.reduce((point, [longitude, latitude]) => ({ longitude: point.longitude + longitude, latitude: point.latitude + latitude }), { longitude: 0, latitude: 0 });
    const summary: FarmBoundarySummary = {
      coordinates: ring,
      areaHectares: result.areaHectares,
      perimeterKm: ring.slice(0, -1).reduce((total, point, index) => total + distanceKm(point, ring[index + 1]), 0),
      vertexCount: vertices.length,
      centroid: { latitude: centroid.latitude / vertices.length, longitude: centroid.longitude / vertices.length },
    };
    callbacks.current.onPolygon?.(ring);
    callbacks.current.onFinish?.(summary);
    setDrawMessage(`Boundary saved · approximately ${result.areaHectares.toFixed(2)} hectares. Not a surveyed measurement.`);
    if (mapRef.current) { updatePolygon(mapRef.current, pointsRef.current); mapRef.current.getCanvas().style.cursor = ''; mapRef.current.doubleClickZoom.enable(); }
    setIsDrawing(false);
    if (container.current) container.current.dataset.drawing = '';
  };

  const toggleDrawing = () => {
    pointsRef.current = [];
    setPointCount(0);
    setIsDrawing(true);
    setDrawMessage('Click or tap each corner to connect boundary lines. Use Finish to close the area.');
    callbacks.current.onPolygon?.([]);
    callbacks.current.onFinish?.(null);
    if (mapRef.current) { mapRef.current.getCanvas().style.cursor = 'crosshair'; mapRef.current.doubleClickZoom.disable(); }
    if (container.current) container.current.dataset.drawing = 'true';
    if (mapRef.current) updatePolygon(mapRef.current, []);
  };

  const clearDrawing = () => {
    pointsRef.current = [];
    setPointCount(0);
    setIsDrawing(false);
    setDrawMessage('');
    if (mapRef.current) { mapRef.current.getCanvas().style.cursor = ''; mapRef.current.doubleClickZoom.enable(); }
    if (container.current) container.current.dataset.drawing = '';
    if (mapRef.current) updatePolygon(mapRef.current, []);
    callbacks.current.onPolygon?.([]);
    callbacks.current.onFinish?.(null);
  };

  const locate = () => navigator.geolocation?.getCurrentPosition((position) => onLocation?.(position.coords.latitude, position.coords.longitude));

  return <div className="farm-map-wrap">
    <div ref={container} className="farm-map" aria-label="Interactive satellite map centred on Ghana" />
    {drawing && <svg className="boundary-overlay" aria-label={`Farm boundary with ${pointCount} corners`}>
      {screenPoints.length >= 3 && <polygon points={screenPoints.map(p => p.join(',')).join(' ')} fill="#b8ef6533" stroke="#e8ffb9" strokeWidth="3"/>}
      {screenPoints.length >= 2 && <polyline points={screenPoints.map(p => p.join(',')).join(' ')} fill="none" stroke="#e8ffb9" strokeWidth="3"/>}
      {screenCursor && screenPoints.length > 0 && <line x1={screenPoints.at(-1)![0]} y1={screenPoints.at(-1)![1]} x2={screenCursor[0]} y2={screenCursor[1]} stroke="#fff" strokeWidth="2" strokeDasharray="6 4"/>}
      {screenPoints.map((point, i) => <circle key={i} cx={point[0]} cy={point[1]} r="5" fill="#fff" stroke="#456725" strokeWidth="2"/>)}
    </svg>}
    {mapError && <p role="status" className="map-error">{mapError}</p>}
    <div className="map-badge"><span className="chip-dot" /> Satellite · Ghana</div>
    <div className="map-zoom" aria-label="Map controls">
      <button onClick={() => mapRef.current?.zoomIn()} aria-label="Zoom in" title="Zoom in"><Plus size={18} /></button>
      <button onClick={() => mapRef.current?.zoomOut()} aria-label="Zoom out" title="Zoom out"><Minus size={18} /></button>
      <button onClick={locate} aria-label="Use my location" title="Use my location"><Crosshair size={18} /></button>
    </div>
    {drawing && <div className="draw-controls">
      {!isDrawing ? <button className="btn btn-primary" disabled={!ready} onClick={toggleDrawing}><Layers3 size={16} /> Draw farm</button> : <button className="btn btn-primary" disabled={pointCount < 3} onClick={finishPolygon}>Finish ({pointCount})</button>}
      {isDrawing && <><button className="btn" disabled={!pointCount} onClick={() => { pointsRef.current.pop(); setPointCount(pointsRef.current.length); if (mapRef.current) updatePolygon(mapRef.current, pointsRef.current); }}>Undo corner</button><button className="btn" onClick={clearDrawing}>Cancel</button></>}
      {pointCount > 0 && <button className="btn btn-ghost" onClick={clearDrawing} aria-label="Clear drawn boundary"><RotateCcw size={16} /> Clear</button>}
    </div>}
    {drawing && drawMessage && <p className="draw-help" role="status">{drawMessage}</p>}
  </div>;
}
