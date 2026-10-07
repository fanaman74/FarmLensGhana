import { z } from 'zod';
import { pointInPolygon, polygonCentroid } from '../geo/geojson';

/**
 * Free, keyless providers queried for a drawn farm. Each section succeeds or fails on its own so one
 * slow provider never hides the others.
 */
export type ReportSection<T> =
  | { ok: true; data: T; source: string; resolution: string }
  | { ok: false; error: string; source: string };

export interface PlaceInfo { community: string | null; district: string | null; region: string | null; displayName: string }
export interface ElevationInfo { centre: number; min: number; max: number; mean: number; samples: number }
export interface SoilLayerValue { label: string; unit: string; byDepth: { depth: string; value: number | null }[]; topsoil: number | null }
export interface SoilInfo { properties: Record<SoilProperty, SoilLayerValue>; textureClass: string | null; phClass: string | null }
export interface LandCoverInfo { year: number; classes: { code: number; name: string; percent: number }[]; croplandPercent: number; baseline?: { year: number; croplandPercent: number } }
export interface ClimateInfo { period: string | null; months: { month: string; rainfallMm: number | null; maxTemperature: number | null; minTemperature: number | null; humidity: number | null; solar: number | null }[]; annualRainfallMm: number | null; wettestMonth: string | null; monthsOver100mm: number }
export interface SceneInfo { searchedDays: number; total: number; latest: { id: string; date: string; cloud: number | null } | null; latestClear: { id: string; date: string; cloud: number | null } | null; scenes: { id: string; date: string; cloud: number | null }[] }

export interface FarmReport {
  centroid: { latitude: number; longitude: number };
  place: ReportSection<PlaceInfo>;
  elevation: ReportSection<ElevationInfo>;
  soil: ReportSection<SoilInfo>;
  landCover: ReportSection<LandCoverInfo>;
  climate: ReportSection<ClimateInfo>;
  scenes: ReportSection<SceneInfo>;
  fetchedAt: string;
}

const USER_AGENT = 'FarmLens-Ghana/0.1 (+https://github.com/fanaman74/FarmLensGhana)';
const cache = new Map<string, { expires: number; data: unknown }>();

async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.data as T;
  const data = await load();
  if (cache.size >= 500) cache.delete(cache.keys().next().value!);
  cache.set(key, { expires: Date.now() + ttlMs, data });
  return data;
}

async function fetchJson(url: URL | string, init: RequestInit = {}, timeoutMs = 12_000): Promise<unknown> {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs), headers: { Accept: 'application/json', 'User-Agent': USER_AGENT, ...init.headers } });
  if (response.status === 429) throw new ProviderBusy();
  if (!response.ok) throw new Error(`Upstream returned ${response.status}`);
  return response.json();
}

class ProviderBusy extends Error {}

function failure(error: unknown, source: string, fallback: string): { ok: false; error: string; source: string } {
  if (error instanceof ProviderBusy) return { ok: false, error: `${source} is busy. Retry in a minute.`, source };
  if (error instanceof DOMException && error.name === 'TimeoutError') return { ok: false, error: `${source} did not respond in time.`, source };
  if (error instanceof NoData) return { ok: false, error: error.message, source };
  return { ok: false, error: fallback, source };
}

class NoData extends Error {}

const round = (value: number, places: number) => Number(value.toFixed(places));

// ---------- Place: OpenStreetMap Nominatim (free, no key; max 1 request/second, identify the app) ----------

let nominatimQueue = Promise.resolve();
let nominatimLast = 0;
function nominatimSlot() {
  const next = nominatimQueue.then(async () => {
    const wait = nominatimLast + 1100 - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    nominatimLast = Date.now();
  });
  nominatimQueue = next.catch(() => undefined);
  return next;
}

const nominatimSchema = z.object({
  display_name: z.string(),
  address: z.record(z.string(), z.string()).optional(),
});

export function parsePlace(input: unknown): PlaceInfo {
  const raw = nominatimSchema.parse(input);
  const address = raw.address ?? {};
  const pick = (...keys: string[]) => keys.map((key) => address[key]).find(Boolean) ?? null;
  return {
    community: pick('village', 'hamlet', 'town', 'city', 'suburb', 'neighbourhood', 'locality', 'isolated_dwelling'),
    district: pick('county', 'state_district', 'municipality', 'city_district'),
    region: pick('state', 'region'),
    displayName: raw.display_name,
  };
}

