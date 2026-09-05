import { z } from 'zod';

const serviceAccountSchema = z.object({
  type: z.literal('service_account').optional(),
  client_email: z.email().refine(value => value.endsWith('.iam.gserviceaccount.com')),
  private_key: z.string().min(100).refine(value => value.includes('BEGIN PRIVATE KEY')),
  project_id: z.string().optional(),
});

export interface ServiceAccountCredentials { client_email: string; private_key: string; }

export function serviceAccountCredentials(rawJson = '', email = '', privateKey = ''): ServiceAccountCredentials | undefined {
  if (rawJson.trim()) {
    let parsed: unknown;
    try { parsed = JSON.parse(rawJson); }
    catch { throw new Error('GEE_SERVICE_ACCOUNT_JSON is not valid JSON.'); }
    const result = serviceAccountSchema.safeParse(parsed);
    if (!result.success) throw new Error('GEE_SERVICE_ACCOUNT_JSON is not a valid Google service-account key.');
    return { client_email: result.data.client_email, private_key: result.data.private_key.replace(/\\n/g, '\n') };
  }
  if (!email && !privateKey) return undefined;
  const result = serviceAccountSchema.pick({ client_email: true, private_key: true }).safeParse({ client_email: email, private_key: privateKey.replace(/\\n/g, '\n') });
  if (!result.success) throw new Error('Set both GEE_SERVICE_ACCOUNT_EMAIL and GEE_SERVICE_ACCOUNT_PRIVATE_KEY correctly.');
  return result.data;
}
