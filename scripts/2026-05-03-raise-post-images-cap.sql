-- ============================================================================
-- 2026-05-03 — Raise the post-images bucket size cap to 10 MB
-- ----------------------------------------------------------------------------
-- The default Supabase bucket cap (often 1–2 MB) is below what a typical phone
-- camera produces. We compress client-side in src/imageAttach.jsx (long edge
-- 1600px, JPEG q=0.82) which usually lands under 1 MB — but the original file
-- still has to fit through whatever the bucket allows on the way in. 10 MB is
-- generous enough that no honest phone photo will be rejected, while still
-- bounding malicious uploads.
--
-- Idempotent — safe to re-run.
-- ============================================================================

update storage.buckets
   set file_size_limit = 10 * 1024 * 1024  -- 10 MB
 where id = 'post-images';

-- Verify
select id, file_size_limit from storage.buckets where id = 'post-images';
