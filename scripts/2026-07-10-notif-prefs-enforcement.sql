-- ============================================================================
-- 2026-07-10 — Notification preferences enforcement
-- ----------------------------------------------------------------------------
-- profiles.notif_prefs (jsonb) holds per-kind mutes: {"post_reaction": false}.
-- add_notification() now skips insert when the recipient muted that kind —
-- one choke point silences the bell AND web push (the push poller only sees
-- rows that exist). Safety kinds are exempt and can never be muted.
-- The UI (MePanel → About → Account & security → Notifications) writes the
-- prefs. Run in the Supabase SQL editor. Idempotent.
-- ============================================================================

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

  -- Honor per-kind mutes — except safety alerts, which always go through.
  if p_kind not in ('care_safety_flag', 'care_new_request', 'care_message') then
    if exists (
      select 1 from public.profiles
      where id = p_recipient_id
        and coalesce((notif_prefs ->> p_kind)::boolean, true) = false
    ) then
      return;
    end if;
  end if;

  insert into public.notifications (recipient_id, actor_id, kind, target_type, target_id, data)
  values (p_recipient_id, p_actor_id, p_kind, p_target_type, p_target_id, coalesce(p_data, '{}'::jsonb));
end;
$$;

-- Verify:
-- select prosrc from pg_proc where proname = 'add_notification';  -- should mention notif_prefs
-- ============================================================================
