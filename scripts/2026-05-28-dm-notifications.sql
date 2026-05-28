-- ============================================================================
-- 2026-05-28 — Notifications for direct messages
-- ----------------------------------------------------------------------------
-- When a dm_message is inserted, notify the other participant.
-- Uses the existing add_notification() helper (skips self-notification).
-- ============================================================================

create or replace function public.notify_dm_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient uuid;
  v_snippet   text;
begin
  -- Get the other participant (not the sender)
  select case
    when participant_ids[1] = NEW.sender_id then participant_ids[2]
    else participant_ids[1]
  end into v_recipient
  from public.dm_conversations
  where id = NEW.conversation_id;

  if v_recipient is null then return NEW; end if;

  v_snippet := left(NEW.body, 120);

  perform public.add_notification(
    v_recipient,
    NEW.sender_id,
    'dm_message',
    'dm_conversation',
    NEW.conversation_id,
    jsonb_build_object('snippet', v_snippet, 'conversation_id', NEW.conversation_id)
  );

  return NEW;
end;
$$;

drop trigger if exists trg_notify_dm_message on public.dm_messages;

create trigger trg_notify_dm_message
  after insert on public.dm_messages
  for each row execute function public.notify_dm_message();
