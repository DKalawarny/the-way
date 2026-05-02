-- ============================================================================
-- Test seed for Test Chapel + Test User
-- Idempotent-ish: uses unique tags in body so re-runs don't duplicate.
-- Run once after the schema migration.
-- ============================================================================

-- Resolve Test Chapel + its pastor (Test User)
with target as (
  select c.id as church_id, c.pastor_id
  from public.churches c
  where c.name ilike 'Test Chapel%'
  limit 1
)

-- Church-scoped posts (pastor speaking AS the church) ─────────────────
insert into public.posts (author_id, scope, scope_id, kind, body, body_data, is_anonymous, created_at)
select t.pastor_id, 'church', t.church_id, 'verse',
       E'When you pass through the waters I will be with you; and through the rivers, they shall not overflow you.\n\n— for anyone wading through something hard this week.',
       jsonb_build_object('scripture_ref','Isaiah 43:2','seed','test'),
       false, now() - interval '2 days'
from target
union all
select t.pastor_id, 'church', t.church_id, 'text',
       'This Sunday we''re in Mark 4 — the storm and the sleeping Jesus. The storm doesn''t disqualify your faith. It forms it. Bring a friend.',
       jsonb_build_object('seed','test'),
       false, now() - interval '20 hours'
from target
union all
select t.pastor_id, 'church', t.church_id, 'question',
       E'What would real rest look like for you this week — not just "less busy", but rest?\n\nReply if you want. Anonymous is fine.',
       jsonb_build_object('seed','test'),
       false, now() - interval '6 hours'
from target
union all
select t.pastor_id, 'church', t.church_id, 'text',
       'Wednesday 7pm — prayer night in the chapel. Come however you are. We''ll save a seat.',
       jsonb_build_object('seed','test'),
       false, now() - interval '1 hour'
from target;

-- Pastor's personal posts (Me feed) ───────────────────────────────────
with target as (
  select c.id as church_id, c.pastor_id
  from public.churches c where c.name ilike 'Test Chapel%' limit 1
)
insert into public.posts (author_id, scope, scope_id, kind, body, body_data, is_anonymous, created_at)
select t.pastor_id, 'me', null, 'text',
       'Reading the Sermon on the Mount slowly this week. Three verses a day. Reordering things in me I didn''t know were out of order.',
       jsonb_build_object('seed','test'),
       false, now() - interval '3 days'
from target
union all
select t.pastor_id, 'me', null, 'verse',
       'Sat with this one for a while this morning. Feels like the whole gospel in eight words.',
       jsonb_build_object('scripture_ref','Psalm 46:10','seed','test'),
       false, now() - interval '5 hours'
from target
union all
select t.pastor_id, 'me', null, 'journey_milestone',
       'Three years today since I started actually walking with him instead of just talking about him. Grateful for the people who didn''t give up on me.',
       jsonb_build_object('seed','test'),
       false, now() - interval '9 hours'
from target;

-- Public prayers (surface on Me feeds via feed_items view) ────────────
with target as (
  select c.pastor_id from public.churches c where c.name ilike 'Test Chapel%' limit 1
)
insert into public.prayers (author_id, body, is_public, is_anonymous, prayer_count, created_at)
select t.pastor_id, 'For my marriage. We''re trying. Some weeks feel like progress, others like we''re back at the beginning.', true, true, 4, now() - interval '2 days' from target
union all
select t.pastor_id, 'My dad gets his diagnosis Tuesday. Pray for whatever the news is, and for my mom.', true, false, 7, now() - interval '1 day' from target
union all
select t.pastor_id, 'I don''t know how to forgive yet. I''m asking God to make me want to.', true, true, 3, now() - interval '12 hours' from target
union all
select t.pastor_id, 'For our church plant. Two new families showed up Sunday. Pray they feel seen.', true, false, 5, now() - interval '3 hours' from target;

-- Anonymous questions (power the Pastor Dashboard themes) ─────────────
insert into public.anonymous_questions (church_id, session_token, question, theme_tag, created_at)
select c.id, 'seed-anon-1', 'Why does prayer feel like I''m talking to the ceiling sometimes?', 'anxiety', now() - interval '5 days'
from public.churches c where c.name ilike 'Test Chapel%'
union all
select c.id, 'seed-anon-2', 'How do you trust God when your mind keeps spiraling at 3am?', 'anxiety', now() - interval '4 days'
from public.churches c where c.name ilike 'Test Chapel%'
union all
select c.id, 'seed-anon-3', 'Is it okay to doubt and still call myself a Christian?', 'doubt', now() - interval '3 days'
from public.churches c where c.name ilike 'Test Chapel%'
union all
select c.id, 'seed-anon-4', 'How do I know any of this is actually real and not just what I want to be true?', 'doubt', now() - interval '3 days'
from public.churches c where c.name ilike 'Test Chapel%'
union all
select c.id, 'seed-anon-5', 'Do I have to forgive someone who isn''t sorry?', 'forgiveness', now() - interval '2 days'
from public.churches c where c.name ilike 'Test Chapel%'
union all
select c.id, 'seed-anon-6', 'My wife and I haven''t been close in over a year. Is there still hope?', 'marriage', now() - interval '2 days'
from public.churches c where c.name ilike 'Test Chapel%'
union all
select c.id, 'seed-anon-7', 'Why does losing my mom still hurt this much three years later?', 'grief', now() - interval '1 day'
from public.churches c where c.name ilike 'Test Chapel%'
union all
select c.id, 'seed-anon-8', 'What''s the point of any of this if I just feel empty most days?', 'meaning', now() - interval '6 hours'
from public.churches c where c.name ilike 'Test Chapel%';

-- A few reactions + a comment so feed cards aren't empty ──────────────
with seeded_posts as (
  select p.id, p.author_id, p.kind
  from public.posts p
  where p.body_data ->> 'seed' = 'test'
)
insert into public.post_reactions (post_id, user_id, kind, created_at)
select sp.id, sp.author_id, 'amen', now()
from seeded_posts sp
where sp.kind in ('verse','text')
limit 4
on conflict do nothing;

insert into public.post_comments (post_id, author_id, body, is_anonymous, created_at)
select sp.id, sp.author_id, 'Saving this. Needed it today.', true, now() - interval '20 minutes'
from (
  select p.id, p.author_id from public.posts p
  where p.body_data ->> 'seed' = 'test' and p.kind = 'verse' and p.scope = 'church'
  limit 1
) sp;
