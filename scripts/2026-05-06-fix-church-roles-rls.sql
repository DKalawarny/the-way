-- ============================================================================
-- 2026-05-06 — Fix self-referential RLS on church_roles
-- ----------------------------------------------------------------------------
-- The "church_roles: members read own church" policy introduced in
-- 2026-05-03-church-ownership-roles.sql contains a recursive subquery:
--
--   select church_id from public.church_roles where user_id = auth.uid()
--
-- …inside an RLS policy ON church_roles itself. Postgres / Supabase resolves
-- this by silently returning no rows, so pastors can never read their own role
-- and pastorChurchId is always null in the client.
--
-- Fix: replace the recursive union with a direct `user_id = auth.uid()` check.
-- A user can always read their own church_roles rows. Members of the same
-- church can still read all roles via the profiles.church_id path.
-- ============================================================================

drop policy if exists "church_roles: members read own church" on public.church_roles;

create policy "church_roles: members read own church"
  on public.church_roles for select
  using (
    auth.uid() is not null
    and (
      -- Always let a user read their own role rows (no recursion)
      user_id = auth.uid()
      or
      -- Let other church members see roles in their church
      church_id in (
        select church_id from public.profiles where id = auth.uid()
      )
    )
  );
