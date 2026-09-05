import type { APIRoute } from 'astro';
import { z } from 'zod';
const coordinates = z.object({ latitude: z.coerce.number().min(4.5).max(11.5), longitude: z.coerce.number().min(-3.5).max(1.5) });
export const GET: APIRoute = async ({ url }) => {
  const input = coordinates.safeParse(Object.fromEntries(url.searchParams));
  if (!input.success) return Response.json({ error: 'Select a location in Ghana.' }, { status: 400 });
  const { latitude, longitude } = input.data;
  const end = new Date(), start = new Date(end.getTime() - 30 * 86400000);
  const query = new URL('https://earth-search.aws.element84.com/v1/search');
  query.search = new URLSearchParams({ collections: 'sentinel-2-l2a', bbox: `${longitude-.02},${latitude-.02},${longitude+.02},${latitude+.02}`, datetime: `${start.toISOString()}/${end.toISOString()}`, limit: '6', sortby: '-properties.datetime' }).toString();
  try {
    const response = await fetch(query, { signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error();
    const raw = z.object({ features: z.array(z.object({ id: z.string(), properties: z.object({ datetime: z.iso.datetime({ offset: true }), 'eo:cloud_cover': z.number().optional() }) })) }).parse(await response.json());
    return Response.json({ scenes: raw.features.map(feature => ({ id: feature.id, date: feature.properties.datetime, cloud: feature.properties['eo:cloud_cover'] ?? null })), from: start.toISOString(), to: end.toISOString() }, { headers: { 'Cache-Control': 'public, max-age=300' } });
  } catch { return Response.json({ error: 'Recent imagery catalogue unavailable. Retry shortly.' }, { status: 502 }); }
};
