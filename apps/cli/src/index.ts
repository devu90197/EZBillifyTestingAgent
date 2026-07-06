import { execSync } from 'node:child_process';
import { Command } from 'commander';
import { loadConfig } from '@ezt/config';
import { TestingAgent } from '@ezt/core';
import { registry } from '@ezt/products';
import { WebRunner } from '@ezt/runner-web';
import { MobileRunner } from '@ezt/runner-mobile';
import { checkConnection } from '@ezt/supabase';

const program = new Command();
program
  .name('ezt')
  .description('EZT — Universal Testing Agent. Test any website or app automatically.')
  .version('0.1.0');

program
  .command('doctor')
  .description('check the local toolchain')
  .action(() => {
    const checks: Array<[string, () => string]> = [
      ['Node', () => process.version],
      ['Java (Android/Appium)', () => firstLine(sh('java -version'))],
      ['adb (Android SDK)', () => firstLine(sh('adb version'))],
      ['Playwright', () => firstLine(sh('pnpm --filter @ezt/runner-web exec playwright --version'))],
      ['Appium', () => firstLine(sh('pnpm --filter @ezt/runner-mobile exec appium --version'))],
    ];
    console.log('\n  EZT toolchain\n  -------------');
    for (const [name, fn] of checks) {
      try {
        console.log(`  [ok]   ${name.padEnd(24)} ${fn()}`);
      } catch {
        console.log(`  [--]   ${name.padEnd(24)} not available`);
      }
    }
    console.log(
      '\n  Note: iOS native testing requires a macOS host with Xcode — not available on Windows.\n',
    );
  });

program
  .command('products')
  .description('list registered products')
  .action(() => {
    console.log('\n  Registered products\n  -------------------');
    for (const p of registry.all()) {
      console.log(`  ${p.id.padEnd(16)} ${p.name}  [${p.platforms.join(', ')}]`);
    }
    console.log('');
  });

program
  .command('supabase-check')
  .description('verify Supabase connectivity using .env credentials')
  .action(async () => {
    const { ok, detail } = await checkConnection();
    console.log(`\n  Supabase: ${ok ? '[ok]' : '[--]'} ${detail}\n`);
    // Unconfigured is not a failure — only a live connection error is.
    const unconfigured = detail.includes('not set');
    process.exit(ok || unconfigured ? 0 : 1);
  });

program
  .command('run')
  .argument('<productId>', 'id of a registered product (see `ezt products`)')
  .option('--artifacts <dir>', 'artifact output root', './artifacts')
  .description('run the testing agent against a product')
  .action(async (productId: string, opts: { artifacts: string }) => {
    loadConfig();
    const product = registry.get(productId);
    const agent = new TestingAgent([new WebRunner(), new MobileRunner()]);
    console.log(`\n  Running agent for "${product.name}" via: ${agent
      .runnersFor(product)
      .map((r) => r.id)
      .join(', ')}\n`);
    const results = await agent.run(product, opts.artifacts);
    console.log(JSON.stringify(results, null, 2));
    process.exit(results.some((r) => r.status !== 'passed' && r.status !== 'skipped') ? 1 : 0);
  });

program.parseAsync().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});

function sh(cmd: string): string {
  return execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
}
function firstLine(s: string): string {
  return s.split('\n')[0]?.trim() ?? '';
}
