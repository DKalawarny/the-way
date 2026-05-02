-- ============================================================================
-- Drop legacy public.replies — 2026-05-01
--
-- Context: comments are now written to public.post_comments (the privacy-
-- gated table introduced in scripts/2026-05-01-private-comments.sql).
-- All client code was migrated this turn (Community.jsx, MePanel.jsx,
-- ProfilePage.jsx); no surface targets the legacy table anymore.
--
-- Pre-flight audit before this drop:
--   - 3 rows total, all body='test' from a single dev author (Apr 26-29)
--   - 0 inbound foreign-key references from any other table
--   - 0 client code paths that read or write it
--
-- The table had a wide-open SELECT policy ("Authenticated users can read
-- replies"), so leaving it in place would mean any signed-in user could
-- still scrape its contents through PostgREST. Drop closes that hole.
--
-- Wrapped in a transaction so a partial failure rolls back cleanly.
-- ============================================================================

begin;

-- DROP TABLE cascades to indexes, RLS policies, and any triggers on
-- the table. We pass CASCADE to also drop any view / FK that we missed
-- in the audit (defensive — the audit found none, but free insurance).
drop table if exists public.replies cascade;

commit;
