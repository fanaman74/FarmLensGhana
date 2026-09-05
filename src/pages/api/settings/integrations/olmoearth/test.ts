import type { APIRoute } from 'astro';
import { isAdmin } from '../../../../../lib/auth/adminSession';
import { secret } from '../../../../../lib/security/secrets';

const attempts = new Map<string, number>();
export const POST: APIRoute = async ({ cookies, clientAddress }) => {
  if (!isAdmin(cookies)) return Response.json({ error: 'Administrator access required.' }, { status: 401 });
  const apiKey = secret('OLMOEARTH_API_KEY');
  if (!apiKey) return Response.json({ error: 'OLMOEARTH_API_KEY is not configured.' }, { status: 409 });
  const last = attempts.get(clientAddress); if (last && Date.now()-last < 10_000) return Response.json({ error: 'Please wait before testing again.' }, { status: 429 });
  attempts.set(clientAddress, Date.now());
  try {
    const response = await fetch('https://olmoearth.allenai.org/api/v1/areas/search', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ limit: 1, offset: 0 }), signal: AbortSignal.timeout(10_000) });
    if (!response.ok) return Response.json({ error: `OlmoEarth authentication test returned ${response.status}.` }, { status: 502 });
    return Response.json({ ok: true, testedAt: new Date().toISOString(), modelConfigured: Boolean(secret('OLMOEARTH_MODEL_ID')) });
  } catch { return Response.json({ error: 'OlmoEarth connection test failed or timed out.' }, { status: 504 }); }
};
