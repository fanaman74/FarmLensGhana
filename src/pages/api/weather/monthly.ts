import type { APIRoute } from 'astro';
import { z } from 'zod';
import { getMonthlyWeather } from '../../../lib/api/monthlyWeather';
const coordinates = z.object({ latitude: z.coerce.number().min(4.5).max(11.5), longitude: z.coerce.number().min(-3.5).max(1.5) });
export const GET: APIRoute = async ({ url }) => {
  const parsed = coordinates.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return Response.json({ error: 'Select a location in Ghana.' }, { status: 400 });
  try { return Response.json(await getMonthlyWeather(parsed.data.latitude, parsed.data.longitude)); }
  catch { return Response.json({ error: 'Monthly outlook is temporarily unavailable. Please retry.' }, { status: 502 }); }
};
