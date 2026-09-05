import type { ProviderResult } from '../types';
import { z } from 'zod';
import { secret } from '../security/secrets';

let token: { value: string; expires: number } | undefined;
async function accessToken() {
  if (token && token.expires > Date.now()) return token.value;
  const clientId = secret('SENTINEL_HUB_CLIENT_ID'), clientSecret = secret('SENTINEL_HUB_CLIENT_SECRET');
  if (!clientId || !clientSecret) throw new Error('not_configured');
  const response = await fetch('https://services.sentinel-hub.com/auth/realms/main/protocol/openid-connect/token', {
    method: 'POST', body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }), signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(String(response.status));
  const data = z.object({ access_token: z.string(), expires_in: z.number() }).parse(await response.json());
  token = { value: data.access_token, expires: Date.now() + Math.max(0, data.expires_in - 60) * 1000 };
  return token.value;
}

export interface Scene { id: string; acquiredAt: string; cloudCover: number | null; satellite: string; resolutionMetres: number; }

export async function sentinelCatalog(polygon: unknown, from: string, to: string, cloudsMax: number): Promise<ProviderResult<Scene[]>> {
  try {
    const bearer = await accessToken();
    const response = await fetch('https://services.sentinel-hub.com/api/v1/catalog/1.0.0/search', {
      method: 'POST', headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json', Accept: 'application/geo+json' },
      body: JSON.stringify({ intersects: polygon, datetime: `${from}T00:00:00Z/${to}T23:59:59Z`, collections: ['sentinel-2-l2a'], limit: 50, filter: `eo:cloud_cover <= ${cloudsMax}`, 'filter-lang': 'cql2-text' }), signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(String(response.status));
    const parsed = z.object({ features: z.array(z.object({ id: z.string(), properties: z.object({ datetime: z.string(), 'eo:cloud_cover': z.number().optional() }) })) }).parse(await response.json());
    return { ok: true, source: 'Sentinel Hub', fetchedAt: new Date().toISOString(), data: parsed.features.map((scene) => ({ id: scene.id, acquiredAt: scene.properties.datetime, cloudCover: scene.properties['eo:cloud_cover'] ?? null, satellite: 'Sentinel-2 L2A', resolutionMetres: 10 })) };
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const code = ['not_configured', '401', '403'].includes(message) ? 'unauthorized' : message === '429' ? 'rate_limited' : error instanceof DOMException ? 'timeout' : 'unavailable';
    return { ok: false, error: { code, message: message === 'not_configured' ? 'Sentinel Hub credentials are not configured.' : `Sentinel Hub request failed (${code}).`, retryable: code !== 'unauthorized' } };
  }
}

export const sentinelIndices = { ndvi: '(B08 - B04) / (B08 + B04)', ndmi: '(B08 - B11) / (B08 + B11)' } as const;
