import { describe, expect, it } from 'vitest';
import { isSelfIntersecting, polygonAreaHectares, validateFarmPolygon } from '../src/lib/geo/geojson';

describe('farm GeoJSON validation', () => {
  const square = [[-1.001,7],[-1,7],[-1,7.001],[-1.001,7.001],[-1.001,7]];
  it('estimates polygon area in hectares', () => expect(polygonAreaHectares(square)).toBeGreaterThan(1));
  it('accepts a valid 1–3000 hectare Polygon', () => expect(validateFarmPolygon({type:'Polygon',coordinates:[square]}).ok).toBe(true));
  it('rejects a self-intersection', () => { const bow = [[-1,7],[-.99,7.01],[-1,7.01],[-.99,7],[-1,7]]; expect(isSelfIntersecting(bow)).toBe(true); expect(validateFarmPolygon({type:'Polygon',coordinates:[bow]}).ok).toBe(false); });
  it('rejects an excessive area', () => { const huge = [[-2,6],[-1,6],[-1,7],[-2,7],[-2,6]]; expect(validateFarmPolygon({type:'Polygon',coordinates:[huge]}).ok).toBe(false); });
  it('rejects holes instead of silently counting them as farm area', () => expect(validateFarmPolygon({type:'Polygon',coordinates:[square,square]}).ok).toBe(false));
  it('rejects repeated vertices', () => expect(validateFarmPolygon({type:'Polygon',coordinates:[[...square.slice(0,3),square[1],square[0]]]}).ok).toBe(false));
});
