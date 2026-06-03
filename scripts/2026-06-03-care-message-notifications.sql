-- ============================================================================
-- 2026-06-03 — Notifications for care messages
-- ----------------------------------------------------------------------------
-- When a care_message is inserted, notify the OTHER participant.
-- Sender → care_member gets notified (pastor/care team).
-- Care member replies → requester gets notified (member).
-- Skips self-notification (add_notification already guards this).
-- ============================================================================

create or replace function public.notify_care_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requester_id  uuid;
  v_care_member_id uuid;
  v_recipient     uuid;
  v_snippet       text;
begin
  select requester_id, care_member_id
  into v_requester_id, v_care_member_id
  from public.care_conversations
  where id = NEW.conversation_id;

  -- If the sender is the requester, notify the care member (pastor).
  -- If the sender is the care member, notify the requester (member).
  if NEW.sender_id = v_requester_id then
    v_recipient := v_care_member_id;
  else
    v_recipient := v_requester_id;
  end if;

  if v_recipient is null then return NEW; end if;

  v_snippet := left(NEW.body, 120);

  perform public.add_notification(
    v_recipient,
    NEW.sender_id,
    'care_message',
    'care_conversation',
    NEW.conversation_id,
    jsonb_build_object(
      'snippet',          v_snippet,
      'conversation_id',  NEW.conversation_id
    )
  );

  return NEW;
end;
$$;

drop trigger if exists trg_notify_care_message on public.care_messages;

create trigger trg_notify_care_message
  after insert on public.care_messages
  for each row execute function public.notify_care_message();
