-- ============================================================================
-- 2026-05-27 — Fix recursive RLS on church_roles INSERT/UPDATE/DELETE
-- ----------------------------------------------------------------------------
-- The write policies (insert/update/delete) on church_roles contain:
--
--   exists (select 1 from public.church_roles cr where cr.user_id = auth.uid() …)
--
-- …inside an RLS policy ON church_roles itself. This causes infinite recursion:
-- "infinite recursion detected in policy for relation 'church_roles'"
--
-- Fix: wrap the permission check in a SECURITY DEFINER function so that it
-- queries church_roles with RLS bypassed. The function itself is locked down —
-- it only returns a boolean and callers can't abuse it for data access.
-- ============================================================================

-- 1. Security-definer helper — bypasses RLS when checking manager status
create or replace function public.church_roles_is_manager(target_church_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.church_roles
    where church_id = target_church_id
      and user_id   = auth.uid()
      and (is_owner = true or can_manage_staff = true)
  );
$$;

-- Grant execute to authenticated users only
revoke execute on function public.church_roles_is_manager(uuid) from public, anon;
grant  execute on function public.church_roles_is_manager(uuid) to authenticated;

-- 2. Drop the recursive write policies
drop policy if exists "church_roles: owner or manager writes"  on public.church_roles;
drop policy if exists "church_roles: owner or manager updates" on public.church_roles;
drop policy if exists "church_roles: owner or manager deletes" on public.church_roles;

-- 3. Recreate using the security-definer helper (no more recursion)
create policy "church_roles: owner or manager writes"
  on public.church_roles for insert
  with check (
    auth.uid() is not null
    and public.church_roles_is_manager(church_roles.church_id)
  );

create policy "church_roles: owner or manager updates"
  on public.church_roles for update
  using (
    auth.uid() is not null
    and public.church_roles_is_manager(church_roles.church_id)
  );

create policy "church_roles: owner or manager deletes"
  on public.church_roles for delete
  using (
    is_owner = false   -- can never delete the owner row via API
    and auth.uid() is not null
    and public.church_roles_is_manager(church_roles.church_id)
  );
