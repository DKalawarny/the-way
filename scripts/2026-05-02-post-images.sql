-- ============================================================================
-- Post image attachments — 2026-05-02
--
-- Creates the 'post-images' storage bucket (public-read so URLs can be
-- dropped straight into <img src> in feed cards) and RLS on storage.objects
-- scoped so each user can only write under their own "<auth.uid()>/..." path
-- prefix. Image URLs are stored inside posts.body_data->'image_urls'
-- (existing jsonb column) — no posts-table schema change needed; the
-- feed_items view already merges body_data into the body jsonb that cards
-- read from.
-- ============================================================================

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-images',
  'post-images',
  true,
  5242880,                                 -- 5 MB per image
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "post-images: anyone reads"             on storage.objects;
drop policy if exists "post-images: owner writes own folder"  on storage.objects;
drop policy if exists "post-images: owner updates own folder" on storage.objects;
drop policy if exists "post-images: owner deletes own folder" on storage.objects;

create policy "post-images: anyone reads"
  on storage.objects for select
  using (bucket_id = 'post-images');

create policy "post-images: owner writes own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'post-images'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "post-images: owner updates own folder"
  on storage.objects for update
  using (
    bucket_id = 'post-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "post-images: owner deletes own folder"
  on storage.objects for delete
  using (
    bucket_id = 'post-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

commit;
