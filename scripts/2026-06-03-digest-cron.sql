-- ============================================================================
-- 2026-06-03 — Weekly digest cron via pg_cron + pg_net
-- ----------------------------------------------------------------------------
-- Prerequisites (run these ONCE in Supabase if not already enabled):
--   create extension if not exists pg_cron;
--   create extension if not exists pg_net;
--
-- Then set two env vars on Render:
--   DIGEST_SECRET=<any long random string>
--
-- And set the same DIGEST_SECRET below.
-- ============================================================================

-- IMPORTANT: replace YOUR_DIGEST_SECRET_HERE with the same value you set
-- in Render's DIGEST_SECRET environment variable.

select cron.schedule(
  'weekly-kinwove-digest',          -- job name (must be unique)
  '0 8 * * 1',                      -- every Monday at 8:00 AM UTC
  $$
    select net.http_post(
      url     := 'https://www.kinwove.com/api/send-digest',
      headers := '{"Content-Type": "application/json", "x-digest-secret": "YOUR_DIGEST_SECRET_HERE"}'::jsonb,
      body    := '{}'::jsonb
    );
  $$
);

-- To see scheduled jobs:
-- select * from cron.job;

-- To remove the job:
-- select cron.unschedule('weekly-kinwove-digest');
