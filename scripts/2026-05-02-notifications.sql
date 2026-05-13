-- ============================================================================
-- 2026-05-02 — In-app notifications
-- ----------------------------------------------------------------------------
-- One table; one row per discrete event. DB triggers on each source table fan
-- out into notifications so we never need to remember to do it from the JSX.
-- The bell button reads from this table; mark-as-read flips read_at.
--
-- Kinds (MVP):
--   friend_request_received   — someone sent you a request
--   friend_request_accepted   — your request was accepted
--   post_comment              — someone commented on your post
--   post_reaction             — someone reacted to your post
--   prayer_support            — someone is praying for your request
--   prayer_encouragement      — someone left a note on your prayer
--   sermon_comment            — someone commented on your sermon thread
--
-- Self-actions are skipped at the trigger (you don't notify yourself).
-- Idempotent — safe to re-run.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. Table
-- ----------------------------------------------------------------------------
create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id     uuid          references public.profiles(id) on delete set null,
  kind         text not null,
  target_type  text,
  target_id    uuid,
  data         jsonb not null default '{}'::jsonb,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists notifications_recipient_idx
  on public.notifications (recipient_id, created_at desc);

create index if not exists notifications_unread_idx
  on public.notifications (recipient_id) where read_at is null;

alter table public.notifications enable row level security;

drop policy if exists "Recipient reads own notifications" on public.notifications;
create policy "Recipient reads own notifications"
  on public.notifications for select
  using (auth.uid() = recipient_id);

-- Only mark-as-read is allowed from the client. read_at is the only column the
-- client should ever touch — column-level GRANT enforces that.
drop policy if exists "Recipient marks own notifications read" on public.notifications;
create policy "Recipient marks own notifications read"
  on public.notifications for update
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

revoke update on public.notifications from authenticated;
grant  update (read_at) on public.notifications to authenticated;

-- No INSERT policy — rows come exclusively from SECURITY DEFINER triggers.
-- No DELETE policy — keep an audit trail; cascade from profile delete handles cleanup.

-- ----------------------------------------------------------------------------
-- 2. Helper — keeps the trigger functions DRY and skips self-notifications.
-- ----------------------------------------------------------------------------
create or replace function public.add_notification(
  p_recipient_id uuid,
  p_actor_id     uuid,
  p_kind         text,
  p_target_type  text,
  p_target_id    uuid,
  p_data         jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_recipient_id is null then return; end if;
  if p_actor_id is not null and p_actor_id = p_recipient_id then return; end if;

  insert into public.notifications (recipient_id, actor_id, kind, target_type, target_id, data)
  values (p_recipient_id, p_actor_id, p_kind, p_target_type, p_target_id, coalesce(p_data, '{}'::jsonb));
end;
$$;

-- ----------------------------------------------------------------------------
-- 3. Trigger functions — one per kind
-- ----------------------------------------------------------------------------

-- 3a. friend_requests INSERT → notify the receiver
create or replace function public.notify_friend_request_received()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.add_notification(
    new.receiver_id, new.sender_id,
    'friend_request_received', 'friend_request', new.id, '{}'::jsonb
  );
  return new;
end;
$$;

-- 3b. friend_requests UPDATE to status='accepted' → notify the original sender
create or replace function public.notify_friend_request_accepted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status and new.status = 'accepted' then
    perform public.add_notification(
      new.sender_id, new.receiver_id,
      'friend_request_accepted', 'friend_request', new.id, '{}'::jsonb
    );
  end if;
  return new;
end;
$$;

-- 3c. post_comments INSERT → notify the post author (and parent comment author
--     if this is a reply, when different from post author)
create or replace function public.notify_post_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_author uuid;
  parent_author uuid;
  snippet text;
begin
  select author_id into post_author from public.posts where id = new.post_id;
  snippet := left(coalesce(new.body, ''), 140);

  perform public.add_notification(
    post_author, new.author_id,
    'post_comment', 'post', new.post_id,
    jsonb_build_object('snippet', snippet)
  );

  if new.parent_id is not null then
    select author_id into parent_author from public.post_comments where id = new.parent_id;
    if parent_author is not null and parent_author <> post_author then
      perform public.add_notification(
        parent_author, new.author_id,
        'post_comment_reply', 'post', new.post_id,
        jsonb_build_object('snippet', snippet, 'parent_comment_id', new.parent_id)
      );
    end if;
  end if;

  return new;
end;
$$;

-- 3d. post_reactions INSERT → notify the post author
create or replace function public.notify_post_reaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_author uuid;
begin
  select author_id into post_author from public.posts where id = new.post_id;
  perform public.add_notification(
    post_author, new.user_id,
    'post_reaction', 'post', new.post_id,
    jsonb_build_object('reaction', new.kind)
  );
  return new;
end;
$$;

-- 3e. personal_prayer_support INSERT → notify the prayer author
create or replace function public.notify_prayer_support()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  prayer_author uuid;
begin
  select user_id into prayer_author from public.personal_prayers where id = new.prayer_id;
  perform public.add_notification(
    prayer_author, new.user_id,
    'prayer_support', 'prayer', new.prayer_id, '{}'::jsonb
  );
  return new;
end;
$$;

-- 3f. personal_prayer_encouragements INSERT → notify the prayer author
create or replace function public.notify_prayer_encouragement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  prayer_author uuid;
  snippet text;
begin
  select user_id into prayer_author from public.personal_prayers where id = new.prayer_id;
  snippet := left(coalesce(new.body, ''), 140);
  perform public.add_notification(
    prayer_author, new.user_id,
    'prayer_encouragement', 'prayer', new.prayer_id,
    jsonb_build_object('snippet', snippet)
  );
  return new;
end;
$$;

-- 3g. sermon_discussions INSERT → notify the sermon's pastor
--     Only fires for sermon-level threads (sermon_id is not null), since
--     per-question discussions don't have a clear "owner".
create or replace function public.notify_sermon_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pastor uuid;
  snippet text;
begin
  if new.sermon_id is null then return new; end if;
  select pastor_id into pastor from public.sermons where id = new.sermon_id;
  snippet := left(coalesce(new.body, ''), 140);
  perform public.add_notification(
    pastor, new.author_id,
    'sermon_comment', 'sermon', new.sermon_id,
    jsonb_build_object('snippet', snippet)
  );
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 4. Triggers
-- ----------------------------------------------------------------------------
drop trigger if exists trg_notify_friend_request_received on public.friend_requests;
create trigger trg_notify_friend_request_received
  after insert on public.friend_requests
  for each row execute function public.notify_friend_request_received();

drop trigger if exists trg_notify_friend_request_accepted on public.friend_requests;
create trigger trg_notify_friend_request_accepted
  after update on public.friend_requests
  for each row execute function public.notify_friend_request_accepted();

drop trigger if exists trg_notify_post_comment on public.post_comments;
create trigger trg_notify_post_comment
  after insert on public.post_comments
  for each row execute function public.notify_post_comment();

drop trigger if exists trg_notify_post_reaction on public.post_reactions;
create trigger trg_notify_post_reaction
  after insert on public.post_reactions
  for each row execute function public.notify_post_reaction();

drop trigger if exists trg_notify_prayer_support on public.personal_prayer_support;
create trigger trg_notify_prayer_support
  after insert on public.personal_prayer_support
  for each row execute function public.notify_prayer_support();

drop trigger if exists trg_notify_prayer_encouragement on public.personal_prayer_encouragements;
create trigger trg_notify_prayer_encouragement
  after insert on public.personal_prayer_encouragements
  for each row execute function public.notify_prayer_encouragement();

drop trigger if exists trg_notify_sermon_comment on public.sermon_discussions;
create trigger trg_notify_sermon_comment
  after insert on public.sermon_discussions
  for each row execute function public.notify_sermon_comment();

-- ----------------------------------------------------------------------------
-- 5. Realtime — let the client subscribe to INSERTs on this table.
--    The publication exists by default in Supabase; we just add the table.
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.notifications;
    exception when duplicate_object then null;
    end;
  end if;
end $$;

commit;
