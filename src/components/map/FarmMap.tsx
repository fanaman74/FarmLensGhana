import { useEffect, useRef, useState } from 'react';
import { AttributionControl, Map as MapLibreMap, Marker, type GeoJSONSource, type MapMouseEvent } from 'maplibre-gl';
import { Crosshair, Layers3, Minus, Plus, RotateCcw } from 'lucide-react';

interface Props {
  latitude: number;
  longitude: number;
  zoom?: number;
  drawing?: boolean;
  onLocation?: (latitude: number, longitude: number) => void;
  onPolygon?: (coordinates: number[][]) => void;
}

const imageryStyle = {
  version: 8 as const,
  sources: { imagery: { type: 'raster' as const, tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, attribution: 'Esri World Imagery' } },
  layers: [{ id: 'imagery', type: 'raster' as const, source: 'imagery' }]
};

export default function FarmMap({ latitude, longitude, zoom = 7, drawing = false, onLocation, onPolygon }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const pointsRef = useRef<number[][]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [pointCount, setPointCount] = useState(0);
  const [mapError, setMapError] = useState('');

  useEffect(() => {
    if (!container.current || mapRef.current) return;
    const map = new MapLibreMap({ container: container.current, style: imageryStyle, center: [longitude, latitude], zoom, attributionControl: false });
    map.on('error', () => setMapError('Satellite basemap could not load. Check your connection; search and field guidance remain available.'));
    map.on('idle', () => { if (map.areTilesLoaded()) setMapError(''); });
    map.addControl(new AttributionControl({ compact: true }), 'bottom-left');
    markerRef.current = new Marker({ color: '#b8ef65' }).setLngLat([longitude, latitude]).addTo(map);
    map.on('load', () => {
      map.addSource('farm-polygon', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({ id: 'farm-fill', type: 'fill', source: 'farm-polygon', paint: { 'fill-color': '#b8ef65', 'fill-opacity': .22 } });
      map.addLayer({ id: 'farm-line', type: 'line', source: 'farm-polygon', paint: { 'line-color': '#e8ffb9', 'line-width': 2.5, 'line-dasharray': [2, 1] } });
    });
    map.on('click', (event: MapMouseEvent) => {
      if (!pointsRef.current.length && !container.current?.dataset.drawing) {
        onLocation?.(event.lngLat.lat, event.lngLat.lng);
        markerRef.current?.setLngLat(event.lngLat);
        return;
      }
      if (container.current?.dataset.drawing === 'true') {
        pointsRef.current = [...pointsRef.current, [event.lngLat.lng, event.lngLat.lat]];
        setPointCount(pointsRef.current.length);
        updatePolygon(map, pointsRef.current);
      }
    });
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    markerRef.current?.setLngLat([longitude, latitude]);
    mapRef.current?.easeTo({ center: [longitude, latitude], duration: 650 });
  }, [latitude, longitude]);

  const updatePolygon = (map: MapLibreMap, points: number[][]) => {
    const ring = points.length > 2 ? [...points, points[0]] : points;
    const geometry = points.length > 2 ? { type: 'Polygon' as const, coordinates: [ring] } : { type: 'LineString' as const, coordinates: ring };
    (map.getSource('farm-polygon') as GeoJSONSource | undefined)?.setData({ type: 'Feature', properties: {}, geometry });
  };

  const finishPolygon = () => {
    if (pointsRef.current.length >= 3) onPolygon?.([...pointsRef.current, pointsRef.current[0]]);
    setIsDrawing(false);
    if (container.current) container.current.dataset.drawing = '';
  };

  const toggleDrawing = () => {
    pointsRef.current = [];
    setPointCount(0);
    setIsDrawing(true);
    if (container.current) container.current.dataset.drawing = 'true';
    if (mapRef.current) updatePolygon(mapRef.current, []);
  };

  const clearDrawing = () => {
    pointsRef.current = [];
    setPointCount(0);
    setIsDrawing(false);
    if (container.current) container.current.dataset.drawing = '';
    if (mapRef.current) updatePolygon(mapRef.current, []);
    onPolygon?.([]);
  };

  const locate = () => navigator.geolocation?.getCurrentPosition((position) => onLocation?.(position.coords.latitude, position.coords.longitude));

  return <div className="farm-map-wrap">
    <div ref={container} className="farm-map" aria-label="Interactive satellite map centred on Ghana" />
    {mapError && <p role="status" className="map-error">{mapError}</p>}
    <div className="map-badge"><span className="chip-dot" /> Satellite · Ghana</div>
    <div className="map-zoom" aria-label="Map controls">
      <button onClick={() => mapRef.current?.zoomIn()} aria-label="Zoom in" title="Zoom in"><Plus size={18} /></button>
      <button onClick={() => mapRef.current?.zoomOut()} aria-label="Zoom out" title="Zoom out"><Minus size={18} /></button>
      <button onClick={locate} aria-label="Use my location" title="Use my location"><Crosshair size={18} /></button>
    </div>
    {drawing && <div className="draw-controls">
      {!isDrawing ? <button className="btn btn-primary" onClick={toggleDrawing}><Layers3 size={16} /> Draw farm</button> : <button className="btn btn-primary" disabled={pointCount < 3} onClick={finishPolygon}>Finish ({pointCount})</button>}
      {pointCount > 0 && <button className="btn btn-ghost" onClick={clearDrawing} aria-label="Clear drawn boundary"><RotateCcw size={16} /> Clear</button>}
    </div>}
  </div>;
}
