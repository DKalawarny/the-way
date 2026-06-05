-- ============================================================================
-- 2026-06-05 — Diagnose + fix Danny's care team role
-- ============================================================================
-- Run each SELECT first to see the state, then run the fix if needed.
-- ============================================================================

-- ── 1. Check pending invites ──────────────────────────────────────────────────
-- Shows any role invites in the DB (pending = waiting, accepted = worked, declined = declined)
select
  i.id          as invite_id,
  i.status,
  i.role_key,
  i.role_label,
  p.display_name as invitee,
  g.display_name as invited_by,
  c.name         as church,
  i.created_at,
  i.responded_at
from public.church_role_invites i
join public.profiles p on p.id = i.user_id
left join public.profiles g on g.id = i.invited_by
left join public.churches c on c.id = i.church_id
order by i.created_at desc
limit 20;

-- ── 2. Check existing church_roles ────────────────────────────────────────────
-- Shows who currently has roles (should include Danny after accept)
select
  r.role_key,
  r.role_label,
  p.display_name as member,
  c.name as church,
  r.granted_at
from public.church_roles r
join public.profiles p on p.id = r.user_id
left join public.churches c on c.id = r.church_id
where r.is_owner = false
order by r.granted_at desc
limit 20;

-- ── 3. If church_roles row is missing — grant it manually ────────────────────
-- This inserts Danny's care role directly from the invite row.
-- Safe: ON CONFLICT means it won't duplicate if the row already exists.
-- Run ONLY if step 2 shows Danny is missing from church_roles.

insert into public.church_roles (church_id, user_id, role_key, role_label, granted_by)
select
  i.church_id,
  i.user_id,
  i.role_key,
  coalesce(i.role_label, 'Care team'),
  i.invited_by
from public.church_role_invites i
where i.role_key = 'care'
  and i.status in ('pending', 'accepted')  -- catch both states
order by i.created_at desc
limit 1
on conflict (church_id, user_id, role_key) do update
  set role_label = excluded.role_label,
      granted_at = now();

-- Also mark the invite as accepted if it's still pending
update public.church_role_invites
set status = 'accepted', responded_at = now()
where role_key = 'care'
  and status = 'pending';

-- ── 4. Verify care_team_members (needed for Care Inbox access) ───────────────
-- The sync_care_role_to_team trigger should have created this row.
-- If it's missing, insert it manually.
select
  ctm.id,
  p.display_name,
  ctm.is_active,
  ctm.joined_at
from public.care_team_members ctm
join public.profiles p on p.id = ctm.user_id
limit 20;

-- If the care_team_members row is missing, insert it:
-- (replace church_id below with the actual church UUID from query 1)
/*
insert into public.care_team_members (church_id, user_id, is_active)
select church_id, user_id, true
from public.church_roles
where role_key = 'care'
  and is_owner = false
on conflict (church_id, user_id) do update set is_active = true;
*/
