-- CORRECTED. The 12 Sep migration used:
--     revoke select (ai_memory, ...) on profiles from anon, authenticated;
-- which is a NO-OP in Postgres: you cannot revoke a column subset out of a
-- table-wide grant, and Supabase grants SELECT on the whole table to those
-- roles. Verified after running it — ai_memory was still readable by an
-- ordinary signed-in user.
--
-- The working shape is the other way round: drop the table-wide SELECT, then
-- grant back only the safe columns. Absent from the list, deliberately:
-- ai_memory, research_memory, stripe_customer_id, stripe_subscription_id.
--
-- RLS still applies on top of this; column grants decide WHICH COLUMNS, RLS
-- decides WHICH ROWS. The server is unaffected — the service key bypasses both.

revoke select on public.profiles from anon, authenticated;

grant select (
  id,
  display_name,
  age_range,
  gender,
  city,
  country,
  person_type,
  background,
  tradition,
  home_found_at,
  exploring_since,
  what_brought,
  looking_for,
  is_verified,
  created_at,
  updated_at,
  avatar_config,
  allow_follows,
  allow_friend_requests,
  tts_voice,
  church_id,
  is_pastor,
  is_premium,
  is_admin,
  avatar_url,
  banner_url,
  flags,
  preferred_language,
  show_flag,
  banner_preset,
  banner_position,
  plan,
  gift_expires_at,
  promo_redeemed_at,
  mentor_open,
  connect_open,
  last_stage,
  is_system_account,
  birthday,
  is_youth_sponsored,
  sync_conversations,
  daily_verse_opt_out,
  verse_streak,
  verse_streak_at,
  notif_prefs,
  ai_grace_granted_at
) on public.profiles to anon, authenticated;

-- Verify — as an ordinary signed-in user this must ERROR, not return a row:
--   select ai_memory from profiles limit 1;
-- and this must still work:
--   select display_name, person_type from profiles limit 1;
