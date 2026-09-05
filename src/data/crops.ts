export type CropCategory = 'Cereal' | 'Root & tuber' | 'Legume' | 'Fruit crop' | 'Tree crop' | 'Vegetable';

export interface Crop {
  slug: string;
  name: string;
  localNames: string[];
  scientificName: string;
  category: CropCategory;
  icon: string;
  colour: string;
  temperature: [number, number];
  rainfall: [number, number];
  soil: string;
  ph: [number, number];
  planting: string;
  harvest: string;
  risks: string[];
  summary: string;
  source: string;
}

export const crops: Crop[] = [
  {
    slug: 'maize', name: 'Maize', localNames: ['Aburo (Twi)', 'Able (Ga)'], scientificName: 'Zea mays', category: 'Cereal', icon: '🌽', colour: '#deef83', temperature: [18, 32], rainfall: [500, 800], soil: 'Deep, well-drained loam with good organic matter', ph: [5.5, 7.5], planting: 'Plant near the start of reliable rains; use locally recommended seed and spacing.', harvest: 'Harvest dry grain when husks and kernels have dried; protect promptly from moisture and pests.', risks: ['Fall armyworm', 'Maize streak virus', 'Drought during tasselling'], summary: 'Ghana’s most widely grown cereal, suited to several ecological zones.', source: 'Indicative reference ranges: FAO Ecocrop and Ghana MoFA extension materials; confirm variety-specific advice locally.'
  },
  {
    slug: 'cassava', name: 'Cassava', localNames: ['Bankye (Twi)', 'Gbeli (Ewe)'], scientificName: 'Manihot esculenta', category: 'Root & tuber', icon: '🌿', colour: '#b9e69c', temperature: [20, 30], rainfall: [1000, 1500], soil: 'Well-drained sandy loam; avoid waterlogging', ph: [5.5, 7], planting: 'Plant healthy stem cuttings when soil moisture is reliable.', harvest: 'Many varieties mature from 9–18 months; harvest to match use and market.', risks: ['Cassava mosaic disease', 'Cassava brown streak', 'Root rot'], summary: 'A resilient food-security crop grown widely across southern and middle Ghana.', source: 'Indicative reference ranges: FAO Ecocrop and Ghana MoFA; verify cultivar duration and disease guidance.'
  },
  {
    slug: 'yam', name: 'Yam', localNames: ['Bayere (Twi)', 'Yeli (Dagbani)'], scientificName: 'Dioscorea spp.', category: 'Root & tuber', icon: '🍠', colour: '#efc99d', temperature: [20, 30], rainfall: [1000, 1500], soil: 'Deep, fertile, well-drained loam', ph: [5.5, 6.5], planting: 'Plant clean seed yam or setts into prepared mounds before or at the onset of rains.', harvest: 'Harvest carefully at maturity to avoid tuber wounds and storage losses.', risks: ['Yam mosaic virus', 'Anthracnose', 'Nematodes'], summary: 'An important staple and cash crop, especially through Ghana’s forest–savanna transition.', source: 'Indicative reference ranges: FAO Ecocrop and CSIR–CRI/MoFA materials; confirm species and variety locally.'
  },
  {
    slug: 'plantain', name: 'Plantain', localNames: ['Borɔdeɛ (Twi)', 'Akodu (Ga)'], scientificName: 'Musa × paradisiaca', category: 'Fruit crop', icon: '🍌', colour: '#f6dc69', temperature: [22, 30], rainfall: [1200, 2200], soil: 'Deep, fertile, moisture-retentive but well-drained soil', ph: [5.5, 7], planting: 'Plant healthy sword suckers or tissue-culture material when water is dependable.', harvest: 'Harvest bunches when fingers are full but still green for most markets.', risks: ['Black sigatoka', 'Weevils', 'Wind damage'], summary: 'A humid-zone staple commonly intercropped with cocoa and other crops.', source: 'Indicative reference ranges: FAO Ecocrop and Ghana MoFA; use local disease-free planting-material guidance.'
  },
  {
    slug: 'cocoa', name: 'Cocoa', localNames: ['Kookoo (Twi)'], scientificName: 'Theobroma cacao', category: 'Tree crop', icon: '🍫', colour: '#c99365', temperature: [21, 32], rainfall: [1500, 2500], soil: 'Deep, well-drained loam with high organic matter', ph: [5, 7.5], planting: 'Establish at the start of the rainy season with managed temporary and permanent shade.', harvest: 'Harvest ripe pods regularly and ferment beans using recommended practices.', risks: ['Cocoa swollen shoot virus', 'Black pod disease', 'Mirids'], summary: 'Ghana’s signature export crop, concentrated in the forest zone.', source: 'Indicative reference ranges: FAO Ecocrop and COCOBOD guidance; follow current COCOBOD recommendations.'
  },
  {
    slug: 'rice', name: 'Rice', localNames: ['Emo (Twi)', 'Mɔli (Ewe)'], scientificName: 'Oryza sativa', category: 'Cereal', icon: '🌾', colour: '#eadc9e', temperature: [20, 35], rainfall: [800, 2000], soil: 'Variety-dependent; lowland rice tolerates heavier water-retentive soils', ph: [5, 7], planting: 'Match variety and establishment method to irrigated, rain-fed lowland, or upland conditions.', harvest: 'Harvest when most panicles are straw-coloured and grains are firm.', risks: ['Rice blast', 'Bird damage', 'Drought or flooding'], summary: 'Produced in irrigated, rain-fed lowland, and upland systems across Ghana.', source: 'Broad reference ranges: FAO Ecocrop and AfricaRice; system-specific values require local verification.'
  },
  {
    slug: 'groundnut', name: 'Groundnut', localNames: ['Nkateɛ (Twi)', 'Sim-simli (Dagbani)'], scientificName: 'Arachis hypogaea', category: 'Legume', icon: '🥜', colour: '#e7bd74', temperature: [20, 30], rainfall: [500, 1000], soil: 'Loose, well-drained sandy loam', ph: [5.5, 7], planting: 'Sow into moist soil after reliable rain; avoid fields prone to standing water.', harvest: 'Lift when pods are mature and dry rapidly to reduce mould risk.', risks: ['Aflatoxin', 'Early and late leaf spot', 'Rosette disease'], summary: 'A valuable food and cash legume, prominent in northern Ghana.', source: 'Indicative reference ranges: FAO Ecocrop and ICRISAT; follow local aflatoxin-control guidance.'
  },
  {
    slug: 'cowpea', name: 'Cowpea', localNames: ['Ayikple (Ewe)', 'Tua (Dagbani)'], scientificName: 'Vigna unguiculata', category: 'Legume', icon: '🫘', colour: '#cab7ef', temperature: [20, 35], rainfall: [400, 700], soil: 'Well-drained sandy loam to loam', ph: [5.5, 7], planting: 'Sow with dependable moisture and choose a maturity class suited to the season.', harvest: 'Pick dry pods promptly and dry grain safely before storage.', risks: ['Maruca pod borer', 'Aphids', 'Striga'], summary: 'A short-season, protein-rich crop adapted to Ghana’s drier zones.', source: 'Indicative reference ranges: FAO Ecocrop and IITA; verify variety and pest-control advice locally.'
  },
  {
    slug: 'tomato', name: 'Tomato', localNames: ['Tomato (widely used)'], scientificName: 'Solanum lycopersicum', category: 'Vegetable', icon: '🍅', colour: '#f28b6e', temperature: [18, 30], rainfall: [400, 800], soil: 'Fertile, well-drained loam', ph: [5.5, 7.5], planting: 'Transplant sturdy seedlings into moist soil; avoid prolonged leaf wetness where possible.', harvest: 'Harvest at a maturity stage matched to travel distance and market.', risks: ['Bacterial wilt', 'Tomato leaf miner', 'Heat-related poor fruit set'], summary: 'A high-value vegetable grown in irrigated and rain-fed systems.', source: 'Indicative reference ranges: FAO Ecocrop and Ghana MoFA; confirm current integrated pest management advice.'
  },
  {
    slug: 'pepper', name: 'Pepper', localNames: ['Mako (Twi)', 'Kpakpo shito (Ga, specific type)'], scientificName: 'Capsicum spp.', category: 'Vegetable', icon: '🌶️', colour: '#ee725d', temperature: [18, 30], rainfall: [600, 1250], soil: 'Fertile, well-drained loam', ph: [5.5, 7], planting: 'Transplant healthy seedlings after reliable rains or with dependable irrigation.', harvest: 'Pick at the colour and maturity required by the variety and market.', risks: ['Anthracnose', 'Thrips', 'Viral diseases'], summary: 'An important culinary and market crop with many locally preferred types.', source: 'Indicative reference ranges: FAO Ecocrop and Ghana MoFA; species and cultivar needs vary.'
  }
];

export const cropBySlug = (slug: string) => crops.find((crop) => crop.slug === slug);

// Publication gate: the seed references have not yet been checked against
// individual source records, cultivar, season, and local-name provenance.
export const agronomyVerified = false;
