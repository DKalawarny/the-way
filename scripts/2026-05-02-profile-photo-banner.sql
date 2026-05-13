-- ============================================================================
-- Profile photo + banner — 2026-05-02
--
-- Adds two columns to profiles so users can upload a real photo for their
-- avatar and a banner for the top of their profile page. Both URLs live in
-- the existing 'post-images' storage bucket (owner can write under their
-- own auth.uid()/* path), so no new bucket or RLS is needed.
--
-- avatar_url is read in preference to avatar_config (the DiceBear-generative
-- option). When null, avatar_config still drives the rendered avatar.
-- banner_url is null by default — profile page falls back to the existing
-- gradient banner.
-- ============================================================================

alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists banner_url text;
