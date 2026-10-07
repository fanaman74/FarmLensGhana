import { z } from 'zod';

const coordinate = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);
export const polygonSchema = z.object({ type: z.literal('Polygon'), coordinates: z.array(z.array(coordinate).min(4).max(500)).length(1) });
export type Polygon = z.infer<typeof polygonSchema>;

function segmentsIntersect(a: number[], b: number[], c: number[], d: number[]) {
  const cross = (p: number[], q: number[], r: number[]) => (q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);
  const c1 = cross(a,b,c), c2 = cross(a,b,d), c3 = cross(c,d,a), c4 = cross(c,d,b);
  const onSegment = (p: number[], q: number[], r: number[]) => Math.abs(cross(p,q,r)) < 1e-12 && r[0] >= Math.min(p[0],q[0]) && r[0] <= Math.max(p[0],q[0]) && r[1] >= Math.min(p[1],q[1]) && r[1] <= Math.max(p[1],q[1]);
  if (onSegment(a,b,c) || onSegment(a,b,d) || onSegment(c,d,a) || onSegment(c,d,b)) return true;
  return ((c1 > 0 && c2 < 0) || (c1 < 0 && c2 > 0)) && ((c3 > 0 && c4 < 0) || (c3 < 0 && c4 > 0));
}

export function isSelfIntersecting(ring: number[][]): boolean {
  for (let i=0; i<ring.length-1; i++) for (let j=i+1; j<ring.length-1; j++) {
    if (Math.abs(i-j) <= 1 || (i===0 && j===ring.length-2)) continue;
    if (segmentsIntersect(ring[i], ring[i+1], ring[j], ring[j+1])) return true;
  }
  return false;
}

const toRadians = (value: number) => value * Math.PI / 180;
const openRing = (ring: number[][]) => ring.length > 1 && ring[0][0] === ring.at(-1)![0] && ring[0][1] === ring.at(-1)![1] ? ring.slice(0, -1) : ring;

/**
 * WGS84 metres per degree at the ring's mean latitude. Farms are at most a few kilometres across, so a
 * local ellipsoidal projection is within 0.01% of a full geodesic calculation; a spherical Earth
 * overstates areas in Ghana by about 0.6%.
 */
function localScale(points: number[][]) {
  const latitude = toRadians(points.reduce((sum, point) => sum + point[1], 0) / points.length);
  return {
    x: 111_412.84 * Math.cos(latitude) - 93.5 * Math.cos(3 * latitude) + 0.118 * Math.cos(5 * latitude),
    y: 111_132.92 - 559.82 * Math.cos(2 * latitude) + 1.175 * Math.cos(4 * latitude) - 0.0023 * Math.cos(6 * latitude),
  };
}

export function polygonAreaHectares(ring: number[][]): number {
  const points = openRing(ring);
  if (points.length < 3) return 0;
  const scale = localScale(points);
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const [x0, y0] = points[i], [x1, y1] = points[(i + 1) % points.length];
    area += (x0 * scale.x) * (y1 * scale.y) - (x1 * scale.x) * (y0 * scale.y);
  }
  return Math.abs(area / 2) / 10_000;
}

/** Length around the closed boundary. */
export function polygonPerimeterKm(ring: number[][]): number {
  const points = openRing(ring);
  const scale = localScale(points);
  return points.reduce((total, point, index) => {
    const next = points[(index + 1) % points.length];
    return total + Math.hypot((next[0] - point[0]) * scale.x, (next[1] - point[1]) * scale.y) / 1000;
  }, 0);
}

/** Area-weighted centroid. Averaging corners drifts toward whichever side has more clicks. */
export function polygonCentroid(ring: number[][]): { latitude: number; longitude: number } {
  const points = openRing(ring);
  const origin = points[0];
  const scale = Math.cos(toRadians(points.reduce((sum, point) => sum + point[1], 0) / points.length));
  const local = points.map(([lon, lat]) => [(lon - origin[0]) * scale, lat - origin[1]]);
  let twiceArea = 0, x = 0, y = 0;
  for (let i = 0; i < local.length; i++) {
    const [x0, y0] = local[i], [x1, y1] = local[(i + 1) % local.length];
    const cross = x0 * y1 - x1 * y0;
    twiceArea += cross; x += (x0 + x1) * cross; y += (y0 + y1) * cross;
  }
  if (Math.abs(twiceArea) < 1e-18) {
    const mean = points.reduce((sum, [lon, lat]) => [sum[0] + lon, sum[1] + lat], [0, 0]);
    return { longitude: mean[0] / points.length, latitude: mean[1] / points.length };
  }
  return { longitude: origin[0] + x / (3 * twiceArea) / scale, latitude: origin[1] + y / (3 * twiceArea) };
}

/** Ray-casting test for [longitude, latitude] points. */
export function pointInPolygon(point: number[], ring: number[][]): boolean {
  const points = openRing(ring);
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i], [xj, yj] = points[j];
    if ((yi > point[1]) !== (yj > point[1]) && point[0] < (xj - xi) * (point[1] - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function validateFarmPolygon(input: unknown, limits = { min: 1, max: 3000 }) {
  const parsed = polygonSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, message: 'Use a valid GeoJSON Polygon with longitude, latitude coordinates.' };
  const ring = parsed.data.coordinates[0];
  if (ring.some(([lon,lat]) => lon < -3.5 || lon > 1.5 || lat < 4.5 || lat > 11.5)) return { ok: false as const, message: 'Choose a farm within Ghana or its immediate border area.' };
  if (new Set(ring.slice(0,-1).map((point) => point.join(','))).size !== ring.length - 1) return { ok: false as const, message: 'Boundary vertices must be distinct.' };
  if (ring[0][0] !== ring.at(-1)?.[0] || ring[0][1] !== ring.at(-1)?.[1]) return { ok: false as const, message: 'Polygon ring must be closed.' };
  if (isSelfIntersecting(ring)) return { ok: false as const, message: 'Polygon boundary must not cross itself.' };
  const areaHectares = polygonAreaHectares(ring);
  if (areaHectares < limits.min || areaHectares > limits.max) return { ok: false as const, message: `Farm area must be between ${limits.min.toLocaleString()} and ${limits.max.toLocaleString()} hectares.`, areaHectares };
  return { ok: true as const, polygon: parsed.data, areaHectares };
}