export async function getPlace(latitude: number, longitude: number): Promise<ReportSection<PlaceInfo>> {
  const source = 'OpenStreetMap Nominatim';
  try {
    const data = await cached(`place:${latitude.toFixed(3)},${longitude.toFixed(3)}`, 86_400_000, async () => {
      const url = new URL('https://nominatim.openstreetmap.org/reverse');
      url.search = new URLSearchParams({ lat: String(latitude), lon: String(longitude), format: 'jsonv2', zoom: '14', addressdetails: '1', 'accept-language': 'en' }).toString();
      await nominatimSlot();
      const raw = await fetchJson(url);
      if (raw && typeof raw === 'object' && 'error' in raw) throw new NoData('No named place was found near this farm.');
      return parsePlace(raw);
    });
    return { ok: true, data, source, resolution: 'Nearest mapped place to the farm centre' };
  } catch (error) { return failure(error, source, 'Place names are unavailable right now.'); }
}

// ---------- Elevation: Open-Meteo Elevation API (Copernicus DEM GLO-90, free, no key) ----------

/** Corners plus an interior grid, capped at the provider's 100-point limit. */
export function elevationSamplePoints(ring: number[][], centroid: { latitude: number; longitude: number }): number[][] {
  const corners = ring.slice(0, -1);
  const lons = corners.map(([lon]) => lon), lats = corners.map(([, lat]) => lat);
  const [west, east, south, north] = [Math.min(...lons), Math.max(...lons), Math.min(...lats), Math.max(...lats)];
  const interior: number[][] = [];
  const steps = 8;
  for (let i = 1; i < steps; i++) for (let j = 1; j < steps; j++) {
    const point = [west + (east - west) * i / steps, south + (north - south) * j / steps];
    if (pointInPolygon(point, ring)) interior.push(point);
  }
  const cornerBudget = Math.max(0, 99 - Math.min(interior.length, 49));
  const cornerStride = Math.max(1, Math.ceil(corners.length / cornerBudget));
  return [[centroid.longitude, centroid.latitude], ...interior.slice(0, 49), ...corners.filter((_, index) => index % cornerStride === 0)].slice(0, 100);
}

const elevationSchema = z.object({ elevation: z.array(z.number().nullable()) });

export async function getElevation(ring: number[][], centroid: { latitude: number; longitude: number }): Promise<ReportSection<ElevationInfo>> {
  const source = 'Open-Meteo Elevation (Copernicus DEM)';
  try {
    const points = elevationSamplePoints(ring, centroid);
    const url = new URL('https://api.open-meteo.com/v1/elevation');
    url.searchParams.set('latitude', points.map(([, lat]) => lat.toFixed(5)).join(','));
    url.searchParams.set('longitude', points.map(([lon]) => lon.toFixed(5)).join(','));
    const raw = elevationSchema.parse(await cached(url.toString(), 86_400_000, () => fetchJson(url)));
    const values = raw.elevation.filter((value): value is number => value != null && Number.isFinite(value));
    if (!values.length || raw.elevation[0] == null) throw new NoData('No elevation data for this location.');
    return {
      ok: true, source, resolution: '90 m digital elevation model',
      data: { centre: round(raw.elevation[0], 0), min: round(Math.min(...values), 0), max: round(Math.max(...values), 0), mean: round(values.reduce((a, b) => a + b, 0) / values.length, 0), samples: values.length },
    };
  } catch (error) { return failure(error, source, 'Elevation is unavailable right now.'); }
}

// ---------- Soil: ISRIC SoilGrids 2.0 (free, no key; fair use 5 requests/minute) ----------

export const soilProperties = {
  phh2o: { label: 'pH (water)', unit: '' },
  clay: { label: 'Clay', unit: '%' },
  sand: { label: 'Sand', unit: '%' },
  silt: { label: 'Silt', unit: '%' },
  soc: { label: 'Organic carbon', unit: 'g/kg' },
  nitrogen: { label: 'Total nitrogen', unit: 'g/kg' },
  cec: { label: 'Cation exchange capacity', unit: 'cmol(c)/kg' },
  bdod: { label: 'Bulk density', unit: 'g/cm³' },
} as const;
export type SoilProperty = keyof typeof soilProperties;
const soilDepths = [{ label: '0-5cm', thickness: 5 }, { label: '5-15cm', thickness: 10 }, { label: '15-30cm', thickness: 15 }];

const soilSchema = z.object({
  properties: z.object({
    layers: z.array(z.object({
      name: z.string(),
      unit_measure: z.object({ d_factor: z.number() }),
      depths: z.array(z.object({ label: z.string(), values: z.object({ mean: z.number().nullable() }) })),
    })),
  }),
});

