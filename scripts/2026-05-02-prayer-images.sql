-- ============================================================================
-- Prayer image attachments — 2026-05-02
--
-- Adds image_urls (jsonb array) to both prayer tables so users can attach
-- photos to a prayer request. Same shape as posts.body_data.image_urls.
-- Files live in the existing 'post-images' storage bucket — no new RLS.
-- ============================================================================

alter table public.prayers
  add column if not exists image_urls jsonb not null default '[]'::jsonb;

alter table public.personal_prayers
  add column if not exists image_urls jsonb not null default '[]'::jsonb;
