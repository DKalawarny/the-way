-- ============================================================================
-- 2026-07-10 — Church daily-question delivery (audit: "week of engagement
--               loop is silent end-to-end")
-- ----------------------------------------------------------------------------
-- Two parts:
--   1. delivered_at column on sermon_content — the idempotency marker the
--      /api/cron/daily-question endpoint uses (also bumps created_at so the
--      question surfaces at the top of the church feed when it fires).
--   2. Hourly pg_cron job that calls the endpoint. Replace
--      YOUR_CRON_SECRET_HERE with the SAME value as Render's CRON_SECRET
--      (identical setup to the daily-kinwove-post job).
-- Run in the Supabase SQL editor. Idempotent.
-- ============================================================================

alter table public.sermon_content
  add column if not exists delivered_at timestamptz;

-- Idempotent: drop any prior job with this name before (re)creating it.
select cron.unschedule('daily-question-delivery')
where exists (select 1 from cron.job where jobname = 'daily-question-delivery');

select cron.schedule(
  'daily-question-delivery',
  '10 * * * *',                     -- hourly at :10 — delivers within an hour of scheduled_at
  $$
    select net.http_post(
      url     := 'https://www.kinwove.com/api/cron/daily-question',
      headers := '{"Content-Type": "application/json", "x-cron-secret": "YOUR_CRON_SECRET_HERE"}'::jsonb,
      body    := '{}'::jsonb
    );
  $$
);

-- ── Verify ──────────────────────────────────────────────────────────────────
-- select jobid, jobname, schedule, active from cron.job where jobname = 'daily-question-delivery';
-- select id, status_code, content, created from net._http_response order by created desc limit 5;
-- ============================================================================
