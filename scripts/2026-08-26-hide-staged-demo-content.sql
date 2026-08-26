-- ============================================================================
-- Take the staged demo content off the public surfaces — WITHOUT touching the
-- demo accounts, which are still needed for testing.
--
-- The accounts existing is not the problem. What a stranger sees is. Right now
-- the public prayer wall carries five invented requests — a course of cancer
-- treatment, a mother's surgery on Thursday, a brother estranged for two years,
-- ten months unemployed, a first prayer in ten years. Anyone who prays for one
-- of those is praying for a fiction.
--
-- The public feed also carries three posts written as first-person testimony,
-- including one about typing a first question into this app at 2am. That is a
-- fabricated review of the product, sitting where a real newcomer will read it.
--
-- Both changes below are reversible one-liners, and neither deletes anything.
-- Account removal is a separate script, for the day real people are invited:
-- scripts/2026-08-26-remove-demo-accounts.sql
-- ============================================================================

begin;

-- The five staged prayers come off the public wall. They stay on the accounts.
update public.personal_prayers
   set is_public = false
 where user_id in (
   select id from auth.users where email like 'demo.%'
 );

-- The three staged first-person posts come out of the public feed.
-- 'church' keeps them visible inside Kinwove Community Church for testing.
update public.posts
   set visibility = 'church'
 where visibility = 'public'
   and author_id in (
     select id from auth.users where email like 'demo.%'
   );

-- The demo pastor's two sermons are unpublished. This was the piece I missed on
-- the first pass: sermon daily-questions reach the feed through the sermon_item
-- source, not through posts, so a signed-in newcomer with no church could still
-- see eighteen discussion prompts from a fictional pastor at a fictional church.
update public.sermons
   set is_published = false
 where pastor_id in (
   select id from auth.users where email like 'demo.%'
 );

commit;

-- Verify:
--   select count(*) from public.personal_prayers p
--     join auth.users u on u.id = p.user_id
--    where u.email like 'demo.%' and p.is_public;          -- expect 0
--   select count(*) from public.posts p
--     join auth.users u on u.id = p.author_id
--    where u.email like 'demo.%' and p.visibility = 'public';  -- expect 0

-- Verified after running, the way it actually matters: signed in as an account
-- with no church — the closest stand-in for a newcomer — the feed went from 18
-- demo rows to 0. Checking the tables alone would not have caught the sermons.
--
-- ⚠️ This costs you some test content: the staged prayers are off the wall and
-- the demo sermons are unpublished, so those surfaces look emptier while you
-- test. Everything is reversible — set is_public / is_published back to true,
-- and visibility back to 'public' — and no row was deleted.
