export interface IntegrationStatus {
  id: 'appeears' | 'olmoEarth' | 'earthEngine';
  name: string;
  purpose: string;
  status: 'connected' | 'not_configured' | 'unavailable';
  documentation: string;
  fingerprint?: string;
  modelId?: string;
  projectId?: string;
}

const fingerprint = (value?: string) => value ? `••••${value.slice(-4)}` : undefined;

export function integrationStatuses(env: ImportMetaEnv): IntegrationStatus[] {
  const openRouterKey = env.OPENROUTER_API_KEY || '';
  const openRouterModel = env.OPENROUTER_MODEL_ID || '';
  const directKey = env.OLMOEARTH_API_KEY || '';
  const directModel = env.OLMOEARTH_MODEL_ID || '';
  const useOpenRouter = Boolean(openRouterKey && openRouterModel);
  const useDirect = !useOpenRouter && Boolean(directKey && directModel);
  return [
    { id: 'appeears', name: 'NASA AppEEARS', purpose: 'Asynchronous historical and research analysis', status: env.EARTHDATA_USERNAME && env.EARTHDATA_PASSWORD ? 'connected' : 'not_configured', documentation: 'https://appeears.earthdatacloud.nasa.gov/api/' },
    { id: 'olmoEarth', name: useOpenRouter ? 'Olmo via OpenRouter' : 'OlmoEarth', purpose: 'AI crop mapping model connection', status: useOpenRouter || useDirect ? 'connected' : 'not_configured', documentation: useOpenRouter ? 'https://openrouter.ai/models' : 'https://docs.olmoearth.allenai.org/', fingerprint: fingerprint(useOpenRouter ? openRouterKey : directKey), modelId: useOpenRouter ? openRouterModel : directModel }
  ];
}
