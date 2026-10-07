export interface ImageryLayer {
  id: string;
  name: string;
  /** One sentence a farmer can act on: what the colours mean for the field. */
  howToRead: string;
  legend: { colours: string[]; low: string; high: string } | null;
  /** The provider's own legend, used where we cannot be sure our colours match its default style. */
  legendImage?: string;
  provider: string;
  /** How fresh the pixels are, stated plainly so a colour is never mistaken for today's view. */
  freshness: string;
  attribution: string;
  tiles: string;
  opacity: number;
  /** Below this zoom the provider either refuses or returns a placeholder, so nothing is requested. */
  minzoom?: number;
}

const ESRI_SENTINEL2 = 'https://sentinel.arcgis.com/arcgis/rest/services/Sentinel2/ImageServer/exportImage';
const DE_AFRICA_WMS = 'https://ows.digitalearth.africa/wms';
const GHANA_ZOOM_IN = 9;

/** Esri renders a Sentinel-2 index server-side; the default mosaic picks its best recent cloud-free pixels. */
export function esriSentinel2Tiles(rasterFunction: string) {
  const params = new URLSearchParams({
    f: 'image', bboxSR: '3857', imageSR: '3857', size: '256,256', format: 'jpgpng',
    renderingRule: JSON.stringify({ rasterFunction }),
  });
  return `${ESRI_SENTINEL2}?${params}&bbox={bbox-epsg-3857}`;
}

/** Digital Earth Africa serves its continental products as WMS in Web Mercator with no key. */
export function deAfricaTiles(layer: string) {
  const params = new URLSearchParams({
    service: 'WMS', version: '1.3.0', request: 'GetMap', layers: layer, styles: '',
    format: 'image/png', transparent: 'true', crs: 'EPSG:3857', width: '256', height: '256',
  });
  return `${DE_AFRICA_WMS}?${params}&bbox={bbox-epsg-3857}`;
}

const esri = { provider: 'Esri Sentinel-2 Views', freshness: "Esri's most recent clear Sentinel-2 pixels from the last 14 months. Dates can differ across the map.", attribution: 'Esri, European Commission, ESA · Sentinel-2' };
export function deAfricaLegend(layer: string) {
  return `${DE_AFRICA_WMS}?${new URLSearchParams({ service: 'WMS', version: '1.3.0', request: 'GetLegendGraphic', layer, format: 'image/png' })}`;
}

const deAfrica = { attribution: 'Digital Earth Africa · CC BY 4.0', minzoom: GHANA_ZOOM_IN };

export const imageryLayers: ImageryLayer[] = [
  {
    id: 'ndvi', name: 'Crop health (NDVI)', ...esri, tiles: esriSentinel2Tiles('NDVI Colormap'), opacity: .85,
    howToRead: 'Green means dense, actively growing plants. Yellow is sparse cover and brown is bare or stressed ground.',
    legend: { colours: ['#a0522d', '#e8d27a', '#9acd32', '#1a7f2e'], low: 'Bare or stressed', high: 'Dense, healthy' },
  },
  {
    id: 'ndmi', name: 'Crop water (NDMI)', ...esri, tiles: esriSentinel2Tiles('NDMI Colorized'), opacity: .85,
    howToRead: 'Blue means plants and soil holding water. Brown and orange mean dry leaves or soil, often the first sign of water stress.',
    legend: { colours: ['#8c510a', '#d8b365', '#f5f5f5', '#5ab4ac', '#01665e'], low: 'Dry', high: 'Moist' },
  },
  {
    id: 'agriculture', name: 'Agriculture colours', ...esri, tiles: esriSentinel2Tiles('Agriculture with DRA'), opacity: 1,
    howToRead: 'Healthy crops show bright green, bare or recently ploughed soil shows mauve or brown, and water is dark blue.',
    legend: null,
  },
  {
    id: 'ndvi-anomaly', name: 'Greener or browner than normal', ...deAfrica, tiles: deAfricaTiles('ndvi_anomaly'), opacity: .8,
    provider: 'Digital Earth Africa NDVI anomaly',
    freshness: 'Latest full month, compared with the same month in 1984–2020. Published around the 5th of the next month.',
    howToRead: 'Shows how far this month’s greenness is from normal. Greener than usual often follows good rain; browner than usual points to drought, stress or clearing.',
    legend: null, legendImage: deAfricaLegend('ndvi_anomaly'),
  },
  {
    id: 'cloud-free', name: 'Cloud-free view (3 months)', ...deAfrica, tiles: deAfricaTiles('gm_s2_rolling'), opacity: 1,
    provider: 'Digital Earth Africa rolling GeoMAD',
    freshness: 'Best pixels from a rolling 3-month window of Sentinel-2 passes, so rainy-season cloud is removed.',
    howToRead: 'Natural colour with clouds filtered out. Use it when the latest passes are cloudy.',
    legend: null,
  },
  {
    id: 'radar', name: 'Radar (sees through cloud)', ...deAfrica, tiles: deAfricaTiles('s1_rtc'), opacity: .9,
    provider: 'Digital Earth Africa Sentinel-1',
    freshness: 'Latest Sentinel-1 radar pass. Over Ghana a new pass arrives every 6–12 days, whatever the weather.',
    howToRead: 'Brighter areas are rougher surfaces such as tall crops, trees and buildings. Dark areas are smooth: water, flooded fields or flat bare soil.',
    legend: null, legendImage: deAfricaLegend('s1_rtc'),
  },
];
