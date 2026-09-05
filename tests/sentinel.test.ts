import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/security/secrets', () => ({ secret: () => 'test-only-credential' }));
afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

describe('Sentinel Hub catalog', () => {
  it('authenticates on the server, validates scenes and reuses the token', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(Response.json({ access_token: 'test-token', expires_in: 3600 }))
      .mockImplementation(() => Promise.resolve(Response.json({ features: [{ id: 'scene', properties: { datetime: '2026-08-01T10:00:00Z', 'eo:cloud_cover': 12 } }] })));
    vi.stubGlobal('fetch', fetcher);
    const { sentinelCatalog } = await import('../src/lib/api/sentinelHub');
    const result = await sentinelCatalog({}, '2026-08-01', '2026-08-02', 30);
    expect(result.ok && result.data[0].cloudCover).toBe(12);
    await sentinelCatalog({}, '2026-08-01', '2026-08-02', 30);
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(JSON.stringify(result)).not.toContain('test-token');
  });
  it('returns a normalized authorization failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
    const { sentinelCatalog } = await import('../src/lib/api/sentinelHub');
    const result = await sentinelCatalog({}, '2026-08-01', '2026-08-02', 30);
    expect(!result.ok && result.error.code).toBe('unauthorized');
  });
});
