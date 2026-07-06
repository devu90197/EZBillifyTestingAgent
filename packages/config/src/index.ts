import * as dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

/**
 * Layered, schema-validated config. Precedence: process env (which may be
 * sourced from .env locally, or from Vault/CI in real environments) validated
 * against this schema at boot. Fail fast on misconfiguration.
 */
const EnvSchema = z.object({
  EZT_ENV: z.enum(['local', 'ci', 'staging', 'prod-validation']).default('local'),
  EZT_SAFETY_MODE: z.enum(['read-only', 'read-write']).default('read-only'),
  EZT_ARTIFACT_DIR: z.string().min(1).default('./artifacts'),
  /** Optional web target override; normally supplied by the product config. */
  EZT_TARGET_URL: z.string().url().optional(),
});

export type EztConfig = z.infer<typeof EnvSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): EztConfig {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Invalid EZT configuration:\n${parsed.error.toString()}`);
  }
  return parsed.data;
}
