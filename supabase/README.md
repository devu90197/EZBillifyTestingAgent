# Supabase backend (EZT platform)

This is the EZT platform's own database — auth users, onboarded products, their
(encrypted) credentials, site analyses, discovered pages, and test runs. It is
**not** any product-under-test's database.

## Push the schema (you run this — it needs your DB password)

```bash
# 1) log in the CLI once
supabase login

# 2) link this folder to your project
supabase link --project-ref hwjxepwcxfiwwtkrczax
#    (it will ask for the database password)

# 3) apply the migration
supabase db push
```

If the CLI complains that the project isn't initialized, run `supabase init`
first (it will keep the existing `migrations/` folder), then repeat 2–3.

## What it creates
- `products` — dynamically onboarded products (name + URL + platforms)
- `product_credentials` — per-product test logins (secret stored encrypted)
- `site_analyses` — crawl + login-detection results
- `discovered_pages` — the link graph found per analysis
- `test_runs` — test executions and summaries

All tables have **Row-Level Security**: a signed-in user sees only their own rows.

## Auth
Platform login uses **Supabase Auth** (email + password). One role for now —
every authenticated user is a tester who owns their products. Enable the Email
provider in Supabase → Authentication → Providers (on by default).
