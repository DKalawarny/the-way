-- STEP 2 of 2. DESTRUCTIVE — drops three columns from profiles.
--
-- ONLY RUN THIS AFTER:
--   1. Step 1 ran and reported rows copied into profile_secrets, and
--   2. the app has deployed with the code that reads profile_secrets.
--
-- stripe_subscription_id deliberately STAYS on profiles: planConfig.js decides
-- whether a paid plan has lapsed from it, the server reads it for the same
-- reason, and it is an opaque identifier rather than information about a person.
-- The three being dropped are the ones that carry content.
alter table public.profiles
  drop column if exists ai_memory,
  drop column if exists research_memory,
  drop column if exists stripe_customer_id;

notify pgrst, 'reload schema';

-- Proof: this should return 0 rows.
select column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'profiles'
  and column_name in ('ai_memory', 'research_memory', 'stripe_customer_id');
