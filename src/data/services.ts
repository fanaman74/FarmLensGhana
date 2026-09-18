export type DataService = {
  slug: string;
  name: string;
  shortName: string;
  summary: string;
  provides: string[];
  resolution: string;
  ghana: string;
  access: string;
  fit: number;
  bestFor: string;
  caveat: string;
};

export const services: DataService[] = [
  {
    slug: 'digital-earth-africa',
    name: 'Digital Earth Africa',
    shortName: 'DE Africa',
    summary: 'Analysis-ready Earth observation services for monitoring land and crop conditions across Africa.',
    provides: ['Cropland', 'Sentinel-1/2 imagery', 'NDVI', 'Vegetation change', 'Water', 'Crop health'],
    resolution: '10 m+',
    ghana: 'Excellent',
    access: 'OGC WMS/WCS, S3 and Open Data Cube',
    fit: 5,
    bestFor: 'Comparing vegetation and land change over time.',
    caveat: 'Confirm layer coverage, terms and quotas for the exact Ghana area before production use.',
  },
  {
    slug: 'fao-wapor',
    name: 'FAO WaPOR',
    shortName: 'WaPOR',
    summary: 'Open water-productivity data for understanding evapotranspiration, biomass and crop water use.',
    provides: ['Evapotranspiration', 'Biomass', 'Rainfall', 'Water productivity', 'Land cover', 'Crop water use'],
    resolution: '100–300 m; some higher resolution',
    ghana: 'Available',
    access: 'Free API; no API key required',
    fit: 5,
    bestFor: 'Planning irrigation and diagnosing water productivity.',
    caveat: 'The grid is regional and modelled; validate irrigation decisions against field measurements.',
  },
  {
    slug: 'esa-worldcereal',
    name: 'ESA WorldCereal',
    shortName: 'WorldCereal',
    summary: 'Global 10 m cropland and active-cropping products designed for seasonal crop monitoring.',
    provides: ['Cropland', 'Maize', 'Cereals', 'Irrigation', 'Active cropping'],
    resolution: '10 m',
    ghana: 'Available',
    access: 'Downloads and Google Earth Engine',
    fit: 5,
    bestFor: 'Starting a 10 m seasonal cropland or cereal analysis.',
    caveat: 'Product classes are model outputs, not surveyed field boundaries or crop confirmation.',
  },
];