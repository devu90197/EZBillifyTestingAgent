import type { Product } from '../domain/product';
import type { TestRunResult } from '../domain/run';

export interface RunnerContext {
  product: Product;
  /** Directory where this run should drop artifacts. */
  artifactDir: string;
  /** Free-form options passed from the CLI / scheduler. */
  options?: Record<string, unknown>;
}

/**
 * The universal Runner port. Every test type (web, mobile, api, security, perf…)
 * is a plugin implementing exactly this contract, so the core stays open for
 * extension but closed for modification (SOLID: Open/Closed + Liskov).
 * Lifecycle: prepare -> execute -> teardown (teardown always runs).
 */
export interface RunnerPlugin {
  readonly id: string;
  readonly platform: string;
  /** Capability check: can this runner handle the given product? */
  supports(product: Product): boolean;
  prepare(ctx: RunnerContext): Promise<void>;
  execute(ctx: RunnerContext): Promise<TestRunResult>;
  teardown(ctx: RunnerContext): Promise<void>;
}
