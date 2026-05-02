-- ============================================================================
-- Create missing prod tables — 2026-05-01
--
-- supabase-schema.sql had drifted from prod: 5 tables that the client
-- actively references were never created in production. Anything that
-- touched them silently failed:
--
--   weekly_focus       — GroupSpace.jsx (read + insert)
--   group_posts        — GroupSpace.jsx, Chat.jsx, Community.jsx (insert)
--   group_replies      — GroupSpace.jsx (read + insert)
--   church_roles       — Feed.jsx, Comments.jsx, SermonDiscussion.jsx,
--                        ChurchAdmin.jsx (role badges everywhere)
--   church_role_invites — ChurchHub.jsx, ChurchAdmin.jsx (invite flow)
--
-- The schema file's role-sync triggers (apply_role_invite_on_accept,
-- cleanup_roles_on_leave, cleanup_roles_on_block, sync_care_role_to_team)
-- couldn't be created without church_roles — so every pastor's role badges
-- and the invite acceptance flow were dead code in prod.
--
-- Bonus item: the 2026-04-29 RLS tightening migration tried to add a
-- policy to weekly_focus (table didn't exist) and rolled back the entire
-- transaction. That means prayers SELECT is still wide-open (the global
-- "Authenticated users can read public prayers" policy is in force, not
-- the per-row "public or own" policy) and shared_conversations INSERT is
-- still anonymous-allowed. This script re-applies those fixes at the end.
--
-- Wrapped in a transaction; if anything breaks, the whole thing rolls
-- back and prod stays in its current (broken-but-stable) state.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. weekly_focus / group_posts / group_replies — group discussion plumbing.
-- ----------------------------------------------------------------------------

create table if not exists public.weekly_focus (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid references public.church_groups(id) on delete cascade,
  passage     text not null,
  title       text,
  pastor_note text,
  week_of     date not null default current_date,
  created_at  timestamptz default now()
);

create table if not exists public.group_posts (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid references public.church_groups(id) on delete cascade,
  focus_id   uuid references public.weekly_focus(id) on delete set null,
  author_id  uuid references public.profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz default now()
);

create table if not exists public.group_replies (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid references public.group_posts(id) on delete cascade,
  author_id  uuid references public.profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz default now()
);

alter table public.weekly_focus  enable row level security;
alter table public.group_posts   enable row level security;
alter table public.group_replies enable row level security;

drop policy if exists "Group members can read focus"        on public.weekly_focus;
drop policy if exists "Pastor of group posts weekly focus"  on public.weekly_focus;
drop policy if exists "Group creator posts weekly focus"    on public.weekly_focus;
drop policy if exists "Group members can read posts"        on public.group_posts;
drop policy if exists "Group members can post"              on public.group_posts;
drop policy if exists "Authors can delete their posts"      on public.group_posts;
drop policy if exists "Group members can read replies"      on public.group_replies;
drop policy if exists "Group members can reply"             on public.group_replies;
drop policy if exists "Authors can delete their replies"    on public.group_replies;

create policy "Group members can read focus"
  on public.weekly_focus for select using (auth.role() = 'authenticated');
-- church_groups has `created_by` (not pastor_id); the group's creator is the
-- one who posts a weekly focus. (Renamed from "Pastor of group posts..." to
-- match the actual column.)
create policy "Group creator posts weekly focus"
  on public.weekly_focus for insert with check (
    auth.uid() = (select created_by from public.church_groups where id = group_id)
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

-- ----------------------------------------------------------------------------
-- 2. church_roles — badges (care, staff, elder, youth, ...)
--    A member holds 0..n roles in their church. Role badges render anywhere
--    the author surfaces (Feed, Comments, Sermon discussions, Care inbox).
-- ----------------------------------------------------------------------------

create table if not exists public.church_roles (
  id           uuid primary key default gen_random_uuid(),
  church_id    uuid not null references public.churches(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  role_key     text not null,
  role_label   text,
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

-- Same-church members see role badges; outside the church gets nothing.
create policy "Anyone in the church reads roles"
  on public.church_roles for select
  using (
    auth.role() = 'authenticated'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.church_id = church_roles.church_id
    )
  );

-- Pastor of the church owns all writes (grants via accepted invites,
-- manual revoke deletes).
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

-- ----------------------------------------------------------------------------
-- 3. church_role_invites — pastor → member: "want to be on the care team?"
-- ----------------------------------------------------------------------------

create table if not exists public.church_role_invites (
  id           uuid primary key default gen_random_uuid(),
  church_id    uuid not null references public.churches(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  role_key     text not null,
  role_label   text,
  message      text,
  status       text not null default 'pending'
                check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  invited_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  responded_at timestamptz
);

-- One pending invite per (church, user, role).
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

create policy "Invitee reads own invites"
  on public.church_role_invites for select
  using (auth.uid() = user_id);

create policy "Invitee responds to own invite"
  on public.church_role_invites for update
  using (auth.uid() = user_id and status = 'pending')
  with check (auth.uid() = user_id and status in ('accepted', 'declined'));

-- ----------------------------------------------------------------------------
-- 4. Trigger functions tied to the role tables.
--    apply_role_invite_on_accept  — flip 'accepted' → materialize church_roles row
--    cleanup_roles_on_leave        — profile.church_id changes → drop roles
--    cleanup_roles_on_block        — church_blocks insert → drop roles
--    sync_care_role_to_team        — keep care_team_members in sync with 'care' role
-- ----------------------------------------------------------------------------

create or replace function public.apply_role_invite_on_accept()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.status = 'accepted'
     and (TG_OP = 'INSERT' or OLD.status is distinct from 'accepted')
  then
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

-- ----------------------------------------------------------------------------
-- 5. Re-apply the 2026-04-29 RLS tightening that previously rolled back.
--    These fixes never made it to prod because that script tried to add a
--    policy to weekly_focus (which didn't exist) and the whole transaction
--    rolled back. Now that weekly_focus exists, we replay the fixes here.
--
--    a. prayers SELECT: was global to authed → now public-or-own only.
--    b. prayers UPDATE: was wide-open → revoked, count column granted only.
--    c. shared_conversations INSERT: was anonymous-allowed → auth required.
-- ----------------------------------------------------------------------------

-- a. prayers SELECT
drop policy if exists "Authenticated users can read public prayers" on public.prayers;
drop policy if exists "Authenticated users read public or own prayers" on public.prayers;
create policy "Authenticated users read public or own prayers"
  on public.prayers for select
  using (
    auth.role() = 'authenticated'
    and (is_public = true or author_id = auth.uid())
  );

-- b. prayers UPDATE — column-level grant so only prayer_count is bumpable.
revoke update on public.prayers from authenticated;
grant  update (prayer_count) on public.prayers to authenticated;

drop policy if exists "Users can update prayer count"     on public.prayers;
drop policy if exists "Authenticated users bump prayer_count" on public.prayers;
create policy "Authenticated users bump prayer_count"
  on public.prayers for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- c. shared_conversations INSERT — close the anonymous spam vector.
drop policy if exists "Anyone can create a share"            on public.shared_conversations;
drop policy if exists "Authenticated users can create a share" on public.shared_conversations;
create policy "Authenticated users can create a share"
  on public.shared_conversations for insert
  with check (auth.role() = 'authenticated');

commit;
