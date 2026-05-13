-- ============================================================================
-- Storage schema fix — 2026-05-04
--
-- Newer Supabase Storage API versions expect three extra columns on
-- storage.objects that older projects (created before ~late 2023) don't have:
--
--   owner_id      uuid  — UUID of the owning user (mirrors the 'owner' text col)
--   version       text  — ETag/version string for conditional requests
--   user_metadata jsonb — arbitrary per-object metadata bag
--
-- Their absence causes every upload to fail with:
--   "The database schema is invalid or incompatible."
--
-- Safe to re-run — all three use ADD COLUMN IF NOT EXISTS.
-- ============================================================================

alter table storage.objects
  add column if not exists owner_id      uuid references auth.users(id),
  add column if not exists version       text,
  add column if not exists user_metadata jsonb;

-- Backfill owner_id from the existing owner text column where possible
-- (owner stores auth.uid()::text in legacy rows).
update storage.objects
set owner_id = owner::uuid
where owner_id is null
  and owner is not null
  and owner ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
