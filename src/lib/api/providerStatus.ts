export interface IntegrationStatus {
  id: 'appeears' | 'olmoEarth';
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
    { id: 'appeears', name: 'NASA AppEEARS', purpose: 'Asynchronous historical and research analysis', status: env.EARTHDATA_USERNAME && env.EARTHDATA_PASSWORD ? 'connected' : 'not_configured', documentation: 'https://appeears.earthdatacloud.nasa.gov/api/' },
    { id: 'olmoEarth', name: env.OPENROUTER_API_KEY ? 'Olmo via OpenRouter' : 'OlmoEarth', purpose: 'AI crop mapping model connection', status: (env.OPENROUTER_API_KEY && env.OPENROUTER_MODEL_ID) || (env.OLMOEARTH_API_KEY && env.OLMOEARTH_MODEL_ID) ? 'connected' : 'not_configured', documentation: env.OPENROUTER_API_KEY ? 'https://openrouter.ai/models' : 'https://docs.olmoearth.allenai.org/', fingerprint: fingerprint(env.OPENROUTER_API_KEY ?? env.OLMOEARTH_API_KEY), modelId: env.OPENROUTER_MODEL_ID ?? env.OLMOEARTH_MODEL_ID }
  ];
}
