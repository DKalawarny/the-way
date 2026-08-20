-- Question leads — 2026-08-20
--
-- Someone lands on an /answers page from ChatGPT, asks a question, and isn't
-- ready to create an account. Every one of those people has been unreachable:
-- four strangers found kinwove that way and all four vanished. This is the
-- lighter ask that sits under the signup button — an email address, so there is
-- some way to come back to them.
--
-- tz_offset_minutes is what makes the follow-up land well. Hard faith questions
-- get asked at 11pm, and answering at 11am the next morning arrives in a
-- completely different frame of mind. Storing the offset lets the job wait until
-- roughly the same hour in THEIR day.
--
-- Safe to run more than once.

create table if not exists public.question_leads (
  id                uuid primary key default gen_random_uuid(),
  email             text not null,
  question          text not null,
  asked_at          timestamptz not null default now(),
  tz_offset_minutes integer,                  -- getTimezoneOffset(): UTC = local + this
  source            text,                     -- which answer page they came from
  follow_up_sent_at timestamptz,
  unsubscribed_at   timestamptz,
  converted_user_id uuid references auth.users(id) on delete set null,
  unique (email)                              -- one lead per address; re-asking updates it
);

-- The follow-up job scans for unsent, unsubscribed-free rows in a time window.
create index if not exists question_leads_pending_idx
  on public.question_leads (asked_at)
  where follow_up_sent_at is null and unsubscribed_at is null;

alter table public.question_leads enable row level security;

-- No client access at all. Writes come from the server with the service role,
-- and nothing in the app ever needs to read this table — leaving it without a
-- policy means RLS denies every anon/authenticated request by default.
