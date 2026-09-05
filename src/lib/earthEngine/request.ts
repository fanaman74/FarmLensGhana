import { z } from 'zod';
import { validateFarmPolygon } from '../geo/geojson';
export const earthRequestSchema = z.object({
  kind: z.enum(['annual', 'cocoa', 'palm', 'radar']),
  latitude: z.number().min(4.5).max(11.5), longitude: z.number().min(-3.5).max(1.5),
  from: z.iso.date(), to: z.iso.date(), threshold: z.number().min(.3).max(.95).default(.65),
  year: z.literal(2024).default(2024), geometry: z.unknown().optional(),
});
export type EarthRequest = z.infer<typeof earthRequestSchema>;
export function validateEarthRequest(input: unknown, now = Date.now()) {
  const parsed = earthRequestSchema.safeParse(input);
  if (!parsed.success) throw new Error('Choose a supported layer, Ghana location and valid dates.');
  const request = parsed.data;
  const days = (Date.parse(request.to) - Date.parse(request.from)) / 86400000;
  if (days < 1 || days > 93 || Date.parse(request.to) > now) throw new Error('Select a past date range of 1–93 days.');
  const latDelta = 2 / 110.574, lonDelta = 2 / (111.32 * Math.cos(request.latitude * Math.PI / 180));
  const bounds = [request.longitude-lonDelta, request.latitude-latDelta, request.longitude+lonDelta, request.latitude+latDelta];
  const [w,s,e,n] = bounds;
  const geometry = request.geometry ?? { type: 'Polygon', coordinates: [[[w,s],[e,s],[e,n],[w,n],[w,s]]] };
  const validated = validateFarmPolygon(geometry, { min: .01, max: 3000 });
  if (!validated.ok) throw new Error(validated.message);
  const points = validated.polygon.coordinates[0];
  const actualBounds = [Math.min(...points.map(p => p[0])), Math.min(...points.map(p => p[1])), Math.max(...points.map(p => p[0])), Math.max(...points.map(p => p[1]))];
  // Bound extent as well as area: thin polygons must not request national tiles.
  if (actualBounds[2]-actualBounds[0] > .1 || actualBounds[3]-actualBounds[1] > .1) throw new Error('Keep the analysis extent below approximately 10 km in each direction.');
  return { ...request, geometry: validated.polygon, bounds: actualBounds };
}
export type ValidatedEarthRequest = ReturnType<typeof validateEarthRequest>;
