-- ============================================================================
-- DEV-ONLY — turn an existing signed-up user into a verified pastor with a
-- fake church. Bypasses the application form so you can test pastor flows
-- (PastorDashboard, SermonComposer, weekly_focus) without real credentials.
--
-- Usage:
--   1. Sign up the user normally in the app and complete profile setup.
--   2. Replace :email below with that user's email.
--   3. Tweak the church fields if you want different names.
--   4. Run the whole file.
--
-- Idempotent-ish: if the user already pastors a church it errors (won't
-- silently create duplicates). Drop the church row first if you need to redo.
-- ============================================================================

begin;

with target as (
  select id as user_id
  from auth.users
  where email = 'dkalawarny+pastor@hotmail.com'   -- <-- change me
),
new_church as (
  insert into public.churches (
    name, denomination, city, country, website,
    pastor_id,
    registration_country, registration_number,
    verification_status, verification_tier, verified_at, verification_notes,
    is_public
  )
  select
    'Test Chapel',           -- church name
    'Non-denominational',    -- denomination
    'Toronto',               -- city
    'Canada',                -- country
    null,                    -- website
    user_id,
    'CA',                    -- registration_country
    'TEST-' || substr(user_id::text, 1, 8),
    'verified',
    'reference',
    now(),
    'Dev test pastor — created by scripts/dev-make-pastor.sql',
    true
  from target
  returning id, pastor_id
),
mark_profile as (
  update public.profiles
     set is_pastor = true,
         church_id = (select id from new_church)
   where id = (select user_id from target)
  returning id
)
select
  (select id from new_church)   as church_id,
  (select id from mark_profile) as pastor_profile_id;

-- Both IDs non-null → commit.
commit;
-- rollback;


-- ============================================================================
-- TEAR-DOWN — undo everything for a given user. Use when you want to
-- re-test the application flow or reset.
-- ============================================================================
-- begin;
-- with target as (
--   select id as user_id from auth.users where email = 'dkalawarny+pastor@hotmail.com'
-- )
-- update public.profiles set is_pastor = false, church_id = null
--   where id = (select user_id from target);
-- delete from public.churches
--   where pastor_id = (select user_id from auth.users where email = 'dkalawarny+pastor@hotmail.com');
-- delete from public.pastor_applications
--   where user_id = (select user_id from auth.users where email = 'dkalawarny+pastor@hotmail.com');
-- commit;
