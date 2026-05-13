-- ============================================================================
-- Church avatar photo — 2026-05-03
--
-- Adds avatar_url to churches so each church can upload a real photo that
-- replaces the default ⛪ emoji in the hero banner and directory card.
-- Files live under {church_id}/avatar.{ext} in the 'church-avatars' bucket.
-- RLS: only the lead pastor (churches.pastor_id = auth.uid()) may write.
-- Anyone may read (public bucket) so <img src> works without auth headers.
-- ============================================================================

begin;

-- 1. Column on the churches table
alter table public.churches
  add column if not exists avatar_url text;

-- 2. Public storage bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'church-avatars',
  'church-avatars',
  true,
  5242880,
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 3. RLS policies
drop policy if exists "church-avatars: anyone reads"           on storage.objects;
drop policy if exists "church-avatars: pastor writes"          on storage.objects;
drop policy if exists "church-avatars: pastor updates"         on storage.objects;
drop policy if exists "church-avatars: pastor deletes"         on storage.objects;

create policy "church-avatars: anyone reads"
  on storage.objects for select
  using (bucket_id = 'church-avatars');

-- The path is {church_id}/avatar.{ext}. The first folder segment is the
-- church id. We verify the authenticated user is that church's pastor.
create policy "church-avatars: pastor writes"
  on storage.objects for insert
  with check (
    bucket_id = 'church-avatars'
    and auth.uid() is not null
    and exists (
      select 1 from public.churches
      where id::text = (storage.foldername(name))[1]
        and pastor_id = auth.uid()
    )
  );

create policy "church-avatars: pastor updates"
  on storage.objects for update
  using (
    bucket_id = 'church-avatars'
    and exists (
      select 1 from public.churches
      where id::text = (storage.foldername(name))[1]
        and pastor_id = auth.uid()
    )
  );

create policy "church-avatars: pastor deletes"
  on storage.objects for delete
  using (
    bucket_id = 'church-avatars'
    and exists (
      select 1 from public.churches
      where id::text = (storage.foldername(name))[1]
        and pastor_id = auth.uid()
    )
  );

commit;
