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
  '/app/login',
];

const LOGIN_URL_RE = /(login|signin|sign-in|sign_in|\/auth|sessions?\/new|account\/login)/i;
const LOGIN_WORDS_RE = /sign ?in|log ?in|\blogin\b/i;

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
  looksLikeLogin: boolean;
}

/**
 * Detect how a product's login works from the LIVE site. Robust to JS-rendered
 * forms (waits for hydration) and multi-step / identifier-first flows: it
 * identifies the login page by URL + title/wording even when a password field
 * isn't present on first load, and reports resilient selectors + the scheme.
 */
export async function detectLoginForm(
  startUrl: string,
  opts: AnalyzeOptions = {},
  browser?: Browser,
  discovered: { url: string; title: string }[] = [],
): Promise<LoginDetection> {
  const timeoutMs = opts.timeoutMs ?? 15_000;
  const origin = new URL(startUrl).origin;
  const ownBrowser = !browser;
  const b = browser ?? (await chromium.launch());
  const ctx = await b.newContext({ ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  const notes: string[] = [];

  try {
    const candidates: string[] = [];
    const add = (u: string) => {
      if (!candidates.includes(u)) candidates.push(u);
    };

    // 1) Discovered pages whose URL or title look like a login (highest priority).
    for (const d of discovered) {
      if (LOGIN_URL_RE.test(d.url) || LOGIN_WORDS_RE.test(d.title)) {
        try {
          if (new URL(d.url).origin === origin) add(d.url);
        } catch {
          /* ignore */
        }
      }
    }

    // 2) Login-ish links on the homepage (wait for JS nav to render).
    try {
      await page.goto(startUrl, { waitUntil: 'networkidle', timeout: timeoutMs });
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
          if (new URL(l).origin === origin) add(l);
        } catch {
          /* ignore */
        }
      }
    } catch (e) {
      notes.push(`homepage load: ${e instanceof Error ? e.message : String(e)}`);
    }

    // 3) Common login paths.
    for (const p of CANDIDATE_PATHS) add(origin + p);

    let weak: LoginDetection | null = null;

    for (const url of candidates.slice(0, 16)) {
      let reached = false;
      try {
        const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: timeoutMs });
        if (!resp || resp.status() >= 400) continue;
        reached = true;
        // Give a JS-rendered password field time to appear.
        await page
          .locator('input[type="password"]')
          .first()
          .waitFor({ state: 'attached', timeout: 4000 })
          .catch(() => {});

        const detection = await extractLogin(page, url);
        if (detection.found) {
          return { ...detection, notes: [...notes, ...detection.notes] };
        }
        // No password field, but this looks like a login page (URL or wording)?
        const isLoginPage = LOGIN_URL_RE.test(url) || detection.looksLikeLogin;
        if (isLoginPage && !weak) {
          weak = {
            found: true,
            loginUrl: url,
            scheme: detection.scheme === 'unknown' ? 'identifier-first' : detection.scheme,
            fields: detection.fields,
            notes: [
              'No password field on the login page at load — likely a multi-step (enter identifier, then password) or JS-rendered form. The authenticated run handles both.',
            ],
          };
        }
      } catch (e) {
        if (reached) notes.push(`candidate ${url}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    if (weak) return { ...weak, notes: [...notes, ...weak.notes] };

    return {
      found: false,
      scheme: 'unknown',
      fields: [],
      notes: [...notes, 'No login page found at discovered URLs, homepage links, or common paths.'],
    };
  } finally {
    await ctx.close();
    if (ownBrowser) await b.close();
  }
}

// Internal detection carries an extra `looksLikeLogin` signal + scheme even when
// no password field is present (for multi-step flows).
type InternalDetection = LoginDetection & { looksLikeLogin: boolean };

async function extractLogin(page: Page, loginUrl: string): Promise<InternalDetection> {
  // The evaluate callback must contain NO named helper functions (esbuild injects
  // a `__name` helper that is undefined in the browser).
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
    const title = (document.title || '').toLowerCase();
    const headings = Array.from(document.querySelectorAll('h1, h2, button, [type="submit"]'))
      .map((e) => e.textContent || '')
      .join(' ')
      .toLowerCase();
    return {
      inputs,
      submitTag: btn ? btn.tagName.toLowerCase() : '',
      submitType: btn ? btn.getAttribute('type') || '' : '',
      submitId: btn ? btn.getAttribute('id') || '' : '',
      submitName: btn ? btn.getAttribute('name') || '' : '',
      submitLabel: btn ? (btn.textContent || '').trim() || btn.getAttribute('value') || '' : '',
      looksLikeLogin: /sign in|log ?in|login|continue|welcome back/.test(title + ' ' + headings),
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
    (i) => i.type !== 'password' && i.type !== 'hidden' && i.type !== 'checkbox' && i.type !== 'submit',
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
  else if (!pwInput && identifier && raw.submitTag) scheme = 'identifier-first';

  return {
    found: !!pwInput || !!otpInput,
    loginUrl,
    scheme,
    fields,
    notes: [],
    looksLikeLogin: raw.looksLikeLogin,
  };
}
