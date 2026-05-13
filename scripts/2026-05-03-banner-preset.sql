-- ============================================================================
-- Banner preset + position — 2026-05-03
--
-- banner_preset: one of a fixed set of gradient keys ('parchment','forest',
--   'navy','clay','plum','teal','slate','rose'). Null = default parchment.
-- banner_position: 0-100 integer for background-position-y when a custom
--   photo is uploaded. Default 50 (centered).
-- ============================================================================

alter table public.profiles
  add column if not exists banner_preset  text    default null,
  add column if not exists banner_position integer not null default 50;
