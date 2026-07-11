-- ============================================================================
-- 2026-07-11 — Verse-thread reply fan-out (audit Tier 3, last SQL item)
-- ----------------------------------------------------------------------------
-- Comments on the daily-verse post only notified the post author — the
-- kinwove SYSTEM account, i.e. nobody. When the post author is the system
-- account, fan the notification out to everyone who commented earlier in the
-- thread instead, so the shared verse conversation actually feels alive.
-- Run in the Supabase SQL editor. Idempotent (replaces the function in place;
-- the existing trigger keeps pointing at it).
-- ============================================================================

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
  snippet text;
begin
  select p.author_id, coalesce(pr.is_system_account, false)
    into post_author, is_system
  from public.posts p
  left join public.profiles pr on pr.id = p.author_id
  where p.id = new.post_id;

  snippet := left(coalesce(new.body, ''), 140);

  if is_system then
    -- System-authored post (daily verse): notify prior commenters instead.
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

-- Verify: select prosrc from pg_proc where proname='notify_post_comment';  -- mentions is_system_account
-- ============================================================================
