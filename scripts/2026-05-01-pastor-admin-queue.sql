-- ============================================================================
-- 2026-05-01 — Pastor application admin triage queue
-- ----------------------------------------------------------------------------
-- Goal: a read-only admin view that lists pending pastor applications with
-- pre-built investigation links + clipboard helpers, so manual review takes
-- 30 seconds per application instead of 5 minutes of hunting.
--
-- This does NOT add a new approval pathway. Final approve/reject still happens
-- via scripts/approve-pastor-application.sql in the Supabase SQL editor —
-- the manual SQL approval is a deliberate trust boundary (see memory file
-- pastor_onboarding_pillar.md). The queue just makes the triage faster.
--
-- Apply order: run this AFTER supabase-schema.sql is otherwise current.
-- Idempotent — safe to re-run.
--
-- Post-apply: grant admin access to your own profile manually:
--   update public.profiles set is_admin = true where id = '<your-uuid>';
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. is_admin column on profiles
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists is_admin boolean default false;

-- ----------------------------------------------------------------------------
-- 2. Admin check helper (SECURITY DEFINER avoids RLS recursion on profiles)
-- ----------------------------------------------------------------------------
-- An inline `exists (select 1 from profiles ...)` inside a policy ON profiles
-- triggers infinite recursion (RLS re-evaluates the policy when the subquery
-- touches profiles). A SECURITY DEFINER function bypasses RLS for the lookup.
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

-- ----------------------------------------------------------------------------
-- 3. Admin read policies on the tables the queue needs to display
-- ----------------------------------------------------------------------------
-- Admins read all pastor applications (any status, any user).
drop policy if exists "Admins read all pastor applications" on public.pastor_applications;
create policy "Admins read all pastor applications"
  on public.pastor_applications for select
  using (public.is_current_user_admin());

-- Admins read all profiles (so the queue can show the applicant's display name + email).
drop policy if exists "Admins read all profiles" on public.profiles;
create policy "Admins read all profiles"
  on public.profiles for select
  using (public.is_current_user_admin());

-- Admins read all churches (regardless of verification_status, so they can
-- see existing claims when checking for one-pastor-per-church conflicts).
drop policy if exists "Admins read all churches" on public.churches;
create policy "Admins read all churches"
  on public.churches for select
  using (public.is_current_user_admin());
