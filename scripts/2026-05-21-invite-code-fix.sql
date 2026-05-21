-- ============================================================================
-- 2026-05-21 — Church invite code: column, generator, backfill, lookup fn
-- ----------------------------------------------------------------------------
-- Fixes two issues:
--   1. invite_code column + generator function may not exist in prod yet
--   2. The churches RLS policy (verified + public only) blocks the code lookup
--      for unverified churches. A security-definer function bypasses that.
-- Idempotent — safe to re-run.
-- ============================================================================

-- 1. Generator function
create or replace function public.gen_church_invite_code() returns text
language sql as $$
  select upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
$$;

-- 2. Columns
alter table public.churches
  add column if not exists invite_code            text unique,
  add column if not exists invite_code_rotated_at timestamptz default now();

-- 3. Backfill existing churches that have no code yet
update public.churches
   set invite_code            = public.gen_church_invite_code(),
       invite_code_rotated_at = now()
 where invite_code is null;

-- 4. Lookup function — security definer so RLS is bypassed.
--    Returns only id + name; callers have no way to enumerate churches or
--    read any other column. The code itself is the secret.
create or replace function public.church_by_invite_code(p_code text)
returns table(id uuid, name text)
language sql
security definer
set search_path = public
as $$
  select id, name
  from public.churches
  where invite_code = upper(trim(p_code))
  limit 1;
$$;
