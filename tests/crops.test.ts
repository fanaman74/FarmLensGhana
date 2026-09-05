import { describe, expect, it } from 'vitest';
import { cropBySlug, crops } from '../src/data/crops';
describe('crop library', () => { it('contains at least ten Ghana crops with unique routes', () => { expect(crops.length).toBeGreaterThanOrEqual(10); expect(new Set(crops.map((c)=>c.slug)).size).toBe(crops.length); }); it('resolves a crop detail route', () => expect(cropBySlug('maize')?.scientificName).toBe('Zea mays')); });
