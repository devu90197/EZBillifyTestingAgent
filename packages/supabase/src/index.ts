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
    const res = await fetch(`${cfg.SUPABASE_URL}/auth/v1/health`);
    return { ok: res.ok, detail: `GET /auth/v1/health -> ${res.status}` };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Sign in a dedicated test user with email/password. Returns the session so a
 * browser test can inject the JWT and skip the UI login (fast, deterministic).
 */
export async function signInTestUser(email: string, password: string): Promise<Session> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(`Test-user sign-in failed: ${error?.message ?? 'no session returned'}`);
  }
  return data.session;
}

export type { SupabaseClient, Session };
