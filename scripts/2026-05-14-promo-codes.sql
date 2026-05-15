-- ============================================================================
-- 2026-05-14 — Promo codes (friends & family free trials)
-- ============================================================================

create table if not exists public.promo_codes (
  id        uuid    primary key default gen_random_uuid(),
  code      text    unique not null,
  plan      text    not null default 'premium',
  months    int     not null default 3,
  max_uses  int     not null default 150,
  uses      int     not null default 0,
  active    boolean not null default true,
  created_at timestamptz default now()
);

alter table public.promo_codes enable row level security;
-- No public policies — only service role (edge functions) can read/write.

-- Track when a user redeemed a promo so they can't use another.
alter table public.profiles
  add column if not exists promo_redeemed_at timestamptz;

-- Index for code lookups.
create index if not exists promo_codes_code_idx on public.promo_codes (code);

-- Seed the first promo code.
insert into public.promo_codes (code, plan, months, max_uses)
values ('KINWOVE-FRIENDS', 'premium', 3, 150)
on conflict (code) do nothing;
