-- ============================================================================
-- 2026-05-01 — Pastor application: Tier 1 domain-match auto-verification
-- ----------------------------------------------------------------------------
-- Goal: when a pastor's confirmed account email lives at the same domain as
-- the church website they're applying with, auto-approve the application
-- without manual review. Instant approval for the most common safe case.
--
-- Safety stack (in order, all must pass):
--   1. Supabase requires email confirmation before signup completes
--      (config.toml: [auth.email] enable_confirmations = true).
--   2. auth.users.email_confirmed_at must be non-null.
--   3. The email domain must EXACTLY match the website domain (case-insensitive,
--      www-stripped, no fuzzy match — graceanglicans.ca ≠ graceanglican.ca).
--   4. The email domain must NOT be a free-email provider (gmail, hotmail, etc.).
--   5. The application must include a registration_number (no_registration
--      applications go to manual review even if domain matches).
--   6. No other church may already be approved with the same registration
--      number OR the same name+country (one-pastor-per-church lock).
--
-- Anything that fails the stack falls through to manual review (status='pending',
-- verification_method='manual') — same workflow as today.
--
-- A successful auto-approval performs the full manual-script flow atomically:
--   - INSERT a verified row into public.churches
--   - UPDATE public.profiles set is_pastor=true, church_id=<new>
--   - UPDATE the application row to status='approved', auto_approved_at=now()
--
-- The manual approval path (scripts/approve-pastor-application.sql) is
-- unchanged and still used for Tier 2 / Tier 3 cases.
--
-- Apply order: run this AFTER supabase-schema.sql is otherwise current.
-- Idempotent — safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Audit columns on pastor_applications
-- ----------------------------------------------------------------------------
alter table public.pastor_applications
  add column if not exists verification_method text
    check (verification_method in ('auto_domain', 'magic_link', 'manual'))
    default 'manual';

alter table public.pastor_applications
  add column if not exists verification_email_used text;

alter table public.pastor_applications
  add column if not exists domain_matched boolean default false;

alter table public.pastor_applications
  add column if not exists auto_approved_at timestamptz;

alter table public.pastor_applications
  add column if not exists approved_by text;
  -- 'system' for auto-approval; null for manual SQL approval (existing flow).

-- ----------------------------------------------------------------------------
-- 2. Free-email blocklist
-- ----------------------------------------------------------------------------
-- Domains in this table are NEVER eligible for Tier 1 auto-approval, no matter
-- what the church website domain is. A pastor with @gmail.com falls to manual
-- review (or, eventually, Tier 2 magic-link verification).
create table if not exists public.free_email_domains (
  domain text primary key
);

insert into public.free_email_domains (domain) values
  ('gmail.com'), ('googlemail.com'),
  ('yahoo.com'), ('yahoo.co.uk'), ('yahoo.ca'), ('yahoo.com.au'), ('ymail.com'),
  ('hotmail.com'), ('hotmail.co.uk'), ('hotmail.ca'), ('hotmail.com.au'),
  ('outlook.com'), ('outlook.co.uk'), ('live.com'), ('live.ca'), ('msn.com'),
  ('icloud.com'), ('me.com'), ('mac.com'),
  ('protonmail.com'), ('proton.me'), ('pm.me'),
  ('aol.com'), ('zoho.com'), ('zohomail.com'), ('mail.com'),
  ('gmx.com'), ('gmx.net'), ('gmx.de'), ('yandex.com'), ('yandex.ru'),
  ('fastmail.com'), ('fastmail.fm'), ('tutanota.com'), ('tutanota.de'),
  ('hey.com'), ('inbox.com'), ('rocketmail.com'),
  ('mailinator.com'), ('guerrillamail.com'), ('10minutemail.com'),
  ('sharklasers.com'), ('temp-mail.org')
on conflict do nothing;

-- Anyone authenticated may read this list (so the client can show "we don't
-- accept @gmail.com for fast-track" hints in the UI). Writes are locked down.
alter table public.free_email_domains enable row level security;
drop policy if exists "Anyone can read free email blocklist" on public.free_email_domains;
create policy "Anyone can read free email blocklist"
  on public.free_email_domains for select
  using (auth.role() = 'authenticated');

-- ----------------------------------------------------------------------------
-- 3. Auto-approval trigger
-- ----------------------------------------------------------------------------
-- Fires BEFORE INSERT or UPDATE on pastor_applications. Only acts when the
-- row's status is 'pending' (the default at insert; reapply also flips back
-- to 'pending'). When status is being set to 'approved' or 'rejected'
-- directly (manual SQL flow), the trigger is a no-op.
--
-- security definer so the function can write to churches/profiles regardless
-- of the calling user's RLS context.
create or replace function public.try_auto_approve_pastor()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_email      text;
  v_email_confirmed timestamptz;
  v_email_domain    text;
  v_website_domain  text;
  v_is_free         boolean;
  v_existing_count  int;
  v_new_church_id   uuid;
