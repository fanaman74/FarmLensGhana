export interface GhanaCity {
  id: string;
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  note: string;
}

/** Every regional capital plus a few major farming and market towns, ordered roughly south to north. */
export const ghanaCities: GhanaCity[] = [
  { id: 'accra', name: 'Accra', region: 'Greater Accra', latitude: 5.6037, longitude: -0.187, note: 'Coastal savanna; vegetables and peri-urban farming.' },
  { id: 'tema', name: 'Tema', region: 'Greater Accra', latitude: 5.6698, longitude: -0.0166, note: 'Port city on the dry Accra plains.' },
  { id: 'sekondi-takoradi', name: 'Sekondi-Takoradi', region: 'Western', latitude: 4.934, longitude: -1.7137, note: 'Wet coastal belt; rubber, oil palm and coconut.' },
  { id: 'cape-coast', name: 'Cape Coast', region: 'Central', latitude: 5.1053, longitude: -1.2466, note: 'Coastal zone; cassava, maize and pineapple nearby.' },
  { id: 'koforidua', name: 'Koforidua', region: 'Eastern', latitude: 6.0941, longitude: -0.2591, note: 'Semi-deciduous forest; cocoa, plantain and citrus.' },
  { id: 'sefwi-wiawso', name: 'Sefwi Wiawso', region: 'Western North', latitude: 6.2058, longitude: -2.4894, note: 'High-rainfall forest; a leading cocoa district.' },
  { id: 'ho', name: 'Ho', region: 'Volta', latitude: 6.6008, longitude: 0.4713, note: 'Forest–savanna transition; yam, cassava and rice.' },
  { id: 'obuasi', name: 'Obuasi', region: 'Ashanti', latitude: 6.2023, longitude: -1.6614, note: 'Forest zone; cocoa and food crops around mining areas.' },
  { id: 'kumasi', name: 'Kumasi', region: 'Ashanti', latitude: 6.6885, longitude: -1.6244, note: 'Forest belt hub; cocoa, plantain and vegetables.' },
  { id: 'goaso', name: 'Goaso', region: 'Ahafo', latitude: 6.8036, longitude: -2.5172, note: 'Forest zone; cocoa, cashew and plantain.' },
  { id: 'hohoe', name: 'Hohoe', region: 'Volta', latitude: 7.1519, longitude: 0.4736, note: 'Volta highlands; cocoa, coffee and rice.' },
  { id: 'sunyani', name: 'Sunyani', region: 'Bono', latitude: 7.3349, longitude: -2.3123, note: 'Transition zone; maize, cashew and cocoa.' },
  { id: 'techiman', name: 'Techiman', region: 'Bono East', latitude: 7.5833, longitude: -1.9333, note: 'Major food market; maize, yam and tomato.' },
  { id: 'kintampo', name: 'Kintampo', region: 'Bono East', latitude: 8.0563, longitude: -1.7306, note: 'Gateway to the north; yam and maize.' },
  { id: 'dambai', name: 'Dambai', region: 'Oti', latitude: 8.0667, longitude: 0.1833, note: 'Volta lakeside; yam, cassava and fishing.' },
  { id: 'damongo', name: 'Damongo', region: 'Savannah', latitude: 9.0833, longitude: -1.8167, note: 'Guinea savanna; shea, yam and groundnut.' },
  { id: 'tamale', name: 'Tamale', region: 'Northern', latitude: 9.4008, longitude: -0.8393, note: 'Northern hub; rice, maize, soybean and groundnut.' },
  { id: 'yendi', name: 'Yendi', region: 'Northern', latitude: 9.4427, longitude: -0.0099, note: 'Savanna; yam, maize and guinea fowl.' },
  { id: 'wa', name: 'Wa', region: 'Upper West', latitude: 10.0601, longitude: -2.5099, note: 'Sudan savanna; millet, sorghum and shea.' },
  { id: 'nalerigu', name: 'Nalerigu', region: 'North East', latitude: 10.5272, longitude: -0.3698, note: 'Savanna; millet, sorghum and cowpea.' },
  { id: 'bolgatanga', name: 'Bolgatanga', region: 'Upper East', latitude: 10.7856, longitude: -0.8514, note: 'Single short rainy season; millet and dry-season tomato.' },
  { id: 'navrongo', name: 'Navrongo', region: 'Upper East', latitude: 10.8956, longitude: -1.0921, note: 'Tono irrigation area; rice and vegetables.' },
];

/** Ghana's land extent as [[west, south], [east, north]]. */
export const ghanaBounds: [[number, number], [number, number]] = [[-3.26, 4.74], [1.2, 11.17]];
