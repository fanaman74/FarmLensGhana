import type { APIRoute } from 'astro';
import { isAdmin } from '../../../../../lib/auth/adminSession';
import { secret } from '../../../../../lib/security/secrets';

const attempts = new Map<string, number>();
const MAX_TEST_ATTEMPTS_ENTRIES = 1000;

function pruneAttempts(now: number) {
  for (const [key, timestamp] of attempts) if (timestamp + 10_000 <= now) attempts.delete(key);
}

export const POST: APIRoute = async ({ cookies, clientAddress }) => {
  if (!isAdmin(cookies)) return Response.json({ error: 'Administrator access required.' }, { status: 401 });
  const openRouterKey = secret('OPENROUTER_API_KEY');
  const openRouterModel = secret('OPENROUTER_MODEL_ID');
  const directKey = secret('OLMOEARTH_API_KEY');
  const directModel = secret('OLMOEARTH_MODEL_ID');
  if (!openRouterKey && !directKey) return Response.json({ error: 'Configure OPENROUTER_API_KEY or OLMOEARTH_API_KEY.' }, { status: 409 });
  const useOpenRouter = Boolean(openRouterKey && openRouterModel);
  if (openRouterKey && !openRouterModel && !directKey) return Response.json({ error: 'OPENROUTER_MODEL_ID is not configured.' }, { status: 409 });
  if (!useOpenRouter && directKey && !directModel) return Response.json({ error: 'OLMOEARTH_MODEL_ID is not configured.' }, { status: 409 });
  const now = Date.now(); pruneAttempts(now);
  const last = attempts.get(clientAddress); if (last && now-last < 10_000) return Response.json({ error: 'Please wait before testing again.' }, { status: 429 });
  if (!last && attempts.size >= MAX_TEST_ATTEMPTS_ENTRIES) return Response.json({ error: 'Too many connection tests are active. Try again later.' }, { status: 429 });
  attempts.set(clientAddress, now);
  try {
    const response = useOpenRouter ? await fetch('https://openrouter.ai/api/v1/models', { headers: { Authorization: `Bearer ${openRouterKey}` }, signal: AbortSignal.timeout(10_000) }) : await fetch('https://olmoearth.allenai.org/api/v1/areas/search', { method: 'POST', headers: { Authorization: `Bearer ${directKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ limit: 1, offset: 0 }), signal: AbortSignal.timeout(10_000) });
    if (!response.ok) return Response.json({ error: `${useOpenRouter ? 'OpenRouter' : 'OlmoEarth'} authentication test returned ${response.status}.` }, { status: 502 });
    return Response.json({ ok: true, testedAt: new Date().toISOString(), provider: useOpenRouter ? 'openrouter' : 'olmoearth', modelConfigured: true });
  } catch { return Response.json({ error: 'OlmoEarth connection test failed or timed out.' }, { status: 504 }); }
};
