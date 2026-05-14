-- ============================================================================
-- 2026-05-13 — Gate daily_verse items in the feed by scheduled_at
-- ----------------------------------------------------------------------------
-- Before this migration, ALL published sermon_content rows appeared in the
-- church feed immediately when a sermon was published. daily_verse items
-- were visible days in advance.
--
-- After: daily_verse rows only surface in feed_items once their scheduled_at
-- has passed. Items with no scheduled_at (drafts) are hidden. All other
-- kinds (going_deeper, kid_version, legacy group_question) are unaffected.
-- ============================================================================

drop view if exists public.feed_items;
create view public.feed_items
  with (security_invoker = true) as
  select
    p.id,
    'post'::text                  as source,
    p.author_id,
    p.scope,
    p.scope_id,
    p.kind,
    coalesce(p.body_data, '{}'::jsonb) || jsonb_build_object('text', p.body) as body,
    p.is_anonymous,
    p.hide_from_profile,
    p.created_at
  from public.posts p

  union all

  select
    pr.id,
    'prayer'::text                as source,
    pr.author_id,
    'me'::text                    as scope,
    null::uuid                    as scope_id,
    'prayer'::text                as kind,
    jsonb_build_object('text', pr.body, 'prayer_count', pr.prayer_count) as body,
    pr.is_anonymous,
    false                         as hide_from_profile,
    pr.created_at
  from public.prayers pr
  where pr.is_public = true

  union all

  select
    sc.id,
    'sermon_item'::text           as source,
    s.pastor_id                   as author_id,
    'church'::text                as scope,
    s.church_id                   as scope_id,
    'sermon_item'::text           as kind,
    jsonb_build_object(
      'sermon_id',   s.id,
      'sermon_title',s.title,
      'item_kind',   sc.kind,
      'day',         sc.day,
      'text',        sc.body,
      'scripture',   sc.scripture
    ) as body,
    false                         as is_anonymous,
    false                         as hide_from_profile,
    sc.created_at
  from public.sermon_content sc
  join public.sermons s on s.id = sc.sermon_id
  where s.is_published = true
    and (
      sc.kind != 'daily_verse'
      or (sc.scheduled_at is not null and sc.scheduled_at <= now())
    );

grant select on public.feed_items to authenticated, anon;
