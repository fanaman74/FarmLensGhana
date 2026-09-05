import type { APIRoute } from 'astro';
import { isAdmin } from '../../../lib/auth/adminSession';
import { integrationStatuses } from '../../../lib/api/providerStatus';
import { secret } from '../../../lib/security/secrets';

export const GET: APIRoute = async ({ cookies }) => {
  if (!isAdmin(cookies)) return Response.json({ error: 'Administrator access required.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  const names = ['SENTINEL_HUB_CLIENT_ID', 'SENTINEL_HUB_CLIENT_SECRET', 'AGROMONITORING_API_KEY', 'EARTHDATA_USERNAME', 'EARTHDATA_PASSWORD', 'OLMOEARTH_API_KEY', 'OLMOEARTH_MODEL_ID', 'DATABASE_URL'];
  const env = Object.fromEntries(names.map((name) => [name, secret(name)])) as ImportMetaEnv;
  return Response.json({ integrations: integrationStatuses(env), storage: env.DATABASE_URL ? 'external' : 'environment', writable: false }, { headers: { 'Cache-Control': 'no-store' } });
};
