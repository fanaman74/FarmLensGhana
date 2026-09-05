import type { APIRoute } from 'astro';
import { validateEarthRequest } from '../../../lib/earthEngine/request';
import { createEarthMap } from '../../../lib/earthEngine/maps';
import { secret } from '../../../lib/security/secrets';
export const POST: APIRoute = async ({ request }) => {
  let input;
  try { input = validateEarthRequest(await request.json()); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'Invalid map request.' }, { status: 400 }); }
  if (secret('GEE_PUBLIC_MAPS_ENABLED') !== 'true') return Response.json({ error: 'Earth Engine maps need administrator setup. Enable server authentication and visitor maps in Settings.' }, { status: 503 });
  try { return Response.json(await createEarthMap(input), { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'Earth Engine is unavailable.' }, { status: 502 }); }
};
