-- ============================================================================
-- Remove the seeded demo accounts before inviting real people.
--
-- ⚠️ READ THIS FIRST. A blanket "delete all demo accounts" would have taken
-- real things with it. Inventory taken 2026-08-26:
--
--   Kinwove Community Church   pastor = demo.pastor. Real members: Emilie, Daniel.
--   circle "questions"         created by demo.pastor. Contains Giorgia.
--   circle "test j30"          created by demo.pastor. Contains Emilie, Giorgia.
--   circle "Young Adults"      created by demo.member. All demo — safe to lose.
--   demo posts (5)             4 comments on them, ALL from demo accounts.
--                              No real person has commented on demo content.
--
-- So this script does two things in order: hands the church and the two circles
-- that contain family over to Daniel, then deletes the six pure-scenery accounts.
-- demo.pastor is deliberately NOT deleted here — see PART 3 at the bottom.
--
-- Run in the Supabase SQL editor. Wrapped in a transaction: if any statement
-- fails, nothing is applied.
-- ============================================================================

begin;

-- ── PART 1 — hand real things to Daniel before anything is deleted ──────────
-- Daniel:        31e2f6d0-f2a3-42ba-a0ea-646d8ad63e89
-- demo.pastor:   0d9bf172-b7a6-47dd-a6d5-bfad3ecc5372  (Michael Carter)

update public.churches
   set pastor_id = '31e2f6d0-f2a3-42ba-a0ea-646d8ad63e89'
 where pastor_id = '0d9bf172-b7a6-47dd-a6d5-bfad3ecc5372';

update public.profiles
   set is_pastor = true
 where id = '31e2f6d0-f2a3-42ba-a0ea-646d8ad63e89';

-- Give Daniel the owner row on the church he now pastors.
insert into public.church_roles (church_id, user_id, role_key, role_label, is_owner)
select c.id, '31e2f6d0-f2a3-42ba-a0ea-646d8ad63e89', 'owner', 'Pastor', true
  from public.churches c
 where c.pastor_id = '31e2f6d0-f2a3-42ba-a0ea-646d8ad63e89'
   and not exists (
     select 1 from public.church_roles r
      where r.church_id = c.id
        and r.user_id = '31e2f6d0-f2a3-42ba-a0ea-646d8ad63e89'
   );

-- The two circles with family in them survive, owned by Daniel.
update public.church_groups
   set created_by = '31e2f6d0-f2a3-42ba-a0ea-646d8ad63e89'
 where id in (
   '341a5acc-a4f7-4125-8dc3-c2150f9f7f9d',   -- "questions"  (Giorgia)
   '08231196-0ba0-47a5-a3dc-cf0516c272ed'    -- "test j30"   (Emilie, Giorgia)
 );

-- ── PART 2 — delete the six scenery accounts ────────────────────────────────
-- Peter, Hannah, Tom, Grace, Marcus, Sarah. Not demo.pastor.
-- Child rows are removed explicitly rather than trusting every foreign key to
-- cascade, so a missing ON DELETE rule can't leave orphans behind.

create temporary table _demo_ids (id uuid primary key);
insert into _demo_ids (id) values
  ('f5f6111e-7063-4613-a9a4-beeb01771cb5'),   -- demo.peter
  ('bbb69b15-1f10-402e-b0c6-414f7e44ce97'),   -- demo.hannah
  ('20ebd215-1f93-43f8-bbe5-1704e6d654bc'),   -- demo.tom
  ('84b2e894-17ea-4ed3-be45-e151fa102a4c'),   -- demo.grace
  ('946632c7-70eb-49a1-866c-be00858baa79'),   -- demo.marcus
  ('6cd40777-fa40-462a-9cb7-846047c0b3c8');   -- demo.member (Sarah)

