-- ============================================================================
-- 2026-07-10 — Fix sermon discussion notifications (audit Tier 3, church loop)
-- ----------------------------------------------------------------------------
-- The engagement flywheel's return path was broken:
--   • notify_sermon_comment returned early when sermon_id was null — but the
--     DAILY-QUESTION threads (the primary surface) insert with sermon_content_id,
--     sermon_id null. So a member answering Tuesday's question notified NO ONE.
--   • It only ever notified the pastor — never the author of a comment being
--     replied to. Replies vanished.
--
-- This rewrite: resolves the sermon/pastor from EITHER sermon_id or
-- sermon_content_id, notifies the pastor, AND notifies the parent comment's
-- author on replies. The existing trigger already points at this function
-- (create-or-replace updates it in place). Run in the Supabase SQL editor.
-- ============================================================================

create or replace function public.notify_sermon_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pastor         uuid;
  parent_author  uuid;
  v_sermon_id    uuid;
  snippet        text;
begin
  snippet := left(coalesce(new.body, ''), 140);

  -- Resolve the sermon from a direct sermon_id OR a daily-question's sermon_content_id.
  if new.sermon_id is not null then
    v_sermon_id := new.sermon_id;
  elsif new.sermon_content_id is not null then
    select sermon_id into v_sermon_id from public.sermon_content where id = new.sermon_content_id;
  end if;

  -- Notify the pastor (add_notification skips self, so the pastor's own comment is fine).
  if v_sermon_id is not null then
    select pastor_id into pastor from public.sermons where id = v_sermon_id;
    perform public.add_notification(
      pastor, new.author_id, 'sermon_comment', 'sermon', v_sermon_id,
      jsonb_build_object('snippet', snippet));
  end if;

  -- On a reply, also notify the author of the comment being replied to.
  if new.parent_id is not null then
    select author_id into parent_author from public.sermon_discussions where id = new.parent_id;
    perform public.add_notification(
      parent_author, new.author_id, 'sermon_comment', 'sermon', v_sermon_id,
      jsonb_build_object('snippet', snippet, 'reply', true));
  end if;

  return new;
end;
$$;
-- (Trigger trg_notify_sermon_comment on sermon_discussions already calls this fn.)
-- ============================================================================
