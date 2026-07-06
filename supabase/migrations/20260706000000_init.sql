-- EZT platform schema — the dynamic testing agent's backend.
-- Every row is owned by the authenticated platform user (Supabase Auth).
-- One role for now: any signed-in user manages ONLY their own data (RLS below).

create extension if not exists pgcrypto;

-- Products the user onboards dynamically (any website/app, by URL).
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null,
  base_url    text not null,
  platforms   text[] not null default array['web'],
  status      text not null default 'active',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Per-product test credentials, entered in the UI. Secret stored ENCRYPTED
-- (app-level encryption or Supabase Vault) — never plaintext.
create table if not exists public.product_credentials (
  id               uuid primary key default gen_random_uuid(),
  product_id       uuid not null references public.products(id) on delete cascade,
  owner            uuid not null default auth.uid() references auth.users(id) on delete cascade,
  label            text not null default 'default',
  identifier_type  text not null default 'email',   -- email | username | phone
  identifier       text not null,
  secret_encrypted text not null,
  created_at       timestamptz not null default now()
);

-- Site analyses: crawl + login-shape detection results.
create table if not exists public.site_analyses (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products(id) on delete cascade,
  owner         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  origin        text,
  pages_crawled int default 0,
  login_scheme  text,     -- email-password | username-password | phone-password | otp | unknown
  login_url     text,
  result        jsonb,    -- full structured analyzer output
  created_at    timestamptz not null default now()
);

-- Individual discovered pages/links per analysis.
create table if not exists public.discovered_pages (
  id            uuid primary key default gen_random_uuid(),
  analysis_id   uuid not null references public.site_analyses(id) on delete cascade,
  owner         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  url           text not null,
  status        int,
  title         text,
  depth         int,
  requires_auth boolean default false
);

-- Test runs against a product.
create table if not exists public.test_runs (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  owner       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind        text not null default 'web',   -- web | api | mobile | security | ...
  status      text not null default 'queued',
  started_at  timestamptz,
  finished_at timestamptz,
  summary     jsonb,
  created_at  timestamptz not null default now()
);

-- keep products.updated_at fresh
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- Row-Level Security: owner-only access on every table.
alter table public.products            enable row level security;
alter table public.product_credentials enable row level security;
alter table public.site_analyses       enable row level security;
alter table public.discovered_pages    enable row level security;
alter table public.test_runs           enable row level security;

create policy "own_products"    on public.products            for all
  using (auth.uid() = owner) with check (auth.uid() = owner);
create policy "own_credentials" on public.product_credentials for all
  using (auth.uid() = owner) with check (auth.uid() = owner);
create policy "own_analyses"    on public.site_analyses       for all
  using (auth.uid() = owner) with check (auth.uid() = owner);
create policy "own_pages"       on public.discovered_pages    for all
  using (auth.uid() = owner) with check (auth.uid() = owner);
create policy "own_runs"        on public.test_runs           for all
  using (auth.uid() = owner) with check (auth.uid() = owner);

-- indexes
create index if not exists idx_products_owner      on public.products(owner);
create index if not exists idx_credentials_product on public.product_credentials(product_id);
create index if not exists idx_analyses_product    on public.site_analyses(product_id);
create index if not exists idx_pages_analysis      on public.discovered_pages(analysis_id);
create index if not exists idx_runs_product        on public.test_runs(product_id);
