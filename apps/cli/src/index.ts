import { execSync } from 'node:child_process';
import { Command } from 'commander';
import { loadConfig } from '@ezt/config';
import { TestingAgent } from '@ezt/core';
import { registry } from '@ezt/products';
import { WebRunner } from '@ezt/runner-web';
import { MobileRunner } from '@ezt/runner-mobile';
import { checkConnection, ensureUser } from '@ezt/supabase';
import { analyzeProduct, runAuthenticatedChecks } from '@ezt/analyzer';
import type { LoginDescriptor, Credentials } from '@ezt/analyzer';

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
  .command('seed-admin')
  .description('create the admin platform user (admin@ezbillify.com)')
  .action(async () => {
    const r = await ensureUser('admin@ezbillify.com', 'admin123');
    console.log(
      r.created
        ? `\n  created admin@ezbillify.com (${r.id})\n`
        : '\n  admin@ezbillify.com already exists\n',
    );
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
  .command('analyze')
  .argument('<url>', 'product URL to analyze, e.g. https://ezbillify.com')
  .option('--max-pages <n>', 'max pages to crawl', '25')
  .option('--max-depth <n>', 'max crawl depth', '2')
  .option('--json', 'output raw JSON')
  .description('crawl a product and auto-detect its login (read-only, no creds)')
  .action(async (url: string, opts: { maxPages: string; maxDepth: string; json?: boolean }) => {
    if (!opts.json) console.log(`\n  Analyzing ${url}  (read-only crawl + login detection)...\n`);
    const r = await analyzeProduct(url, {
      maxPages: Number(opts.maxPages),
      maxDepth: Number(opts.maxDepth),
    });
    if (opts.json) {
      // machine-readable ONLY (consumed by the dashboard) — no banner.
      process.stdout.write(JSON.stringify(r));
      return;
    }
    console.log(`  Origin          ${r.origin}`);
    console.log(`  Pages crawled   ${r.crawl.pagesCrawled}`);
    console.log('  Top pages:');
    for (const p of r.crawl.pages.slice(0, 10)) {
      const title = p.title ? ` · ${p.title.slice(0, 42)}` : '';
      console.log(`    [${String(p.status).padStart(3)}] ${p.url}${title}`);
    }
    console.log(`\n  Login detected  ${r.login.found ? 'YES' : 'no'}`);
    if (r.login.found) {
      console.log(`  Login URL       ${r.login.loginUrl}`);
      console.log(`  Login scheme    ${r.login.scheme}`);
      for (const f of r.login.fields) {
        const label = f.label ? `  (${f.label.slice(0, 30)})` : '';
        console.log(`    - ${f.role.padEnd(10)} ${f.selector}${label}`);
      }
    }
    for (const n of r.login.notes) console.log(`  note: ${n}`);
    console.log('');
  });

program
  .command('run-auth')
  .description('authenticated deep-crawl + checks; reads JSON config from stdin (creds never on argv)')
  .action(async () => {
    const chunks: Buffer[] = [];
    for await (const c of process.stdin) chunks.push(c as Buffer);
    const cfg = JSON.parse(Buffer.concat(chunks).toString()) as {
      baseUrl: string;
      login: LoginDescriptor;
      credentials: Credentials;
      maxPages?: number;
      maxDepth?: number;
    };
    const result = await runAuthenticatedChecks(cfg.baseUrl, cfg.login, cfg.credentials, {
      maxPages: cfg.maxPages ?? 15,
      maxDepth: cfg.maxDepth ?? 1,
    });
    process.stdout.write(JSON.stringify(result));
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
