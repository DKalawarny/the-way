-- Comments on public posts were invisible to everyone — 2026-08-20
--
-- Symptom (Daniel + his mother, both signed in): she commented on the daily
-- verse, he replied to test it, and NEITHER could see either comment. The post
-- showed "No comments yet — be the first." while the database held two.
--
-- Cause: the SELECT policy from 2026-05-01 gates entirely on `scope` and church
-- membership. For scope='me' it requires the POST AUTHOR to have a church and
-- the reader to be in it. The daily verse and daily reflection are authored by
-- the kinwove system account, whose church_id is NULL — so that branch can
-- never be satisfied and no one could read those threads.
--
-- The deeper problem is that the policy predates `posts.visibility` and never
-- learned about it. 117 of 118 posts are visibility='public' — the UI labels
-- them "👥 Anyone on kinwove" — yet the comment policy has no public branch at
-- all. Measured before this fix: 8 of the 9 comments in the database were
-- unreadable by a signed-in user, including every comment on kinwove's own
-- daily posts. People were commenting into a void, their own words vanishing
-- from their view the moment they posted.
--
-- Fix: honour visibility. If the post is public, its comment thread is public.
-- Every existing branch is kept exactly as it was, so church-, group- and
-- me-scoped privacy is unchanged; this only adds the case the policy was
-- missing. INSERT mirrors SELECT, as it did before.
--
-- Safe to run more than once.

drop policy if exists "Members read comments" on public.post_comments;

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
            -- NEW: a public post has a public thread. This is the branch whose
            -- absence hid every comment on the daily verse.
            or p.visibility = 'public'
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
            -- group-scoped: group members
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

drop policy if exists "Members write comments" on public.post_comments;

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
          or p.visibility = 'public'
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

-- comment_count is maintained by trigger and was already correct — it counts
-- rows regardless of who can read them, which is why the badge and the thread
-- disagreed rather than both showing zero.
