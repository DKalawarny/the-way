-- ============================================================================
-- Church join requests — 2026-05-03
--
-- Adds an optional approval gate to church membership:
--   churches.open_join = true  → joining is instant (existing behaviour)
--   churches.open_join = false → creates a church_join_requests row that
--                                a church owner/manager must approve
--
-- On approval the pastor sets profiles.church_id; the request row is kept
-- for audit. Declined users can re-request.
-- ============================================================================

begin;

-- 1. Toggle on the church
alter table public.churches
  add column if not exists open_join boolean not null default true;

-- 2. Join requests table
create table if not exists public.church_join_requests (
  id           uuid primary key default gen_random_uuid(),
  church_id    uuid not null references public.churches(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending','approved','declined')),
  message      text,
  reviewed_by  uuid references auth.users(id),
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now(),
  unique (church_id, user_id)  -- one live request per person per church
);

alter table public.church_join_requests enable row level security;

-- Users read their own requests
create policy "join_requests: user reads own"
  on public.church_join_requests for select
  using (user_id = auth.uid());

-- Church owners and managers read all requests for their church
create policy "join_requests: owner reads church"
  on public.church_join_requests for select
  using (
    exists (
      select 1 from public.church_roles cr
      where cr.church_id = church_join_requests.church_id
        and cr.user_id   = auth.uid()
        and (cr.is_owner = true or cr.can_manage_staff = true)
    )
  );

-- Signed-in users can insert their own request
create policy "join_requests: user inserts own"
  on public.church_join_requests for insert
  with check (user_id = auth.uid());

-- Users can delete their own pending request (withdraw)
create policy "join_requests: user deletes own pending"
  on public.church_join_requests for delete
  using (user_id = auth.uid() and status = 'pending');

-- Owners and managers can update status (approve / decline)
create policy "join_requests: owner updates"
  on public.church_join_requests for update
  using (
    exists (
      select 1 from public.church_roles cr
      where cr.church_id = church_join_requests.church_id
        and cr.user_id   = auth.uid()
        and (cr.is_owner = true or cr.can_manage_staff = true)
    )
  );

commit;
