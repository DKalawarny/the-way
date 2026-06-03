-- Fix care message notification trigger:
-- 1. Don't reveal anonymous requester's identity (actor_id = null for anonymous senders)
-- 2. Include is_anonymous flag in notification data so the UI can display "Anonymous"

create or replace function public.notify_care_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_requester_id   uuid;
  v_care_member_id uuid;
  v_is_anonymous   boolean;
  v_recipient      uuid;
  v_actor          uuid;
begin
  select requester_id, care_member_id, coalesce(is_anonymous, false)
    into v_requester_id, v_care_member_id, v_is_anonymous
    from public.care_conversations
   where id = NEW.conversation_id;

  if NEW.sender_id = v_requester_id then
    v_recipient := v_care_member_id;
    -- Anonymous requester: don't reveal their identity in the notification
    v_actor := case when v_is_anonymous then null else NEW.sender_id end;
  else
    -- Pastor/care team replying: always show their identity
    v_recipient := v_requester_id;
    v_actor     := NEW.sender_id;
  end if;

  if v_recipient is null then return NEW; end if;

  perform public.add_notification(
    v_recipient,
    v_actor,
    'care_message',
    'care_conversation',
    NEW.conversation_id,
    jsonb_build_object(
      'snippet',         left(NEW.body, 120),
      'conversation_id', NEW.conversation_id,
      'is_anonymous',    v_is_anonymous
    )
  );

  return NEW;
end;
$$;

-- Re-create trigger (drop first in case it already exists)
drop trigger if exists trg_notify_care_message on public.care_messages;
create trigger trg_notify_care_message
  after insert on public.care_messages
  for each row execute function public.notify_care_message();
