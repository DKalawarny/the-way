-- ============================================================================
-- personal_prayers → profiles foreign key — 2026-05-04
--
-- Community.jsx selects:
--   personal_prayers.select('*, profiles(display_name, city, ...)')
-- PostgREST resolves embedded joins through foreign keys.  The table was
-- created with user_id referencing auth.users (or with no FK at all), so
-- the join fails with "Could not find a relationship between
-- 'personal_prayers' and 'profiles' in the schema cache".
--
-- Fix: add a FK from personal_prayers.user_id → profiles.id.
-- If auth.users FK already exists we drop it first (can't have two FKs on
-- the same column pointing different places and expect PostgREST to pick the
-- right one — profiles is the correct target for API joins).
-- ============================================================================

-- Drop any existing FK on personal_prayers.user_id so we can replace it.
do $$
declare
  r record;
begin
  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.personal_prayers'::regclass
      and contype = 'f'
      and conkey = (
        select array_agg(attnum order by attnum)
        from pg_attribute
        where attrelid = 'public.personal_prayers'::regclass
          and attname = 'user_id'
      )
  loop
    execute format('alter table public.personal_prayers drop constraint %I', r.conname);
  end loop;
end
$$;

-- Add the FK that PostgREST needs for the embedded join.
alter table public.personal_prayers
  add constraint personal_prayers_user_id_fkey
  foreign key (user_id)
  references public.profiles(id)
  on delete cascade;

-- Force PostgREST to pick up the new constraint immediately.
notify pgrst, 'reload schema';
