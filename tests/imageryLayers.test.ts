import { describe, expect, it } from 'vitest';
import { deAfricaLegend, deAfricaTiles, esriSentinel2Tiles, imageryLayers } from '../src/data/imageryLayers';

describe('imagery layers', () => {
  it('requests Esri Sentinel-2 renders in Web Mercator with the named raster function', () => {
    const url = new URL(esriSentinel2Tiles('NDVI Colormap').replace('{bbox-epsg-3857}', '0,0,1,1'));
    expect(url.origin + url.pathname).toBe('https://sentinel.arcgis.com/arcgis/rest/services/Sentinel2/ImageServer/exportImage');
    expect(url.searchParams.get('bboxSR')).toBe('3857');
    expect(url.searchParams.get('imageSR')).toBe('3857');
    expect(JSON.parse(url.searchParams.get('renderingRule')!)).toEqual({ rasterFunction: 'NDVI Colormap' });
  });

  it('requests Digital Earth Africa WMS tiles and legends for a named layer', () => {
    const url = new URL(deAfricaTiles('ndvi_anomaly').replace('{bbox-epsg-3857}', '0,0,1,1'));
    expect(url.searchParams.get('crs')).toBe('EPSG:3857');
    expect(url.searchParams.get('layers')).toBe('ndvi_anomaly');
    expect(url.searchParams.get('transparent')).toBe('true');
    expect(new URL(deAfricaLegend('s1_rtc')).searchParams.get('request')).toBe('GetLegendGraphic');
  });

  it('keeps the bbox placeholder literal so MapLibre can fill it', () => {
    for (const layer of imageryLayers) expect(layer.tiles.endsWith('&bbox={bbox-epsg-3857}')).toBe(true);
  });

  it('gives every layer a reading guide, provider and freshness note', () => {
    expect(new Set(imageryLayers.map((layer) => layer.id)).size).toBe(imageryLayers.length);
    for (const layer of imageryLayers) {
      expect(layer.howToRead.length).toBeGreaterThan(20);
      expect(layer.provider).toBeTruthy();
      expect(layer.freshness).toBeTruthy();
      expect(layer.attribution).toBeTruthy();
    }
  });
});
