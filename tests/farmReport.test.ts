import { describe, expect, it } from 'vitest';
import { elevationSamplePoints, parseClimate, parseLandCover, parsePlace, parseSoil, phClass, textureClass } from '../src/lib/api/farmReport';
import { pointInPolygon, polygonAreaHectares, polygonCentroid, polygonPerimeterKm } from '../src/lib/geo/geojson';

describe('farm geometry', () => {
  // 0.01° square near Ejura: 1.1059 km north-south by 1.1040 km east-west on the WGS84 ellipsoid.
  const square = [[-1.37, 7.38], [-1.36, 7.38], [-1.36, 7.39], [-1.37, 7.39], [-1.37, 7.38]];
  it('matches the geodesic area of a known square', () => expect(polygonAreaHectares(square)).toBeCloseTo(122.1, 1));
  it('measures the perimeter on the sphere', () => expect(polygonPerimeterKm(square)).toBeCloseTo(4.42, 1));
  it('uses the area centroid, not the corner average', () => {
    // Extra corners along one edge must not drag the centre toward that edge.
    const ring = [[0, 7], [0.0025, 7], [0.005, 7], [0.0075, 7], [0.01, 7], [0.01, 7.01], [0, 7.01], [0, 7]];
    const centre = polygonCentroid(ring);
    expect(centre.latitude).toBeCloseTo(7.005, 5);
    expect(centre.longitude).toBeCloseTo(0.005, 5);
  });
  it('tests points inside the boundary', () => { expect(pointInPolygon([-1.365, 7.385], square)).toBe(true); expect(pointInPolygon([-1.35, 7.385], square)).toBe(false); });
  it('keeps elevation samples within the provider limit', () => {
    const many = Array.from({ length: 400 }, (_, i) => [Math.cos(i / 400 * 2 * Math.PI) * .01 - 1, Math.sin(i / 400 * 2 * Math.PI) * .01 + 7]);
    const points = elevationSamplePoints([...many, many[0]], { latitude: 7, longitude: -1 });
    expect(points.length).toBeLessThanOrEqual(100);
    expect(points[0]).toEqual([-1, 7]);
  });
});

describe('farm report parsers', () => {
  it('reads Ghana districts and regions from OpenStreetMap', () => {
    const place = parsePlace({ display_name: 'Ejura, Ejura-Sekyedumase Municipal District, Ashanti Region, Ghana', address: { town: 'Ejura', county: 'Ejura-Sekyedumase Municipal District', state: 'Ashanti Region', country: 'Ghana' } });
    expect(place).toMatchObject({ community: 'Ejura', district: 'Ejura-Sekyedumase Municipal District', region: 'Ashanti Region' });
  });

  const layer = (name: string, d: number, values: (number | null)[]) => ({ name, unit_measure: { d_factor: d }, depths: ['0-5cm', '5-15cm', '15-30cm'].map((label, i) => ({ label, values: { mean: values[i] } })) });
  it('converts SoilGrids units and weights topsoil by depth', () => {
    const soil = parseSoil({ properties: { layers: [layer('phh2o', 10, [60, 58, 55]), layer('clay', 10, [150, 180, 250]), layer('sand', 10, [600, 580, 520]), layer('silt', 10, [250, 240, 230]), layer('nitrogen', 100, [150, 100, 80])] } });
    expect(soil.properties.phh2o.byDepth[0].value).toBe(6);
    expect(soil.properties.phh2o.topsoil).toBeCloseTo((6 * 5 + 5.8 * 10 + 5.5 * 15) / 30, 5);
    expect(soil.properties.nitrogen.topsoil).toBeCloseTo((1.5 * 5 + 1 * 10 + .8 * 15) / 30, 5);
    expect(soil.properties.soc.topsoil).toBeNull();
    expect(soil.textureClass).toBe('Sandy clay loam');
    expect(soil.phClass).toBe('Moderately to slightly acidic');
  });
  it('reports masked SoilGrids cells as missing, not zero', () => expect(() => parseSoil({ properties: { layers: [layer('phh2o', 10, [null, null, null])] } })).toThrow(/built-up/));
  it('classifies USDA soil texture', () => { expect(textureClass(40, 40, 20)).toBe('Loam'); expect(textureClass(90, 5, 5)).toBe('Sand'); expect(textureClass(20, 20, 60)).toBe('Clay'); expect(phClass(4.2)).toBe('Extremely acidic'); });

  it('maps Esri histogram bins to land-cover classes', () => {
    const cover = parseLandCover({ histograms: [{ size: 12, min: -.5, max: 11.5, counts: [0, 0, 300, 0, 0, 600, 0, 100, 0, 0, 0, 0] }] }, 2025);
    expect(cover.croplandPercent).toBe(60);
    expect(cover.classes.map((item) => item.name)).toEqual(['Crops', 'Trees', 'Built area']);
  });

  it('turns NASA POWER mm/day into monthly totals', () => {
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const rain = Object.fromEntries([...months.map((month, i) => [month, i === 5 ? 6 : 2]), ['ANN', 2.3]]);
    const climate = parseClimate({ header: { start: 2001, end: 2020 }, properties: { parameter: { PRECTOTCORR: rain, T2M_MAX: { ...rain, JAN: -999 } } } });
    expect(climate.months[5].rainfallMm).toBe(180);
    expect(climate.wettestMonth).toBe('Jun');
    expect(climate.monthsOver100mm).toBe(1);
    expect(climate.months[0].maxTemperature).toBeNull();
    expect(climate.period).toBe('2001–2020');
  });
});
