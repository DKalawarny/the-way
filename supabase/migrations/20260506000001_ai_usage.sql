-- ── AI usage tracking ────────────────────────────────────────────────────────
-- Tracks per-user, per-period AI message counts.
-- period = 'lifetime' for free tier, 'YYYY-MM' for monthly paid tiers.
-- topup = bonus credits added via Stripe one-time purchase.

create table if not exists public.ai_usage (
  id         bigserial primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  period     text not null,                     -- 'lifetime' | 'YYYY-MM'
  count      integer not null default 0,
  topup      integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, period)
);

-- Users can only read their own usage row; the increment function is SECURITY DEFINER
-- so it bypasses RLS and runs as the DB owner.
alter table public.ai_usage enable row level security;

create policy "ai_usage_select_own"
  on public.ai_usage for select
  using (auth.uid() = user_id);

-- ── Atomic increment ─────────────────────────────────────────────────────────
-- Upserts a row for (user_id, period) and increments count by 1.
-- Called from the client via supabase.rpc('increment_ai_usage', ...).
create or replace function public.increment_ai_usage(
  p_user_id uuid,
  p_period  text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.ai_usage (user_id, period, count, updated_at)
  values (p_user_id, p_period, 1, now())
  on conflict (user_id, period)
  do update set
    count      = ai_usage.count + 1,
    updated_at = now();
end;
$$;

-- ── Top-up grant ─────────────────────────────────────────────────────────────
-- Called by the Stripe webhook when a top-up payment succeeds.
-- Adds bonus credits to the user's current period row.
create or replace function public.grant_ai_topup(
  p_user_id uuid,
  p_period  text,
  p_amount  integer default 100
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.ai_usage (user_id, period, topup, updated_at)
  values (p_user_id, p_period, p_amount, now())
  on conflict (user_id, period)
  do update set
    topup      = ai_usage.topup + p_amount,
    updated_at = now();
end;
$$;
