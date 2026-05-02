-- ============================================================================
-- 2026-05-01 — Fix infinite recursion in admin RLS policies
-- ----------------------------------------------------------------------------
-- The admin policies added in 2026-05-01-pastor-admin-queue.sql used an
-- inline `exists (select 1 from public.profiles where id = auth.uid()
-- and is_admin = true)` check inside a policy on `public.profiles` itself.
-- When any query touches profiles, RLS evaluates that policy, which queries
-- profiles, which re-triggers RLS, which evaluates that policy again, etc.
-- Postgres detects the loop and bails with:
--   "infinite recursion detected in policy for relation 'profiles'"
--
-- Fix: wrap the admin check in a SECURITY DEFINER function so the lookup
-- bypasses RLS. Same end result, no recursion.
--
-- Idempotent — safe to re-run.
-- ============================================================================

create or replace function public.is_current_user_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

revoke all on function public.is_current_user_admin() from public;
grant execute on function public.is_current_user_admin() to authenticated;

-- Rewrite the three admin policies to use the function
drop policy if exists "Admins read all profiles" on public.profiles;
create policy "Admins read all profiles"
  on public.profiles for select
  using (public.is_current_user_admin());

drop policy if exists "Admins read all pastor applications" on public.pastor_applications;
create policy "Admins read all pastor applications"
  on public.pastor_applications for select
  using (public.is_current_user_admin());

drop policy if exists "Admins read all churches" on public.churches;
create policy "Admins read all churches"
  on public.churches for select
  using (public.is_current_user_admin());
