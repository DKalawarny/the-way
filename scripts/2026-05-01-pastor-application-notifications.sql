-- ============================================================================
-- 2026-05-01 — Pastor application email notifications
-- ----------------------------------------------------------------------------
-- Goal: when a pastor application is created (or re-submitted after
-- rejection), send an email to the admin so the queue actually gets
-- checked. Without this, the admin queue is dead — no one knows when
-- to look.
--
-- How it works:
--   1. AFTER INSERT OR UPDATE trigger on pastor_applications
--   2. The trigger function reads the Resend API key from app_settings
--   3. It uses pg_net.http_post to call Resend's REST API directly
--   4. Two email variants: "auto-verified" (for domain-match approvals)
--      and "needs review" (for pending applications)
--
-- The BEFORE trigger from 2026-05-01-pastor-domain-verification.sql may
-- flip status to 'approved' before this AFTER trigger fires. We see the
-- final state, so we differentiate auto-approve from pending in the
-- email subject.
--
-- Manual SQL approval (status: pending → approved) does NOT fire an email,
-- because the admin who ran the approval already knows about it.
-- Manual rejection same.
--
-- Setup steps after applying this migration (one-time):
--   1. Sign up at https://resend.com (free tier covers 3000 emails/month).
--   2. Create an API key in the Resend dashboard.
--   3. Run this in the Supabase SQL editor:
--        insert into public.app_settings (key, value) values
--          ('resend_api_key', 're_your_key_here'),
--          ('admin_email',    'dkalawarny@hotmail.com'),
--          ('app_url',        'https://your-app-url.com')
--        on conflict (key) do update set value = excluded.value, updated_at = now();
--
-- Until step 3 runs, the trigger is a no-op (gracefully skips when the
-- API key isn't set), so this migration is harmless to apply early.
--
-- Idempotent — safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. pg_net for outbound HTTP from Postgres
-- ----------------------------------------------------------------------------
create extension if not exists pg_net with schema extensions;

-- ----------------------------------------------------------------------------
-- 2. app_settings table — locked down via RLS (no policies = no API access).
--    Only direct DB access (SQL editor / migrations) can read or write.
-- ----------------------------------------------------------------------------
create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);
alter table public.app_settings enable row level security;
-- Intentionally NO policies — this table holds secrets.

-- ----------------------------------------------------------------------------
-- 3. Notification trigger function
-- ----------------------------------------------------------------------------
create or replace function public.notify_admin_pastor_application()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  api_key      text;
  admin_email  text;
  app_url      text;
  subject      text;
  status_label text;
  cta_html     text;
  reg_line     text;
  html_body    text;
