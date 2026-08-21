-- Nobody was told when someone commented on a kinwove post — 2026-08-20
--
-- The 2026-07-11 fan-out already handles part of this: on a system-authored
-- post (the daily verse, the daily reflection) it notifies everyone who
-- commented earlier in the thread, since the "post author" is a bot nobody
-- reads. That works — it's why Laurinda was told when Daniel replied to her.
--
-- Two gaps remained:
--
--   1. The FIRST comment on a system post notifies nobody at all, because
--      there are no prior commenters to fan out to. Laurinda's comment on
--      10 August and again on 20 August both landed in silence. She is the
--      only person outside the family who has ever engaged, and kinwove never
--      told anyone it had happened.
--
--   2. Daniel is never notified unless he happens to already be in the thread.
--      The daily posts are the app's own content and the most likely place a
--      new person leaves their first word — that is precisely the moment worth
--      knowing about.
--
-- Fix: on a system-authored post, also notify every admin. Keyed on
-- profiles.is_admin rather than a hardcoded id, so it keeps working if the
-- account changes. The kinwove account is itself is_admin, so it is excluded
-- explicitly — notifying the bot is the behaviour this replaces.
--
-- Prior-commenter fan-out and the reply branch are unchanged.
-- Safe to run more than once.

create or replace function public.notify_post_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_author uuid;
  parent_author uuid;
  is_system boolean;
  prior record;
  admin_row record;
  snippet text;
begin
  select p.author_id, coalesce(pr.is_system_account, false)
    into post_author, is_system
  from public.posts p
  left join public.profiles pr on pr.id = p.author_id
  where p.id = new.post_id;

  snippet := left(coalesce(new.body, ''), 140);

  if is_system then
    -- Everyone already in the thread — the conversation half.
    for prior in
      select distinct author_id from public.post_comments
      where post_id = new.post_id
        and author_id is not null
        and author_id <> new.author_id
        and id <> new.id
    loop
      perform public.add_notification(
        prior.author_id, new.author_id,
        'post_comment', 'post', new.post_id,
        jsonb_build_object('snippet', snippet)
      );
    end loop;

    -- Admins, so the first comment on a daily post is never silent. Skips the
    -- commenter (an admin commenting shouldn't ping themselves), any system
    -- account, and anyone already notified above as a prior commenter.
    for admin_row in
      select pr.id from public.profiles pr
      where pr.is_admin = true
        and coalesce(pr.is_system_account, false) = false
        and pr.id <> new.author_id
        and pr.id not in (
          select distinct author_id from public.post_comments
          where post_id = new.post_id and author_id is not null and id <> new.id
        )
    loop
      perform public.add_notification(
        admin_row.id, new.author_id,
        'post_comment', 'post', new.post_id,
        jsonb_build_object('snippet', snippet)
      );
    end loop;
  else
    perform public.add_notification(
      post_author, new.author_id,
      'post_comment', 'post', new.post_id,
      jsonb_build_object('snippet', snippet)
    );
  end if;

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
