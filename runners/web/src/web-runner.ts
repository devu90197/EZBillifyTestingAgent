import { spawn } from 'node:child_process';
import type { Product, RunnerContext, RunnerPlugin, TestRunResult } from '@ezt/core';

/**
 * Web runner plugin. Implements the universal Runner port by driving Playwright.
 * execute() shells out to `playwright test` with the product's baseUrl injected
 * as EZT_TARGET_URL, so the same runner tests ANY product.
 */
export class WebRunner implements RunnerPlugin {
  readonly id = 'runner-web';
  readonly platform = 'web';

  supports(product: Product): boolean {
    return product.platforms.includes('web') && !!product.web?.baseUrl;
  }

  async prepare(): Promise<void> {
    /* browsers are installed once via `pnpm browsers:install` */
  }

  async execute(ctx: RunnerContext): Promise<TestRunResult> {
    const startedAt = new Date().toISOString();
    const exitCode = await this.runPlaywright(ctx.product.web!.baseUrl);
    return {
      productId: ctx.product.id,
      platform: this.platform,
      runner: this.id,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: exitCode === 0 ? 'passed' : 'failed',
      cases: [],
    };
  }

  async teardown(): Promise<void> {
    /* no persistent state in the foundation */
  }

  private runPlaywright(baseUrl: string): Promise<number> {
    return new Promise((resolve) => {
      const child = spawn(
        'pnpm',
        ['--filter', '@ezt/runner-web', 'exec', 'playwright', 'test', '--reporter=list'],
        {
          env: { ...process.env, EZT_TARGET_URL: baseUrl },
          stdio: 'inherit',
          shell: process.platform === 'win32',
        },
      );
      child.on('close', (code) => resolve(code ?? 1));
      child.on('error', () => resolve(1));
    });
  }
}
