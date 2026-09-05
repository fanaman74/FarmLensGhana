import type { APIRoute } from 'astro';
import { z } from 'zod';
import { geocodeGhana } from '../../lib/api/openMeteo';

const schema = z.string().trim().min(2).max(80).regex(/^[\p{L}\p{N}\s,.'-]+$/u);

export const GET: APIRoute = async ({ url }) => {
  const parsed = schema.safeParse(url.searchParams.get('q') ?? '');
  if (!parsed.success) return Response.json({ error: 'Enter at least two letters.' }, { status: 400 });
  try {
    return Response.json({ results: await geocodeGhana(parsed.data), source: 'Open-Meteo Geocoding API', fetchedAt: new Date().toISOString() }, { headers: { 'Cache-Control': 'public, max-age=86400' } });
  } catch {
    return Response.json({ error: 'Location search is temporarily unavailable.' }, { status: 502 });
  }
};
