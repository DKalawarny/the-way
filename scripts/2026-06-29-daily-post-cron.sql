-- ============================================================================
-- 2026-06-29 — kinwove persona daily auto-post cron (pg_cron + pg_net)
-- ----------------------------------------------------------------------------
-- Root cause of "daily posts stopped ~2026-06-15": pg_cron was never enabled,
-- so this job never actually ran on a schedule. (pg_net was already on.)
--
-- PREREQUISITES (do these BEFORE running this file):
--   1. Render → kinwove web service → Environment: add
--        CRON_SECRET = <the long random string you generated>
--      Save (this redeploys the web service). The /api/cron/daily-post
--      endpoint rejects any call whose x-cron-secret header != CRON_SECRET.
--   2. Supabase → Database → Extensions: enable `pg_cron` (pg_net already on).
--        (or run:  create extension if not exists pg_cron;)
--
-- Then replace YOUR_CRON_SECRET_HERE below with the SAME value you set in
-- Render's CRON_SECRET, and run this whole file in the Supabase SQL editor.
--
-- Schedule: 14:00 UTC daily = 7:00 AM Vancouver during PDT (summer).
-- NOTE: pg_cron runs in UTC and does not follow DST — in winter (PST) this
-- fires at 6:00 AM Vancouver. Adjust the cron expression if you want it
-- pinned to a wall-clock hour year-round.
-- ============================================================================

-- Idempotent: drop any prior job with this name before (re)creating it.
select cron.unschedule('daily-kinwove-post')
where exists (select 1 from cron.job where jobname = 'daily-kinwove-post');

select cron.schedule(
  'daily-kinwove-post',             -- job name (must be unique)
  '0 14 * * *',                     -- every day at 14:00 UTC (7am Vancouver PDT)
  $$
    select net.http_post(
      url     := 'https://www.kinwove.com/api/cron/daily-post',
      headers := '{"Content-Type": "application/json", "x-cron-secret": "YOUR_CRON_SECRET_HERE"}'::jsonb,
      body    := '{}'::jsonb
    );
  $$
);

-- ── Verify ──────────────────────────────────────────────────────────────────
-- select jobid, jobname, schedule, active from cron.job;
--
-- ── See recent runs (after it has fired at least once) ───────────────────────
-- select d.runid, j.jobname, d.status, d.return_message, d.start_time
-- from cron.job_run_details d join cron.job j on j.jobid = d.jobid
-- where j.jobname = 'daily-kinwove-post' order by d.start_time desc limit 10;
--
-- ── See the actual HTTP responses from the endpoint (pg_net is async) ────────
-- select id, status_code, content, created
-- from net._http_response order by created desc limit 10;
--
-- ── Remove the job ───────────────────────────────────────────────────────────
-- select cron.unschedule('daily-kinwove-post');
-- ============================================================================