/** USDA texture triangle. */
export function textureClass(sandInput: number, siltInput: number, clayInput: number): string {
  const total = sandInput + siltInput + clayInput;
  const sand = sandInput / total * 100, silt = siltInput / total * 100, clay = clayInput / total * 100;
  if (silt + 1.5 * clay < 15) return 'Sand';
  if (silt + 2 * clay < 30) return 'Loamy sand';
  if ((clay >= 7 && clay < 20 && sand > 52) || (clay < 7 && silt < 50)) return 'Sandy loam';
  if (clay >= 7 && clay < 27 && silt >= 28 && silt < 50 && sand <= 52) return 'Loam';
  if (silt >= 80 && clay < 12) return 'Silt';
  if ((silt >= 50 && clay >= 12 && clay < 27) || (silt >= 50 && silt < 80 && clay < 12)) return 'Silt loam';
  if (clay >= 20 && clay < 35 && silt < 28 && sand > 45) return 'Sandy clay loam';
  if (clay >= 27 && clay < 40 && sand > 20 && sand <= 45) return 'Clay loam';
  if (clay >= 27 && clay < 40 && sand <= 20) return 'Silty clay loam';
  if (clay >= 35 && sand > 45) return 'Sandy clay';
  if (clay >= 40 && silt >= 40) return 'Silty clay';
  return 'Clay';
}

export function phClass(ph: number): string {
  if (ph < 4.5) return 'Extremely acidic';
  if (ph < 5.5) return 'Strongly acidic';
  if (ph < 6.5) return 'Moderately to slightly acidic';
  if (ph <= 7.5) return 'Near neutral';
  if (ph <= 8.5) return 'Moderately alkaline';
  return 'Strongly alkaline';
}

export function parseSoil(input: unknown): SoilInfo {
  const raw = soilSchema.parse(input);
  const properties = {} as Record<SoilProperty, SoilLayerValue>;
  for (const name of Object.keys(soilProperties) as SoilProperty[]) {
    const layer = raw.properties.layers.find((item) => item.name === name);
    const byDepth = soilDepths.map(({ label }) => {
      const mean = layer?.depths.find((depth) => depth.label === label)?.values.mean;
      return { depth: label.replace('-', '–').replace('cm', ' cm'), value: mean == null || !layer ? null : mean / layer.unit_measure.d_factor };
    });
    const known = byDepth.map((item, index) => ({ value: item.value, thickness: soilDepths[index].thickness })).filter((item): item is { value: number; thickness: number } => item.value != null);
    const thickness = known.reduce((sum, item) => sum + item.thickness, 0);
    properties[name] = { ...soilProperties[name], byDepth, topsoil: thickness ? known.reduce((sum, item) => sum + item.value * item.thickness, 0) / thickness : null };
  }
  if (Object.values(properties).every((property) => property.topsoil == null)) throw new NoData('SoilGrids has no estimate here. It masks built-up areas and water bodies.');
  const { sand, silt, clay, phh2o } = properties;
  return {
    properties,
    textureClass: sand.topsoil != null && silt.topsoil != null && clay.topsoil != null ? textureClass(sand.topsoil, silt.topsoil, clay.topsoil) : null,
    phClass: phh2o.topsoil != null ? phClass(phh2o.topsoil) : null,
  };
}

const soilCalls: number[] = [];
export async function getSoil(latitude: number, longitude: number): Promise<ReportSection<SoilInfo>> {
  const source = 'ISRIC SoilGrids 2.0';
  try {
    // SoilGrids cells are 250 m, so nearby farm centres share a cached answer.
    const data = await cached(`soil:${latitude.toFixed(3)},${longitude.toFixed(3)}`, 7 * 86_400_000, async () => {
      const now = Date.now();
      while (soilCalls.length && soilCalls[0] < now - 60_000) soilCalls.shift();
      if (soilCalls.length >= 5) throw new ProviderBusy();
      soilCalls.push(now);
      const url = new URL('https://rest.isric.org/soilgrids/v2.0/properties/query');
      url.searchParams.set('lon', longitude.toFixed(5));
      url.searchParams.set('lat', latitude.toFixed(5));
      for (const property of Object.keys(soilProperties)) url.searchParams.append('property', property);
      for (const { label } of soilDepths) url.searchParams.append('depth', label);
      url.searchParams.set('value', 'mean');
      return parseSoil(await fetchJson(url, {}, 20_000));
    });
    return { ok: true, data, source, resolution: '250 m modelled soil grid at the farm centre' };
  } catch (error) { return failure(error, source, 'Soil properties are unavailable right now.'); }
}

