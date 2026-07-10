-- ============================================================================
-- 2026-07-10 — Web push subscriptions (audit Tier 3: real closed-app push)
-- ----------------------------------------------------------------------------
-- Stores each device's PushSubscription (endpoint + encryption keys). Written
-- only by server.js via service role (/api/push/subscribe); the poller in
-- server.js reads it to fan out notifications through web-push.
-- RLS enabled with no policies = clients can't touch it directly.
-- Run in the Supabase SQL editor. Idempotent.
-- ============================================================================

create table if not exists public.push_subscriptions (
  endpoint   text primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  keys       jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- Verify: select count(*) from public.push_subscriptions;
-- ============================================================================
