import type { APIRoute } from 'astro';
import { validateFarmPolygon } from '../../../lib/geo/geojson';
import { buildFarmReport } from '../../../lib/api/farmReport';

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);
  const result = validateFarmPolygon(body, { min: .01, max: 3000 });
  if (!result.ok) return Response.json({ error: result.message }, { status: 400 });
  return Response.json(await buildFarmReport(result.polygon.coordinates[0]), { headers: { 'Cache-Control': 'no-store' } });
};
