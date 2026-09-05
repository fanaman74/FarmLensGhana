import type { APIRoute } from 'astro';
import { isAdmin } from '../../../../lib/auth/adminSession';
import { earthEngine, evaluate } from '../../../../lib/earthEngine/client';
export const POST: APIRoute = async ({ cookies }) => {
  if (!isAdmin(cookies)) return Response.json({ error: 'Administrator access required.' }, { status: 401 });
  try { const ee = await earthEngine(); await evaluate(ee.Number(1)); return Response.json({ ok: true, testedAt: new Date().toISOString() }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'Earth Engine connection failed.' }, { status: 503 }); }
};
