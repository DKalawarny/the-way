-- ============================================================================
-- Per-post audience picker (FB-style) — 2026-05-02
--
-- Adds posts.visibility ('public' | 'church' | 'private'). Independent of
-- `scope` (which is where the post is filed); visibility controls WHO can read.
--
--   public  = any signed-in user (post can appear in Community)
--   church  = members of the relevant church only
--             - scope='church': members of post.scope_id
--             - scope='me'    : members of post author's church_id
--   private = author only
--
-- The legacy "Authenticated users can read posts" policy was wide-open and
-- would bypass the visibility gate, so it's dropped. Scope-aware policies
-- become the only read path; "Author manages own posts" still covers the
-- author's read of their own private posts.
-- ============================================================================

begin;

alter table public.posts
  add column if not exists visibility text not null default 'public';

alter table public.posts drop constraint if exists posts_visibility_check;
alter table public.posts add  constraint posts_visibility_check
  check (visibility in ('public','church','private'));

create index if not exists posts_visibility_idx
  on public.posts (visibility);

-- Drop the wide-open legacy policy so visibility-gated policies are
-- authoritative for non-author reads. Also drop the new-name policies
-- defensively so this script is safe to re-run after a partial apply.
drop policy if exists "Authenticated users can read posts"        on public.posts;
drop policy if exists "Authenticated users read church-scope posts" on public.posts;
drop policy if exists "Same-church members read me-scope posts"    on public.posts;
drop policy if exists "Read church-scope posts by visibility"     on public.posts;
drop policy if exists "Read me-scope posts by visibility"         on public.posts;

create policy "Read church-scope posts by visibility"
  on public.posts for select
  using (
    auth.role() = 'authenticated'
    and scope = 'church'
    and (
      visibility = 'public'
      or (
        visibility = 'church'
        and exists (
          select 1 from public.profiles me
          where me.id = auth.uid() and me.church_id = posts.scope_id
        )
      )
    )
  );

create policy "Read me-scope posts by visibility"
  on public.posts for select
  using (
    auth.role() = 'authenticated'
    and scope = 'me'
    and (
      visibility = 'public'
      or (
        visibility = 'church'
        and exists (
          select 1
          from public.profiles me
          join public.profiles them on them.id = posts.author_id
          where me.id = auth.uid()
            and me.church_id is not null
            and me.church_id = them.church_id
        )
      )
    )
  );

-- "Group members read group posts" stays as written — group membership
-- already gates the read path. Group posts get the visibility column too
-- but the group-membership check is the authoritative gate.

-- ----------------------------------------------------------------------------
-- Rebuild feed_items to expose visibility so clients can filter (Community
-- shows public-only; church/profile feeds rely on RLS).
-- Postgres can't reorder view columns via CREATE OR REPLACE, so drop+create.
-- ----------------------------------------------------------------------------

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
    p.visibility,
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
    'public'::text                as visibility,
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
    'public'::text                as visibility,
    sc.created_at
  from public.sermon_content sc
  join public.sermons s on s.id = sc.sermon_id
  where s.is_published = true;

grant select on public.feed_items to authenticated, anon;

commit;
