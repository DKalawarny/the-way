-- ============================================================================
-- Banner upload fix — 2026-05-04
--
-- Two issues addressed:
--
-- 1. The post-images bucket had a strict allowed_mime_types list that
--    rejected HEIC/HEIF (iOS native format), image/jpg (vs image/jpeg),
--    and any other image type not in the original four. Setting the list
--    to NULL means the bucket accepts any MIME type — the file-input
--    accept="image/*" on the front-end is sufficient client-side gating.
--    File size limit raised from 5 MB → 10 MB so full-res phone photos
--    don't hit the cap.
--
-- 2. Ensure the banner_url / banner_preset / banner_position columns exist
--    (in case the earlier profile-photo-banner or banner-preset migrations
--    were not yet applied to this environment).
-- ============================================================================

-- 1. Relax bucket MIME restrictions & raise size cap
update storage.buckets
set
  allowed_mime_types = null,         -- accept any content type
  file_size_limit    = 10485760      -- 10 MB
where id = 'post-images';

-- 2. Guarantee profile banner columns exist
alter table public.profiles
  add column if not exists avatar_url       text,
  add column if not exists banner_url       text,
  add column if not exists banner_preset    text    default null,
  add column if not exists banner_position  integer not null default 50;

-- 3. Force PostgREST to reload its schema cache so new columns are visible
notify pgrst, 'reload schema';
