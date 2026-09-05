import type { ProviderResult } from '../types';
export interface NationalCropStat { year: number; value: number; unit: string; element: string; area: 'Ghana'; }
export async function getGhanaCropStats(_crop: string, _from: number, _to: number): Promise<ProviderResult<NationalCropStat[]>> {
  return { ok: false, error: { code: 'missing_data', message: 'No verified local FAOSTAT extract has been generated.', retryable: false } };
}
