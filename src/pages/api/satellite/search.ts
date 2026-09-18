import type { APIRoute } from 'astro';
import { z } from 'zod';

const inputSchema = z.object({
  latitude: z.number().min(4.5).max(11.5),
  longitude: z.number().min(-3.5).max(1.5),
  from: z.iso.date(),
  to: z.iso.date(),
  cloud: z.number().int().min(0).max(80),
}).strict();

const resultSchema = z.object({
  features: z.array(z.object({
    id: z.string(),
    properties: z.object({
      datetime: z.iso.datetime({ offset: true }),
      'eo:cloud_cover': z.number().nullable().optional(),
    }),
  })),
});

function isValidDateRange(from: string, to: string) {
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const fromMs = Date.parse(`${from}T00:00:00Z`);
  const toMs = Date.parse(`${to}T00:00:00Z`);
  const days = (toMs - fromMs) / 86_400_000;
  return Number.isFinite(fromMs) && Number.isFinite(toMs) && fromMs < toMs && toMs <= today && days >= 1 && days <= 93;
}

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success || !isValidDateRange(parsed.data?.from ?? '', parsed.data?.to ?? '')) {
    return Response.json({ error: 'Choose a Ghana location, a past date range of 1–93 days, and cloud cover from 0–80%.' }, { status: 400 });
  }

  const { latitude, longitude, from, to, cloud } = parsed.data;
  const query = new URL('https://earth-search.aws.element84.com/v1/search');
  query.search = new URLSearchParams({
    collections: 'sentinel-2-l2a',
    bbox: `${longitude - 0.02},${latitude - 0.02},${longitude + 0.02},${latitude + 0.02}`,
    datetime: `${from}T00:00:00Z/${to}T23:59:59Z`,
    query: JSON.stringify({ 'eo:cloud_cover': { lte: cloud } }),
    limit: '8',
    sortby: '-properties.datetime',
  }).toString();

  try {
    const response = await fetch(query, { signal: AbortSignal.timeout(12_000), headers: { Accept: 'application/geo+json' } });
    if (!response.ok) return Response.json({ error: 'Satellite catalogue unavailable. Retry shortly.' }, { status: 502 });
    const result = resultSchema.safeParse(await response.json());
    if (!result.success) return Response.json({ error: 'Satellite catalogue returned an unexpected response.' }, { status: 502 });
    return Response.json({ scenes: result.data.features.slice(0, 8).map((feature) => ({ id: feature.id, date: feature.properties.datetime, cloud: feature.properties['eo:cloud_cover'] ?? null })) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Satellite catalogue unavailable. Retry shortly.' }, { status: 502 });
  }
};