begin
  -- On UPDATE, only fire when the application is being re-submitted
  -- (status transitions INTO 'pending'). Manual approve/reject by admin
  -- does not trigger an email — the admin already knows.
  if TG_OP = 'UPDATE' then
    if new.status is not distinct from old.status then return new; end if;
    if new.status <> 'pending' then return new; end if;
  end if;

  -- Read settings; bail silently if API key isn't configured yet.
  select value into api_key     from public.app_settings where key = 'resend_api_key';
  if api_key is null or api_key = '' then return new; end if;

  select value into admin_email from public.app_settings where key = 'admin_email';
  if admin_email is null or admin_email = '' then
    admin_email := 'dkalawarny@hotmail.com';
  end if;

  select value into app_url     from public.app_settings where key = 'app_url';
  if app_url is null then app_url := ''; end if;

  -- Subject + lead-in line, differentiated by outcome
  if new.status = 'approved' and new.verification_method = 'auto_domain' then
    subject      := '✦ Auto-verified: ' || coalesce(new.church_name, 'unnamed');
    status_label := 'Approved instantly via domain match. The applicant is now a verified pastor.';
  else
    subject      := '🛡 New pastor application: ' || coalesce(new.church_name, 'unnamed');
    status_label := 'Pending — please review in the admin queue.';
  end if;

  -- Optional CTA button if app_url is configured
  if app_url <> '' then
    cta_html := '<p style="margin-top:20px;"><a href="' || app_url
             || '" style="background:#2a1a0e;color:#fdf8f0;padding:10px 18px;'
             || 'border-radius:999px;text-decoration:none;font-size:14px;">'
             || 'Open admin queue</a></p>';
  else
    cta_html := '';
  end if;

  -- Registration summary
  if new.no_registration then
    reg_line := 'No registration · ' || coalesce(new.denominational_reference, '(no reference)');
  else
    reg_line := coalesce(new.registration_country, '—')
             || ' · ' || coalesce(new.registration_number, '—');
  end if;

  -- Build the HTML body. Note: format() %s placeholders + %% for literal %.
  html_body := format(
    '<div style="font-family:-apple-system,system-ui,sans-serif;max-width:560px;margin:0 auto;color:#2a1a0e;">'
      '<h2 style="font-size:19px;margin:0 0 8px;">%s</h2>'
      '<p style="color:#666;line-height:1.55;margin:0 0 16px;">%s</p>'
      '<table style="border-collapse:collapse;width:100%%;font-size:14px;">'
        '<tr><td style="padding:6px 12px 6px 0;color:#888;width:120px;">Applicant</td><td style="padding:6px 0;">%s</td></tr>'
        '<tr><td style="padding:6px 12px 6px 0;color:#888;">Role</td><td style="padding:6px 0;">%s</td></tr>'
        '<tr><td style="padding:6px 12px 6px 0;color:#888;">Denomination</td><td style="padding:6px 0;">%s</td></tr>'
        '<tr><td style="padding:6px 12px 6px 0;color:#888;">Location</td><td style="padding:6px 0;">%s</td></tr>'
        '<tr><td style="padding:6px 12px 6px 0;color:#888;">Website</td><td style="padding:6px 0;"><a href="%s" style="color:#c4813a;">%s</a></td></tr>'
        '<tr><td style="padding:6px 12px 6px 0;color:#888;">Registration</td><td style="padding:6px 0;">%s</td></tr>'
        '<tr><td style="padding:6px 12px 6px 0;color:#888;">Email</td><td style="padding:6px 0;">%s</td></tr>'
      '</table>'
      '%s'
      '%s'
    '</div>',
    coalesce(new.church_name, 'unnamed church'),
    status_label,
    coalesce(new.full_name, '—'),
    coalesce(new.pastor_role, '—'),
    coalesce(new.denomination, '—'),
    nullif(trim(coalesce(new.city, '') || coalesce(', ' || nullif(new.country, ''), '')), '') ,
    coalesce(new.website, '#'),
    coalesce(new.website, '—'),
    reg_line,
    coalesce(new.verification_email_used, '—'),
    case when coalesce(new.reason, '') <> ''
      then '<p style="margin-top:18px;font-style:italic;color:#555;line-height:1.6;border-left:3px solid #c4813a;padding-left:12px;">' || new.reason || '</p>'
      else '' end,
    cta_html
  );

  -- Fire-and-forget HTTP POST to Resend. We don't await the response —
  -- if Resend is down or returns 4xx, the application insert still
  -- succeeds (we'd rather miss a notification than block onboarding).
  perform net.http_post(
    url     := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || api_key
    ),
    body    := jsonb_build_object(
      'from',    'kinwove <onboarding@resend.dev>',
      'to',      jsonb_build_array(admin_email),
      'subject', subject,
      'html',    html_body
    )
  );

  return new;
exception
  when others then
    -- Never block the application insert because of a notification failure.
    raise warning 'notify_admin_pastor_application failed: %', sqlerrm;
    return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 4. Trigger
-- ----------------------------------------------------------------------------
drop trigger if exists notify_admin_on_pastor_application on public.pastor_applications;
create trigger notify_admin_on_pastor_application
  after insert or update on public.pastor_applications
  for each row
  execute function public.notify_admin_pastor_application();