// ---------- Land cover: Esri / Impact Observatory Sentinel-2 10 m land cover (free, no key) ----------

export const landCoverClasses: Record<number, string> = { 1: 'Water', 2: 'Trees', 4: 'Flooded vegetation', 5: 'Crops', 7: 'Built area', 8: 'Bare ground', 9: 'Snow/ice', 10: 'Clouds', 11: 'Rangeland' };
const LAND_COVER_YEAR = 2025;
const LAND_COVER_BASELINE = 2017;
const histogramSchema = z.object({ histograms: z.array(z.object({ size: z.number(), min: z.number(), max: z.number(), counts: z.array(z.number()) })) });

export function parseLandCover(input: unknown, year: number): LandCoverInfo {
  const [histogram] = histogramSchema.parse(input).histograms;
  if (!histogram) throw new NoData('No land-cover pixels fall inside this boundary.');
  const width = (histogram.max - histogram.min) / histogram.size;
  const totals = new Map<number, number>();
  histogram.counts.forEach((count, index) => {
    const code = Math.round(histogram.min + width * (index + .5));
    if (count > 0 && landCoverClasses[code]) totals.set(code, (totals.get(code) ?? 0) + count);
  });
  const total = [...totals.values()].reduce((a, b) => a + b, 0);
  if (!total) throw new NoData('No land-cover pixels fall inside this boundary.');
  const classes = [...totals].map(([code, count]) => ({ code, name: landCoverClasses[code], percent: round(count / total * 100, 1) })).sort((a, b) => b.percent - a.percent);
  return { year, classes, croplandPercent: classes.find((item) => item.code === 5)?.percent ?? 0 };
}

