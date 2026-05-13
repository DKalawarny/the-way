-- ============================================================================
-- 2026-05-06 — Pastor-scheduled daily verse posting
-- ----------------------------------------------------------------------------
-- Adds a `scheduled_at` column to sermon_content so the pastor can choose
-- exactly when each daily verse appears in the congregation feed.
-- The feed_items view then gates display by scheduled_at <= NOW() — no
-- pg_cron or backend job required; Postgres evaluates NOW() on every query.
--
-- What changes:
--   1. sermon_content gets a nullable `scheduled_at timestamptz` column.
--      Only daily_verse rows use it; other kinds leave it NULL.
--   2. feed_items view is rebuilt so the daily-verse branch only surfaces rows
--      where scheduled_at IS NOT NULL AND scheduled_at <= NOW().
--      The synthetic created_at from the previous approach is replaced by the
--      actual scheduled_at value so cards sort in the feed at the right moment.
--   3. Other sermon_content kinds (group_question, going_deeper, kid_version)
--      remain excluded from the feed — they live inside SermonView only.
--
-- Run this in Supabase SQL editor.  Idempotent: safe to re-run.
-- ============================================================================

-- ── 1. Add scheduled_at to sermon_content ────────────────────────────────────
ALTER TABLE public.sermon_content
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;

-- ── 2. Rebuild feed_items ─────────────────────────────────────────────────────
-- Drop first so column order is guaranteed correct regardless of prior
-- migrations (post-visibility, personal-prayers-in-feed).
DROP VIEW IF EXISTS public.feed_items;

CREATE VIEW public.feed_items
  WITH (security_invoker = true) AS

  -- ── Native posts ─────────────────────────────────────────────────────────────
  SELECT
    p.id,
    'post'::text                   AS source,
    p.author_id,
    p.scope,
    p.scope_id,
    p.kind,
    coalesce(p.body_data, '{}'::jsonb) || jsonb_build_object('text', p.body) AS body,
    p.is_anonymous,
    p.hide_from_profile,
    p.visibility,
    p.created_at
  FROM public.posts p

  UNION ALL

  -- ── Public prayers (author's Me feed) ────────────────────────────────────────
  SELECT
    pr.id,
    'prayer'::text                 AS source,
    pr.author_id,
    'me'::text                     AS scope,
    null::uuid                     AS scope_id,
    'prayer'::text                 AS kind,
    jsonb_build_object('text', pr.body, 'prayer_count', pr.prayer_count) AS body,
    pr.is_anonymous,
    false                          AS hide_from_profile,
    'public'::text                 AS visibility,
    pr.created_at
  FROM public.prayers pr
  WHERE pr.is_public = true

  UNION ALL

  -- ── Pastor-scheduled daily verses ────────────────────────────────────────────
  --
  -- A verse appears in the feed only once scheduled_at <= NOW().
  -- group_question / going_deeper / kid_version are intentionally excluded;
  -- they are shown exclusively inside SermonView.
  --
  -- created_at = scheduled_at so the card sorts at the correct moment in
  -- the feed timeline (not at sermon creation time).
  SELECT
    sc.id,
    'sermon_item'::text            AS source,
    s.pastor_id                    AS author_id,
    'church'::text                 AS scope,
    s.church_id                    AS scope_id,
    'sermon_item'::text            AS kind,
    jsonb_build_object(
      'sermon_id',    s.id,
      'sermon_title', s.title,
      'item_kind',    sc.kind,
      'day',          sc.day,
      'text',         sc.body,
      'scripture',    sc.scripture
    )                              AS body,
    false                          AS is_anonymous,
    false                          AS hide_from_profile,
    'public'::text                 AS visibility,
    sc.scheduled_at                AS created_at
  FROM public.sermon_content sc
  JOIN public.sermons s ON s.id = sc.sermon_id
  WHERE s.is_published = true
    AND sc.kind = 'daily_verse'
    AND sc.scheduled_at IS NOT NULL
    AND sc.scheduled_at <= NOW();

GRANT SELECT ON public.feed_items TO authenticated, anon;
