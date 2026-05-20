-- Church avatar URL + banner preset columns
alter table public.churches add column if not exists avatar_url    text;
alter table public.churches add column if not exists banner_preset text default 'ink';

-- Storage bucket for church avatars (run once; no-ops if already exists)
insert into storage.buckets (id, name, public)
values ('church-avatars', 'church-avatars', true)
on conflict (id) do nothing;

-- Storage policies — pastors upload to their own church folder
drop policy if exists "church avatar upload" on storage.objects;
create policy "church avatar upload"
  on storage.objects for insert
  with check (
    bucket_id = 'church-avatars'
    and auth.uid() is not null
  );

drop policy if exists "church avatar update" on storage.objects;
create policy "church avatar update"
  on storage.objects for update
  using (
    bucket_id = 'church-avatars'
    and auth.uid() is not null
  );

drop policy if exists "church avatar public read" on storage.objects;
create policy "church avatar public read"
  on storage.objects for select
  using (bucket_id = 'church-avatars');
