-- ============================================================================
-- Fix post-images storage RLS — 2026-05-04
--
-- The existing policies use storage.foldername(name) which is a helper
-- function added in later versions of the Supabase storage extension.
-- On older projects it may not exist, causing storage uploads to fail with
-- "The database schema is invalid or incompatible."
--
-- Replace every storage.foldername(name)[1] call with the equivalent plain
-- Postgres expression: split_part(name, '/', 1)
-- Both extract the first path segment (the user's auth.uid()).
-- ============================================================================

drop policy if exists "post-images: owner writes own folder"  on storage.objects;
drop policy if exists "post-images: owner updates own folder" on storage.objects;
drop policy if exists "post-images: owner deletes own folder" on storage.objects;

create policy "post-images: owner writes own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'post-images'
    and auth.uid() is not null
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "post-images: owner updates own folder"
  on storage.objects for update
  using (
    bucket_id = 'post-images'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "post-images: owner deletes own folder"
  on storage.objects for delete
  using (
    bucket_id = 'post-images'
    and split_part(name, '/', 1) = auth.uid()::text
  );
