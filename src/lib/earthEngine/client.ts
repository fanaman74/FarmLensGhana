import { GoogleAuth } from 'google-auth-library';
import ee from '@google/earthengine';
import { secret } from '../security/secrets';
import { serviceAccountCredentials } from './credentials';

let auth: GoogleAuth | undefined;
let initialized: Promise<void> | undefined;
export function earthEngineConfigured() { return /^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(secret('GEE_PROJECT_ID')); }
export function earthEngineAuthenticationMode() {
  if (secret('GEE_SERVICE_ACCOUNT_JSON') || (secret('GEE_SERVICE_ACCOUNT_EMAIL') && secret('GEE_SERVICE_ACCOUNT_PRIVATE_KEY'))) return 'service_account';
  if (secret('GOOGLE_APPLICATION_CREDENTIALS')) return 'credential_file';
  return 'application_default';
}
export async function earthEngineToken() {
  if (!earthEngineConfigured()) throw new Error('Configure the Earth Engine Cloud project ID in server settings.');
  try {
    const credentials = serviceAccountCredentials(secret('GEE_SERVICE_ACCOUNT_JSON'), secret('GEE_SERVICE_ACCOUNT_EMAIL'), secret('GEE_SERVICE_ACCOUNT_PRIVATE_KEY'));
    auth ??= new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/earthengine.readonly'], projectId: secret('GEE_PROJECT_ID'), ...(credentials ? { credentials } : secret('GOOGLE_APPLICATION_CREDENTIALS') ? { keyFilename: secret('GOOGLE_APPLICATION_CREDENTIALS') } : {}) });
    const token = await auth.getAccessToken();
    if (!token) throw new Error();
    return token;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('GEE_')) throw error;
    throw new Error('Earth Engine server authentication is missing or expired. On Railway, configure the service-account JSON secret; do not enter a Gmail password.');
  }
}
export async function earthEngine() {
  const token = await earthEngineToken();
  ee.data.setAuthToken('', 'Bearer', token, 300, [], undefined, false);
  ee.data.setDeadline(20000);
  initialized ??= new Promise<void>((resolve, reject) => ee.initialize(null, null, resolve, () => reject(new Error('Earth Engine access failed. Check project registration, API enablement and IAM permissions.')), null, secret('GEE_PROJECT_ID'))).catch(error => { initialized = undefined; throw error; });
  await initialized;
  return ee;
}
export function evaluate<T>(value: { evaluate: (callback: (result: T, error?: string) => void) => void }): Promise<T> {
  return new Promise((resolve, reject) => value.evaluate((result, error) => error ? reject(new Error('Earth Engine could not process this area and date range.')) : resolve(result)));
}
