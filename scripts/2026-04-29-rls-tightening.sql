-- ============================================================================
-- RLS tightening — 2026-04-29
-- Paste into the Supabase SQL editor as a single transaction.
--
-- Fixes the critical gaps surfaced by the policy audit:
--   1. prayers SELECT was global to authed users — now honors is_public.
--   2. prayers UPDATE was wide-open — any authed user could rewrite body,
--      flip is_public, reassign author_id. Now table-level UPDATE is revoked
--      and only the prayer_count column is grantable, so the count-bump flow
--      keeps working but no other column can be touched from the client.
--   3. weekly_focus INSERT let any authed user post to any group's focus.
--      Now only the group's pastor can.
--   4. shared_conversations INSERT was open to fully anonymous callers (spam
--      vector). Now requires authentication.
--
-- Note on prayers UPDATE: the app never edits a prayer body or flips its
-- public flag from the client today (the only mutation is prayer_count).
-- If that ever changes, do it via a SECURITY DEFINER function rather than
-- re-broadening the GRANT.
--
-- Wrapped in a transaction so a partial failure rolls back cleanly.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. prayers
-- ----------------------------------------------------------------------------

-- SELECT: only public prayers (or your own).
drop policy if exists "Authenticated users can read public prayers" on public.prayers;
create policy "Authenticated users read public or own prayers"
  on public.prayers for select
  using (
    auth.role() = 'authenticated'
    and (is_public = true or author_id = auth.uid())
  );

-- UPDATE: revoke table-wide privilege, grant only the count column.
-- The RLS policy still requires authenticated, but column-level GRANT
-- means any other column update returns "permission denied for column X".
revoke update on public.prayers from authenticated;
grant  update (prayer_count) on public.prayers to authenticated;

drop policy if exists "Users can update prayer count" on public.prayers;
create policy "Authenticated users bump prayer_count"
  on public.prayers for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ----------------------------------------------------------------------------
-- 2. weekly_focus — INSERT must come from the group's pastor
-- ----------------------------------------------------------------------------

drop policy if exists "Pastors can post weekly focus" on public.weekly_focus;
create policy "Pastor of group posts weekly focus"
  on public.weekly_focus for insert
  with check (
    auth.uid() = (
      select pastor_id from public.church_groups where id = group_id
    )
  );

-- ----------------------------------------------------------------------------
-- 3. shared_conversations — require authentication for inserts
-- ----------------------------------------------------------------------------

drop policy if exists "Anyone can create a share" on public.shared_conversations;
create policy "Authenticated users can create a share"
  on public.shared_conversations for insert
  with check (auth.role() = 'authenticated');

commit;
