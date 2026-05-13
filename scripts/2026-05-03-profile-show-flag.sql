-- ============================================================================
-- Profile show_flag toggle — 2026-05-03
--
-- Adds a boolean opt-in so users can choose to display their country flag
-- next to their name on posts and comments. Defaults to false — off unless
-- explicitly turned on. The flag rendered is flags[0] (the user's primary
-- country selection from FlagPicker, already in profiles.flags).
-- ============================================================================

alter table public.profiles
  add column if not exists show_flag boolean not null default false;
