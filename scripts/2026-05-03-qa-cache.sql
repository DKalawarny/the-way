-- ============================================================================
-- 2026-05-03 — Q&A cache + event log
-- ----------------------------------------------------------------------------
-- Two tables, one job each:
--
--   qa_cache   — deduped (person_type, question_normalized) → answer. Reads
--                bypass the AI when the same context-free question comes back.
--                One row per unique question; hit_count tracks how often it's
--                been served.
--
--   qa_events  — append-only log of every chat call. One row per ask, even on
--                cache hits. Used for analytics, future fine-tuning, and to
--                spot common questions we should be answering better.
--
-- All writes happen through the service role key from the API server. RLS
-- forbids client reads/writes — these tables are infrastructure, not user
-- content.
--
-- Idempotent — safe to re-run.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. qa_cache — deduped Q&A
-- ----------------------------------------------------------------------------
create table if not exists public.qa_cache (
  id                   uuid primary key default gen_random_uuid(),
  person_type          text not null,
  question_normalized  text not null,
  question_raw         text not null,
  answer               text not null,
  model_used           text,
  hit_count            integer not null default 0,
  created_at           timestamptz not null default now(),
  last_seen_at         timestamptz not null default now()
);

create unique index if not exists qa_cache_lookup_idx
  on public.qa_cache (person_type, question_normalized);

create index if not exists qa_cache_hot_idx
  on public.qa_cache (hit_count desc, last_seen_at desc);

alter table public.qa_cache enable row level security;
-- No policies → no client access. Writes go through service role only.

-- ----------------------------------------------------------------------------
-- 2. qa_events — append-only log
-- ----------------------------------------------------------------------------
create table if not exists public.qa_events (
  id              uuid primary key default gen_random_uuid(),
  person_type     text,
  question        text not null,
  user_id         uuid references public.profiles(id) on delete set null,
  was_cache_hit   boolean not null default false,
  is_first_turn   boolean not null default false,
  model_used      text,
  created_at      timestamptz not null default now()
);

create index if not exists qa_events_created_idx
  on public.qa_events (created_at desc);

create index if not exists qa_events_user_idx
  on public.qa_events (user_id, created_at desc);

create index if not exists qa_events_person_type_idx
  on public.qa_events (person_type, created_at desc);

alter table public.qa_events enable row level security;
-- No policies → no client access. Writes go through service role only.

-- ----------------------------------------------------------------------------
-- 3. RPC — atomic hit_count increment + last_seen_at touch
-- ----------------------------------------------------------------------------
create or replace function public.qa_cache_bump_hit(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.qa_cache
     set hit_count    = hit_count + 1,
         last_seen_at = now()
   where id = p_id;
$$;

commit;
