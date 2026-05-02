-- ============================================================================
-- Drop posts.audience — 2026-05-01
--
-- The `audience` column on public.posts (default 'public') was the original
-- privacy mechanism, replaced by posts.scope ('me' | 'church' | 'group') in
-- the 2026-05-01 privacy migration. Audit before this drop:
--
--   - 34 rows total, all audience='public' — no 'friends' or 'private'
--     rows would lose meaning
--   - 0 client code paths read or write it after this turn
--     (Community.jsx badge render was removed; no composer sets it)
--   - 0 DB-side dependents: no views, functions, policies, or triggers
--     reference the column (audited via information_schema and pg_proc)
--
-- Wrapped in a transaction so a partial failure rolls back cleanly.
-- ============================================================================

begin;

alter table public.posts drop column if exists audience;

commit;
