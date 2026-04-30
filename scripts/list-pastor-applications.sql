-- ============================================================================
-- Pastor application review queue.
-- Paste any of these blocks into the Supabase SQL editor.
-- Companion to scripts/approve-pastor-application.sql.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Pending queue — everything awaiting a manual review, oldest first.
-- ----------------------------------------------------------------------------
select
  a.id                         as application_id,
  a.created_at::date           as submitted,
  a.full_name                  as pastor,
  a.pastor_role                as role,
  a.church_name,
  a.denomination,
  a.city || ', ' || a.country  as location,
  a.website,
  case
    when a.no_registration then 'reference'
    else coalesce(a.registration_country || ' · ' || a.registration_number, 'missing')
  end                          as verification,
  a.denominational_reference   as reference_contact,
  p.email                      as pastor_email
from public.pastor_applications a
left join auth.users p on p.id = a.user_id
where a.status = 'pending'
order by a.created_at asc;


-- ----------------------------------------------------------------------------
-- 2. Single application — full detail before you approve. Replace the UUID.
-- ----------------------------------------------------------------------------
select
  a.*,
  p.email   as pastor_email,
  p.created_at as account_created
from public.pastor_applications a
left join auth.users p on p.id = a.user_id
where a.id = '00000000-0000-0000-0000-000000000000';


-- ----------------------------------------------------------------------------
-- 3. Stats — how many in each bucket, and how long they've been waiting.
-- ----------------------------------------------------------------------------
select
  status,
  count(*)                                                  as total,
  min(created_at)::date                                     as oldest,
  round(avg(extract(epoch from (now() - created_at))/86400)::numeric, 1)
                                                            as avg_days_waiting
from public.pastor_applications
group by status
order by status;


-- ----------------------------------------------------------------------------
-- 4. Rejected with notes — for follow-up or to see what came back.
-- ----------------------------------------------------------------------------
select
  id, full_name, church_name, reviewed_at::date as rejected_on, notes
from public.pastor_applications
where status = 'rejected'
order by reviewed_at desc nulls last;


-- ----------------------------------------------------------------------------
-- 5. Recently approved — sanity-check that everything wired through.
-- Joins to churches so you can confirm verification_tier/status landed.
-- ----------------------------------------------------------------------------
select
  a.full_name                       as pastor,
  a.church_name                     as applied_as,
  c.name                            as church_row,
  c.verification_status,
  c.verification_tier,
  c.verified_at::date               as verified,
  a.reviewed_at::date               as approved_on
from public.pastor_applications a
left join public.churches c on c.pastor_id = a.user_id
where a.status = 'approved'
order by a.reviewed_at desc nulls last
limit 25;
