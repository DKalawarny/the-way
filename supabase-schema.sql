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

-- Replies on posts: removed 2026-05-01.
-- Comments now live in public.post_comments (privacy-gated). The legacy
-- replies table was dropped; see scripts/2026-05-01-drop-legacy-replies.sql.

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

-- Visitor info — see scripts/2026-04-30-church-visit-info.sql
alter table public.churches add column if not exists service_info   text;
alter table public.churches add column if not exists street_address text;

-- Featured walk — see scripts/2026-05-01-featured-walk.sql
alter table public.churches
  add column if not exists featured_walk_id uuid
    references public.walks(id) on delete set null;

-- Hide-from-profile flag — see scripts/2026-05-01-hide-from-profile.sql
alter table public.posts
  add column if not exists hide_from_profile boolean not null default false;

-- Per-post audience picker — see scripts/2026-05-02-post-visibility.sql
alter table public.posts
  add column if not exists visibility text not null default 'public';
alter table public.posts drop constraint if exists posts_visibility_check;
alter table public.posts add  constraint posts_visibility_check
  check (visibility in ('public','church','private'));
create index if not exists posts_visibility_idx on public.posts (visibility);

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
alter table public.profiles add column if not exists is_admin boolean default false;

alter table public.churches enable row level security;
alter table public.pastor_applications enable row level security;

-- Admin triage queue read policies — see scripts/2026-05-01-pastor-admin-queue.sql
-- and scripts/2026-05-01-fix-admin-rls-recursion.sql.
-- The is_admin lookup goes through a SECURITY DEFINER function so the
-- policy on profiles doesn't recurse into itself.
create or replace function public.is_current_user_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

revoke all on function public.is_current_user_admin() from public;
grant execute on function public.is_current_user_admin() to authenticated;

drop policy if exists "Admins read all pastor applications" on public.pastor_applications;
create policy "Admins read all pastor applications"
  on public.pastor_applications for select
  using (public.is_current_user_admin());

drop policy if exists "Admins read all profiles" on public.profiles;
create policy "Admins read all profiles"
  on public.profiles for select
  using (public.is_current_user_admin());

drop policy if exists "Admins read all churches" on public.churches;
create policy "Admins read all churches"
  on public.churches for select
  using (public.is_current_user_admin());

-- ----------------------------------------------------------------------------
-- Admin email notifications when a pastor application arrives —
-- see scripts/2026-05-01-pastor-application-notifications.sql for the
-- one-time setup steps (Resend signup + insert into app_settings).
-- The trigger is a no-op until the API key is configured.
-- ----------------------------------------------------------------------------
create extension if not exists pg_net with schema extensions;

create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);
alter table public.app_settings enable row level security;

create or replace function public.notify_admin_pastor_application()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  api_key      text;
  admin_email  text;
  app_url      text;
  subject      text;
  status_label text;
  cta_html     text;
  reg_line     text;
  html_body    text;
