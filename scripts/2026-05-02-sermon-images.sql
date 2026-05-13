-- ============================================================================
-- Sermon image attachments — 2026-05-02
--
-- Pastors can now attach images to a sermon. URLs are stored as a jsonb
-- array on the sermon row (mirrors how posts.body_data.image_urls works)
-- and also copied into the sermon-announcement post's body_data so the
-- existing PostCard → PostImageGrid pipeline shows them in the church
-- feed without any feed-side change.
-- Files live in the existing 'post-images' storage bucket; pastors upload
-- under their own auth.uid() folder, same RLS as regular post images.
-- ============================================================================

alter table public.sermons
  add column if not exists image_urls jsonb not null default '[]'::jsonb;
