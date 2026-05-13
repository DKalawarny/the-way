-- Surface public personal_prayers in the main Feed.
-- Prayer page becomes "My prayers" only; community prayers were a separate
-- tab (Prayer → Community). Now the Feed is the single social surface, and
-- public prayers bubble up as kind='prayer' cards alongside posts.
--
-- Idempotent: safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Make sure personal_prayers has the columns the Prayer UI already writes.
--    The base schema only declares id/user_id/body/is_answered/answered_at,
--    but the app has been writing these for a while via earlier prod migrations.
-- ---------------------------------------------------------------------------
alter table public.personal_prayers add column if not exists is_public     boolean default false;
alter table public.personal_prayers add column if not exists prayer_count  integer default 0;
alter table public.personal_prayers add column if not exists praise_report text;

-- ---------------------------------------------------------------------------
-- 2. Column-level update grant: anyone authenticated may bump prayer_count
--    on a public prayer (matches the pattern used on public.prayers).
--    Without this we'd have to expose every column to UPDATE.
-- ---------------------------------------------------------------------------
grant update (prayer_count) on public.personal_prayers to authenticated;

-- Allow non-author bumps on public rows. Authors keep "for all" via the
-- existing "Users manage their own personal prayers" policy.
drop policy if exists "Authenticated users bump personal prayer_count" on public.personal_prayers;
create policy "Authenticated users bump personal prayer_count"
  on public.personal_prayers for update
  using (is_public = true and auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- 3. Rebuild feed_items view with a fourth union: public personal_prayers.
--    Shape matches the existing 'prayer' source from public.prayers so the
--    client can render both with one card variant.
-- ---------------------------------------------------------------------------
create or replace view public.feed_items
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

  -- Public personal prayers — the "My prayers" entries the author chose to share.
  select
    pp.id,
    'personal_prayer'::text       as source,
    pp.user_id                    as author_id,
    'me'::text                    as scope,
    null::uuid                    as scope_id,
    'prayer'::text                as kind,
    jsonb_build_object(
      'text',          pp.body,
      'prayer_count',  pp.prayer_count,
      'is_answered',   pp.is_answered,
      'praise_report', pp.praise_report,
      'image_urls',    coalesce(pp.image_urls, '[]'::jsonb)
    ) as body,
    false                         as is_anonymous,
    false                         as hide_from_profile,
    pp.created_at
  from public.personal_prayers pp
  where pp.is_public = true

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
  where s.is_published = true;

grant select on public.feed_items to authenticated, anon;
