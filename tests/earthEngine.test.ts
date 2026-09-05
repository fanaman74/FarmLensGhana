import { describe, expect, test, vi } from 'vitest';
import { validateEarthRequest } from '../src/lib/earthEngine/request';
import { serviceAccountCredentials } from '../src/lib/earthEngine/credentials';
const input = { kind: 'annual', latitude: 6.68, longitude: -1.62, from: '2026-08-01', to: '2026-09-01', threshold: .65 };
describe('Earth Engine request boundaries', () => {
  test('builds a location-aligned small AOI', () => { const result = validateEarthRequest(input); expect(result.geometry.coordinates[0]).toHaveLength(5); expect(result.bounds[0]).toBeLessThan(-1.62); expect(result.bounds[2]).toBeGreaterThan(-1.62); });
  test('rejects unsupported classes, huge dates and invalid probability', () => { for (const change of [{kind:'cashew'}, {from:'2025-01-01'}, {to:'2099-01-01'}, {threshold:1.1}, {latitude:40}]) expect(() => validateEarthRequest({...input,...change})).toThrow(); });
  test('keeps tree model observation year explicit', () => { expect(validateEarthRequest({...input,kind:'cocoa'}).year).toBe(2024); expect(() => validateEarthRequest({...input,year:2026})).toThrow(); });
  test('rejects national and crossing polygons', () => { expect(() => validateEarthRequest({...input,geometry:{type:'Polygon',coordinates:[[[-3,5],[1,5],[1,11],[-3,11],[-3,5]]]}})).toThrow(); });
});

vi.mock('../src/lib/security/secrets', () => ({ secret: () => '' }));
test('missing project fails before attempting cloud authentication', async () => {
  const { earthEngineToken } = await import('../src/lib/earthEngine/client');
  await expect(earthEngineToken()).rejects.toThrow('project ID');
});

test('parses Railway service-account JSON without changing private key lines', () => {
  const key = `-----BEGIN PRIVATE KEY-----\\n${'x'.repeat(120)}\\n-----END PRIVATE KEY-----\\n`;
  const result = serviceAccountCredentials(JSON.stringify({ type: 'service_account', client_email: 'farmlens@mapssp-1499716002898.iam.gserviceaccount.com', private_key: key }));
  expect(result?.client_email).toContain('iam.gserviceaccount.com');
  expect(result?.private_key).toContain('\n');
  expect(result?.private_key).not.toContain('\\n');
});

test('rejects malformed hosted credentials', () => {
  expect(() => serviceAccountCredentials('{bad json')).toThrow('not valid JSON');
  expect(() => serviceAccountCredentials('', 'wrong@example.com', 'short')).toThrow('Set both');
});