begin
  -- Only run when row is pending. Manual approval/rejection bypasses entirely.
  if new.status is distinct from 'pending' then
    return new;
  end if;

  -- Must be a confirmed user. Reads from auth.users (read-only for users).
  select email, email_confirmed_at
    into v_user_email, v_email_confirmed
    from auth.users
   where id = new.user_id;

  if v_email_confirmed is null or v_user_email is null then
    new.verification_method := 'manual';
    return new;
  end if;

  -- Extract the email domain (everything after @).
  v_email_domain := lower(split_part(v_user_email, '@', 2));

  -- Normalise the website to a bare domain: strip protocol, www., port, path.
  v_website_domain := lower(coalesce(new.website, ''));
  v_website_domain := regexp_replace(v_website_domain, '^https?://', '');
  v_website_domain := regexp_replace(v_website_domain, '^www\.', '');
  v_website_domain := split_part(v_website_domain, '/', 1);
  v_website_domain := split_part(v_website_domain, ':', 1);
  v_website_domain := split_part(v_website_domain, '?', 1);
  v_website_domain := trim(v_website_domain);

  -- Both must be present and exactly equal. No fuzzy / suffix matching.
  if v_email_domain = '' or v_website_domain = '' or v_email_domain <> v_website_domain then
    new.verification_method := 'manual';
    return new;
  end if;

  -- Block free-email providers.
  select exists(select 1 from public.free_email_domains where domain = v_email_domain)
    into v_is_free;
  if v_is_free then
    new.verification_method := 'manual';
    return new;
  end if;

  -- Must have a real registration number. no_registration flow stays manual.
  if new.no_registration
     or new.registration_number is null
     or trim(new.registration_number) = '' then
    new.verification_method := 'manual';
    return new;
  end if;

  -- One-pastor-per-church lock. Block auto-approval if another verified church
  -- exists with the same registration number (any country) or the same
  -- name + country combination.
  select count(*) into v_existing_count
    from public.churches
   where verification_status = 'verified'
     and (
       (registration_number is not null
         and lower(registration_number) = lower(new.registration_number)
         and lower(coalesce(registration_country, '')) = lower(coalesce(new.registration_country, '')))
       or (lower(name) = lower(new.church_name)
           and lower(coalesce(country, '')) = lower(coalesce(new.country, '')))
     );

  if v_existing_count > 0 then
    new.verification_method := 'manual';
    new.notes := 'Another pastor has already claimed this church. Flagged for human review.';
    return new;
  end if;

  -- All checks passed. Create the church row + link the profile + flip status.
  -- The unique index churches_unique_registration is the final safety net —
  -- if it raises, the whole insert fails atomically.
  insert into public.churches (
    name, denomination, city, country, website,
    pastor_id,
    registration_country, registration_number,
    verification_status, verification_tier, verified_at, verification_notes,
    is_public
  ) values (
    new.church_name, new.denomination, new.city, new.country, new.website,
    new.user_id,
    new.registration_country, new.registration_number,
    'verified',
    'registry',
    now(),
    'Auto-verified — pastor email domain matches church website (' || v_email_domain || ')',
    true
  )
  returning id into v_new_church_id;

  update public.profiles
     set is_pastor = true,
         church_id = v_new_church_id
   where id = new.user_id;

  new.status                  := 'approved';
  new.reviewed_at             := now();
  new.verification_method     := 'auto_domain';
  new.verification_email_used := v_user_email;
  new.domain_matched          := true;
  new.auto_approved_at        := now();
  new.approved_by             := 'system';

  return new;
end;
$$;

drop trigger if exists try_auto_approve_pastor_trigger on public.pastor_applications;
create trigger try_auto_approve_pastor_trigger
  before insert or update on public.pastor_applications
  for each row
  execute function public.try_auto_approve_pastor();

-- ----------------------------------------------------------------------------
-- 4. Backfill existing rows so audit columns are sensible
-- ----------------------------------------------------------------------------
update public.pastor_applications
   set verification_method = 'manual'
 where verification_method is null;
