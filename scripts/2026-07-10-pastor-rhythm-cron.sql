-- ============================================================================
-- 2026-07-10 — Pastor weekly rhythm (audit: only pastor email ever was the
--               day-3 onboarding note)
-- ----------------------------------------------------------------------------
-- Two weekly beats hitting POST /api/cron/pastor-rhythm:
--   Thu 16:00 UTC (~9am Vancouver PDT): kind=nudge  — "Sunday's coming" when
--     no sermon is loaded for the upcoming week.
--   Mon 16:00 UTC: kind=digest — posts / prayers / new members last 7 days
--     (skips churches with nothing to report).
-- Replace YOUR_CRON_SECRET_HERE (same value as Render's CRON_SECRET) in BOTH
-- jobs, then run the whole file. Idempotent.
-- ============================================================================

select cron.unschedule('pastor-thursday-nudge')
where exists (select 1 from cron.job where jobname = 'pastor-thursday-nudge');

select cron.schedule(
  'pastor-thursday-nudge',
  '0 16 * * 4',
  $$
    select net.http_post(
      url     := 'https://www.kinwove.com/api/cron/pastor-rhythm',
      headers := '{"Content-Type": "application/json", "x-cron-secret": "YOUR_CRON_SECRET_HERE"}'::jsonb,
      body    := '{"kind": "nudge"}'::jsonb
    );
  $$
);

select cron.unschedule('pastor-monday-digest')
where exists (select 1 from cron.job where jobname = 'pastor-monday-digest');

select cron.schedule(
  'pastor-monday-digest',
  '0 16 * * 1',
  $$
    select net.http_post(
      url     := 'https://www.kinwove.com/api/cron/pastor-rhythm',
      headers := '{"Content-Type": "application/json", "x-cron-secret": "YOUR_CRON_SECRET_HERE"}'::jsonb,
      body    := '{"kind": "digest"}'::jsonb
    );
  $$
);

-- Verify: select jobname, schedule from cron.job where jobname like 'pastor-%';
-- ============================================================================
