import type { APIRoute } from 'astro';
import { ghanaCities } from '../../../data/ghanaCities';
import { getCitySnapshots } from '../../../lib/api/openMeteo';

export const GET: APIRoute = async () => {
  const result = await getCitySnapshots(ghanaCities);
  return Response.json(result, { status: result.ok ? 200 : result.error.code === 'timeout' ? 504 : 502, headers: { 'Cache-Control': result.ok ? 'public, max-age=600, stale-while-revalidate=600' : 'no-store' } });
};
