-- ============================================================================
-- Grace messages — extra AI questions for someone who is clearly struggling.
--
-- Daniel, 2026-08-24: "in desperation messages like this is there a way that the
-- ai can realize it and when the 5 free are up say i see you are really hurting
-- right now im going to give you 10 more messages."
--
-- The plumbing already existed: ai_usage.topup is an integer and the quota gate
-- in server.js is `count >= limit + topup`, so a grant is just topup += 10.
-- What was missing is a record of who has already been granted one, so it can't
-- be farmed. One column on profiles, and one function that enforces the rule
-- atomically so two racing requests can't both grant.
--
-- Crisis messages (suicide, self-harm, abuse) do NOT go through this — they
-- bypass the quota entirely and are never counted. See src/safetyPatterns.js.
-- This is the softer tier: real distress that isn't an emergency.
--
-- Run in the Supabase SQL editor. Safe to re-run.
-- ============================================================================

alter table public.profiles
  add column if not exists ai_grace_granted_at timestamptz;

-- Returns true if a grant was made, false if they've had one inside the window.
create or replace function public.grant_ai_grace(
  p_user_id uuid,
  p_period  text,
  p_amount  int,
  p_cooldown_days int default 30
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last timestamptz;
begin
  -- Lock the row so two concurrent requests can't both pass the check.
  select ai_grace_granted_at into v_last
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    return false;
  end if;

  if v_last is not null and v_last > now() - make_interval(days => p_cooldown_days) then
    return false;
  end if;

  insert into public.ai_usage (user_id, period, count, topup)
  values (p_user_id, p_period, 0, p_amount)
  on conflict (user_id, period)
  do update set topup = public.ai_usage.topup + p_amount;

  update public.profiles
  set ai_grace_granted_at = now()
  where id = p_user_id;

  return true;
end;
$$;

-- Verify:
-- select column_name from information_schema.columns
--   where table_name = 'profiles' and column_name = 'ai_grace_granted_at';
-- select proname from pg_proc where proname = 'grant_ai_grace';
