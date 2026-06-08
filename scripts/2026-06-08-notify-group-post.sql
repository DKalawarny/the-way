-- ============================================================================
-- 2026-06-08 — Notifications for group posts and replies
-- ----------------------------------------------------------------------------
-- notify_group_post  : new group_posts row  → bell for every other group member
-- notify_group_reply : new group_replies row → bell for the original post author
--
-- Uses the existing add_notification() helper (skips self-notifications).
-- Idempotent — safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Group post → notify all other group members
-- ---------------------------------------------------------------------------
create or replace function public.notify_group_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member record;
  v_snippet text;
begin
  v_snippet := left(NEW.body, 120);

  for v_member in
    select member_id from public.group_members where group_id = NEW.group_id
  loop
    perform public.add_notification(
      v_member.member_id,
      NEW.author_id,
      'group_post',
      'group_post',
      NEW.id,
      jsonb_build_object('snippet', v_snippet, 'group_id', NEW.group_id)
    );
  end loop;

  return NEW;
end;
$$;

drop trigger if exists trg_notify_group_post on public.group_posts;

create trigger trg_notify_group_post
  after insert on public.group_posts
  for each row execute function public.notify_group_post();

-- ---------------------------------------------------------------------------
-- 2. Group reply → notify the post author
-- ---------------------------------------------------------------------------
create or replace function public.notify_group_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post_author uuid;
  v_snippet     text;
begin
  select author_id into v_post_author
  from public.group_posts
  where id = NEW.post_id;

  if v_post_author is null then return NEW; end if;

  v_snippet := left(NEW.body, 120);

  perform public.add_notification(
    v_post_author,
    NEW.author_id,
    'group_reply',
    'group_post',
    NEW.post_id,
    jsonb_build_object('snippet', v_snippet)
  );

  return NEW;
end;
$$;

drop trigger if exists trg_notify_group_reply on public.group_replies;

create trigger trg_notify_group_reply
  after insert on public.group_replies
  for each row execute function public.notify_group_reply();
