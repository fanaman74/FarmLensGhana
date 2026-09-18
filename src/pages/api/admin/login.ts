import type { APIRoute } from 'astro';
import { z } from 'zod';
import { authConfigured, createSession, verifyPassword } from '../../../lib/auth/adminSession';

const attempts = new Map<string, { count: number; reset: number }>();
const MAX_LOGIN_ATTEMPTS_ENTRIES = 1000;
const bodySchema = z.object({ password: z.string().min(8).max(200) });

function pruneAttempts(now: number) {
  for (const [key, state] of attempts) if (state.reset <= now) attempts.delete(key);
}

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  if (!authConfigured()) return Response.json({ error: 'Administrator authentication is not configured. Set ADMIN_PASSWORD_HASH and APP_ENCRYPTION_KEY.' }, { status: 503 });
  const key = clientAddress || 'unknown'; const now = Date.now(); pruneAttempts(now); const state = attempts.get(key);
  if (state && state.reset > now && state.count >= 5) return Response.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
  if (!state && attempts.size >= MAX_LOGIN_ATTEMPTS_ENTRIES) return Response.json({ error: 'Too many login attempts are active. Try again later.' }, { status: 429 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !verifyPassword(parsed.data.password)) {
    attempts.set(key, { count: state && state.reset > now ? state.count + 1 : 1, reset: now + 15 * 60_000 });
    return Response.json({ error: 'Invalid credentials.' }, { status: 401 });
  }
  attempts.delete(key); createSession(cookies);
  return Response.json({ ok: true });
};
