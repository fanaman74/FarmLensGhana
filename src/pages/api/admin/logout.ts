import type { APIRoute } from 'astro';
import { clearSession } from '../../../lib/auth/adminSession';
export const POST: APIRoute = async ({ cookies }) => { clearSession(cookies); return Response.json({ ok: true }); };
