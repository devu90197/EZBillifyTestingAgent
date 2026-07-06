import { chromium, type Browser } from 'playwright';
import type { AnalyzeOptions, CrawlResult, CrawledPage } from './types';

/** Normalize a URL: absolute, no fragment, no trailing slash (except root). */
function normalize(raw: string, base: string): string | null {
  try {
    const u = new URL(raw, base);
    u.hash = '';
    let s = u.toString();
    if (s.endsWith('/') && u.pathname !== '/') s = s.slice(0, -1);
    return s;
  } catch {
    return null;
  }
}

/**
 * Read-only, same-origin BFS crawl. Discovers the link graph of a product so we
 * know what surfaces exist to test. Bounded by maxPages/maxDepth so it is safe
 * and fast against any site. A shared Browser may be passed in (not closed here).
 */
export async function crawlSite(
  startUrl: string,
  opts: AnalyzeOptions = {},
  browser?: Browser,
): Promise<CrawlResult> {
  const maxPages = opts.maxPages ?? 25;
  const maxDepth = opts.maxDepth ?? 2;
  const timeoutMs = opts.timeoutMs ?? 15_000;
  const origin = new URL(startUrl).origin;

  const ownBrowser = !browser;
  const b = browser ?? (await chromium.launch());
  const ctx = await b.newContext({
    ignoreHTTPSErrors: true,
    userAgent: 'EZT-Analyzer/0.1 (+testing-agent; read-only)',
  });
  const page = await ctx.newPage();

  const visited = new Set<string>();
  const start = normalize(startUrl, startUrl) ?? startUrl;
  const queue: Array<{ url: string; depth: number }> = [{ url: start, depth: 0 }];
  const pages: CrawledPage[] = [];

  try {
    while (queue.length > 0 && pages.length < maxPages) {
      const { url, depth } = queue.shift()!;
      if (visited.has(url)) continue;
      visited.add(url);
      try {
        const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
        const title = await page.title().catch(() => '');
        const hrefs = await page.$$eval('a[href]', (as) =>
          as.map((a) => (a as HTMLAnchorElement).href),
        );
        const sameOrigin = [
          ...new Set(
            hrefs
              .map((h) => normalize(h, url))
              .filter((h): h is string => !!h && new URL(h).origin === origin),
          ),
        ];
        pages.push({ url, status: resp?.status() ?? 0, title, depth, outLinks: sameOrigin.length });
        if (depth < maxDepth) {
          for (const link of sameOrigin) if (!visited.has(link)) queue.push({ url: link, depth: depth + 1 });
        }
      } catch (e) {
        pages.push({
          url,
          status: 0,
          title: '',
          depth,
          outLinks: 0,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
  } finally {
    await ctx.close();
    if (ownBrowser) await b.close();
  }

  return { origin, startUrl, pagesCrawled: pages.length, pages };
}
