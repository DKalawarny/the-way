-- ============================================================================
-- Sermon-discussion image attachments — 2026-05-02
--
-- Adds image_urls (jsonb array) to sermon_discussions so members can attach
-- images to their replies. Same shape as posts.body_data.image_urls and the
-- prayer/sermon image columns. Files live in the existing 'post-images'
-- storage bucket — no new RLS.
-- ============================================================================

alter table public.sermon_discussions
  add column if not exists image_urls jsonb not null default '[]'::jsonb;
