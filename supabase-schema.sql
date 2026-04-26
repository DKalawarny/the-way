-- Run this in Supabase → SQL Editor → New query

-- Profiles table (extends Supabase auth.users)
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  display_name    text not null,
  age_range       text check (age_range in ('18–24','25–34','35–49','50+')),
  gender          text check (gender in ('Man','Woman','Prefer not to say')),
  city            text,
  country         text,
  person_type     text,
  background      text,  -- where they came from spiritually
  tradition       text,  -- current tradition (changes trigger milestone)
  home_found_at   timestamptz,  -- set when tradition changes from 'discovering'
  exploring_since text check (exploring_since in ('Just started','A few months','About a year','Several years')),
  what_brought    text,
  looking_for     text[],  -- array: exploring/discussion/study-group/discipleship/mentoring
  is_verified     boolean default false,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Community posts
create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid references public.profiles(id) on delete cascade,
  body        text not null,
  person_type text,
  created_at  timestamptz default now()
);

-- Replies on posts
create table if not exists public.replies (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid references public.posts(id) on delete cascade,
  author_id  uuid references public.profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz default now()
);

-- Reactions (resonates / amen / thinking)
create table if not exists public.reactions (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid references public.posts(id) on delete cascade,
  author_id  uuid references public.profiles(id) on delete cascade,
  kind       text check (kind in ('resonates','amen','thinking')),
  unique (post_id, author_id)
);

-- Reports (safety)
create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete set null,
  target_type text check (target_type in ('profile','post','reply')),
  target_id   uuid not null,
  reason      text not null,
  created_at  timestamptz default now()
);

-- Blocks (safety)
create table if not exists public.blocks (
  id         uuid primary key default gen_random_uuid(),
  blocker_id uuid references public.profiles(id) on delete cascade,
  blocked_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique (blocker_id, blocked_id)
);

-- Featured threads (weekly pinned discussion)
create table if not exists public.featured_threads (
  id         uuid primary key default gen_random_uuid(),
  question   text not null,
  context    text,
  active     boolean default true,
  created_at timestamptz default now()
);

alter table public.featured_threads enable row level security;

create policy "Anyone can read featured threads"
  on public.featured_threads for select
  using (true);

-- Add optional FK from posts → featured_threads
alter table public.posts add column if not exists
  featured_thread_id uuid references public.featured_threads(id) on delete set null;

-- Follows
create table if not exists public.follows (
  id          uuid primary key default gen_random_uuid(),
  follower_id uuid references public.profiles(id) on delete cascade,
  following_id uuid references public.profiles(id) on delete cascade,
  created_at  timestamptz default now(),
  unique (follower_id, following_id)
);

-- Auto-update updated_at on profiles
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function update_updated_at();

-- Row Level Security
alter table public.profiles  enable row level security;
alter table public.posts      enable row level security;
alter table public.replies    enable row level security;
alter table public.reactions  enable row level security;
alter table public.reports    enable row level security;
alter table public.blocks     enable row level security;
alter table public.follows    enable row level security;

-- Profiles: anyone verified can read; only owner can write
create policy "Public profiles are viewable by authenticated users"
  on public.profiles for select
  using (auth.role() = 'authenticated');

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Posts: authenticated users can read and write
create policy "Authenticated users can read posts"
  on public.posts for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can create posts"
  on public.posts for insert
  with check (auth.uid() = author_id);

create policy "Authors can delete their posts"
  on public.posts for delete
  using (auth.uid() = author_id);

-- Replies
create policy "Authenticated users can read replies"
  on public.replies for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can create replies"
  on public.replies for insert
  with check (auth.uid() = author_id);

create policy "Authors can delete their replies"
  on public.replies for delete
  using (auth.uid() = author_id);

-- Reactions
create policy "Authenticated users can read reactions"
  on public.reactions for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can react"
  on public.reactions for insert
  with check (auth.uid() = author_id);

create policy "Users can remove their own reactions"
  on public.reactions for delete
  using (auth.uid() = author_id);

-- Reports: users can submit, only they can see their own
create policy "Users can report"
  on public.reports for insert
  with check (auth.uid() = reporter_id);

-- Blocks
create policy "Users manage their own blocks"
  on public.blocks for all
  using (auth.uid() = blocker_id);

-- Follows
create policy "Authenticated users can read follows"
  on public.follows for select
  using (auth.role() = 'authenticated');

create policy "Users manage their own follows"
  on public.follows for insert
  with check (auth.uid() = follower_id);

create policy "Users can unfollow"
  on public.follows for delete
  using (auth.uid() = follower_id);
