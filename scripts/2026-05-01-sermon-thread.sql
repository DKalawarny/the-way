-- ============================================================================
-- 2026-05-01 — Sermon-level discussion thread
-- ----------------------------------------------------------------------------
-- Goal: an FB-style "post + comments" view at the bottom of every sermon, so
-- members have one obvious place to react to Sunday — separate from (and in
-- addition to) the per-question threads that already exist under
-- group_question content rows.
--
-- Approach: reuse the existing public.sermon_discussions table by adding a
-- nullable sermon_id column alongside the (now also nullable) sermon_content_id.
-- A row anchors to exactly one of the two — enforced by a CHECK constraint.
-- All RLS policies are rewritten to resolve the church via either anchor, so
-- existing per-question discussions keep working without migration of data.
--
-- Apply order: run this AFTER supabase-schema.sql is otherwise current.
-- Idempotent — safe to re-run.
-- ============================================================================

-- 1. Allow either anchor to be null (new sermon-level rows leave content null;
--    existing per-question rows leave sermon_id null).
alter table public.sermon_discussions
  alter column sermon_content_id drop not null;

alter table public.sermon_discussions
  add column if not exists sermon_id uuid
    references public.sermons(id) on delete cascade;

-- 2. Exactly one anchor must be set — never both, never neither.
alter table public.sermon_discussions
  drop constraint if exists sermon_discussions_anchor_chk;
alter table public.sermon_discussions
  add constraint sermon_discussions_anchor_chk
  check ((sermon_id is null) <> (sermon_content_id is null));

-- 3. Index for the new sermon-level lookup pattern.
create index if not exists sermon_discussions_sermon_idx
  on public.sermon_discussions (sermon_id, created_at);

-- 4. Rewrite RLS policies so they resolve the parent church via *either* anchor.
drop policy if exists "Church members read sermon discussions"   on public.sermon_discussions;
drop policy if exists "Church members write sermon discussions"  on public.sermon_discussions;
drop policy if exists "Pastor moderates sermon discussions"      on public.sermon_discussions;
drop policy if exists "Blocks restrict sermon discussion inserts" on public.sermon_discussions;

-- helper: resolve church_id from whichever anchor is set on a row
-- (inlined as a sub-select in each policy to avoid a SECURITY DEFINER function).

create policy "Church members read sermon discussions"
  on public.sermon_discussions for select
  using (
    auth.role() = 'authenticated'
    and exists (
      select 1
      from public.sermons s
      join public.profiles p on p.id = auth.uid()
      where p.church_id = s.church_id
        and s.id = coalesce(
          sermon_discussions.sermon_id,
          (select sc.sermon_id from public.sermon_content sc
            where sc.id = sermon_discussions.sermon_content_id)
        )
    )
  );

create policy "Church members write sermon discussions"
  on public.sermon_discussions for insert
  with check (
    auth.uid() = author_id
    and exists (
      select 1
      from public.sermons s
      join public.profiles p on p.id = auth.uid()
      where p.church_id = s.church_id
        and s.id = coalesce(
          sermon_discussions.sermon_id,
          (select sc.sermon_id from public.sermon_content sc
            where sc.id = sermon_discussions.sermon_content_id)
        )
    )
  );

create policy "Pastor moderates sermon discussions"
  on public.sermon_discussions for delete
  using (
    exists (
      select 1
      from public.sermons s
      where s.pastor_id = auth.uid()
        and s.id = coalesce(
          sermon_discussions.sermon_id,
          (select sc.sermon_id from public.sermon_content sc
            where sc.id = sermon_discussions.sermon_content_id)
        )
    )
  );

create policy "Blocks restrict sermon discussion inserts"
  on public.sermon_discussions as restrictive for insert
  with check (
    not public.is_blocked_from_church(
      (select s.church_id from public.sermons s
        where s.id = coalesce(
          sermon_discussions.sermon_id,
          (select sc.sermon_id from public.sermon_content sc
            where sc.id = sermon_discussions.sermon_content_id)
        )
      ),
      auth.uid()
    )
  );

-- "Author manages own sermon discussion" delete policy is unchanged — it only
-- depends on author_id, not on the anchor.
