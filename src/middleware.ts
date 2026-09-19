import { defineMiddleware } from 'astro:middleware';

const requests = new Map<string, { count: number; until: number }>();

function isSameOriginRequest(request: Request, requestUrl: URL) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  let originUrl: URL;
  try { originUrl = new URL(origin); } catch { return false; }
  if (originUrl.host !== requestUrl.host) return false;
  if (originUrl.protocol === requestUrl.protocol) return true;
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  if (forwardedProto && originUrl.protocol === forwardedProto + ':') return true;
  // Railway terminates TLS at the proxy and Astro sees the internal HTTP origin.
  return import.meta.env.PROD && requestUrl.protocol === 'http:' && originUrl.protocol === 'https:';
}

export const onRequest = defineMiddleware(async (context, next) => {
  if (context.url.pathname.startsWith('/api/')) {
    const now = Date.now();
    if (requests.size > 5000) for (const [key,value] of requests) if (value.until < now) requests.delete(key);
    const isEarthTile = context.url.pathname.startsWith('/api/earth-engine/tiles/');
    const isEarthMap = context.url.pathname === '/api/earth-engine/map';
    const key = `${context.clientAddress}:${isEarthTile ? 'ee-tiles' : isEarthMap ? 'ee-maps' : 'api'}`;
    const entry = requests.get(key);
    if (entry && entry.until > now) {
      if (++entry.count > (isEarthTile ? 240 : isEarthMap ? 6 : 60)) return Response.json({ error: 'Too many requests. Please retry in a minute.' }, { status: 429, headers: { 'Retry-After': '60' } });
    } else requests.set(key, { count: 1, until: now + 60_000 });
  }
  if (context.url.pathname.startsWith('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(context.request.method)) {
    if (!isSameOriginRequest(context.request, context.url)) {
      return Response.json({ error: 'Same-origin request required.' }, { status: 403 });
    }
    if (Number(context.request.headers.get('content-length') ?? 0) > 100_000) {
      return Response.json({ error: 'Request body too large.' }, { status: 413 });
    }
  }
  const response = await next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(self), camera=(), microphone=()');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  return response;
});
