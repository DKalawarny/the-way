-- 2026-04-30 — visitor info on the public church page
--
-- The cheap-path pastor onboarding pillar is "scan the QR, know when to show up."
-- Today the public ChurchPage tells visitors who pastors and where the city is,
-- but never when the service is or where to drive. These two columns close that
-- gap. Both nullable — pastors who don't fill them in just don't see the row.
--
-- service_info: free-form text so pastors can say "Sundays · 9am & 11am" or
--               "Saturdays 6pm · Sundays 10am" without us forcing a schema
--               on multi-service churches.
-- street_address: free-form too. We don't geocode or validate; some churches
--                 meet in homes / coffee shops and that's fine.

alter table public.churches
  add column if not exists service_info   text,
  add column if not exists street_address text;
