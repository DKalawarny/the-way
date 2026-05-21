-- Church follows: users can follow churches without joining them
create table if not exists public.church_follows (
  user_id    uuid references public.profiles(id) on delete cascade,
  church_id  uuid references public.churches(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, church_id)
);

alter table public.church_follows enable row level security;

create policy "Anyone can read church follows"
  on public.church_follows for select
  using (true);

create policy "Users manage their own church follows"
  on public.church_follows for insert
  with check (auth.uid() = user_id);

create policy "Users delete their own church follows"
  on public.church_follows for delete
  using (auth.uid() = user_id);
