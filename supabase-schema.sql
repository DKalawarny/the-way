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

-- Prayer requests
create table if not exists public.prayers (
  id           uuid primary key default gen_random_uuid(),
  author_id    uuid references public.profiles(id) on delete cascade,
  body         text not null,
  is_public    boolean default true,
  is_anonymous boolean default false,
  prayer_count integer default 0,
  created_at   timestamptz default now()
);

-- Who prayed for a request
create table if not exists public.prayer_responses (
  id         uuid primary key default gen_random_uuid(),
  prayer_id  uuid references public.prayers(id) on delete cascade,
  author_id  uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique (prayer_id, author_id)
);

alter table public.prayers enable row level security;
alter table public.prayer_responses enable row level security;

create policy "Authenticated users read public or own prayers"
  on public.prayers for select
  using (
    auth.role() = 'authenticated'
    and (is_public = true or author_id = auth.uid())
  );

create policy "Users can insert their own prayers"
  on public.prayers for insert
  with check (auth.uid() = author_id);

-- Non-author updates are restricted to the prayer_count column via GRANT;
-- see the bottom of this file for the column-level grant.
create policy "Authenticated users bump prayer_count"
  on public.prayers for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Users can read prayer responses"
  on public.prayer_responses for select
  using (auth.role() = 'authenticated');

create policy "Users can insert prayer responses"
  on public.prayer_responses for insert
  with check (auth.uid() = author_id);

-- Shared conversations (read-only links)
create table if not exists public.shared_conversations (
  id          text primary key,
  title       text,
  messages    jsonb not null,
  person_type text,
  created_at  timestamptz default now()
);

alter table public.shared_conversations enable row level security;

create policy "Anyone can read shared conversations"
  on public.shared_conversations for select
  using (true);

create policy "Authenticated users can create a share"
  on public.shared_conversations for insert
  with check (auth.role() = 'authenticated');

-- Church / study groups
create table if not exists public.church_groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  pastor_id   uuid references public.profiles(id) on delete cascade,
  invite_code text unique not null,
  tradition   text,
  created_at  timestamptz default now()
);

-- Group membership
create table if not exists public.group_members (
  id        uuid primary key default gen_random_uuid(),
  group_id  uuid references public.church_groups(id) on delete cascade,
  member_id uuid references public.profiles(id) on delete cascade,
  role      text check (role in ('pastor','member')) default 'member',
  joined_at timestamptz default now(),
  unique (group_id, member_id)
);

-- Weekly focus set by pastor
create table if not exists public.weekly_focus (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid references public.church_groups(id) on delete cascade,
  passage     text not null,
  title       text,
  pastor_note text,
  week_of     date not null default current_date,
  created_at  timestamptz default now()
);

-- Group discussion posts
create table if not exists public.group_posts (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid references public.church_groups(id) on delete cascade,
  focus_id   uuid references public.weekly_focus(id) on delete set null,
  author_id  uuid references public.profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz default now()
);

-- Replies on group posts
create table if not exists public.group_replies (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid references public.group_posts(id) on delete cascade,
  author_id  uuid references public.profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz default now()
);

alter table public.church_groups  enable row level security;
alter table public.group_members  enable row level security;
alter table public.weekly_focus   enable row level security;
alter table public.group_posts    enable row level security;
alter table public.group_replies  enable row level security;

create policy "Authenticated users can read groups"
  on public.church_groups for select using (auth.role() = 'authenticated');
create policy "Authenticated users can create groups"
  on public.church_groups for insert with check (auth.uid() = pastor_id);
create policy "Pastors can update their group"
  on public.church_groups for update using (auth.uid() = pastor_id);

create policy "Members can read group membership"
  on public.group_members for select using (auth.role() = 'authenticated');
create policy "Users can join groups"
  on public.group_members for insert with check (auth.uid() = member_id);
create policy "Users can leave groups"
  on public.group_members for delete using (auth.uid() = member_id);

create policy "Group members can read focus"
  on public.weekly_focus for select using (auth.role() = 'authenticated');
create policy "Pastor of group posts weekly focus"
  on public.weekly_focus for insert with check (
    auth.uid() = (select pastor_id from public.church_groups where id = group_id)
  );

