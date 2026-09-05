import { randomUUID } from 'node:crypto';
import { earthEngine, evaluate } from './client';
import type { ValidatedEarthRequest } from './request';

type Layer = { id: string; tileUrl: string; title: string; source: string; from: string; to: string; latestObservation: string; imageCount: number; threshold: number | null; bounds: number[]; expiresAt: string; caveat: string };
const maps = new Map<string, { key: string; mapid: string; layer: Layer; expires: number }>();
let active = 0;
export function getEarthMap(id: string) {
  const entry = maps.get(id);
  if (!entry || entry.expires <= Date.now()) { maps.delete(id); return undefined; }
  return entry;
}
export async function createEarthMap(request: ValidatedEarthRequest): Promise<Layer> {
  const key = JSON.stringify(request);
  for (const [id, entry] of maps) { if (entry.expires <= Date.now()) maps.delete(id); else if (entry.key === key) return entry.layer; }
  if (active >= 2) throw new Error('Two Earth Engine requests are already processing. Please try again shortly.');
  active++;
  try {
    const ee = await earthEngine();
    const area = ee.Geometry(request.geometry);
    const tree = request.kind === 'cocoa' || request.kind === 'palm';
    const from = tree ? `${request.year}-01-01` : request.from;
    const endExclusive = tree ? `${request.year+1}-01-01` : new Date(Date.parse(request.to)+86400000).toISOString().slice(0,10);
    const source = tree ? `projects/forestdatapartnership/assets/${request.kind}/model_2025b` : request.kind === 'annual' ? 'GOOGLE/DYNAMICWORLD/V1' : 'COPERNICUS/S1_GRD';
    let collection = ee.ImageCollection(source).filterBounds(area).filterDate(from, endExclusive);
    if (request.kind === 'radar') collection = collection.filter(ee.Filter.eq('instrumentMode', 'IW')).filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING')).filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'));
    const metadata = await evaluate<{ count: number; latest: number | null }>(ee.Dictionary({ count: collection.size(), latest: collection.aggregate_max('system:time_start') }));
    if (!metadata.count || metadata.latest == null) throw new Error('No source observations cover this area in the selected period. Try another date range.');
    const probability = collection.select(tree ? 'probability' : request.kind === 'annual' ? 'crops' : 'VH').mean().clip(area);
    const image = request.kind === 'radar' ? probability : probability.updateMask(probability.gte(request.threshold));
    const visualization = request.kind === 'radar' ? { min: -25, max: -5, palette: ['071810','518b7a','f4f1de'] } : { min: request.threshold, max: 1, palette: ['fff1a8','ffb547','d56031'] };
    const result = await new Promise<{ mapid: string }>((resolve, reject) => image.getMapId(visualization, (map: { mapid: string }, error?: string) => error ? reject(new Error('Earth Engine could not create the map. Check dataset access and quota.')) : resolve(map)));
    if (!/^projects\/[a-zA-Z0-9_-]+\/maps\/[a-zA-Z0-9_-]+$/.test(result.mapid)) throw new Error('Unexpected Earth Engine map response.');
    const id = randomUUID(), expires = Date.now()+20*60000;
    const layer: Layer = { id, tileUrl: `/api/earth-engine/tiles/${id}/{z}/{x}/{y}`, source, bounds: request.bounds,
      title: tree ? `${request.kind === 'cocoa' ? 'Cocoa' : 'Palm'} probability · 2024` : request.kind === 'annual' ? 'Recent annual-crop probability' : 'Sentinel-1 VH radar · mean dB',
      from, to: tree ? `${request.year}-12-31` : request.to, latestObservation: new Date(metadata.latest).toISOString(), imageCount: metadata.count,
      threshold: request.kind === 'radar' ? null : request.threshold, expiresAt: new Date(expires).toISOString(),
      caveat: tree ? 'Produced by Google for the Forest Data Partnership · CC-BY 4.0. Model 2025b, observation year 2024. Probabilities are not confirmed field boundaries. Threshold is user-selected, not locally calibrated.' : request.kind === 'annual' ? 'Dynamic World / Google & WRI · CC-BY 4.0. Mean of available cloud-masked observations; missing pixels are no-data. The crops class does not distinguish maize, rice or other species.' : 'Copernicus Sentinel-1 GRD. Descending IW VH mean; radar works through clouds but backscatter does not identify crop species. No-data is not absence.',
    };
    if (maps.size >= 100) maps.delete(maps.keys().next().value!);
    maps.set(id, { key, mapid: result.mapid, layer, expires });
    return layer;
  } finally { active--; }
}