begin
  if TG_OP = 'UPDATE' then
    if new.status is not distinct from old.status then return new; end if;
    if new.status <> 'pending' then return new; end if;
  end if;

  select value into api_key     from public.app_settings where key = 'resend_api_key';
  if api_key is null or api_key = '' then return new; end if;

  select value into admin_email from public.app_settings where key = 'admin_email';
  if admin_email is null or admin_email = '' then
    admin_email := 'dkalawarny@hotmail.com';
  end if;

  select value into app_url     from public.app_settings where key = 'app_url';
  if app_url is null then app_url := ''; end if;

  if new.status = 'approved' and new.verification_method = 'auto_domain' then
    subject      := '✦ Auto-verified: ' || coalesce(new.church_name, 'unnamed');
    status_label := 'Approved instantly via domain match. The applicant is now a verified pastor.';
  else
    subject      := '🛡 New pastor application: ' || coalesce(new.church_name, 'unnamed');
    status_label := 'Pending — please review in the admin queue.';
  end if;

  if app_url <> '' then
    cta_html := '<p style="margin-top:20px;"><a href="' || app_url
             || '" style="background:#2a1a0e;color:#fdf8f0;padding:10px 18px;'
             || 'border-radius:999px;text-decoration:none;font-size:14px;">'
             || 'Open admin queue</a></p>';
  else
    cta_html := '';
  end if;

  if new.no_registration then
    reg_line := 'No registration · ' || coalesce(new.denominational_reference, '(no reference)');
  else
    reg_line := coalesce(new.registration_country, '—')
             || ' · ' || coalesce(new.registration_number, '—');
  end if;

  html_body := format(
    '<div style="font-family:-apple-system,system-ui,sans-serif;max-width:560px;margin:0 auto;color:#2a1a0e;">'
      '<h2 style="font-size:19px;margin:0 0 8px;">%s</h2>'
      '<p style="color:#666;line-height:1.55;margin:0 0 16px;">%s</p>'
      '<table style="border-collapse:collapse;width:100%%;font-size:14px;">'
        '<tr><td style="padding:6px 12px 6px 0;color:#888;width:120px;">Applicant</td><td style="padding:6px 0;">%s</td></tr>'
        '<tr><td style="padding:6px 12px 6px 0;color:#888;">Role</td><td style="padding:6px 0;">%s</td></tr>'
        '<tr><td style="padding:6px 12px 6px 0;color:#888;">Denomination</td><td style="padding:6px 0;">%s</td></tr>'
        '<tr><td style="padding:6px 12px 6px 0;color:#888;">Location</td><td style="padding:6px 0;">%s</td></tr>'
        '<tr><td style="padding:6px 12px 6px 0;color:#888;">Website</td><td style="padding:6px 0;"><a href="%s" style="color:#c4813a;">%s</a></td></tr>'
        '<tr><td style="padding:6px 12px 6px 0;color:#888;">Registration</td><td style="padding:6px 0;">%s</td></tr>'
        '<tr><td style="padding:6px 12px 6px 0;color:#888;">Email</td><td style="padding:6px 0;">%s</td></tr>'
      '</table>'
      '%s'
      '%s'
    '</div>',
    coalesce(new.church_name, 'unnamed church'),
    status_label,
    coalesce(new.full_name, '—'),
    coalesce(new.pastor_role, '—'),
    coalesce(new.denomination, '—'),
    nullif(trim(coalesce(new.city, '') || coalesce(', ' || nullif(new.country, ''), '')), ''),
    coalesce(new.website, '#'),
    coalesce(new.website, '—'),
    reg_line,
    coalesce(new.verification_email_used, '—'),
    case when coalesce(new.reason, '') <> ''
      then '<p style="margin-top:18px;font-style:italic;color:#555;line-height:1.6;border-left:3px solid #c4813a;padding-left:12px;">' || new.reason || '</p>'
      else '' end,
    cta_html
  );

  perform net.http_post(
    url     := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || api_key
    ),
    body    := jsonb_build_object(
      'from',    'kinwove <onboarding@resend.dev>',
      'to',      jsonb_build_array(admin_email),
      'subject', subject,
      'html',    html_body
    )
  );

  return new;
exception
  when others then
    raise warning 'notify_admin_pastor_application failed: %', sqlerrm;
    return new;
end;
$$;

drop trigger if exists notify_admin_on_pastor_application on public.pastor_applications;
create trigger notify_admin_on_pastor_application
  after insert or update on public.pastor_applications
  for each row
  execute function public.notify_admin_pastor_application();

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

create policy "User can update own application"
  on public.pastor_applications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

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

-- ----------------------------------------------------------------------------
-- Pastor application: Tier 1 domain-match auto-verification
-- See scripts/2026-05-01-pastor-domain-verification.sql for design notes.
-- REQUIRES: [auth.email] enable_confirmations = true (config.toml + Supabase
-- dashboard). Without confirmed emails the auto-approve path is unsafe.
-- ----------------------------------------------------------------------------
alter table public.pastor_applications
  add column if not exists verification_method text
    check (verification_method in ('auto_domain', 'magic_link', 'manual'))
    default 'manual';
alter table public.pastor_applications add column if not exists verification_email_used text;
alter table public.pastor_applications add column if not exists domain_matched boolean default false;
alter table public.pastor_applications add column if not exists auto_approved_at timestamptz;
alter table public.pastor_applications add column if not exists approved_by text;

create table if not exists public.free_email_domains (
  domain text primary key
);

insert into public.free_email_domains (domain) values
  ('gmail.com'), ('googlemail.com'),
  ('yahoo.com'), ('yahoo.co.uk'), ('yahoo.ca'), ('yahoo.com.au'), ('ymail.com'),
  ('hotmail.com'), ('hotmail.co.uk'), ('hotmail.ca'), ('hotmail.com.au'),
  ('outlook.com'), ('outlook.co.uk'), ('live.com'), ('live.ca'), ('msn.com'),
  ('icloud.com'), ('me.com'), ('mac.com'),
  ('protonmail.com'), ('proton.me'), ('pm.me'),
  ('aol.com'), ('zoho.com'), ('zohomail.com'), ('mail.com'),
  ('gmx.com'), ('gmx.net'), ('gmx.de'), ('yandex.com'), ('yandex.ru'),
  ('fastmail.com'), ('fastmail.fm'), ('tutanota.com'), ('tutanota.de'),
  ('hey.com'), ('inbox.com'), ('rocketmail.com'),
  ('mailinator.com'), ('guerrillamail.com'), ('10minutemail.com'),
  ('sharklasers.com'), ('temp-mail.org')
on conflict do nothing;

alter table public.free_email_domains enable row level security;
drop policy if exists "Anyone can read free email blocklist" on public.free_email_domains;
create policy "Anyone can read free email blocklist"
  on public.free_email_domains for select
  using (auth.role() = 'authenticated');