create policy "Group members can read posts"
  on public.group_posts for select using (auth.role() = 'authenticated');
create policy "Group members can post"
  on public.group_posts for insert with check (auth.uid() = author_id);
create policy "Authors can delete their posts"
  on public.group_posts for delete using (auth.uid() = author_id);

create policy "Group members can read replies"
  on public.group_replies for select using (auth.role() = 'authenticated');
create policy "Group members can reply"
  on public.group_replies for insert with check (auth.uid() = author_id);
create policy "Authors can delete their replies"
  on public.group_replies for delete using (auth.uid() = author_id);

-- Personal prayer journal (private, never shown publicly unless user chooses to share)
create table if not exists public.personal_prayers (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete cascade,
  body        text not null,
  is_answered boolean default false,
  answered_at timestamptz,
  created_at  timestamptz default now()
);

alter table public.personal_prayers enable row level security;

create policy "Users manage their own personal prayers"
  on public.personal_prayers for all
  using (auth.uid() = user_id);

-- Add group scope and encouragement note to existing tables
alter table public.prayers add column if not exists group_id uuid references public.church_groups(id) on delete set null;
alter table public.prayer_responses add column if not exists note text;

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

-- Reactions on personal prayers (🙏❤️🔥✨💪)
create table if not exists public.personal_prayer_reactions (
  id         uuid primary key default gen_random_uuid(),
  prayer_id  uuid references public.personal_prayers(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete cascade,
  kind       text not null,
  created_at timestamptz default now(),
  unique (prayer_id, user_id)
);

alter table public.personal_prayer_reactions enable row level security;

create policy "Users manage own prayer reactions"
  on public.personal_prayer_reactions for all
  using (auth.uid() = user_id);

-- ============================================================================
-- Church directory + pastor onboarding
-- ============================================================================

create table if not exists public.churches (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  denomination  text,
  city          text,
  country       text,
  website       text,
  about         text,
  pastor_id     uuid references public.profiles(id) on delete set null,
  pinned_post   text,
  is_public     boolean default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table if not exists public.pastor_applications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.profiles(id) on delete cascade,
  full_name     text not null,
  church_name   text not null,
  denomination  text,
  city          text,
  country       text,
  website       text,
  reason        text,
  status        text check (status in ('pending','approved','rejected')) default 'pending',
  reviewed_at   timestamptz,
  notes         text,
  created_at    timestamptz default now(),
  unique (user_id)
);

alter table public.profiles add column if not exists church_id uuid references public.churches(id) on delete set null;
alter table public.profiles add column if not exists is_pastor boolean default false;

alter table public.churches enable row level security;
alter table public.pastor_applications enable row level security;

create policy "Anyone can read public churches"
  on public.churches for select
  using (is_public = true);

create policy "Pastor can update their church"
  on public.churches for update
  using (auth.uid() = pastor_id);

create policy "Anyone can submit pastor application"
  on public.pastor_applications for insert
  with check (auth.uid() = user_id);

create policy "User reads own application"
  on public.pastor_applications for select
  using (auth.uid() = user_id);

create trigger churches_updated_at
  before update on public.churches
  for each row execute function update_updated_at();

-- ----------------------------------------------------------------------------
-- Church verification (registration-number based; manual review)
-- ----------------------------------------------------------------------------
alter table public.churches add column if not exists registration_country text;
alter table public.churches add column if not exists registration_number text;
alter table public.churches add column if not exists verification_status text default 'pending'
  check (verification_status in ('pending','verified','rejected'));
alter table public.churches add column if not exists verification_tier text
  check (verification_tier in ('registry','reference','none'));
alter table public.churches add column if not exists verified_at timestamptz;
alter table public.churches add column if not exists verification_notes text;

-- Existing churches stay live (grandfather), new ones default to pending.
update public.churches set verification_status = 'verified', verification_tier = 'registry'
  where verification_status is null or verification_status = 'pending';

-- One claim per registry number per country.
create unique index if not exists churches_unique_registration
  on public.churches (registration_country, registration_number)
  where registration_number is not null;

-- Application gets the same verification fields so we can read them at review time.
alter table public.pastor_applications add column if not exists registration_country text;
alter table public.pastor_applications add column if not exists registration_number text;
alter table public.pastor_applications add column if not exists pastor_role text;
alter table public.pastor_applications add column if not exists no_registration boolean default false;
alter table public.pastor_applications add column if not exists denominational_reference text;

drop policy if exists "Anyone can read public churches" on public.churches;
create policy "Anyone can read verified public churches"
  on public.churches for select
  using (is_public = true and verification_status = 'verified');

create policy "Pastor reads their own church"
  on public.churches for select
  using (auth.uid() = pastor_id);

-- ============================================================================
-- Personal prayer support + encouragements (referenced by Community / Prayer / MePanel)
-- ============================================================================

create table if not exists public.personal_prayer_support (
  id         uuid primary key default gen_random_uuid(),
  prayer_id  uuid references public.personal_prayers(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique (prayer_id, user_id)
);

create table if not exists public.personal_prayer_encouragements (
  id         uuid primary key default gen_random_uuid(),
  prayer_id  uuid references public.personal_prayers(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz default now()
);

alter table public.personal_prayer_support       enable row level security;
alter table public.personal_prayer_encouragements enable row level security;

-- Allow public read of public prayers (so the Community feed isn't empty)
create policy "Anyone can read public personal prayers"
  on public.personal_prayers for select
  using (is_public = true);

create policy "Anyone can read prayer support"
  on public.personal_prayer_support for select
  using (true);

create policy "Users insert own support"
  on public.personal_prayer_support for insert
  with check (auth.uid() = user_id);

create policy "Users delete own support"
  on public.personal_prayer_support for delete
  using (auth.uid() = user_id);

create policy "Anyone can read encouragements"
  on public.personal_prayer_encouragements for select
  using (true);

create policy "Users insert own encouragements"
  on public.personal_prayer_encouragements for insert
  with check (auth.uid() = user_id);

create policy "Users delete own encouragements"
  on public.personal_prayer_encouragements for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- Walks (member-driven curriculum tracks: New Believer, Doubt, Grief, etc.)
-- Members pick and walk privately. Pastor never sees individual progress.
-- ============================================================================

create table if not exists public.walks (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  title         text not null,
  subtitle      text,
  description   text,
  category      text check (category in ('new-believer','doubt','grief','marriage','anxiety','prayer','parenting','recovery','seasonal','other')),
  cover_emoji   text default '✦',
  length_days   int not null default 7,
  is_published  boolean default true,
  sort_order    int default 0,
  created_at    timestamptz default now()
);

create table if not exists public.walk_steps (
  id                uuid primary key default gen_random_uuid(),
  walk_id           uuid references public.walks(id) on delete cascade,
  day               int not null,
  title             text not null,
  body              text not null,
  scripture_ref     text,
  scripture_body    text,
  reflection_prompt text,
  unique (walk_id, day)
);

create table if not exists public.walk_progress (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.profiles(id) on delete cascade,
  walk_id      uuid references public.walks(id) on delete cascade,
  current_day  int not null default 1,
  completed_at timestamptz,
  started_at   timestamptz default now(),
  last_at      timestamptz default now(),
  unique (user_id, walk_id)
);

alter table public.walks         enable row level security;
alter table public.walk_steps    enable row level security;
alter table public.walk_progress enable row level security;

create policy "Anyone reads published walks"
  on public.walks for select using (is_published = true);
create policy "Anyone reads walk steps"
  on public.walk_steps for select using (true);
create policy "Users see own walk progress"
  on public.walk_progress for select using (auth.uid() = user_id);
create policy "Users insert own walk progress"
  on public.walk_progress for insert with check (auth.uid() = user_id);
create policy "Users update own walk progress"
  on public.walk_progress for update using (auth.uid() = user_id);
create policy "Users delete own walk progress"
  on public.walk_progress for delete using (auth.uid() = user_id);

-- ============================================================================
-- Sermon → Week Engine
-- Pastor pastes outline → daily content for the week (verses, group questions,
-- going-deeper, kid version). Pastor sees aggregate engagement only.
-- ============================================================================

create table if not exists public.sermons (
  id              uuid primary key default gen_random_uuid(),
  church_id       uuid references public.churches(id) on delete cascade,
  pastor_id       uuid references public.profiles(id) on delete set null,
  title           text not null,
  scripture_ref   text,
  summary         text,
  week_starts_on  date not null,
  is_published    boolean default true,
  created_at      timestamptz default now()
);

create table if not exists public.sermon_content (
  id          uuid primary key default gen_random_uuid(),
  sermon_id   uuid references public.sermons(id) on delete cascade,
  kind        text check (kind in ('daily_verse','group_question','going_deeper','kid_version')),
  day         int,
  body        text not null,
  scripture   text,
  sort_order  int default 0,
  created_at  timestamptz default now()
);

alter table public.sermons        enable row level security;
alter table public.sermon_content enable row level security;

create policy "Anyone reads published sermons"
  on public.sermons for select using (is_published = true);
create policy "Pastor manages own sermons"
  on public.sermons for all using (auth.uid() = pastor_id) with check (auth.uid() = pastor_id);
create policy "Anyone reads sermon content"
  on public.sermon_content for select using (true);
create policy "Pastor manages own sermon content"
  on public.sermon_content for all using (
    exists (select 1 from public.sermons s where s.id = sermon_id and s.pastor_id = auth.uid())
  );

-- ============================================================================
-- Care Team (Talk to Someone)
-- Pastor invites trusted people. Members pick who to talk to (anonymous or named).
-- Each conversation is private to the two participants. Pastor never sees content.
-- ============================================================================

create table if not exists public.care_team_members (
  id              uuid primary key default gen_random_uuid(),
  church_id       uuid references public.churches(id) on delete cascade,
  user_id         uuid references public.profiles(id) on delete cascade,
  role_label      text not null,
  specialty_tags  text[] default '{}',
  bio             text,
  is_active       boolean default true,
  accepted_covenant_at timestamptz,
  created_at      timestamptz default now(),
  unique (church_id, user_id)
);

create table if not exists public.care_conversations (
  id                uuid primary key default gen_random_uuid(),
  church_id         uuid references public.churches(id) on delete cascade,
  requester_id      uuid references public.profiles(id) on delete set null,
  care_member_id    uuid references public.profiles(id) on delete set null,
  topic             text,
  is_anonymous      boolean default false,
  status            text check (status in ('open','claimed','closed')) default 'open',
  safety_flagged    boolean default false,
  last_message_at   timestamptz default now(),
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create table if not exists public.care_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.care_conversations(id) on delete cascade,
  sender_id       uuid references public.profiles(id) on delete set null,
  body            text not null,
  is_safety_flag  boolean default false,
  created_at      timestamptz default now()
);

alter table public.care_team_members   enable row level security;
alter table public.care_conversations  enable row level security;
alter table public.care_messages       enable row level security;

-- Care team members are visible to anyone in the church (so members can pick)
create policy "Anyone reads active care team"
  on public.care_team_members for select using (is_active = true);
create policy "Care member updates own row"
  on public.care_team_members for update using (auth.uid() = user_id);
create policy "Pastor manages care team"
  on public.care_team_members for all using (
    exists (select 1 from public.churches c where c.id = church_id and c.pastor_id = auth.uid())
  ) with check (
    exists (select 1 from public.churches c where c.id = church_id and c.pastor_id = auth.uid())
  );

-- Conversations: requester + assigned care member only
create policy "Participants read own conversations"
  on public.care_conversations for select
  using (auth.uid() = requester_id or auth.uid() = care_member_id);

-- "Anyone available" routing: open & unclaimed conversations are visible to
-- active care team members of the church (so they can claim)
create policy "Care team sees open unclaimed"
  on public.care_conversations for select
  using (
    status = 'open' and care_member_id is null and
    exists (select 1 from public.care_team_members m
            where m.church_id = church_id and m.user_id = auth.uid() and m.is_active = true)
  );

create policy "Members create conversations"
  on public.care_conversations for insert
  with check (auth.uid() = requester_id);

create policy "Participant updates conversation"
  on public.care_conversations for update
  using (
    auth.uid() = requester_id or auth.uid() = care_member_id or
    (status = 'open' and care_member_id is null and
      exists (select 1 from public.care_team_members m
              where m.church_id = church_id and m.user_id = auth.uid() and m.is_active = true))
  );

create policy "Read messages in own conversation"
  on public.care_messages for select
  using (
    exists (select 1 from public.care_conversations c
            where c.id = conversation_id
              and (c.requester_id = auth.uid() or c.care_member_id = auth.uid()))
  );
create policy "Send messages to own conversation"
  on public.care_messages for insert
  with check (
    auth.uid() = sender_id and
    exists (select 1 from public.care_conversations c
            where c.id = conversation_id
              and (c.requester_id = auth.uid() or c.care_member_id = auth.uid()))
  );

create trigger care_conversations_updated_at
  before update on public.care_conversations
  for each row execute function update_updated_at();

-- ============================================================================
-- Anonymous Questions (Anonymous Welcome + Heatmap source)
-- No identity stored. Pastor sees aggregated themes only.
-- ============================================================================

create table if not exists public.anonymous_questions (
  id              uuid primary key default gen_random_uuid(),
  church_id       uuid references public.churches(id) on delete set null,
  session_token   text not null,
  question        text not null,
  ai_response     text,
  theme_tag       text,
  created_at      timestamptz default now()
);

alter table public.anonymous_questions enable row level security;

create policy "Pastor reads own church anonymous questions"
  on public.anonymous_questions for select
  using (
    exists (select 1 from public.churches c where c.id = church_id and c.pastor_id = auth.uid())
  );
create policy "Anyone inserts anonymous question"
  on public.anonymous_questions for insert with check (true);

create index if not exists anonymous_questions_church_created_idx
  on public.anonymous_questions (church_id, created_at desc);
create index if not exists anonymous_questions_theme_idx
  on public.anonymous_questions (church_id, theme_tag);

-- ============================================================================
-- Column-level update grants (paired with RLS policies above)
-- Without these, the "Authenticated users bump prayer_count" policy would
-- still expose every column to UPDATE statements. Granting only the count
-- column means a malicious caller cannot rewrite body, flip is_public, or
-- reassign author_id.
-- ============================================================================

revoke update on public.prayers from authenticated;
grant  update (prayer_count) on public.prayers to authenticated;

-- ============================================================================
-- Seed walks (default library — members can browse from day one)
-- Safe to re-run; uses on-conflict-do-nothing on slug
-- ============================================================================

insert into public.walks (slug, title, subtitle, description, category, cover_emoji, length_days, sort_order)
values
  ('new-believer', 'New to faith', 'A gentle 7-day walk for someone just starting out', 'No prior knowledge assumed. We''ll walk through what Christians actually believe, how to read the Bible, what prayer is, and what comes next.', 'new-believer', '✦', 7, 10),
  ('doubt',        'Walking through doubt', 'Honest space for the questions that won''t go away', 'Faith and doubt are not opposites. This walk takes the hardest questions seriously — suffering, hiddenness, hypocrisy — without rushing to fix you.', 'doubt', '◯', 7, 20),
  ('grief',        'In the valley', 'A 14-day companion for grief', 'For loss that words don''t fix. We sit in the Psalms with you. No tidying, no timelines.', 'grief', '✧', 14, 30),
  ('anxiety',      'Anxious mind, quiet soul', 'A practical 10-day walk', 'For the worry loop. Breath, scripture, and a gentle daily practice — informed by faith and not afraid of therapy.', 'anxiety', '✿', 10, 40),
  ('prayer',       'Learning to pray', 'A 7-day starter — no formulas', 'For people who never learned how, or who feel stuck. We''ll learn from the Lord''s Prayer and the Psalms.', 'prayer', '☘', 7, 50),
  ('marriage',     'For two', 'A 7-day walk you can do together', 'A short walk for couples — engaged, newlywed, or twenty years in. Gentle, not preachy.', 'marriage', '❦', 7, 60),
  ('parenting',    'Raising children of faith', 'A 7-day walk for parents', 'How to talk about God with your kids without making it weird, forced, or fragile.', 'parenting', '♡', 7, 70),
  ('lent',         'Lent', 'A 40-day walk', 'A traditional Lenten companion — daily readings, reflection, and fasting practice.', 'seasonal', '✚', 40, 80),
  ('advent',       'Advent', 'A 28-day walk to Christmas', 'Slow, expectant. Daily readings building from prophecy to incarnation.', 'seasonal', '★', 28, 90)
on conflict (slug) do nothing;

