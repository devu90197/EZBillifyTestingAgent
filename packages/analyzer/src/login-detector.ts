import { chromium, type Browser, type Page } from 'playwright';
import type { AnalyzeOptions, LoginDetection, LoginField, LoginScheme } from './types';

const CANDIDATE_PATHS = [
  '/login',
  '/signin',
  '/sign-in',
  '/auth/login',
  '/account/login',
  '/users/sign_in',
  '/session/new',
];

interface RawInput {
  type: string;
  name: string;
  id: string;
  placeholder: string;
  autocomplete: string;
  label: string;
}
interface RawForm {
  inputs: RawInput[];
  submitTag: string;
  submitType: string;
  submitId: string;
  submitName: string;
  submitLabel: string;
}

/**
 * Detect how a product's login works by analyzing the LIVE site: find the login
 * page, inspect its form, and classify the scheme (email / username / phone +
 * password, or OTP). Returns resilient selectors the runner can drive later.
 */
export async function detectLoginForm(
  startUrl: string,
  opts: AnalyzeOptions = {},
  browser?: Browser,
): Promise<LoginDetection> {
  const timeoutMs = opts.timeoutMs ?? 15_000;
  const origin = new URL(startUrl).origin;
  const ownBrowser = !browser;
  const b = browser ?? (await chromium.launch());
  const ctx = await b.newContext({ ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  const notes: string[] = [];

  try {
    const candidates = new Set<string>();
    try {
      await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
      const links = await page.$$eval('a[href]', (as) =>
        as
          .filter((a) =>
            /log ?in|sign ?in|account|my ?account/i.test(
              `${a.textContent ?? ''} ${a.getAttribute('href') ?? ''}`,
            ),
          )
          .map((a) => (a as HTMLAnchorElement).href),
      );
      for (const l of links) {
        try {
          if (new URL(l).origin === origin) candidates.add(l);
        } catch {
          /* ignore */
        }
      }
    } catch (e) {
      notes.push(`homepage load failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    for (const p of CANDIDATE_PATHS) candidates.add(origin + p);

    for (const url of [...candidates].slice(0, 14)) {
      let reached = false;
      try {
        const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
        if (!resp || resp.status() >= 400) continue;
        reached = true;
        if ((await page.locator('input[type="password"]').count()) === 0) continue;
        return { ...(await extractLogin(page, url)), notes: [...notes] };
      } catch (e) {
        if (reached) notes.push(`candidate ${url}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return {
      found: false,
      scheme: 'unknown',
      fields: [],
      notes: [...notes, 'no login form with a password field found at homepage links or common paths'],
    };
  } finally {
    await ctx.close();
    if (ownBrowser) await b.close();
  }
}

async function extractLogin(page: Page, loginUrl: string): Promise<LoginDetection> {
  // IMPORTANT: the evaluate callback must contain NO named helper functions —
  // esbuild/tsx injects a `__name` helper that is undefined in the browser.
  // We pull raw attributes here and compute selectors/scheme in Node below.
  const raw: RawForm = await page.evaluate(() => {
    const pw = document.querySelector('input[type="password"]');
    const form = (pw && pw.closest('form')) || document.body;
    const inputs = Array.from(form.querySelectorAll('input')).map((i) => {
      const id = i.getAttribute('id') || '';
      let label = '';
      if (id) {
        const l = document.querySelector('label[for="' + id + '"]');
        if (l && l.textContent) label = l.textContent.trim();
      }
      if (!label) {
        const w = i.closest('label');
        if (w && w.textContent) label = w.textContent.trim();
      }
      if (!label) label = i.getAttribute('placeholder') || i.getAttribute('aria-label') || '';
      return {
        type: i.getAttribute('type') || 'text',
        name: i.getAttribute('name') || '',
        id,
        placeholder: i.getAttribute('placeholder') || '',
        autocomplete: i.getAttribute('autocomplete') || '',
        label,
      };
    });
    const btn = form.querySelector('button[type="submit"], input[type="submit"], button');
    return {
      inputs,
      submitTag: btn ? btn.tagName.toLowerCase() : '',
      submitType: btn ? btn.getAttribute('type') || '' : '',
      submitId: btn ? btn.getAttribute('id') || '' : '',
      submitName: btn ? btn.getAttribute('name') || '' : '',
      submitLabel: btn ? (btn.textContent || '').trim() || btn.getAttribute('value') || '' : '',
    };
  });

  const cssEscape = (s: string): string => s.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`);
  const inputSel = (i: RawInput): string =>
    i.id ? `#${cssEscape(i.id)}` : i.name ? `input[name="${i.name}"]` : `input[type="${i.type}"]`;
  const text = (i: RawInput): string =>
    `${i.name} ${i.id} ${i.placeholder} ${i.label} ${i.autocomplete}`.toLowerCase();

  const pwInput = raw.inputs.find((i) => i.type === 'password');
  const otpInput = raw.inputs.find((i) => /otp|one.?time|verification|\bcode\b/.test(text(i)));
  const emailInput = raw.inputs.find((i) => i.type === 'email' || /email|e-mail/.test(text(i)));
  const phoneInput = raw.inputs.find((i) => i.type === 'tel' || /phone|mobile|msisdn/.test(text(i)));
  const userInput = raw.inputs.find(
    (i) => i.type !== 'password' && i.type !== 'hidden' && /user|login|account/.test(text(i)),
  );
  const firstText = raw.inputs.find(
    (i) => i.type !== 'password' && i.type !== 'hidden' && i.type !== 'checkbox',
  );

  const fields: LoginField[] = [];
  const identifier = emailInput ?? phoneInput ?? userInput ?? firstText;
  if (identifier)
    fields.push({
      role: 'identifier',
      selector: inputSel(identifier),
      inputType: identifier.type,
      name: identifier.name,
      label: identifier.label,
    });
  if (pwInput)
    fields.push({ role: 'password', selector: inputSel(pwInput), inputType: 'password', name: pwInput.name });
  if (otpInput)
    fields.push({ role: 'otp', selector: inputSel(otpInput), inputType: otpInput.type, name: otpInput.name });
  if (raw.submitTag) {
    const submitSel = raw.submitId
      ? `#${cssEscape(raw.submitId)}`
      : raw.submitName
        ? `${raw.submitTag}[name="${raw.submitName}"]`
        : raw.submitType
          ? `${raw.submitTag}[type="${raw.submitType}"]`
          : raw.submitTag;
    fields.push({ role: 'submit', selector: submitSel, label: raw.submitLabel });
  }

  let scheme: LoginScheme = 'unknown';
  if (pwInput && emailInput) scheme = 'email-password';
  else if (pwInput && phoneInput) scheme = 'phone-password';
  else if (pwInput && (userInput || firstText)) scheme = 'username-password';
  else if (otpInput && !pwInput) scheme = 'otp';

  return { found: !!pwInput || !!otpInput, loginUrl, scheme, fields, notes: [] };
}
