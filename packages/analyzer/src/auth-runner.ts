import { chromium, type Browser } from 'playwright';
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

/**
 * Log in with the detected form + supplied credentials, then crawl behind auth
 * and run generic health checks (HTTP status + console errors per page). This is
 * the autonomous authenticated testing loop — it needs no per-product code.
 */
export async function runAuthenticatedChecks(
  baseUrl: string,
  login: LoginDescriptor,
  creds: Credentials,
  opts: AnalyzeOptions = {},
  browser?: Browser,
): Promise<AuthRunResult> {
  const maxPages = opts.maxPages ?? 15;
  const maxDepth = opts.maxDepth ?? 1;
  const timeoutMs = opts.timeoutMs ?? 20_000;
  const origin = new URL(baseUrl).origin;
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
  const loginAttempted = !!(idSel && pwSel);

  try {
    await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    if (loginAttempted) {
      const before = page.url();
      await page.fill(idSel!, creds.identifier).catch(() => {});
      await page.fill(pwSel!, creds.secret).catch(() => {});
      if (submitSel) await page.click(submitSel).catch(() => {});
      else await page.keyboard.press('Enter').catch(() => {});
      await page.waitForLoadState('networkidle', { timeout: timeoutMs }).catch(() => {});
      await page.waitForTimeout(800);
      const after = page.url();
      const stillHasPassword = (await page.locator('input[type="password"]').count()) > 0;
      loginSuccess = (after !== before && !after.includes(new URL(loginUrl).pathname)) || !stillHasPassword;
      detail = loginSuccess ? `signed in (now at ${after})` : `login uncertain (still at ${after})`;
    } else {
      detail = 'login field selectors incomplete — skipped login';
    }

    const visited = new Set<string>();
    const queue: Array<{ url: string; depth: number }> = [{ url: normalize(baseUrl) ?? baseUrl, depth: 0 }];
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
            if (n && new URL(n).origin === origin && !visited.has(n)) queue.push({ url: n, depth: depth + 1 });
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
    pagesChecked: checks.length,
    passed,
    failed: checks.length - passed,
    checks,
    startedAt,
    finishedAt: new Date().toISOString(),
  };
}
