-- Third attempt, and the first one that cannot be defeated by a typo.
--
-- Attempt 1 used `revoke select (col) ... ` — a no-op in Postgres, because you
-- cannot revoke a column subset out of a table-wide grant. It reported success
-- and changed nothing.
-- Attempt 2 spelled out 46 column names by hand and did not survive the journey
-- into the SQL editor; information_schema still showed anon/authenticated
-- holding SELECT on ai_memory afterwards.
--
-- This builds the list from the live schema instead, so it adapts if columns
-- are ever added and there is nothing to paste wrong.
do $$
declare cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
    into cols
  from information_schema.columns
  where table_schema = 'public'
    and table_name   = 'profiles'
    and column_name not in (
      'ai_memory',              -- the AI's inferred summary of a person
      'research_memory',
      'stripe_customer_id',
      'stripe_subscription_id'
    );

  execute 'revoke select on public.profiles from anon, authenticated';
  execute format('grant select (%s) on public.profiles to anon, authenticated', cols);
end $$;

-- PostgREST caches privileges; without this the change may not take effect.
notify pgrst, 'reload schema';

-- Proof. This should now return NO rows for anon or authenticated:
select grantee, privilege_type
from information_schema.column_privileges
where table_schema = 'public'
  and table_name   = 'profiles'
  and column_name  = 'ai_memory'
  and privilege_type = 'SELECT'
  and grantee in ('anon', 'authenticated');