create or replace function public.try_auto_approve_pastor()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_email      text;
  v_email_confirmed timestamptz;
  v_email_domain    text;
  v_website_domain  text;
  v_is_free         boolean;
  v_existing_count  int;
  v_new_church_id   uuid;
begin
  if new.status is distinct from 'pending' then
    return new;
  end if;

  select email, email_confirmed_at
    into v_user_email, v_email_confirmed
    from auth.users
   where id = new.user_id;

  if v_email_confirmed is null or v_user_email is null then
    new.verification_method := 'manual';
    return new;
  end if;

  v_email_domain := lower(split_part(v_user_email, '@', 2));

  v_website_domain := lower(coalesce(new.website, ''));
  v_website_domain := regexp_replace(v_website_domain, '^https?://', '');
  v_website_domain := regexp_replace(v_website_domain, '^www\.', '');
  v_website_domain := split_part(v_website_domain, '/', 1);
  v_website_domain := split_part(v_website_domain, ':', 1);
  v_website_domain := split_part(v_website_domain, '?', 1);
  v_website_domain := trim(v_website_domain);

  if v_email_domain = '' or v_website_domain = '' or v_email_domain <> v_website_domain then
    new.verification_method := 'manual';
    return new;
  end if;

  select exists(select 1 from public.free_email_domains where domain = v_email_domain)
    into v_is_free;
  if v_is_free then
    new.verification_method := 'manual';
    return new;
  end if;

  if new.no_registration
     or new.registration_number is null
     or trim(new.registration_number) = '' then
    new.verification_method := 'manual';
    return new;
  end if;

  select count(*) into v_existing_count
    from public.churches
   where verification_status = 'verified'
     and (
       (registration_number is not null
         and lower(registration_number) = lower(new.registration_number)
         and lower(coalesce(registration_country, '')) = lower(coalesce(new.registration_country, '')))
       or (lower(name) = lower(new.church_name)
           and lower(coalesce(country, '')) = lower(coalesce(new.country, '')))
     );

  if v_existing_count > 0 then
    new.verification_method := 'manual';
    new.notes := 'Another pastor has already claimed this church. Flagged for human review.';
    return new;
  end if;

  insert into public.churches (
    name, denomination, city, country, website,
    pastor_id,
    registration_country, registration_number,
    verification_status, verification_tier, verified_at, verification_notes,
    is_public
  ) values (
    new.church_name, new.denomination, new.city, new.country, new.website,
    new.user_id,
    new.registration_country, new.registration_number,
    'verified',
    'registry',
    now(),
    'Auto-verified — pastor email domain matches church website (' || v_email_domain || ')',
    true
  )
  returning id into v_new_church_id;

  update public.profiles
     set is_pastor = true,
         church_id = v_new_church_id
   where id = new.user_id;

  new.status                  := 'approved';
  new.reviewed_at             := now();
  new.verification_method     := 'auto_domain';
  new.verification_email_used := v_user_email;
  new.domain_matched          := true;
  new.auto_approved_at        := now();
  new.approved_by             := 'system';

  return new;
end;
$$;

drop trigger if exists try_auto_approve_pastor_trigger on public.pastor_applications;
create trigger try_auto_approve_pastor_trigger
  before insert or update on public.pastor_applications
  for each row
  execute function public.try_auto_approve_pastor();

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

-- ============================================================================
-- Unified posts feed (Me page · Church page · Group)
-- We extend the existing public.posts table with new columns rather than
-- duplicating it. Old text-only posts continue to work as kind='text',
-- scope='me'. Structured extras (scripture_ref, sermon_id, etc) go in
-- body_data jsonb. The feed_items view unions posts + public prayers +
-- published sermon items into one stream.
-- ============================================================================

alter table public.posts add column if not exists scope text;
alter table public.posts add column if not exists scope_id uuid;
alter table public.posts add column if not exists kind text;
alter table public.posts add column if not exists body_data jsonb not null default '{}'::jsonb;
alter table public.posts add column if not exists is_anonymous boolean not null default false;

-- Backfill defaults for any pre-existing rows so new constraints can apply.
update public.posts set scope = 'me' where scope is null;
update public.posts set kind  = 'text' where kind is null;

-- Now lock in the constraints. Drop-and-recreate keeps this migration
-- idempotent if it has been run before with looser checks.
alter table public.posts drop constraint if exists posts_scope_check;
alter table public.posts add  constraint posts_scope_check
  check (scope in ('me','church','group'));
alter table public.posts drop constraint if exists posts_kind_check;
alter table public.posts add  constraint posts_kind_check
  check (kind in ('text','prayer','verse','question','journey_milestone'));
