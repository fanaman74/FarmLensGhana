import type { APIRoute } from 'astro';
import { isAdmin } from '../../../lib/auth/adminSession';
import { integrationStatuses } from '../../../lib/api/providerStatus';
import { secret } from '../../../lib/security/secrets';
import { earthEngineAuthenticationMode } from '../../../lib/earthEngine/client';

export const GET: APIRoute = async ({ cookies }) => {
  if (!isAdmin(cookies)) return Response.json({ error: 'Administrator access required.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  const names = ['EARTHDATA_USERNAME', 'EARTHDATA_PASSWORD', 'OLMOEARTH_API_KEY', 'OLMOEARTH_MODEL_ID', 'OPENROUTER_API_KEY', 'OPENROUTER_MODEL_ID', 'DATABASE_URL'];
  const env = Object.fromEntries(names.map((name) => [name, secret(name)])) as ImportMetaEnv;
  const hostedCredentials = Boolean(secret('GEE_SERVICE_ACCOUNT_JSON') || (secret('GEE_SERVICE_ACCOUNT_EMAIL') && secret('GEE_SERVICE_ACCOUNT_PRIVATE_KEY')));
  const earthEngine = { id: 'earthEngine', name: 'Google Earth Engine', purpose: 'Dynamic World, cocoa/palm probabilities and Sentinel-1 radar', status: secret('GEE_PROJECT_ID') ? hostedCredentials ? 'credentials_configured' : 'needs_verification' : 'not_configured', fingerprint: secret('GEE_PROJECT_ID') ? `${secret('GEE_PROJECT_ID')} · ${earthEngineAuthenticationMode().replace('_', ' ')}` : undefined, documentation: 'https://developers.google.com/earth-engine/guides/service_account' };
  return Response.json({ integrations: [...integrationStatuses(env), earthEngine], storage: env.DATABASE_URL ? 'external' : 'environment', writable: false }, { headers: { 'Cache-Control': 'no-store' } });
};
