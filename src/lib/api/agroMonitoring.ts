import { createHash } from 'node:crypto';
import { kelvinToCelsius } from '../agriculture/indices';
import { validateFarmPolygon } from '../geo/geojson';
import type { ProviderResult } from '../types';

export const geometryHash = (geometry: unknown) => createHash('sha256').update(JSON.stringify(geometry)).digest('hex');
export function normalizeAgroSoil(payload: { t0?: number; t10?: number; moisture?: number }) { return { surfaceTemperatureCelsius: payload.t0 == null ? null : kelvinToCelsius(payload.t0), temperature10cmCelsius: payload.t10 == null ? null : kelvinToCelsius(payload.t10), moisture: payload.moisture ?? null }; }
export async function registerAgroPolygon(polygon: unknown): Promise<ProviderResult<{ polygonId: string; geometryHash: string }>> {
  const valid = validateFarmPolygon(polygon);
  if (!valid.ok) return { ok: false, error: { code: 'invalid_request', message: valid.message, retryable: false } };
  if (!import.meta.env.AGROMONITORING_API_KEY) return { ok: false, error: { code: 'unauthorized', message: 'AgroMonitoring is not configured.', retryable: false } };
  return { ok: false, error: { code: 'unavailable', message: 'Remote polygon creation is unavailable in this deployment.', retryable: false } };
}
