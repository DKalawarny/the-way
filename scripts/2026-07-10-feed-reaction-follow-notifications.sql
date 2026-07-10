-- ============================================================================
-- 2026-07-10 — Feed reaction + follow notifications (audit Tier 3)
-- ----------------------------------------------------------------------------
-- Two silent gaps the audit found in the habit loop:
--   • Community-feed reactions write to public.reactions, but the only reaction
--     trigger was on public.post_reactions — so "someone said Amen to my post"
--     (the most common first social touch) produced NO notification.
--   • "Started following you" had UI + push copy but NO trigger on public.follows
--     — the strongest "someone noticed me" moment in a tiny network was dropped.
--
-- In a 15-person community every lost notification is a lost session. Both are
-- pure additive triggers reusing add_notification(). Run in the Supabase SQL
-- editor. Idempotent. Bell copy (post_reaction / follow) already exists.
-- ============================================================================

-- Community-feed reaction → notify the post's author (reactor = reactions.author_id;
-- add_notification already skips self-reactions).
create or replace function public.notify_feed_reaction()
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
    post_author, new.author_id, 'post_reaction', 'post', new.post_id,
    jsonb_build_object('reaction', new.kind));
  return new;
end;
$$;

drop trigger if exists trg_notify_feed_reaction on public.reactions;
create trigger trg_notify_feed_reaction
  after insert on public.reactions
  for each row execute function public.notify_feed_reaction();

-- New follow → notify the person being followed.
create or replace function public.notify_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.add_notification(
    new.following_id, new.follower_id, 'follow', 'profile', new.follower_id, '{}'::jsonb);
  return new;
end;
$$;

drop trigger if exists trg_notify_follow on public.follows;
create trigger trg_notify_follow
  after insert on public.follows
  for each row execute function public.notify_follow();

-- Verify:
-- select tgname from pg_trigger where tgrelid in ('public.reactions'::regclass,'public.follows'::regclass);
-- ============================================================================
