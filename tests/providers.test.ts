import { describe, expect, it } from 'vitest';
import { normalizeAppEearsState } from '../src/lib/api/appeears';
import { classifyWithThreshold, normalizeOlmoTask } from '../src/lib/api/olmoEarth';
import { integrationStatuses } from '../src/lib/api/providerStatus';

describe('provider adapters', () => {
  it('normalizes asynchronous task states', () => { expect(normalizeAppEearsState('a','running').status).toBe('processing'); expect(normalizeOlmoTask('o','completed',{ok:true}).status).toBe('done'); });
  it('uses unknown below the Olmo confidence threshold', () => expect(classifyWithThreshold({className:'maize',confidence:.59},.6).className).toBe('unknown'));
  it('masks integration keys and exposes no full secret', () => { const statuses = integrationStatuses({OPENROUTER_API_KEY:'super-secret-key', OPENROUTER_MODEL_ID:'allenai/test'} as ImportMetaEnv); expect(JSON.stringify(statuses)).not.toContain('super-secret-key'); });
});
