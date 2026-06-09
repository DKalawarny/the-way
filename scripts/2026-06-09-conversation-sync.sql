-- Optional conversation sync across devices
create table if not exists public.conversations (
  id         text not null,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  title      text not null default 'New conversation',
  person_type text,
  messages   jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.conversations enable row level security;

create policy "Users manage own conversations"
  on public.conversations for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Opt-in flag on profiles
alter table public.profiles
  add column if not exists sync_conversations boolean default false;
