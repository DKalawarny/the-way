-- ============================================================================
-- 2026-05-06 — Event, Poll, and Announcement post types
-- ============================================================================

-- 1. Relax the kind check so new values are accepted.
--    (If no named constraint exists this is a no-op.)
alter table public.posts drop constraint if exists posts_kind_check;
alter table public.posts
  add constraint posts_kind_check
  check (kind in (
    'text', 'prayer', 'verse', 'question',
    'journey_milestone', 'sermon_item',
    'event', 'poll', 'announcement'
  ));

-- 2. Poll votes — one row per (post, user) so we can show live tallies
--    and prevent double-voting without a round-trip to the client.
create table if not exists public.poll_votes (
  id           uuid primary key default gen_random_uuid(),
  post_id      uuid not null references public.posts(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  option_index int  not null,
  created_at   timestamptz not null default now(),
  unique (post_id, user_id)   -- one vote per person per poll
);

alter table public.poll_votes enable row level security;

create policy "poll_votes: anyone reads"
  on public.poll_votes for select using (true);

create policy "poll_votes: authenticated insert"
  on public.poll_votes for insert
  with check (auth.uid() = user_id);

create policy "poll_votes: user deletes own"
  on public.poll_votes for delete
  using (auth.uid() = user_id);
