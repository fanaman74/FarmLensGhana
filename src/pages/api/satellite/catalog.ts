import type { APIRoute } from 'astro';
import { z } from 'zod';
import { sentinelCatalog } from '../../../lib/api/sentinelHub';
import { validateFarmPolygon } from '../../../lib/geo/geojson';

const bodySchema = z.object({ geometry: z.unknown(), from: z.iso.date(), to: z.iso.date(), cloudsMax: z.number().min(0).max(100).default(30) });
export const POST: APIRoute = async ({ request }) => {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Invalid imagery search request.' }, { status: 400 });
  const days = (Date.parse(parsed.data.to) - Date.parse(parsed.data.from)) / 86_400_000;
  if (days < 0 || days > 93 || Date.parse(parsed.data.to) > Date.now()) return Response.json({ error: 'Choose a past range of at most 93 days.' }, { status: 400 });
  const polygon = validateFarmPolygon(parsed.data.geometry, { min: .1, max: 3000 });
  if (!polygon.ok) return Response.json({ error: polygon.message }, { status: 400 });
  const result = await sentinelCatalog(polygon.polygon, parsed.data.from, parsed.data.to, parsed.data.cloudsMax);
  return Response.json(result, { status: result.ok ? 200 : result.error.code === 'unauthorized' ? 503 : 502 });
};
