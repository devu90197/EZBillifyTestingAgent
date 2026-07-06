import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import * as dotenv from 'dotenv';
import { z } from 'zod';

/** Walk up from cwd to find the monorepo-root .env, so config works from any package. */
function findEnvPath(start: string = process.cwd()): string | undefined {
  let dir = start;
  for (let i = 0; i < 8; i++) {
    const candidate = join(dir, '.env');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return undefined;
}

const envPath = findEnvPath();
dotenv.config(envPath ? { path: envPath } : undefined);

/**
 * Layered, schema-validated config. Precedence: process env (sourced from .env
 * locally, or from Vault/CI in real environments) validated at boot. All
 * product/secret values are OPTIONAL so the foundation runs without them; the
 * relevant runner errors clearly if a value it needs is missing.
 */
const EnvSchema = z.object({
  EZT_ENV: z.enum(['local', 'ci', 'staging', 'prod-validation']).default('local'),
  EZT_SAFETY_MODE: z.enum(['read-only', 'read-write']).default('read-only'),
  EZT_ARTIFACT_DIR: z.string().min(1).default('./artifacts'),

  /** Optional web target override; normally supplied by the product config. */
  EZT_TARGET_URL: z.string().url().optional(),

  /** Dedicated EzBillify QA test account (NEVER a real customer account). */
  EZT_EZBILLIFY_TEST_EMAIL: z.string().email().optional(),
  EZT_EZBILLIFY_TEST_PASSWORD: z.string().optional(),

  /** Supabase — used for auth bootstrap and (later) read-only DB validation. */
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  /** ⚠️ bypasses Row-Level Security. Sandbox/staging ONLY — never against prod. */
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  /** Read-ONLY Postgres connection string for DB validation (use a read-only role). */
  SUPABASE_DB_URL: z.string().optional(),
  /** For the `supabase` CLI (schema introspection / migrations). */
  SUPABASE_PROJECT_REF: z.string().optional(),
  SUPABASE_ACCESS_TOKEN: z.string().optional(),
});

export type EztConfig = z.infer<typeof EnvSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): EztConfig {
  // Treat empty env values ("KEY=") as unset, so blank .env placeholders don't
  // fail format validation (url/email) on optional keys.
  const cleaned: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(env)) {
    cleaned[key] = value === '' ? undefined : value;
  }
  const parsed = EnvSchema.safeParse(cleaned);
  if (!parsed.success) {
    throw new Error(`Invalid EZT configuration:\n${parsed.error.toString()}`);
  }
  return parsed.data;
}
