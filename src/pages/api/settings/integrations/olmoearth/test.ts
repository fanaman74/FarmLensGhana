import type { APIRoute } from 'astro';
import { isAdmin } from '../../../../../lib/auth/adminSession';
import { secret } from '../../../../../lib/security/secrets';

const attempts = new Map<string, number>();
export const POST: APIRoute = async ({ cookies, clientAddress }) => {
  if (!isAdmin(cookies)) return Response.json({ error: 'Administrator access required.' }, { status: 401 });
  const openRouterKey = secret('OPENROUTER_API_KEY');
  const openRouterModel = secret('OPENROUTER_MODEL_ID');
  const directKey = secret('OLMOEARTH_API_KEY');
  const directModel = secret('OLMOEARTH_MODEL_ID');
  if (!openRouterKey && !directKey) return Response.json({ error: 'Configure OPENROUTER_API_KEY or OLMOEARTH_API_KEY.' }, { status: 409 });
  if (openRouterKey && !openRouterModel) return Response.json({ error: 'OPENROUTER_MODEL_ID is not configured.' }, { status: 409 });
  const last = attempts.get(clientAddress); if (last && Date.now()-last < 10_000) return Response.json({ error: 'Please wait before testing again.' }, { status: 429 });
  attempts.set(clientAddress, Date.now());
  try {
    const response = openRouterKey ? await fetch('https://openrouter.ai/api/v1/models', { headers: { Authorization: `Bearer ${openRouterKey}` }, signal: AbortSignal.timeout(10_000) }) : await fetch('https://olmoearth.allenai.org/api/v1/areas/search', { method: 'POST', headers: { Authorization: `Bearer ${directKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ limit: 1, offset: 0 }), signal: AbortSignal.timeout(10_000) });
    if (!response.ok) return Response.json({ error: `${openRouterKey ? 'OpenRouter' : 'OlmoEarth'} authentication test returned ${response.status}.` }, { status: 502 });
    return Response.json({ ok: true, testedAt: new Date().toISOString(), provider: openRouterKey ? 'openrouter' : 'olmoearth', modelConfigured: Boolean(openRouterModel ?? directModel) });
  } catch { return Response.json({ error: 'OlmoEarth connection test failed or timed out.' }, { status: 504 }); }
};
