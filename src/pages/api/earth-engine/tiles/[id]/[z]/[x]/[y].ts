import type { APIRoute } from 'astro';
import { getEarthMap } from '../../../../../../../lib/earthEngine/maps';
import { earthEngineToken } from '../../../../../../../lib/earthEngine/client';
import { secret } from '../../../../../../../lib/security/secrets';
export const GET: APIRoute = async ({ params }) => {
  if (secret('GEE_PUBLIC_MAPS_ENABLED') !== 'true') return new Response(null, { status: 503 });
  const { id, z, x, y } = params;
  if (!id || ![z,x,y].every(v => /^\d{1,6}$/.test(v ?? ''))) return new Response(null, { status: 400 });
  const zoom = Number(z), tx = Number(x), ty = Number(y);
  if (zoom < 8 || zoom > 17 || tx >= 2**zoom || ty >= 2**zoom) return new Response(null, { status: 400 });
  const entry = getEarthMap(id);
  if (!entry) return new Response(null, { status: 410 });
  const west = tx/2**zoom*360-180, east = (tx+1)/2**zoom*360-180;
  const lat = (row: number) => Math.atan(Math.sinh(Math.PI*(1-2*row/2**zoom)))*180/Math.PI;
  const [w,s,e,n] = entry.layer.bounds;
  if (east < w || west > e || lat(ty) < s || lat(ty+1) > n) return new Response(null, { status: 404 });
  try {
    const token = await earthEngineToken();
    const upstream = await fetch(`https://earthengine.googleapis.com/v1/${entry.mapid}/tiles/${zoom}/${tx}/${ty}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20000) });
    if (!upstream.ok || !upstream.headers.get('content-type')?.startsWith('image/')) return new Response(null, { status: 502 });
    return new Response(await upstream.arrayBuffer(), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'private, max-age=300' } });
  } catch { return new Response(null, { status: 502 }); }
};
