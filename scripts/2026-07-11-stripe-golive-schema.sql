-- ============================================================================
-- 2026-07-11 — Stripe go-live schema (found while prepping payments week)
-- ----------------------------------------------------------------------------
-- The checkout + webhook edge functions read/write FOUR things that did not
-- exist — every purchase would have created duplicate Stripe customers, the
-- webhook couldn't link payments back, top-ups errored (missing RPC), and
-- seat blocks had no column. Safe to run today; nothing activates until
-- Stripe live keys exist. Idempotent.
-- ============================================================================

alter table public.profiles
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text;

create index if not exists profiles_stripe_customer_idx
  on public.profiles (stripe_customer_id);

alter table public.churches
  add column if not exists seat_blocks int not null default 0;

-- Top-up grant used by the webhook on checkout.session.completed (topup).
create or replace function public.grant_ai_topup(p_user_id uuid, p_period text, p_amount int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.ai_usage (user_id, period, count, topup)
  values (p_user_id, p_period, 0, p_amount)
  on conflict (user_id, period)
  do update set topup = public.ai_usage.topup + p_amount;
end;
$$;

-- Verify:
-- select column_name from information_schema.columns
-- where table_name='profiles' and column_name like 'stripe%';
-- ============================================================================
