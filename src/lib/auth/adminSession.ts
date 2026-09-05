import { createHmac, scryptSync, timingSafeEqual } from 'node:crypto';
import type { AstroCookies } from 'astro';
import { secret } from '../security/secrets';

const COOKIE = 'farmlens_admin';
const MAX_AGE = 60 * 60 * 4;

function key() { return secret('APP_ENCRYPTION_KEY'); }
function sign(payload: string) { return createHmac('sha256', key()).update(payload).digest('base64url'); }

export function authConfigured() { return Boolean(secret('ADMIN_PASSWORD_HASH') && key().length >= 32); }

export function verifyPassword(password: string): boolean {
  const encoded = secret('ADMIN_PASSWORD_HASH');
  if (!encoded || password.length > 200) return false;
  const [scheme, salt, expectedHex] = encoded.split('$');
  if (scheme !== 'scrypt' || !salt || !expectedHex) return false;
  try {
    const actual = scryptSync(password, salt, 64);
    const expected = Buffer.from(expectedHex, 'hex');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch { return false; }
}

export function createSession(cookies: AstroCookies) {
  const payload = Buffer.from(JSON.stringify({ role: 'admin', exp: Math.floor(Date.now()/1000)+MAX_AGE })).toString('base64url');
  cookies.set(COOKIE, `${payload}.${sign(payload)}`, { httpOnly: true, secure: import.meta.env.PROD, sameSite: 'strict', path: '/', maxAge: MAX_AGE });
}

export function isAdmin(cookies: AstroCookies): boolean {
  const token = cookies.get(COOKIE)?.value;
  if (!token || !key()) return false;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;
  const actual = Buffer.from(signature);
  const expected = Buffer.from(sign(payload));
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false;
  try { const body = JSON.parse(Buffer.from(payload, 'base64url').toString()); return body.role === 'admin' && body.exp > Date.now()/1000; } catch { return false; }
}

export function clearSession(cookies: AstroCookies) { cookies.delete(COOKIE, { path: '/' }); }
