import type { APIRoute } from 'astro';
import { z } from 'zod';
import { getWeather } from '../../lib/api/openMeteo';

const schema = z.object({ latitude: z.coerce.number().min(4.5).max(11.5), longitude: z.coerce.number().min(-3.5).max(1.5) });

export const GET: APIRoute = async ({ url }) => {
  const input = schema.safeParse(Object.fromEntries(url.searchParams));
  if (!input.success) return Response.json({ error: 'Use coordinates within or close to Ghana.' }, { status: 400 });
  const result = await getWeather(input.data.latitude, input.data.longitude);
  return Response.json(result, { status: result.ok ? 200 : result.error.code === 'timeout' ? 504 : 502, headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=300' } });
};
