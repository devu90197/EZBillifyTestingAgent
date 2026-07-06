import { chromium, type Browser, type Page } from 'playwright';
import type { AnalyzeOptions, LoginField } from './types';

export interface LoginDescriptor {
  loginUrl?: string;
  scheme: string;
  fields: LoginField[];
}

export interface Credentials {
  identifier: string;
  secret: string;
  otp?: string;
}

export interface AuthCheck {
  url: string;
  status: number;
  title: string;
  consoleErrors: number;
  ok: boolean;
}

export interface AuthRunResult {
  loginAttempted: boolean;
  loginSuccess: boolean;
  detail: string;
  startUrl: string;
  loginUrl?: string;
  landingUrl?: string;
  pagesChecked: number;
  passed: number;
  failed: number;
  checks: AuthCheck[];
  startedAt: string;
  finishedAt: string;
}

function selFor(fields: LoginField[], role: LoginField['role']): string | undefined {
  return fields.find((f) => f.role === role)?.selector;
}

function normalize(raw: string): string | null {
  try {
    const u = new URL(raw);
    u.hash = '';
    let s = u.toString();
    if (s.endsWith('/') && u.pathname !== '/') s = s.slice(0, -1);
    return s;
  } catch {
    return null;
  }
}

async function fillFirst(page: Page, sel: string | undefined, fallback: string, value: string) {
  const loc = sel && (await page.locator(sel).count()) > 0 ? page.locator(sel).first() : page.locator(fallback).first();
  await loc.fill(value).catch(() => {});
}

/**
 * Log in with the detected form + supplied credentials, then crawl behind auth
 * starting from the POST-LOGIN landing page to discover the product's internal
 * URLs, checking HTTP status + console errors per page. Handles single-step and
 * multi-step / identifier-first (enter identifier, then password) flows.
 */
export async function runAuthenticatedChecks(
  baseUrl: string,
  login: LoginDescriptor,
  creds: Credentials,
  opts: AnalyzeOptions = {},
  browser?: Browser,
): Promise<AuthRunResult> {
  const maxPages = opts.maxPages ?? 20;
  const maxDepth = opts.maxDepth ?? 2;
  const timeoutMs = opts.timeoutMs ?? 20_000;
  const startedAt = new Date().toISOString();

  const ownBrowser = !browser;
  const b = browser ?? (await chromium.launch());
  const ctx = await b.newContext({ ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  let consoleErrors = 0;
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors++;
  });

  const checks: AuthCheck[] = [];
  const loginUrl = login.loginUrl ?? baseUrl;
  const idSel = selFor(login.fields, 'identifier');
  const pwSel = selFor(login.fields, 'password');
  const submitSel = selFor(login.fields, 'submit');
  let loginSuccess = false;
  let detail = '';
  let landingUrl = baseUrl;
  const loginAttempted = true;

  try {
    await page.goto(loginUrl, { waitUntil: 'networkidle', timeout: timeoutMs });
    const before = page.url();

    // Step 1: identifier
    await page.locator(idSel ?? 'input:not([type="hidden"]):not([type="password"])').first().waitFor({ timeout: 6000 }).catch(() => {});
    await fillFirst(page, idSel, 'input:not([type="hidden"]):not([type="password"])', creds.identifier);

    // Step 2: password — if not present yet, advance the multi-step form.
    let hasPw = (await page.locator('input[type="password"]').count()) > 0;
    if (!hasPw) {
      if (submitSel && (await page.locator(submitSel).count()) > 0) await page.locator(submitSel).first().click().catch(() => {});
      else await page.keyboard.press('Enter').catch(() => {});
      await page.waitForLoadState('networkidle', { timeout: timeoutMs }).catch(() => {});
      await page.locator('input[type="password"]').first().waitFor({ timeout: 6000 }).catch(() => {});
      hasPw = (await page.locator('input[type="password"]').count()) > 0;
    }
    if (hasPw) await fillFirst(page, pwSel, 'input[type="password"]', creds.secret);

    // Step 3: submit
    const submitBtn =
      submitSel && (await page.locator(submitSel).count()) > 0
        ? page.locator(submitSel).first()
        : page.getByRole('button', { name: /sign ?in|log ?in|login|continue|submit/i }).first();
    if ((await submitBtn.count()) > 0) await submitBtn.click().catch(() => {});
    else await page.keyboard.press('Enter').catch(() => {});

    await page.waitForLoadState('networkidle', { timeout: timeoutMs }).catch(() => {});
    await page.waitForTimeout(1000);

    landingUrl = page.url();
    const stillHasPassword = (await page.locator('input[type="password"]').count()) > 0;
    const loginPath = (() => {
      try {
        return new URL(loginUrl).pathname;
      } catch {
        return '/login';
      }
    })();
    loginSuccess = (landingUrl !== before && !landingUrl.includes(loginPath)) || !stillHasPassword;
    detail = loginSuccess
      ? `signed in — landed on ${landingUrl}`
      : `login uncertain — still at ${landingUrl}`;

    // Step 4: crawl behind auth FROM the landing page (discovers product URLs).
    const crawlOrigin = new URL(landingUrl).origin;
    const start = normalize(landingUrl) ?? landingUrl;
    const visited = new Set<string>();
    const queue: Array<{ url: string; depth: number }> = [{ url: start, depth: 0 }];
    while (queue.length > 0 && checks.length < maxPages) {
      const { url, depth } = queue.shift()!;
      if (visited.has(url)) continue;
      visited.add(url);
      consoleErrors = 0;
      try {
        const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
        await page.waitForTimeout(250);
        const status = resp?.status() ?? 0;
        const title = await page.title().catch(() => '');
        checks.push({ url, status, title, consoleErrors, ok: status > 0 && status < 400 });
        if (depth < maxDepth) {
          const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => (a as HTMLAnchorElement).href));
          for (const h of hrefs) {
            const n = normalize(h);
            if (n && new URL(n).origin === crawlOrigin && !visited.has(n)) queue.push({ url: n, depth: depth + 1 });
          }
        }
      } catch {
        checks.push({ url, status: 0, title: '', consoleErrors, ok: false });
      }
    }
  } finally {
    await ctx.close();
    if (ownBrowser) await b.close();
  }

  const passed = checks.filter((c) => c.ok).length;
  return {
    loginAttempted,
    loginSuccess,
    detail,
    startUrl: baseUrl,
    loginUrl,
    landingUrl,
    pagesChecked: checks.length,
    passed,
    failed: checks.length - passed,
    checks,
    startedAt,
    finishedAt: new Date().toISOString(),
  };
}
