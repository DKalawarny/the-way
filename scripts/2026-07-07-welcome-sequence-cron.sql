-- ============================================================================
-- 2026-07-07 — Welcome sequence: pg_cron schedule
-- ----------------------------------------------------------------------------
-- A gentle onboarding drip in Danny's voice. Each email has ONE job:
--   • Day 0 (on signup)  — Welcome + ask your first question   (already sent by
--                          /api/email/welcome — not part of this cron)
--   • Day 2 (48–72 h)    — "You're not meant to walk this alone" — the community
--   • Day 5 (120–144 h)  — "The whole Bible's in here" — reading with a companion
--
-- Each stage is a 24 h cohort window, so a daily run delivers each email exactly
-- once per person — no tracking table needed (same approach as nudge-incomplete).
-- Only onboarded members (display_name set) receive these.
--
-- PREREQUISITES:
--   • pg_cron + pg_net enabled (already on — same as the daily verse/post crons).
--   • CRON_SECRET env var set on Render (already set).
--
-- Run this whole file in the Supabase SQL editor. Replace YOUR_CRON_SECRET_HERE
-- with the same value that's in Render's CRON_SECRET.
-- ============================================================================

-- 14:00 UTC = 7am Pacific / 10am Eastern — an hour after the daily verse, so the
-- morning isn't one big blast.
select cron.unschedule('welcome-sequence')
where exists (select 1 from cron.job where jobname = 'welcome-sequence');

select cron.schedule(
  'welcome-sequence',
  '0 14 * * *',
  $$
    select net.http_post(
      url     := 'https://www.kinwove.com/api/cron/welcome-sequence',
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
--   url := 'https://www.kinwove.com/api/cron/welcome-sequence',
--   headers := '{"Content-Type":"application/json","x-cron-secret":"YOUR_CRON_SECRET_HERE"}'::jsonb,
--   body := '{}'::jsonb);
-- ============================================================================
