-- ============================================================================
-- Church verification: registration-number based, manual review
-- Idempotent — safe to re-run.
-- Paste this into Supabase SQL editor.
-- ============================================================================

-- 1. New columns on churches
alter table public.churches add column if not exists registration_country text;
alter table public.churches add column if not exists registration_number  text;
alter table public.churches add column if not exists verification_status  text default 'pending'
  check (verification_status in ('pending','verified','rejected'));
alter table public.churches add column if not exists verification_tier    text
  check (verification_tier in ('registry','reference','none'));
alter table public.churches add column if not exists verified_at          timestamptz;
alter table public.churches add column if not exists verification_notes   text;

-- 2. Grandfather any churches that already exist so they stay live.
update public.churches
   set verification_status = 'verified',
       verification_tier   = coalesce(verification_tier, 'registry'),
       verified_at         = coalesce(verified_at, now())
 where verification_status is null
    or verification_status = 'pending';

-- 3. One claim per registry number per country.
create unique index if not exists churches_unique_registration
  on public.churches (registration_country, registration_number)
  where registration_number is not null;

-- 4. New columns on pastor_applications (so we capture them at apply time)
alter table public.pastor_applications add column if not exists registration_country     text;
alter table public.pastor_applications add column if not exists registration_number      text;
alter table public.pastor_applications add column if not exists pastor_role              text;
alter table public.pastor_applications add column if not exists no_registration          boolean default false;
alter table public.pastor_applications add column if not exists denominational_reference text;

-- 5. RLS — only verified+public churches show up to everyone, but pastors can always see their own.
drop policy if exists "Anyone can read public churches"           on public.churches;
drop policy if exists "Anyone can read verified public churches"  on public.churches;
drop policy if exists "Pastor reads their own church"             on public.churches;

create policy "Anyone can read verified public churches"
  on public.churches for select
  using (is_public = true and verification_status = 'verified');

create policy "Pastor reads their own church"
  on public.churches for select
  using (auth.uid() = pastor_id);
