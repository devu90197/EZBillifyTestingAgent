import type { Product } from '../domain/product';
import type { RunnerPlugin, RunnerContext } from '../ports/runner';
import type { TestRunResult } from '../domain/run';

/**
 * The universal testing agent core.
 *
 * Given a product and the set of installed runners, it selects the runners that
 * support the product and executes each with a guaranteed teardown. This class
 * is the seat for future AI-driven behaviour (test selection, generation,
 * prioritisation) — for now it runs every supporting runner in order.
 */
export class TestingAgent {
  constructor(private readonly runners: readonly RunnerPlugin[]) {}

  /** Runners that can handle this product. */
  runnersFor(product: Product): RunnerPlugin[] {
    return this.runners.filter((r) => r.supports(product));
  }

  async run(product: Product, artifactRoot: string): Promise<TestRunResult[]> {
    const results: TestRunResult[] = [];
    for (const runner of this.runnersFor(product)) {
      const ctx: RunnerContext = {
        product,
        artifactDir: `${artifactRoot}/${product.id}/${runner.platform}`,
      };
      await runner.prepare(ctx);
      try {
        results.push(await runner.execute(ctx));
      } finally {
        // teardown always runs — production-safety requirement.
        await runner.teardown(ctx);
      }
    }
    return results;
  }
}
