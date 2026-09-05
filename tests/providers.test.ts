import { describe, expect, it } from 'vitest';
import { normalizeAgroSoil } from '../src/lib/api/agroMonitoring';
import { normalizeAppEearsState } from '../src/lib/api/appeears';
import { classifyWithThreshold, normalizeOlmoTask } from '../src/lib/api/olmoEarth';
import { integrationStatuses } from '../src/lib/api/providerStatus';

describe('provider adapters', () => {
  it('normalizes AgroMonitoring temperatures', () => expect(normalizeAgroSoil({t0:300,t10:290,moisture:.22})).toEqual({surfaceTemperatureCelsius:26.85,temperature10cmCelsius:16.85,moisture:.22}));
  it('normalizes asynchronous task states', () => { expect(normalizeAppEearsState('a','running').status).toBe('processing'); expect(normalizeOlmoTask('o','completed',{ok:true}).status).toBe('done'); });
  it('uses unknown below the Olmo confidence threshold', () => expect(classifyWithThreshold({className:'maize',confidence:.59},.6).className).toBe('unknown'));
  it('masks integration keys and exposes no full secret', () => { const statuses = integrationStatuses({AGROMONITORING_API_KEY:'super-secret-key'} as ImportMetaEnv); expect(statuses.find((s)=>s.id==='agroMonitoring')?.fingerprint).toBe('••••-key'); expect(JSON.stringify(statuses)).not.toContain('super-secret-key'); });
});
