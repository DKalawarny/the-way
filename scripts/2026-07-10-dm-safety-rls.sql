-- ============================================================================
-- 2026-07-10 — DM safety hardening (audit HIGH: blocks don't cover DMs;
--               youth "church-scoped" promise unenforced)
-- ----------------------------------------------------------------------------
-- Two SECURITY DEFINER helpers (blocked_users RLS hides rows from non-owners,
-- so the policy must check via definer) + rewritten insert policies:
--   • dm_conversations insert: pair must not be blocked either direction;
--     youth-sponsored accounts only pair within their own church.
--   • dm_messages insert: same rules re-checked on every send (covers blocks
--     created after the conversation existed).
-- Server-side system DMs (welcome bot) use the service role and bypass RLS.
-- Run in the Supabase SQL editor. Idempotent. RUN BY DANIEL 2026-07-10.
-- ============================================================================

create or replace function public.dm_pair_allowed(p_me uuid, p_other uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $f$
declare
  v_me_church    uuid;
  v_other_church uuid;
  v_me_youth     boolean;
  v_other_youth  boolean;
begin
  if p_other is null or p_me is null or p_me = p_other then return false; end if;

  if exists (select 1 from public.blocked_users
             where (blocker_id = p_other and blocked_id = p_me)
                or (blocker_id = p_me and blocked_id = p_other)) then
    return false;
  end if;

  select church_id, coalesce(is_youth_sponsored, false) into v_me_church, v_me_youth
    from public.profiles where id = p_me;
  select church_id, coalesce(is_youth_sponsored, false) into v_other_church, v_other_youth
    from public.profiles where id = p_other;

  if (v_me_youth or v_other_youth)
     and (v_me_church is null or v_other_church is null or v_me_church <> v_other_church) then
    return false;
  end if;

  return true;
end;
$f$;

create or replace function public.dm_send_allowed(p_conversation_id uuid, p_sender uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $g$
declare
  v_other uuid;
begin
  select (select u from unnest(participant_ids) u where u <> p_sender limit 1)
    into v_other
  from public.dm_conversations
  where id = p_conversation_id and p_sender = any(participant_ids);
  return public.dm_pair_allowed(p_sender, v_other);
end;
$g$;

drop policy if exists "dm_conv_insert" on public.dm_conversations;
create policy "dm_conv_insert" on public.dm_conversations
  for insert with check (
    auth.uid() = any(participant_ids)
    and public.dm_pair_allowed(
      auth.uid(),
      (select u from unnest(participant_ids) u where u <> auth.uid() limit 1)
    )
  );

drop policy if exists "dm_msg_insert" on public.dm_messages;
create policy "dm_msg_insert" on public.dm_messages
  for insert with check (
    sender_id = auth.uid()
    and public.dm_send_allowed(conversation_id, auth.uid())
  );

-- Verify:
-- select polname from pg_policy
-- where polrelid in ('public.dm_conversations'::regclass, 'public.dm_messages'::regclass);
-- ============================================================================
