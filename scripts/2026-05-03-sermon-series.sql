-- ============================================================================
-- 2026-05-03 — Sermon series
-- ----------------------------------------------------------------------------
-- A "series" groups multiple weekly sermons under one thematic arc
-- (e.g. "Romans 1–8", "Walking with Paul", "Advent 2026"). Each sermon row
-- now carries an optional series_id; null means "standalone" (no series).
--
-- This is the data layer only — the UI lives in SermonComposer (series picker)
-- and on the public church page (series browse). See those for surface details.
--
-- Apply order: run this AFTER supabase-schema.sql is otherwise current.
-- Idempotent — safe to re-run.
-- ============================================================================

create table if not exists public.sermon_series (
  id                uuid primary key default gen_random_uuid(),
  church_id         uuid not null references public.churches(id) on delete cascade,
  pastor_id         uuid references public.profiles(id) on delete set null,
  name              text not null,
  slug              text,                                  -- url-friendly handle, unique per church (see index below)
  description       text,
  scripture_arc     text,                                  -- e.g. 'Romans 1–8'
  cover_image_url   text,
  started_on        date not null default current_date,
  ended_on          date,                                  -- null = still in progress
  is_published      boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- One series per (church, slug). Slug nullable — pastors who skip it just
-- can't deep-link by handle.
create unique index if not exists sermon_series_church_slug_unique
  on public.sermon_series (church_id, slug)
  where slug is not null;

-- Most common read pattern: "show me a church's series, newest first."
create index if not exists sermon_series_church_started_idx
  on public.sermon_series (church_id, started_on desc);

-- Auto-bump updated_at so the composer can sort by recency.
create or replace function public.sermon_series_touch_updated_at()
  returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists sermon_series_touch_updated_at on public.sermon_series;
create trigger sermon_series_touch_updated_at
  before update on public.sermon_series
  for each row execute function public.sermon_series_touch_updated_at();

-- ── Link sermons to a series ────────────────────────────────────────────────
-- series_id null  → standalone sermon (the existing default for every row).
-- series_index    → 1, 2, 3… within the series, used for "Week 3 of 8" labels
--                   and forward/back navigation. Nullable so pastors can add a
--                   sermon to a series before deciding its order.
alter table public.sermons
  add column if not exists series_id    uuid references public.sermon_series(id) on delete set null,
  add column if not exists series_index int;

create index if not exists sermons_series_idx
  on public.sermons (series_id, series_index)
  where series_id is not null;

-- ── RLS — mirror the sermons table model ────────────────────────────────────
-- Read: anyone (auth or anon) can see published series. The composer's
-- "my drafts" view will use the pastor-managed policy below to read its own
-- unpublished rows.
alter table public.sermon_series enable row level security;

drop policy if exists "Anyone reads published series"   on public.sermon_series;
drop policy if exists "Pastor manages own series"       on public.sermon_series;

create policy "Anyone reads published series"
  on public.sermon_series for select
  using (is_published = true);

create policy "Pastor manages own series"
  on public.sermon_series for all
  using (auth.uid() = pastor_id)
  with check (auth.uid() = pastor_id);
