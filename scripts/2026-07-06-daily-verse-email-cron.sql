-- ============================================================================
-- 2026-07-06 — Daily verse email: opt-out column + pg_cron schedule
-- ----------------------------------------------------------------------------
-- Sends one calm "today's verse" email each morning to every onboarded member
-- who hasn't opted out. The retention habit-loop (YouVersion playbook).
--
-- PREREQUISITES:
--   • pg_cron + pg_net enabled (already on — same as the daily post cron).
--   • CRON_SECRET env var set on Render (already set).
--
-- Run this whole file in the Supabase SQL editor. Replace YOUR_CRON_SECRET_HERE
-- with the same value that's in Render's CRON_SECRET.
-- ============================================================================

-- ── 1. Opt-out column (one-click unsubscribe flips this to true) ──────────────
alter table public.profiles
  add column if not exists daily_verse_opt_out boolean not null default false;

-- ── 2. Schedule the morning send ─────────────────────────────────────────────
-- 13:00 UTC = 6am Pacific / 9am Eastern — a morning touchpoint for N. America.
select cron.unschedule('daily-verse-email')
where exists (select 1 from cron.job where jobname = 'daily-verse-email');

select cron.schedule(
  'daily-verse-email',
  '0 13 * * *',
  $$
    select net.http_post(
      url     := 'https://www.kinwove.com/api/cron/daily-verse-email',
      headers := '{"Content-Type": "application/json", "x-cron-secret": "YOUR_CRON_SECRET_HERE"}'::jsonb,
      body    := '{}'::jsonb
    );
  $$
);

-- ── Verify / test ────────────────────────────────────────────────────────────
-- select jobid, jobname, schedule, active from cron.job;
--
-- Fire it once now to test (swap in the real secret):
-- select net.http_post(
--   url := 'https://www.kinwove.com/api/cron/daily-verse-email',
--   headers := '{"Content-Type":"application/json","x-cron-secret":"YOUR_CRON_SECRET_HERE"}'::jsonb,
--   body := '{}'::jsonb);
-- ============================================================================
