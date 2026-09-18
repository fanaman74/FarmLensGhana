import { describe, expect, it } from 'vitest';
import { normalizeAppEearsState } from '../src/lib/api/appeears';
import { classifyWithThreshold, normalizeOlmoTask } from '../src/lib/api/olmoEarth';
import { integrationStatuses } from '../src/lib/api/providerStatus';

describe('provider adapters', () => {
  it('normalizes asynchronous task states', () => { expect(normalizeAppEearsState('a','running').status).toBe('processing'); expect(normalizeOlmoTask('o','completed',{ok:true}).status).toBe('done'); });
  it('uses unknown below the Olmo confidence threshold', () => expect(classifyWithThreshold({className:'maize',confidence:.59},.6).className).toBe('unknown'));
  it('masks integration keys and exposes no full secret', () => { const statuses = integrationStatuses({OPENROUTER_API_KEY:'super-secret-key', OPENROUTER_MODEL_ID:'allenai/test'} as ImportMetaEnv); expect(JSON.stringify(statuses)).not.toContain('super-secret-key'); });
  it('uses direct OlmoEarth credentials when OpenRouter is not configured', () => { const [status] = integrationStatuses({ OLMOEARTH_API_KEY: 'direct-secret-key', OLMOEARTH_MODEL_ID: 'olmo/direct-model', OPENROUTER_API_KEY: '', OPENROUTER_MODEL_ID: '' } as ImportMetaEnv).filter((item) => item.id === 'olmoEarth'); expect(status.status).toBe('connected'); expect(status.name).toBe('OlmoEarth'); expect(status.fingerprint).toBe('••••-key'); expect(status.modelId).toBe('olmo/direct-model'); });
});
