-- ============================================================================
-- Approve a pastor_application: create the church, link the pastor, mark approved.
-- Reusable template — paste into Supabase SQL editor, fill in :application_id,
-- review the SELECT output, then run the transaction block.
--
-- Workflow:
--   1. Pastor submits PastorApply form → row in pastor_applications (status='pending')
--   2. You manually verify the church (registry lookup OR vouching denominational body)
--   3. Run STEP 1 below to inspect what you're about to create
--   4. Run STEP 2 to actually approve
--
-- To reject instead of approve, see the bottom of this file.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1 — INSPECT. Replace the UUID, run this first, eyeball the result.
-- ----------------------------------------------------------------------------
select
  id                          as application_id,
  user_id                     as pastor_user_id,
  full_name,
  pastor_role,
  church_name,
  denomination,
  city,
  country,
  website,
  registration_country,
  registration_number,
  no_registration,
  denominational_reference,
  reason,
  status,
  created_at
from public.pastor_applications
where id = '00000000-0000-0000-0000-000000000000';  -- <-- application_id


-- ----------------------------------------------------------------------------
-- STEP 2 — APPROVE. Replace the UUID. Wrapped in a transaction so a partial
-- failure rolls back cleanly. The CTEs filter on status='pending', so if the
-- app is already approved/rejected the final SELECT returns three NULLs —
-- check the result row before committing.
-- ----------------------------------------------------------------------------
begin;

with app as (
  select *
  from public.pastor_applications
  where id = '00000000-0000-0000-0000-000000000000'  -- <-- application_id
    and status = 'pending'
  for update
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
    a.church_name, a.denomination, a.city, a.country, a.website,
    a.user_id,
    a.registration_country, a.registration_number,
    'verified',
    case when a.no_registration then 'reference' else 'registry' end,
    now(),
    case when a.no_registration
         then 'Verified via denominational reference: ' || coalesce(a.denominational_reference, '(none provided)')
         else 'Verified via registration number lookup'
    end,
    true
  from app a
  returning id, pastor_id
),
mark_app as (
  update public.pastor_applications
     set status = 'approved', reviewed_at = now()
   where id in (select id from app)
  returning id
),
mark_profile as (
  update public.profiles
     set is_pastor = true,
         church_id = (select id from new_church)
   where id in (select pastor_id from new_church)
  returning id
)
select
  (select id from new_church)   as church_id,
  (select id from mark_app)     as approved_application_id,
  (select id from mark_profile) as pastor_profile_id;

-- All three IDs non-null → commit. Any NULL → rollback and re-check STEP 1.
commit;
-- rollback;


-- ============================================================================
-- REJECT (alternative to STEP 2). Replace UUID and the notes string.
-- Pastor sees the notes via PastorApply.jsx so write something useful.
-- ============================================================================
-- update public.pastor_applications
--    set status = 'rejected',
--        reviewed_at = now(),
--        notes = 'Could not verify the registration number you provided. Reach out to dkalawarny@hotmail.com if this is a mistake.'
--  where id = '00000000-0000-0000-0000-000000000000'
--    and status = 'pending';