delete from public.post_comments          where author_id    in (select id from _demo_ids);
delete from public.post_comments          where post_id      in (select id from public.posts where author_id in (select id from _demo_ids));
delete from public.sermon_discussions     where author_id    in (select id from _demo_ids);
delete from public.group_messages         where author_id    in (select id from _demo_ids);
delete from public.group_posts            where author_id    in (select id from _demo_ids);
delete from public.group_members          where member_id    in (select id from _demo_ids);
delete from public.church_groups          where created_by   in (select id from _demo_ids);
delete from public.personal_prayer_support where user_id     in (select id from _demo_ids);
delete from public.personal_prayers       where user_id      in (select id from _demo_ids);
delete from public.church_notes           where author_id    in (select id from _demo_ids);
delete from public.user_notes             where user_id      in (select id from _demo_ids);
delete from public.bible_progress         where user_id      in (select id from _demo_ids);
delete from public.bible_highlights       where user_id      in (select id from _demo_ids);
delete from public.push_subscriptions     where user_id      in (select id from _demo_ids);
delete from public.conversations          where user_id      in (select id from _demo_ids);
delete from public.qa_events              where user_id      in (select id from _demo_ids);
delete from public.ai_usage               where user_id      in (select id from _demo_ids);
delete from public.notifications          where recipient_id in (select id from _demo_ids)
                                             or actor_id     in (select id from _demo_ids);
delete from public.church_roles           where user_id      in (select id from _demo_ids);
delete from public.sermons                where pastor_id    in (select id from _demo_ids);
delete from public.posts                  where author_id    in (select id from _demo_ids);
delete from public.profiles               where id           in (select id from _demo_ids);
delete from auth.users                    where id           in (select id from _demo_ids);

commit;

-- Verify:
--   select email from auth.users where email like 'demo.%';        -- expect only demo.pastor
--   select name, pastor_id from public.churches;                   -- pastor should be Daniel
--   select name from public.church_groups;                         -- "questions" + "test j30" still there

-- ============================================================================
-- PART 3 — demo.pastor (Michael Carter). NOT run above, on purpose.
--
-- After PART 1 the church and both circles belong to Daniel, so this account no
-- longer owns anything real. Run this block on its own once you've confirmed the
-- church still looks right in the app:
--
-- begin;
-- delete from public.post_comments      where author_id    = '0d9bf172-b7a6-47dd-a6d5-bfad3ecc5372';
-- delete from public.sermon_discussions where author_id    = '0d9bf172-b7a6-47dd-a6d5-bfad3ecc5372';
-- delete from public.group_messages     where author_id    = '0d9bf172-b7a6-47dd-a6d5-bfad3ecc5372';
-- delete from public.group_posts        where author_id    = '0d9bf172-b7a6-47dd-a6d5-bfad3ecc5372';
-- delete from public.group_members      where member_id    = '0d9bf172-b7a6-47dd-a6d5-bfad3ecc5372';
-- delete from public.church_notes       where author_id    = '0d9bf172-b7a6-47dd-a6d5-bfad3ecc5372';
-- delete from public.sermons            where pastor_id    = '0d9bf172-b7a6-47dd-a6d5-bfad3ecc5372';
-- delete from public.notifications      where recipient_id = '0d9bf172-b7a6-47dd-a6d5-bfad3ecc5372'
--                                          or actor_id     = '0d9bf172-b7a6-47dd-a6d5-bfad3ecc5372';
-- delete from public.church_roles       where user_id      = '0d9bf172-b7a6-47dd-a6d5-bfad3ecc5372';
-- delete from public.posts              where author_id    = '0d9bf172-b7a6-47dd-a6d5-bfad3ecc5372';
-- delete from public.bible_progress     where user_id      = '0d9bf172-b7a6-47dd-a6d5-bfad3ecc5372';
-- delete from public.conversations      where user_id      = '0d9bf172-b7a6-47dd-a6d5-bfad3ecc5372';
-- delete from public.qa_events          where user_id      = '0d9bf172-b7a6-47dd-a6d5-bfad3ecc5372';
-- delete from public.ai_usage           where user_id      = '0d9bf172-b7a6-47dd-a6d5-bfad3ecc5372';
-- delete from public.profiles           where id           = '0d9bf172-b7a6-47dd-a6d5-bfad3ecc5372';
-- delete from auth.users                where id           = '0d9bf172-b7a6-47dd-a6d5-bfad3ecc5372';
-- commit;
-- ============================================================================
