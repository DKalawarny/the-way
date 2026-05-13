-- ============================================================================
-- Group-post image attachments — 2026-05-02
--
-- Adds image_urls (jsonb array) to group_posts so members can attach images
-- to posts in their group space. Same shape as posts.body_data.image_urls
-- and the prayer/sermon/discussion image columns. Files live in the
-- existing 'post-images' storage bucket — no new RLS.
-- ============================================================================

alter table public.group_posts
  add column if not exists image_urls jsonb not null default '[]'::jsonb;
