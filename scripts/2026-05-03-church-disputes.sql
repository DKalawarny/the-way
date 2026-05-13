-- ============================================================================
-- 2026-05-03 — Church listing disputes
-- ----------------------------------------------------------------------------
-- Public "this listing isn't right" submissions on church pages. Anyone (signed
-- in or not) can flag a church; admins triage from the same panel they use for
-- pastor applications. Closes the trust loop on auto-verified churches.
--
-- Idempotent — safe to re-run.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. Table
-- ----------------------------------------------------------------------------
create table if not exists public.church_disputes (
  id              uuid primary key default gen_random_uuid(),
  church_id       uuid not null references public.churches(id) on delete cascade,
  reporter_id     uuid          references public.profiles(id) on delete set null,
  reporter_email  text,
  dispute_type    text not null
    check (dispute_type in ('inaccurate_info','wrong_location','not_real','closed','impersonation','other')),
  reason          text not null,
  status          text not null default 'pending'
    check (status in ('pending','reviewed','resolved','dismissed')),
  resolved_by     uuid          references public.profiles(id) on delete set null,
  resolved_at     timestamptz,
  resolution_note text,
  created_at      timestamptz not null default now()
);

create index if not exists church_disputes_pending_idx
  on public.church_disputes (created_at desc)
  where status = 'pending';

create index if not exists church_disputes_church_idx
  on public.church_disputes (church_id, created_at desc);

alter table public.church_disputes enable row level security;

-- ----------------------------------------------------------------------------
-- 2. Policies
-- ----------------------------------------------------------------------------

-- Anyone (anon or authed) can submit. Light shape check — reason can't be empty,
-- length cap matches the client. reporter_id must match the caller (or be null
-- for anon) to stop a logged-in attacker from impersonating other users.
drop policy if exists "Anyone can submit a dispute" on public.church_disputes;
create policy "Anyone can submit a dispute"
  on public.church_disputes for insert
  to anon, authenticated
  with check (
    char_length(reason) between 1 and 2000
    and (reporter_id is null or reporter_id = auth.uid())
    and status = 'pending'
    and resolved_by is null
    and resolved_at is null
  );

-- Admins read everything for triage.
drop policy if exists "Admins read all disputes" on public.church_disputes;
create policy "Admins read all disputes"
  on public.church_disputes for select
  to authenticated
  using (public.is_current_user_admin());

-- Admins update status / resolution fields.
drop policy if exists "Admins update disputes" on public.church_disputes;
create policy "Admins update disputes"
  on public.church_disputes for update
  to authenticated
  using (public.is_current_user_admin())
  with check (public.is_current_user_admin());

-- Reporters can read their own submissions (so a future "your reports" panel
-- works without us bouncing through service role).
drop policy if exists "Reporter reads own disputes" on public.church_disputes;
create policy "Reporter reads own disputes"
  on public.church_disputes for select
  to authenticated
  using (auth.uid() = reporter_id);

commit;
