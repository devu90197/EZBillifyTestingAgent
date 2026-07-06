# EZT — Dynamic Platform Design

EZT is a SaaS-style testing agent: you log in, **add any product by URL**, and it
tests that product automatically — no code changes, no `.env` edits per product.
EzBillify is simply the first product added through this flow.

## The dynamic flow

```
1. Sign in to EZT            (Supabase Auth — one role for now)
        │
2. Add a product  ──────────►  name + base URL   (stored in `products`)
        │
3. Analyze (read-only)  ─────►  @ezt/analyzer crawls the site + auto-detects
        │                       the login shape (email / username / phone +
        │                       password, or OTP) and shows it in the UI
        │
4. Enter that product's test credentials in the UI
        │                       (stored encrypted in `product_credentials`)
        │
5. Deep run  ───────────────►  log in with the detected form, crawl the
                                authenticated area, run tests automatically
                                (results in `site_analyses` / `test_runs`)
```

Add another product → repeat. The engine is fully product-agnostic.

## What's built (this milestone)

| Piece | Status | Where |
|---|---|---|
| Supabase backend schema + RLS (auth-scoped, one role) | ✅ | `supabase/migrations/` |
| Supabase connectivity from the platform | ✅ verified | `@ezt/supabase`, `ezt supabase-check` |
| **Site analyzer**: read-only crawl + login-shape auto-detection | ✅ **working** | `@ezt/analyzer`, `ezt analyze <url>` |
| Config loads from repo-root `.env` anywhere | ✅ | `@ezt/config` |

`ezt analyze <url>` proven: classifies `username-password` / `email-password` etc.
with real selectors, and reports the crawled link graph — read-only, no creds.

## What's next (the UI layer — the login you asked for)

| Piece | Plan |
|---|---|
| **Platform login/auth UI** | `apps/dashboard` (Next.js 15 + Supabase Auth, email+password, one role). Protected routes. |
| **Add-product page** | form → insert into `products`; triggers analysis. |
| **Analysis view** | shows detected login scheme + crawled pages; form to enter product creds. |
| **Credential capture** | store in `product_credentials` **encrypted** (Supabase Vault / app-level AES). |
| **Authenticated deep-crawl + auto-tests** | log in via detected form, crawl behind auth, run generic checks (page health, console errors, broken links, a11y), then domain tests. |
| **Wire analyzer → DB** | persist analyses/pages/runs; surface in dashboard. |

## Data model (see `supabase/migrations/20260706000000_init.sql`)
`products` · `product_credentials` · `site_analyses` · `discovered_pages` · `test_runs`
— all owner-scoped via Row-Level Security (`auth.uid() = owner`).

## Security posture
- Platform secrets (service-role key) stay server-side only; `.env` is git-ignored.
- Product test credentials are encrypted at rest; never logged.
- All analysis is read-only; write-flows require an explicit grant + non-prod target,
  and the money-movement kill-switch always applies.