alter table public.posts drop constraint if exists posts_scope_id_consistency;
alter table public.posts add  constraint posts_scope_id_consistency
  check (
    (scope = 'me' and scope_id is null) or
    (scope in ('church','group') and scope_id is not null)
  );

alter table public.posts alter column scope set not null;
alter table public.posts alter column kind  set not null;

create index if not exists posts_scope_idx
  on public.posts (scope, scope_id, created_at desc);
create index if not exists posts_author_idx
  on public.posts (author_id, created_at desc);

alter table public.posts enable row level security;

-- New policies layered on the existing table. Old policies (if any) keep
-- working for the legacy community feed; these add scope-aware reads.
drop policy if exists "Author manages own posts"               on public.posts;
drop policy if exists "Authenticated users read me/church posts" on public.posts;
drop policy if exists "Group members read group posts"         on public.posts;
drop policy if exists "Pastor can post to own church"          on public.posts;

create policy "Author manages own posts"
  on public.posts for all
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

create policy "Authenticated users read me/church posts"
  on public.posts for select
  using (
    auth.role() = 'authenticated'
    and scope in ('me','church')
  );

create policy "Group members read group posts"
  on public.posts for select
  using (
    auth.role() = 'authenticated'
    and scope = 'group'
    and exists (
      select 1 from public.group_members m
      where m.group_id = scope_id and m.member_id = auth.uid()
    )
  );

create policy "Pastor can post to own church"
  on public.posts for insert
  with check (
    scope <> 'church'
    or exists (
      select 1 from public.churches c
      where c.id = scope_id and c.pastor_id = auth.uid()
    )
  );

-- ============================================================================
-- Reactions: amen / praying / heart
-- One row per (post, user, kind). A user can leave multiple kinds on one post.
-- ============================================================================

create table if not exists public.post_reactions (
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  kind       text not null check (kind in ('amen','praying','heart')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, kind)
);

create index if not exists post_reactions_post_idx
  on public.post_reactions (post_id);

alter table public.post_reactions enable row level security;

create policy "Authenticated users read reactions"
  on public.post_reactions for select
  using (auth.role() = 'authenticated');

create policy "Users manage their own reactions"
  on public.post_reactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================================
-- Comments (single-level threads to start; parent_id reserved for future)
-- ============================================================================

create table if not exists public.post_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  parent_id  uuid references public.post_comments(id) on delete cascade,
  body       text not null,
  is_anonymous boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists post_comments_post_idx
  on public.post_comments (post_id, created_at);

alter table public.post_comments enable row level security;

create policy "Authenticated users read comments"
  on public.post_comments for select
  using (auth.role() = 'authenticated');

create policy "Author manages own comments"
  on public.post_comments for all
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

