-- Terms acceptance log — 2026-08-19
--
-- Records that a specific person affirmatively agreed to a specific version of
-- the Terms at a specific moment. Until now the app only showed passive text
-- ("by creating an account you agree…") next to an age checkbox, and kept no
-- record at all, so there was no way to show who agreed to what or when.
--
-- One row per (user, version): re-accepting a NEW version adds a row rather than
-- overwriting, so the history survives every future revision — which is the whole
-- point once the Terms change at incorporation and again at go-live.
--
-- Safe to run more than once.

create table if not exists public.terms_acceptances (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  version     text not null,
  accepted_at timestamptz not null default now(),
  ip          text,
  user_agent  text,
  unique (user_id, version)
);

create index if not exists terms_acceptances_user_idx
  on public.terms_acceptances (user_id, accepted_at desc);

alter table public.terms_acceptances enable row level security;

-- People may read their own acceptance history. Nobody writes through the client:
-- inserts happen server-side with the service role so the timestamp, IP and user
-- agent are recorded by us rather than supplied by the browser.
drop policy if exists "read own terms acceptances" on public.terms_acceptances;
create policy "read own terms acceptances"
  on public.terms_acceptances for select
  using (auth.uid() = user_id);

-- Note on deletion: rows cascade when the auth user is deleted, so the account
-- deletion flow stays a genuine deletion. That trades away proof-of-agreement for
-- departed users, which is the right way round for a privacy request.
