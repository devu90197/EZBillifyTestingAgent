import { createClient, type SupabaseClient, type Session } from '@supabase/supabase-js';
import { loadConfig } from '@ezt/config';

/** Anon-key client. Session is never persisted (test isolation). */
export function createSupabaseClient(): SupabaseClient {
  const cfg = loadConfig();
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
    throw new Error('Set SUPABASE_URL and SUPABASE_ANON_KEY in .env first.');
  }
  return createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Lightweight reachability check — needs only SUPABASE_URL, no key. */
export async function checkConnection(): Promise<{ ok: boolean; detail: string }> {
  const cfg = loadConfig();
  if (!cfg.SUPABASE_URL) {
    return { ok: false, detail: 'SUPABASE_URL not set in .env' };
  }
  try {
    const headers: Record<string, string> = {};
    if (cfg.SUPABASE_ANON_KEY) {
      headers.apikey = cfg.SUPABASE_ANON_KEY;
      headers.Authorization = `Bearer ${cfg.SUPABASE_ANON_KEY}`;
    }
    const res = await fetch(`${cfg.SUPABASE_URL}/auth/v1/health`, { headers });
    return { ok: res.ok, detail: `GET /auth/v1/health -> ${res.status}` };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Sign in a dedicated test user with email/password. Returns the session so a
 * browser test can inject the JWT and skip the UI login (fast, deterministic).
 */
/** Service-role client — bypasses RLS. Server-side/admin use only, never in the browser. */
export function createAdminClient(): SupabaseClient {
  const cfg = loadConfig();
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env first.');
  }
  return createClient(cfg.SUPABASE_URL, cfg.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Idempotently create a platform user (email confirmed). Used to seed the admin. */
export async function ensureUser(
  email: string,
  password: string,
): Promise<{ created: boolean; id?: string }> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) {
    if (/already|registered|exists/i.test(error.message)) return { created: false };
    throw new Error(error.message);
  }
  return { created: true, id: data.user?.id };
}

export async function signInTestUser(email: string, password: string): Promise<Session> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(`Test-user sign-in failed: ${error?.message ?? 'no session returned'}`);
  }
  return data.session;
}

export type { SupabaseClient, Session };
