-- ============================================================================
-- 2026-05-13 — Gift codes table + gift_expires_at on profiles
-- ============================================================================

-- Gift codes generated after a Stripe gift purchase.
create table if not exists public.gift_codes (
  id                uuid primary key default gen_random_uuid(),
  code              text unique not null,
  plan              text not null,           -- 'premium' | 'premium_plus'
  months            int  not null,           -- 3 | 6 | 12
  stripe_session_id text,
  purchased_by      uuid references auth.users(id) on delete set null,
  purchaser_email   text,
  redeemed_by       uuid references auth.users(id) on delete set null,
  redeemed_at       timestamptz,
  expires_at        timestamptz,             -- when the gifted plan expires
  redeem_by         timestamptz not null default now() + interval '1 year',
  created_at        timestamptz default now()
);

alter table public.gift_codes enable row level security;
-- No public policies — only service role (edge functions) can read/write.

-- Track gift subscription expiry on profiles.
alter table public.profiles
  add column if not exists gift_expires_at timestamptz;

-- Index for code lookups.
create index if not exists gift_codes_code_idx on public.gift_codes (code);
