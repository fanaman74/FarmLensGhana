import { describe, expect, test, vi } from 'vitest';
import { POST } from '../src/pages/api/satellite/search';

const context = (body: unknown) => ({ request: new Request('http://localhost/api/satellite/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) }) as Parameters<typeof POST>[0];
const dateOffset = (days: number) => { const date = new Date(); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10); };

describe('satellite catalogue search', () => {
  test('rejects polygons and invalid date/cloud filters', async () => {
    const response = await POST(context({ latitude: 7, longitude: -1, from: dateOffset(-2), to: dateOffset(-1), cloud: 20, polygon: [] }));
    expect(response.status).toBe(400);
  });

  test('normalizes Earth Search scenes and sends fixed filters', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ features: [{ id: 'scene-1', properties: { datetime: '2026-09-01T10:00:00Z', 'eo:cloud_cover': 12 } }] }), { headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetch);
    const response = await POST(context({ latitude: 7, longitude: -1, from: dateOffset(-8), to: dateOffset(-1), cloud: 20 }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ scenes: [{ id: 'scene-1', date: '2026-09-01T10:00:00Z', cloud: 12 }] });
    const url = new URL(fetch.mock.calls[0][0]);
    expect(url.hostname).toBe('earth-search.aws.element84.com');
    expect(url.searchParams.get('collections')).toBe('sentinel-2-l2a');
    expect(JSON.parse(url.searchParams.get('query') ?? '{}')).toEqual({ 'eo:cloud_cover': { lte: 20 } });
    expect(url.searchParams.get('limit')).toBe('8');
  });
});
