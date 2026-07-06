# What I need from you to test EzBillify

Grouped by priority. **Website-first** items are marked ⭐ — those unblock the current phase. Mobile/DB items can come later. Paste secrets into `.env` (git-ignored) — never into chat or committed files.

---

## A. Access & accounts

| # | Item | Why | Priority |
|---|---|---|---|
| A1 | ⭐ **Dedicated QA test account(s)** on EzBillify — email + password. NOT a real customer. Ideally one per role (admin, cashier/POS, accountant). | Log in and drive real journeys. | Now |
| A2 | ⭐ Is there a **staging / sandbox environment** (URL) separate from `ezbillify.com`? | Write-actions (create invoice, refund) must run off-prod. If none, we stay read-only on prod. | Now |
| A3 | Whether test accounts have **2FA/OTP**. If yes, a way to test-bypass (a no-2FA QA account, or a test OTP). | Automated login can't solve a real OTP. | Now |
| A4 | **Allowed test window + rate limits** (any WAF/bot protection like Cloudflare that might block automation?). | Avoid being blocked/booted; stay production-safe. | Now |
| A5 | **Sandbox payment gateway** creds/mode (Razorpay/Stripe/etc. test keys). | Exercise payment flows without moving real money. | Later (payments) |

## B. From the EzBillify codebase

| # | Item | Why | Priority |
|---|---|---|---|
| B1 | ⭐ **Front-end stack** (React/Next/Vue? router type) + repo access or a zip. | Pick the right locator strategy; find routes. | Now |
| B2 | ⭐ **Real routes/paths**: login, dashboard, invoice create/list, reports, settings. | I've put placeholders (`/login`, `/invoices/new`) — need the real ones. | Now |
| B3 | ⭐ **Stable selectors**: do elements have `data-testid`? If not, can we add them to key controls (login fields, save button, totals)? | Robust, non-flaky tests. Best single thing you can do. | Now |
| B4 | ⭐ **Auth flow**: Supabase Auth (email/password? magic link? OAuth?), and how the session/JWT is stored (cookie/localStorage key). | Lets us skip UI login for speed and test auth correctly. | Now |
| B5 | **GST/tax rules** the app implements: rates, intra vs inter-state (CGST/SGST vs IGST), rounding rule (per-line vs per-invoice, half-up?), HSN handling. | My `computeGst()` oracle must match the app's ground truth. | Now (for invoice tests) |
| B6 | **Invoice numbering** scheme + any statutory formatting rules. | Assert invoice output correctly. | Later |
| B7 | **API base URL + docs** (OpenAPI/Swagger, or Supabase Edge Functions list). | API + contract testing (Phase 5). | Later |
| B8 | **Feature flags** in use (and how they're toggled). | Feature-flag matrix testing. | Later |

## C. Supabase (for the CLI / testing agent)

Paste these into `.env`. Each is optional — the agent degrades gracefully if absent.

| Key | What it is | Notes / safety |
|---|---|---|
| ⭐ `SUPABASE_URL` | Project URL, `https://<ref>.supabase.co` | Safe. Needed for `ezt supabase-check` + auth. |
| ⭐ `SUPABASE_ANON_KEY` | Public anon key (Project Settings → API) | Safe (client-side key). Used for test-user sign-in. |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | ⚠️ **Bypasses Row-Level Security.** Leave BLANK for prod. Only set it for a **staging/test** project (fast data seeding/teardown). |
| `SUPABASE_DB_URL` | Postgres connection string for DB validation | Use a **dedicated read-only role** (or read replica), e.g. `postgresql://ro_user:pw@host:6543/postgres`. Never the owner/superuser against prod. |
| `SUPABASE_PROJECT_REF` | Project ref (short id) | For the `supabase` CLI (schema introspection). |
| `SUPABASE_ACCESS_TOKEN` | Personal access token for the `supabase` CLI | Only if you want me to introspect schema / manage a test project. Scope it minimally. |

**Recommended setup for safety:** give me a **read-only** anon+DB path against prod, and — if you want write-flow tests (create invoice, refund) — a **separate staging Supabase project** where the service-role key is fine. That keeps prod untouchable while still testing everything.

## D. What I do NOT need
- Your personal login, admin superuser DB creds, or production service-role key.
- Any real customer PII. All test data will be synthetic and namespaced.

---

## E. The moment you provide the ⭐ items, this unlocks
1. `ezt supabase-check` turns green.
2. The **login journey** runs (currently auto-skipped) — `runners/web/tests/journeys/login.spec.ts`.
3. I confirm selectors/routes → the **invoice + GST journey** runs against staging.
4. We expand into reports, permissions/RBAC, PDF, accessibility, visual regression — the full website suite.
