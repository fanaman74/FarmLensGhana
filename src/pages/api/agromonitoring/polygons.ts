import type { APIRoute } from 'astro';
import { registerAgroPolygon } from '../../../lib/api/agroMonitoring';

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);
  const result = await registerAgroPolygon(body?.geometry ?? body);
  const status = result.ok ? 200 : result.error.code === 'invalid_request' ? 400 : result.error.code === 'unauthorized' ? 503 : 502;
  return Response.json(result, { status });
};