async function landCoverHistogram(ring: number[][], year: number) {
  const body = new URLSearchParams({
    geometry: JSON.stringify({ rings: [ring], spatialReference: { wkid: 4326 } }),
    geometryType: 'esriGeometryPolygon',
    mosaicRule: JSON.stringify({ where: `Year=${year}` }),
    f: 'json',
  });
  const raw = await fetchJson('https://ic.imagery1.arcgis.com/arcgis/rest/services/Sentinel2_10m_LandCover/ImageServer/computeHistograms', { method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, 15_000);
  if (raw && typeof raw === 'object' && 'error' in raw) throw new Error('Land-cover service error');
  return parseLandCover(raw, year);
}

export async function getLandCover(ring: number[][]): Promise<ReportSection<LandCoverInfo>> {
  const source = 'Esri / Impact Observatory 10 m land cover';
  try {
    const key = `landcover:${JSON.stringify(ring)}`;
    const data = await cached(key, 86_400_000, async () => {
      const [latest, baseline] = await Promise.allSettled([landCoverHistogram(ring, LAND_COVER_YEAR), landCoverHistogram(ring, LAND_COVER_BASELINE)]);
      if (latest.status === 'rejected') throw latest.reason;
      return baseline.status === 'fulfilled' ? { ...latest.value, baseline: { year: LAND_COVER_BASELINE, croplandPercent: baseline.value.croplandPercent } } : latest.value;
    });
    return { ok: true, data, source, resolution: '10 m Sentinel-2 classification, one map per year' };
  } catch (error) { return failure(error, source, 'Land cover is unavailable right now.'); }
}

// ---------- Climate normals: NASA POWER agroclimatology (free, no key) ----------

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'] as const;
const DAYS_IN_MONTH = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const monthSchema = z.record(z.string(), z.number());
const powerSchema = z.object({
  header: z.object({ start: z.union([z.string(), z.number()]).optional(), end: z.union([z.string(), z.number()]).optional() }).optional(),
  properties: z.object({ parameter: z.object({ PRECTOTCORR: monthSchema, T2M_MAX: monthSchema.optional(), T2M_MIN: monthSchema.optional(), RH2M: monthSchema.optional(), ALLSKY_SFC_SW_DWN: monthSchema.optional() }) }),
});

export function parseClimate(input: unknown): ClimateInfo {
  const raw = powerSchema.parse(input);
  const parameter = raw.properties.parameter;
  const value = (series: Record<string, number> | undefined, month: string) => {
    const result = series?.[month];
    return result == null || result <= -999 ? null : result;
  };
  const months = MONTHS.map((month, index) => {
    const rainPerDay = value(parameter.PRECTOTCORR, month);
    return {
      month: month[0] + month.slice(1).toLowerCase(),
      rainfallMm: rainPerDay == null ? null : round(rainPerDay * DAYS_IN_MONTH[index], 0),
      maxTemperature: value(parameter.T2M_MAX, month),
      minTemperature: value(parameter.T2M_MIN, month),
      humidity: value(parameter.RH2M, month),
      solar: value(parameter.ALLSKY_SFC_SW_DWN, month),
    };
  });
  const rain = months.filter((month): month is typeof month & { rainfallMm: number } => month.rainfallMm != null);
  const wettest = rain.reduce<typeof rain[number] | null>((best, month) => !best || month.rainfallMm > best.rainfallMm ? month : best, null);
  const start = raw.header?.start, end = raw.header?.end;
  return {
    period: start && end ? `${String(start).slice(0, 4)}–${String(end).slice(0, 4)}` : null,
    months,
    annualRainfallMm: rain.length === 12 ? rain.reduce((sum, month) => sum + month.rainfallMm, 0) : null,
    wettestMonth: wettest?.month ?? null,
    monthsOver100mm: rain.filter((month) => month.rainfallMm >= 100).length,
  };
}

export async function getClimate(latitude: number, longitude: number): Promise<ReportSection<ClimateInfo>> {
  const source = 'NASA POWER';
  try {
    const data = await cached(`climate:${latitude.toFixed(2)},${longitude.toFixed(2)}`, 7 * 86_400_000, async () => {
      const url = new URL('https://power.larc.nasa.gov/api/temporal/climatology/point');
      url.search = new URLSearchParams({ parameters: 'PRECTOTCORR,T2M_MAX,T2M_MIN,RH2M,ALLSKY_SFC_SW_DWN', community: 'AG', latitude: latitude.toFixed(4), longitude: longitude.toFixed(4), format: 'JSON' }).toString();
      return parseClimate(await fetchJson(url, {}, 20_000));
    });
    return { ok: true, data, source, resolution: '~50 km satellite and reanalysis grid' };
  } catch (error) { return failure(error, source, 'Long-term climate averages are unavailable right now.'); }
}

// ---------- Imagery: Element 84 Earth Search, Sentinel-2 L2A scenes that cover the boundary ----------

const SCENE_DAYS = 60;
const stacSchema = z.object({ features: z.array(z.object({ id: z.string(), properties: z.object({ datetime: z.string(), 'eo:cloud_cover': z.number().nullable().optional() }) })) });

export async function getScenes(ring: number[][]): Promise<ReportSection<SceneInfo>> {
  const source = 'Element 84 Earth Search (Sentinel-2 L2A)';
  try {
    const end = new Date(), start = new Date(end.getTime() - SCENE_DAYS * 86_400_000);
    const raw = stacSchema.parse(await fetchJson('https://earth-search.aws.element84.com/v1/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/geo+json' },
      body: JSON.stringify({ collections: ['sentinel-2-l2a'], intersects: { type: 'Polygon', coordinates: [ring] }, datetime: `${start.toISOString()}/${end.toISOString()}`, limit: 50, sortby: [{ field: 'properties.datetime', direction: 'desc' }] }),
    }));
    const scenes = raw.features.map((feature) => ({ id: feature.id, date: feature.properties.datetime, cloud: feature.properties['eo:cloud_cover'] ?? null })).sort((a, b) => b.date.localeCompare(a.date));
    return { ok: true, source, resolution: '10 m imagery, revisit about every 5 days', data: { searchedDays: SCENE_DAYS, total: scenes.length, latest: scenes[0] ?? null, latestClear: scenes.find((scene) => scene.cloud != null && scene.cloud <= 20) ?? null, scenes: scenes.slice(0, 8) } };
  } catch (error) { return failure(error, source, 'The satellite catalogue is unavailable right now.'); }
}

export async function buildFarmReport(ring: number[][]): Promise<FarmReport> {
  const centroid = polygonCentroid(ring);
  const [place, elevation, soil, landCover, climate, scenes] = await Promise.all([
    getPlace(centroid.latitude, centroid.longitude),
    getElevation(ring, centroid),
    getSoil(centroid.latitude, centroid.longitude),
    getLandCover(ring),
    getClimate(centroid.latitude, centroid.longitude),
    getScenes(ring),
  ]);
  return { centroid, place, elevation, soil, landCover, climate, scenes, fetchedAt: new Date().toISOString() };
}
