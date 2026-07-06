import type { RunnerPlugin } from '@ezt/core';

/**
 * Capability manifest a plugin declares to the (future) Plugin Registry so the
 * core can discover what a runner can do without importing it.
 */
export interface CapabilityManifest {
  id: string;
  kind: 'runner';
  platform: string;
  /** e.g. ['functional', 'e2e', 'visual', 'a11y'] */
  capabilities: string[];
  version: string;
}

/** Identity helper for authoring runners with inferred types + a manifest. */
export function defineRunner<T extends RunnerPlugin>(
  runner: T,
  manifest: Omit<CapabilityManifest, 'kind'>,
): T & { manifest: CapabilityManifest } {
  return Object.assign(runner, { manifest: { kind: 'runner' as const, ...manifest } });
}

export type { RunnerPlugin, RunnerContext } from '@ezt/core';
