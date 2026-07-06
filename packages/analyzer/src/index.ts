import { chromium } from 'playwright';
import { crawlSite } from './crawler';
import { detectLoginForm } from './login-detector';
import type { AnalyzeOptions, AnalyzeResult } from './types';

/**
 * Analyze any product from just its URL: crawl the link graph AND detect how its
 * login works — read-only, no credentials required. This is the dynamic core:
 * point it at any website and it reports what to test and how to sign in.
 */
export async function analyzeProduct(
  startUrl: string,
  opts: AnalyzeOptions = {},
): Promise<AnalyzeResult> {
  const origin = new URL(startUrl).origin;
  const browser = await chromium.launch();
  try {
    const crawl = await crawlSite(startUrl, opts, browser);
    const login = await detectLoginForm(startUrl, opts, browser);
    return { origin, startUrl, analyzedAt: new Date().toISOString(), crawl, login };
  } finally {
    await browser.close();
  }
}

export { crawlSite } from './crawler';
export { detectLoginForm } from './login-detector';
export { runAuthenticatedChecks } from './auth-runner';
export type {
  LoginDescriptor,
  Credentials,
  AuthCheck,
  AuthRunResult,
} from './auth-runner';
export type {
  AnalyzeOptions,
  AnalyzeResult,
  CrawlResult,
  CrawledPage,
  LoginDetection,
  LoginField,
  LoginScheme,
} from './types';
