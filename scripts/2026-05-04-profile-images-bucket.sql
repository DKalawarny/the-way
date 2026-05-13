-- ============================================================================
-- profile-images bucket — 2026-05-04
--
-- Separate bucket for avatar and banner uploads, isolated from post-images
-- so any configuration issues on that bucket don't affect profile uploads.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-images', 'profile-images', true, 10485760, null)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "profile-images: anyone reads"   on storage.objects;
drop policy if exists "profile-images: owner writes"   on storage.objects;
drop policy if exists "profile-images: owner updates"  on storage.objects;
drop policy if exists "profile-images: owner deletes"  on storage.objects;

create policy "profile-images: anyone reads"
  on storage.objects for select
  using (bucket_id = 'profile-images');

create policy "profile-images: owner writes"
  on storage.objects for insert
  with check (
    bucket_id = 'profile-images'
    and auth.uid() is not null
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "profile-images: owner updates"
  on storage.objects for update
  using (bucket_id = 'profile-images' and split_part(name, '/', 1) = auth.uid()::text);

create policy "profile-images: owner deletes"
  on storage.objects for delete
  using (bucket_id = 'profile-images' and split_part(name, '/', 1) = auth.uid()::text);
