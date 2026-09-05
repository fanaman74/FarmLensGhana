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

export function polygonAreaHectares(ring: number[][]): number {
  const meanLat = ring.reduce((sum, p) => sum+p[1], 0)/ring.length * Math.PI/180;
  const metresPerLon = 111_320*Math.cos(meanLat), metresPerLat = 110_574;
  let area = 0;
  for (let i=0; i<ring.length-1; i++) area += (ring[i][0]*metresPerLon)*(ring[i+1][1]*metresPerLat) - (ring[i+1][0]*metresPerLon)*(ring[i][1]*metresPerLat);
  return Math.abs(area/2)/10_000;
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