-- ============================================================================
-- feed_items view — the one query feeds read.
-- Unions:
--   posts                                → as-is
--   prayers (is_public)                  → kind='prayer', scope='me' (author's profile)
--   sermon_content (published parent)    → kind='sermon_item', scope='church'
-- The view exposes a stable shape so <Feed source="me|church|group" /> works
-- without the client knowing about three different tables.
-- ============================================================================

create or replace view public.feed_items
  with (security_invoker = true) as
  -- Native posts. Body merges the text column (legacy) with body_data jsonb
  -- (new structured extras like scripture_ref, sermon_id, journey_id...).
  select
    p.id,
    'post'::text                  as source,
    p.author_id,
    p.scope,
    p.scope_id,
    p.kind,
    coalesce(p.body_data, '{}'::jsonb) || jsonb_build_object('text', p.body) as body,
    p.is_anonymous,
    p.hide_from_profile,
    p.created_at
  from public.posts p

  union all

  -- Public prayers surface on the author's Me feed.
  select
    pr.id,
    'prayer'::text                as source,
    pr.author_id,
    'me'::text                    as scope,
    null::uuid                    as scope_id,
    'prayer'::text                as kind,
    jsonb_build_object('text', pr.body, 'prayer_count', pr.prayer_count) as body,
    pr.is_anonymous,
    false                         as hide_from_profile,
    pr.created_at
  from public.prayers pr
  where pr.is_public = true

  union all

  -- Published sermon_content rows surface on the church feed.
  select
    sc.id,
    'sermon_item'::text           as source,
    s.pastor_id                   as author_id,
    'church'::text                as scope,
    s.church_id                   as scope_id,
    'sermon_item'::text           as kind,
    jsonb_build_object(
      'sermon_id',   s.id,
      'sermon_title',s.title,
      'item_kind',   sc.kind,
      'day',         sc.day,
      'text',        sc.body,
      'scripture',   sc.scripture
    ) as body,
    false                         as is_anonymous,
    false                         as hide_from_profile,
    sc.created_at
  from public.sermon_content sc
  join public.sermons s on s.id = sc.sermon_id
  where s.is_published = true
    and (
      sc.kind != 'daily_verse'
      or (sc.scheduled_at is not null and sc.scheduled_at <= now())
    );

grant select on public.feed_items to authenticated, anon;

-- ============================================================================
-- Sermon discussions
-- A row anchors to EITHER a sermon_content row (per-question thread, original
-- design) OR a sermon row directly (FB-style "post + comments" thread under
-- the whole sermon — see scripts/2026-05-01-sermon-thread.sql). A CHECK
-- constraint guarantees exactly one anchor is set.
-- Members of the church can read & write; pastor can moderate (delete any).
-- parent_id self-ref enables one level of replies.
-- ============================================================================

create table if not exists public.sermon_discussions (
  id                 uuid primary key default gen_random_uuid(),
  sermon_content_id  uuid references public.sermon_content(id) on delete cascade,
  sermon_id          uuid references public.sermons(id) on delete cascade,
  author_id          uuid not null references public.profiles(id) on delete cascade,
  parent_id          uuid references public.sermon_discussions(id) on delete cascade,
  body               text not null,
  is_anonymous       boolean not null default false,
  created_at         timestamptz not null default now()
);

-- Existing deployments: relax the original NOT NULL on sermon_content_id and
-- add the new sermon_id column. Both are no-ops on a fresh schema.
alter table public.sermon_discussions
  alter column sermon_content_id drop not null;
alter table public.sermon_discussions
  add column if not exists sermon_id uuid references public.sermons(id) on delete cascade;

-- Exactly one anchor must be set.
alter table public.sermon_discussions
  drop constraint if exists sermon_discussions_anchor_chk;
alter table public.sermon_discussions
  add constraint sermon_discussions_anchor_chk
  check ((sermon_id is null) <> (sermon_content_id is null));

create index if not exists sermon_discussions_content_idx
  on public.sermon_discussions (sermon_content_id, created_at);
create index if not exists sermon_discussions_sermon_idx
  on public.sermon_discussions (sermon_id, created_at);

alter table public.sermon_discussions enable row level security;

drop policy if exists "Church members read sermon discussions" on public.sermon_discussions;
drop policy if exists "Church members write sermon discussions" on public.sermon_discussions;
drop policy if exists "Author manages own sermon discussion"   on public.sermon_discussions;
drop policy if exists "Pastor moderates sermon discussions"    on public.sermon_discussions;

-- Each policy resolves the parent church via whichever anchor is set on the
-- row: coalesce(sermon_id, lookup-via-sermon_content_id).
create policy "Church members read sermon discussions"
  on public.sermon_discussions for select
  using (
    auth.role() = 'authenticated'
    and exists (
      select 1
      from public.sermons s
      join public.profiles p on p.id = auth.uid()
      where p.church_id = s.church_id
        and s.id = coalesce(
          sermon_discussions.sermon_id,
          (select sc.sermon_id from public.sermon_content sc
            where sc.id = sermon_discussions.sermon_content_id)
        )
    )
  );

create policy "Church members write sermon discussions"
  on public.sermon_discussions for insert
  with check (
    auth.uid() = author_id
    and exists (
      select 1
      from public.sermons s
      join public.profiles p on p.id = auth.uid()
      where p.church_id = s.church_id
        and s.id = coalesce(
          sermon_discussions.sermon_id,
          (select sc.sermon_id from public.sermon_content sc
            where sc.id = sermon_discussions.sermon_content_id)
        )
    )
  );

create policy "Author manages own sermon discussion"
  on public.sermon_discussions for delete
  using (auth.uid() = author_id);

create policy "Pastor moderates sermon discussions"
  on public.sermon_discussions for delete
  using (
    exists (
      select 1
      from public.sermons s
      where s.pastor_id = auth.uid()
        and s.id = coalesce(
          sermon_discussions.sermon_id,
          (select sc.sermon_id from public.sermon_content sc
            where sc.id = sermon_discussions.sermon_content_id)
        )
    )
  );

-- ============================================================================
-- Church invite codes + member blocking
-- One rotating code per church · auto-accept on code · pastor can remove members
-- ============================================================================

-- Friendly 8-char invite codes (e.g. "A3F9C7B2")
create or replace function public.gen_church_invite_code() returns text
language sql as $$
  select upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
$$;

alter table public.churches
  add column if not exists invite_code            text unique,
  add column if not exists invite_code_rotated_at timestamptz default now();

-- Backfill any existing churches without a code
update public.churches
   set invite_code = public.gen_church_invite_code(),
       invite_code_rotated_at = now()
 where invite_code is null;

-- Block list: pastor removes a member to prevent re-entry
create table if not exists public.church_blocks (
  church_id   uuid not null references public.churches(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  blocked_by  uuid references public.profiles(id) on delete set null,
  blocked_at  timestamptz not null default now(),
  primary key (church_id, user_id)
);

alter table public.church_blocks enable row level security;

create policy "Pastor manages own-church blocks"
  on public.church_blocks for all
  using (
    exists (select 1 from public.churches c
            where c.id = church_id and c.pastor_id = auth.uid())
  )
  with check (
    exists (select 1 from public.churches c
            where c.id = church_id and c.pastor_id = auth.uid())
  );

create policy "Users can see if they are blocked"
  on public.church_blocks for select
  using (auth.uid() = user_id);

-- Stable helper used by RLS + triggers
create or replace function public.is_blocked_from_church(p_church_id uuid, p_user_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.church_blocks
    where church_id = p_church_id and user_id = p_user_id
  )
$$;

-- Restrictive policies — these AND with the existing permissive policies,
-- so a blocked user can no longer insert into the church even if they're a
-- valid author otherwise.
create policy "Blocks restrict church post inserts"
  on public.posts as restrictive for insert
  with check (
    scope <> 'church'
    or not public.is_blocked_from_church(scope_id, auth.uid())
  );

drop policy if exists "Blocks restrict sermon discussion inserts" on public.sermon_discussions;
create policy "Blocks restrict sermon discussion inserts"
  on public.sermon_discussions as restrictive for insert
  with check (
    not public.is_blocked_from_church(
      (select s.church_id from public.sermons s
        where s.id = coalesce(
          sermon_discussions.sermon_id,
          (select sc.sermon_id from public.sermon_content sc
            where sc.id = sermon_discussions.sermon_content_id)
        )
      ),
      auth.uid()
    )
  );

-- Trigger: prevent a blocked user from setting profile.church_id back to that church
create or replace function public.guard_profile_church_join()
returns trigger language plpgsql as $$
begin
  if NEW.church_id is not null
     and (TG_OP = 'INSERT' or NEW.church_id is distinct from OLD.church_id)
     and public.is_blocked_from_church(NEW.church_id, NEW.id)
  then
    raise exception 'You can no longer rejoin this church.';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_guard_profile_church_join on public.profiles;
create trigger trg_guard_profile_church_join
  before insert or update of church_id on public.profiles
  for each row execute function public.guard_profile_church_join();

-- ============================================================================
-- Church roles (badges) — care, staff, elder, youth pastor, etc.
-- Role-as-attribute: a member can hold zero or more named roles in their
-- church. Roles render as badges everywhere their author appears
-- (Feed, Comments, Prayer, Sermon discussions, Care inbox, ...).
-- A role is granted when an invite is accepted; revoked when the pastor
-- deletes the row, the member leaves the church, or the member is blocked.
-- ============================================================================

create table if not exists public.church_roles (
  id           uuid primary key default gen_random_uuid(),
  church_id    uuid not null references public.churches(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  role_key     text not null,                          -- 'care' | 'staff' | 'elder' | 'worship' | 'youth' | freeform
  role_label   text,                                   -- optional human label override ("Worship lead")
  granted_by   uuid references public.profiles(id) on delete set null,
  granted_at   timestamptz not null default now(),
  unique (church_id, user_id, role_key)
);

create index if not exists church_roles_user_idx
  on public.church_roles (user_id);
create index if not exists church_roles_church_idx
  on public.church_roles (church_id);

alter table public.church_roles enable row level security;

drop policy if exists "Anyone in the church reads roles"   on public.church_roles;
drop policy if exists "Pastor manages roles in own church" on public.church_roles;

-- Members of the church can read every role row in that church (so badges
-- render for everyone). Outside the church: no read access.
create policy "Anyone in the church reads roles"
  on public.church_roles for select
  using (
    auth.role() = 'authenticated'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.church_id = church_roles.church_id
    )
  );

-- Pastor of the church owns all writes — invites grant, manual revoke deletes.
create policy "Pastor manages roles in own church"
  on public.church_roles for all
  using (
    exists (select 1 from public.churches c
            where c.id = church_id and c.pastor_id = auth.uid())
  )
  with check (
    exists (select 1 from public.churches c
            where c.id = church_id and c.pastor_id = auth.uid())
  );

-- ============================================================================
-- Church role invites — pastor invites a member to take on a role.
-- The member sees a banner; accept → church_roles row is created. Decline
-- or cancel → invite stays in history but no role is granted.
-- ============================================================================

create table if not exists public.church_role_invites (
  id           uuid primary key default gen_random_uuid(),
  church_id    uuid not null references public.churches(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  role_key     text not null,
  role_label   text,
  message      text,                                  -- optional pastor note shown in the banner
  status       text not null default 'pending'
                check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  invited_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  responded_at timestamptz
);

-- At most one pending invite per (church, user, role)
create unique index if not exists church_role_invites_one_pending
  on public.church_role_invites (church_id, user_id, role_key)
  where status = 'pending';

create index if not exists church_role_invites_user_idx
  on public.church_role_invites (user_id, status);
create index if not exists church_role_invites_church_idx
  on public.church_role_invites (church_id, status);

alter table public.church_role_invites enable row level security;

drop policy if exists "Pastor manages role invites in own church" on public.church_role_invites;
drop policy if exists "Invitee reads own invites"                  on public.church_role_invites;
drop policy if exists "Invitee responds to own invite"             on public.church_role_invites;

-- Pastor creates / cancels invites for their own church.
create policy "Pastor manages role invites in own church"
  on public.church_role_invites for all
  using (
    exists (select 1 from public.churches c
            where c.id = church_id and c.pastor_id = auth.uid())
  )
  with check (
    exists (select 1 from public.churches c
            where c.id = church_id and c.pastor_id = auth.uid())
  );

-- Invitee can read every invite addressed to them.
create policy "Invitee reads own invites"
  on public.church_role_invites for select
  using (auth.uid() = user_id);

-- Invitee can flip a pending invite to accepted/declined (no other field changes).
create policy "Invitee responds to own invite"
  on public.church_role_invites for update
  using (auth.uid() = user_id and status = 'pending')
  with check (auth.uid() = user_id and status in ('accepted', 'declined'));

-- When an invite flips to 'accepted', materialize a church_roles row.
-- Runs security-definer so the invitee can grant themselves the role through
-- this controlled path (without otherwise being able to write to church_roles).
create or replace function public.apply_role_invite_on_accept()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.status = 'accepted'
     and (TG_OP = 'INSERT' or OLD.status is distinct from 'accepted')
  then
    -- Defensive guard: only materialize if the invitee is currently in this church
    if not exists (
      select 1 from public.profiles p
      where p.id = NEW.user_id and p.church_id = NEW.church_id
    ) then
      raise exception 'Cannot accept role invite: not a member of this church.';
    end if;

    NEW.responded_at := coalesce(NEW.responded_at, now());

    insert into public.church_roles (
      church_id, user_id, role_key, role_label, granted_by
    ) values (
      NEW.church_id, NEW.user_id, NEW.role_key, NEW.role_label, NEW.invited_by
    )
    on conflict (church_id, user_id, role_key) do update
      set role_label = excluded.role_label,
          granted_by = excluded.granted_by,
          granted_at = now();

  elsif NEW.status in ('declined', 'cancelled')
        and (TG_OP = 'INSERT' or OLD.status is distinct from NEW.status)
  then
    NEW.responded_at := coalesce(NEW.responded_at, now());
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_apply_role_invite on public.church_role_invites;
create trigger trg_apply_role_invite
  before insert or update of status on public.church_role_invites
  for each row execute function public.apply_role_invite_on_accept();

-- When a member leaves the church (profile.church_id changes), drop their
-- roles + cancel any pending invites for that church. Roles never follow
-- a member to a new church.
create or replace function public.cleanup_roles_on_leave()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if OLD.church_id is not null
     and (NEW.church_id is null or NEW.church_id is distinct from OLD.church_id)
  then
    delete from public.church_roles
      where user_id = OLD.id and church_id = OLD.church_id;

    update public.church_role_invites
      set status = 'cancelled', responded_at = now()
      where user_id = OLD.id and church_id = OLD.church_id and status = 'pending';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_cleanup_roles_on_leave on public.profiles;
create trigger trg_cleanup_roles_on_leave
  after update of church_id on public.profiles
  for each row execute function public.cleanup_roles_on_leave();

-- When a member is blocked, also clean up their roles + pending invites.
create or replace function public.cleanup_roles_on_block()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.church_roles
    where user_id = NEW.user_id and church_id = NEW.church_id;
  update public.church_role_invites
    set status = 'cancelled', responded_at = now()
    where user_id = NEW.user_id and church_id = NEW.church_id and status = 'pending';
  return NEW;
end;
$$;

drop trigger if exists trg_cleanup_roles_on_block on public.church_blocks;
create trigger trg_cleanup_roles_on_block
  after insert on public.church_blocks
  for each row execute function public.cleanup_roles_on_block();

-- ============================================================================
-- Care role ↔ care_team_members sync.
-- The 'care' role granted through the People tab keeps care_team_members in
-- sync, so the existing care inbox / TalkToSomeone routing keeps working
-- without needing a second admin surface.
-- ============================================================================

create or replace function public.sync_care_role_to_team()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'INSERT' and NEW.role_key = 'care' then
    insert into public.care_team_members (church_id, user_id, role_label, is_active)
    values (NEW.church_id, NEW.user_id, coalesce(NEW.role_label, 'Care team'), true)
    on conflict (church_id, user_id) do update
      set is_active  = true,
          role_label = coalesce(excluded.role_label, public.care_team_members.role_label);
  elsif TG_OP = 'DELETE' and OLD.role_key = 'care' then
    update public.care_team_members
       set is_active = false
     where church_id = OLD.church_id and user_id = OLD.user_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_sync_care_role_insert on public.church_roles;
create trigger trg_sync_care_role_insert
  after insert on public.church_roles
  for each row execute function public.sync_care_role_to_team();

drop trigger if exists trg_sync_care_role_delete on public.church_roles;
create trigger trg_sync_care_role_delete
  after delete on public.church_roles
  for each row execute function public.sync_care_role_to_team();

-- One-time backfill: existing active care_team_members → church_roles
-- so badges show up immediately for current care team members.
insert into public.church_roles (church_id, user_id, role_key, role_label, granted_at)
select church_id, user_id, 'care', role_label, created_at
from public.care_team_members
where is_active = true
  and church_id is not null
  and user_id is not null
on conflict (church_id, user_id, role_key) do nothing;

-- ============================================================================
-- Schema drift reconciliation (added 2026-05-01)
--
-- supabase-schema.sql had drifted from prod — three tables existed in the
-- live database but were never reflected here. They are restated below
-- so a fresh `psql -f supabase-schema.sql` against an empty DB matches
-- production. Everything is `create table if not exists` / `drop policy
-- if exists` so re-running on a populated DB is a no-op.
--
-- See also: scripts/2026-05-01-private-comments.sql for the privacy gate.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- friend_requests — referenced by UserProfile.jsx, MePanel.jsx, Community.jsx.
-- Status flows pending → accepted | declined; either party can cancel/delete.
-- ----------------------------------------------------------------------------

create table if not exists public.friend_requests (
  id          uuid primary key default gen_random_uuid(),
  sender_id   uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  status      text default 'pending',
  created_at  timestamptz default now()
);

alter table public.friend_requests enable row level security;

drop policy if exists "send"     on public.friend_requests;
drop policy if exists "view own" on public.friend_requests;
drop policy if exists "respond"  on public.friend_requests;
drop policy if exists "cancel"   on public.friend_requests;

create policy "send"
  on public.friend_requests for insert
  with check (auth.uid() = sender_id);

create policy "view own"
  on public.friend_requests for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "respond"
  on public.friend_requests for update
  using (auth.uid() = receiver_id);

create policy "cancel"
  on public.friend_requests for delete
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- ----------------------------------------------------------------------------
-- study_sessions — AI chat persistence (host-led shared conversations).
-- `messages` is jsonb so the chat transcript shape can evolve without
-- schema migrations. SELECT is open to anyone authed because participants
-- need to load the host's session by id; mutation is host-only.
-- ----------------------------------------------------------------------------

create table if not exists public.study_sessions (
  id          text primary key,
  host_id     uuid references public.profiles(id) on delete set null,
  person_type text default 'group',
  messages    jsonb default '[]'::jsonb,
  created_at  timestamptz default now(),
  active      boolean default true
);

alter table public.study_sessions enable row level security;

drop policy if exists "Anyone can read active sessions" on public.study_sessions;
drop policy if exists "Host can insert"                 on public.study_sessions;
drop policy if exists "Host can update"                 on public.study_sessions;

create policy "Anyone can read active sessions"
  on public.study_sessions for select
  using (active = true);

create policy "Host can insert"
  on public.study_sessions for insert
  with check (auth.uid() = host_id);

create policy "Host can update"
  on public.study_sessions for update
  using (auth.uid() = host_id);

-- ----------------------------------------------------------------------------
-- waitlist — pre-launch email capture. RLS is enabled with no policies, so
-- the table is effectively closed to client roles (only the service role
-- can read or write). Inserts come from a server function or admin tool.
-- ----------------------------------------------------------------------------

create table if not exists public.waitlist (
  email      text primary key,
  source     text,
  created_at timestamptz default now()
);

alter table public.waitlist enable row level security;
-- intentionally no policies — service-role only.

-- ----------------------------------------------------------------------------
-- Drift triage status (2026-05-01):
--
--   weekly_focus, group_posts, group_replies, church_roles,
--   church_role_invites — CREATED IN PROD via
--   scripts/2026-05-01-create-missing-tables.sql. Schema file and prod now
--   agree on these. The same migration also re-applied the 2026-04-29 RLS
--   tightening (prayers SELECT public-or-own, prayers UPDATE column-level
--   grant, shared_conversations INSERT auth-required) that had silently
--   rolled back when it tried to attach a policy to weekly_focus.
--
--   posts.audience — DROPPED FROM PROD via
--   scripts/2026-05-01-drop-posts-audience.sql. Privacy is fully expressed
--   by posts.scope now; the old column was 100% 'public' and no code path
--   read or wrote it after the privacy migration.
--
--   app_settings + notify_admin_pastor_application + the trigger — APPLIED
--   TO PROD via scripts/2026-05-01-pastor-application-notifications.sql.
--   Was drafted in this schema file on 2026-05-01 but never applied, so
--   pastor application emails were silently dead. The trigger is now live
--   in prod but stays a no-op until the Resend API key is inserted —
--   see the migration's header comment for the one-time setup steps.
-- ============================================================================

