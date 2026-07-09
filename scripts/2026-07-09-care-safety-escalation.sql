-- ============================================================================
-- 2026-07-09 — Care safety escalation (audit Tier 0, CRITICAL)
-- ----------------------------------------------------------------------------
-- Problem the audit found: when a care conversation is flagged for self-harm/
-- crisis, or a new "anyone available" request comes in UNCLAIMED, NO ONE was
-- notified (notify_care_message returned early when the recipient was null). The
-- detector worked; nothing downstream did.
--
-- This adds two triggers on care_conversations:
--   1. safety_flagged flips true  -> notify EVERY active care team member + the
--      pastor of that church (in-app notification; kind 'care_safety_flag').
--   2. a new UNCLAIMED request     -> notify the whole active care team so someone
--      claims it (kind 'care_new_request'; actor hidden if anonymous).
--
-- Run this whole file in the Supabase SQL editor. Idempotent (safe to re-run).
-- Client copy for the two new notification kinds is already in NotificationsBell.
-- ============================================================================

-- 1. Safety-flag escalation ---------------------------------------------------
create or replace function public.notify_care_safety_flag()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  m record;
  v_pastor uuid;
begin
  -- Only when safety_flagged transitions into true (not on every update).
  if new.safety_flagged is true and (old.safety_flagged is distinct from true) then
    for m in
      select user_id
      from public.care_team_members
      where church_id = new.church_id and is_active = true
    loop
      perform public.add_notification(
        m.user_id, null, 'care_safety_flag', 'care', new.id,
        jsonb_build_object('church_id', new.church_id));
    end loop;

    select pastor_id into v_pastor from public.churches where id = new.church_id;
    if v_pastor is not null then
      perform public.add_notification(
        v_pastor, null, 'care_safety_flag', 'care', new.id,
        jsonb_build_object('church_id', new.church_id));
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_care_safety_flag on public.care_conversations;
create trigger trg_notify_care_safety_flag
  after update on public.care_conversations
  for each row execute function public.notify_care_safety_flag();

-- 2. New unclaimed request ----------------------------------------------------
create or replace function public.notify_care_new_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  m record;
begin
  if new.care_member_id is null then
    for m in
      select user_id
      from public.care_team_members
      where church_id = new.church_id and is_active = true
    loop
      perform public.add_notification(
        m.user_id,
        case when new.is_anonymous then null else new.requester_id end,
        'care_new_request', 'care', new.id,
        jsonb_build_object('church_id', new.church_id, 'anonymous', new.is_anonymous));
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_care_new_request on public.care_conversations;
create trigger trg_notify_care_new_request
  after insert on public.care_conversations
  for each row execute function public.notify_care_new_request();

-- Verify:  select tgname from pg_trigger where tgrelid = 'public.care_conversations'::regclass;
-- ============================================================================
