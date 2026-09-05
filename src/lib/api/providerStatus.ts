export interface IntegrationStatus {
  id: 'sentinelHub' | 'agroMonitoring' | 'appeears' | 'olmoEarth';
  name: string;
  purpose: string;
  status: 'connected' | 'not_configured' | 'unavailable';
  documentation: string;
  fingerprint?: string;
  modelId?: string;
}

const fingerprint = (value?: string) => value ? `••••${value.slice(-4)}` : undefined;

export function integrationStatuses(env: ImportMetaEnv): IntegrationStatus[] {
  return [
    { id: 'sentinelHub', name: 'Sentinel Hub', purpose: 'Interactive Sentinel-2 imagery and polygon statistics', status: env.SENTINEL_HUB_CLIENT_ID && env.SENTINEL_HUB_CLIENT_SECRET ? 'connected' : 'not_configured', documentation: 'https://docs.sentinel-hub.com/api/latest/' },
    { id: 'agroMonitoring', name: 'AgroMonitoring', purpose: 'Clipped field imagery and ready-made agricultural products', status: env.AGROMONITORING_API_KEY ? 'connected' : 'not_configured', documentation: 'https://agromonitoring.com/api', fingerprint: fingerprint(env.AGROMONITORING_API_KEY) },
    { id: 'appeears', name: 'NASA AppEEARS', purpose: 'Asynchronous historical and research analysis', status: env.EARTHDATA_USERNAME && env.EARTHDATA_PASSWORD ? 'connected' : 'not_configured', documentation: 'https://appeears.earthdatacloud.nasa.gov/api/' },
    { id: 'olmoEarth', name: 'OlmoEarth', purpose: 'Validated Ghana-specific crop mapping models', status: env.OLMOEARTH_API_KEY && env.OLMOEARTH_MODEL_ID ? 'connected' : 'not_configured', documentation: 'https://docs.olmoearth.allenai.org/', fingerprint: fingerprint(env.OLMOEARTH_API_KEY), modelId: env.OLMOEARTH_MODEL_ID }
  ];
}
