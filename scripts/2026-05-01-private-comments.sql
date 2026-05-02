-- ============================================================================
-- Private comments — 2026-05-01
--
-- Tightens the read model on posts + post_comments so a profile can be
-- "open to browse, closed to converse":
--
--   posts (read)
--     scope='church'  → any authed user (church-tagged posts stay browsable
--                       so a non-member can land on a church/profile and read)
--     scope='me'      → author + same-church members of the author
--     scope='group'   → unchanged (group_members)
--
--   post_comments (read + insert)
--     restricted to the church-membership boundary of the parent post:
--       scope='church' → members of post.scope_id
--       scope='me'     → members of post.author's church
--       scope='group'  → members of post.scope_id (group)
--     post author always reads/writes on their own post.
--     "Author manages own comments" preserved → edit/delete by self stays.
--
--   posts.comment_count (denormalized)
--     a trigger keeps a count column on posts, so non-members can still see
--     "12 comments — join to read" on a post they can read but not enter.
--     Without this, count(*) over post_comments would RLS-filter to 0 for
--     non-members and the badge would silently lie.
--
-- The previous read policy was "Authenticated users read me/church posts" —
-- a single fan-open. That's what we're replacing.
--
-- Wrapped in a transaction; partial failure rolls back cleanly.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. posts SELECT — split the old single policy into scope-aware policies.
--    "Author manages own posts" stays untouched; it covers the author's
--    own read path and all writes.
-- ----------------------------------------------------------------------------

drop policy if exists "Authenticated users read me/church posts" on public.posts;

-- Church-scoped posts: anyone signed in can read. The card body can be
-- discovered from a church page or a profile feed; comments are gated below.
create policy "Authenticated users read church-scope posts"
  on public.posts for select
  using (
    auth.role() = 'authenticated'
    and scope = 'church'
  );

-- Me-scoped posts: only the author + members of the author's church.
-- A profile with no church_id is therefore visible only to the author —
-- which matches the "private until you join a church" onboarding shape.
create policy "Same-church members read me-scope posts"
  on public.posts for select
  using (
    auth.role() = 'authenticated'
    and scope = 'me'
    and (
      author_id = auth.uid()
      or exists (
        select 1
        from public.profiles me
        join public.profiles them on them.id = posts.author_id
        where me.id = auth.uid()
          and me.church_id is not null
          and me.church_id = them.church_id
      )
    )
  );

-- "Group members read group posts" stays as written — it already gates by
-- group_members and is correct for scope='group'.

-- ----------------------------------------------------------------------------
-- 2. post_comments SELECT + INSERT — gate by parent-post church boundary.
--    "Author manages own comments" stays for UPDATE/DELETE by self.
-- ----------------------------------------------------------------------------

drop policy if exists "Authenticated users read comments" on public.post_comments;

create policy "Members read comments"
  on public.post_comments for select
  using (
    auth.role() = 'authenticated'
    and (
      author_id = auth.uid()
      or exists (
        select 1
        from public.posts p
        left join public.profiles pa on pa.id = p.author_id
        where p.id = post_comments.post_id
          and (
            -- post author always sees comments on their own post
            p.author_id = auth.uid()
            -- church-scoped: members of the tagged church
            or (
              p.scope = 'church'
              and exists (
                select 1 from public.profiles me
                where me.id = auth.uid() and me.church_id = p.scope_id
              )
            )
            -- me-scoped: members of the post author's church
            or (
              p.scope = 'me'
              and pa.church_id is not null
              and exists (
                select 1 from public.profiles me
                where me.id = auth.uid() and me.church_id = pa.church_id
              )
            )
            -- group-scoped: group members (existing semantics)
            or (
              p.scope = 'group'
              and exists (
                select 1 from public.group_members m
                where m.group_id = p.scope_id and m.member_id = auth.uid()
              )
            )
          )
      )
    )
  );

-- INSERT mirrors read: if you can read the comment thread, you can post in
-- it. Plus the row's author_id must be you (already enforced by the
-- "Author manages own comments" FOR ALL policy, but pinned here too so this
-- policy is self-contained if the author policy is ever narrowed).
create policy "Members write comments"
  on public.post_comments for insert
  with check (
    auth.uid() = author_id
    and exists (
      select 1
      from public.posts p
      left join public.profiles pa on pa.id = p.author_id
      where p.id = post_comments.post_id
        and (
          p.author_id = auth.uid()
          or (
            p.scope = 'church'
            and exists (
              select 1 from public.profiles me
              where me.id = auth.uid() and me.church_id = p.scope_id
            )
          )
          or (
            p.scope = 'me'
            and pa.church_id is not null
            and exists (
              select 1 from public.profiles me
              where me.id = auth.uid() and me.church_id = pa.church_id
            )
          )
          or (
            p.scope = 'group'
            and exists (
              select 1 from public.group_members m
              where m.group_id = p.scope_id and m.member_id = auth.uid()
            )
          )
        )
    )
  );

-- ----------------------------------------------------------------------------
-- 3. posts.comment_count — denormalized so the "12 comments" badge is
--    visible to non-members who can see the post body but not enter the
--    discussion. Without this, count(*) over post_comments would silently
--    return 0 for non-members and mislead the UI.
-- ----------------------------------------------------------------------------

alter table public.posts
  add column if not exists comment_count integer not null default 0;

-- Backfill existing rows once. Idempotent — re-running is a no-op.
update public.posts p
set comment_count = sub.c
from (
  select post_id, count(*)::integer as c
  from public.post_comments
  group by post_id
) sub
where sub.post_id = p.id
  and p.comment_count <> sub.c;

create or replace function public.bump_post_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update public.posts
      set comment_count = comment_count + 1
      where id = new.post_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.posts
      set comment_count = greatest(comment_count - 1, 0)
      where id = old.post_id;
    return old;
  end if;
  return null;
end $$;

drop trigger if exists trg_post_comments_count on public.post_comments;

create trigger trg_post_comments_count
  after insert or delete on public.post_comments
  for each row execute function public.bump_post_comment_count();

commit;
