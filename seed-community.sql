-- Run this in Supabase → SQL Editor → New query
-- Creates one seed account + 25 community posts (5/day over last 5 days)

DO $$
DECLARE
  seed_id uuid := 'a1b2c3d4-e5f6-0000-0000-000000000001';
BEGIN

-- ── Auth user (required for profile FK) ──────────────────────────────────────
INSERT INTO auth.users (
  id, instance_id, aud, role,
  email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  is_super_admin
) VALUES (
  seed_id,
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'community@theway.app', '',
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}', '{}',
  false
) ON CONFLICT (id) DO NOTHING;

-- ── Profile ───────────────────────────────────────────────────────────────────
INSERT INTO public.profiles (id, display_name, person_type, created_at, updated_at)
VALUES (seed_id, 'The Community', 'curious', now(), now())
ON CONFLICT (id) DO NOTHING;

-- ── Posts ─────────────────────────────────────────────────────────────────────
INSERT INTO public.posts (author_id, body, person_type, created_at) VALUES

-- Day 5 ago
(seed_id,
 'I've been wrestling with whether prayer actually changes anything or if it's just us sorting through our own thoughts. What do you all think?',
 'curious', now() - interval '5 days' + interval '8 hours'),

(seed_id,
 'Read Psalm 22 this morning — "My God, my God, why have you forsaken me?" The rawness of it hit differently today. He's not pretending everything is fine.',
 'seeking', now() - interval '5 days' + interval '10 hours'),

(seed_id,
 'Genuinely curious: how do people reconcile the violence in the Old Testament with a God described as love? Not asking to argue — actually want to understand.',
 'skeptic', now() - interval '5 days' + interval '13 hours'),

(seed_id,
 'First time really reading the Gospels as an adult. The Jesus in there is so different from the one I grew up hearing about in church.',
 'curious', now() - interval '5 days' + interval '16 hours'),

(seed_id,
 'Something about the Sermon on the Mount feels more radical the more I sit with it. Blessed are the poor in spirit. Blessed are those who mourn. That's not comfortable.',
 'new-faith', now() - interval '5 days' + interval '19 hours'),

-- Day 4 ago
(seed_id,
 'Been attending a small church for a few months but still feel like an outsider. Is that normal? Does that feeling eventually change?',
 'seeking', now() - interval '4 days' + interval '7 hours'),

(seed_id,
 'Something about Ecclesiastes feels deeply honest in a way other books don't. "Vanity of vanities" — he's not pretending. That kind of honesty in scripture surprises me.',
 'curious', now() - interval '4 days' + interval '11 hours'),

(seed_id,
 'The idea of grace keeps stopping me. Not earning it. Not deserving it. Just receiving it. That's honestly harder to accept than I expected.',
 'new-faith', now() - interval '4 days' + interval '14 hours'),

(seed_id,
 'John 3:16 is everywhere. On signs, in tattoos, on stadium bleachers. I wonder how many people have actually sat with what it claims.',
 'skeptic', now() - interval '4 days' + interval '17 hours'),

(seed_id,
 'Reading about early church history and it's messier than I expected — the disagreements, the councils, the politics. Somehow that makes it feel more real, not less.',
 'curious', now() - interval '4 days' + interval '20 hours'),

-- Day 3 ago
(seed_id,
 'I came here skeptical and I'm still skeptical. But I keep coming back. I'm not sure what that means, but it means something.',
 'skeptic', now() - interval '3 days' + interval '8 hours'),

(seed_id,
 'The resurrection is either the most important claim in human history or an extraordinary lie. There's no comfortable middle ground on it. That's what I keep coming back to.',
 'skeptic', now() - interval '3 days' + interval '11 hours'),

(seed_id,
 'What changed for you? If you went from not believing to believing — not just culturally but actually — what shifted? I'm asking sincerely.',
 'seeking', now() - interval '3 days' + interval '14 hours'),

(seed_id,
 'Proverbs 3:5 — "Trust in the Lord with all your heart and lean not on your own understanding." That's genuinely terrifying to try and live out.',
 'new-faith', now() - interval '3 days' + interval '17 hours'),

(seed_id,
 'Romans 8:28 gets quoted to explain away too much pain. But sitting with the whole chapter — it's something else entirely. Worth reading slowly.',
 'curious', now() - interval '3 days' + interval '20 hours'),

-- Day 2 ago
(seed_id,
 'The Lord's Prayer is so short. I kept waiting for more and then realized maybe that's the point. Maybe simplicity is the instruction.',
 'new-faith', now() - interval '2 days' + interval '9 hours'),

(seed_id,
 'Been thinking about Job. He didn't get answers. He got a question back. And somehow — in the text anyway — that was enough. I'm still sitting with that.',
 'curious', now() - interval '2 days' + interval '12 hours'),

(seed_id,
 'Luke 15 — three parables in a row about losing things and finding them. The father running. That image keeps coming back to me.',
 'seeking', now() - interval '2 days' + interval '15 hours'),

(seed_id,
 'Anyone else find that the more you understand the historical context of a passage, the more strange and specific and alive it gets? Less abstract, not more.',
 'curious', now() - interval '2 days' + interval '17 hours'),

(seed_id,
 'The Beatitudes don't describe the people who have it together. They describe the broken, the grieving, the overlooked. That's either really good news or really uncomfortable news.',
 'skeptic', now() - interval '2 days' + interval '20 hours'),

-- Day 1 ago
(seed_id,
 'I don't know if I'm a Christian yet. But I know I'm different than I was six months ago. Something has shifted and I can't fully explain it.',
 'seeking', now() - interval '1 day' + interval '8 hours'),

(seed_id,
 'Confession: I came here because I was desperate. Nowhere else to turn. That feels important to say out loud, even to strangers.',
 'seeking', now() - interval '1 day' + interval '11 hours'),

(seed_id,
 'Something about Communion — even just the concept of it — breaks me open a little. I don't fully understand why. Something about a table with no conditions.',
 'new-faith', now() - interval '1 day' + interval '14 hours'),

(seed_id,
 'Faith isn't the absence of doubt. I think it's continuing anyway. At least that's what I'm going with for now.',
 'curious', now() - interval '1 day' + interval '17 hours'),

(seed_id,
 'If you're somewhere between belief and unbelief, you're in good company. Most of the Psalms live there too.',
 'seeking', now() - interval '1 day' + interval '20 hours');

RAISE NOTICE 'Seed complete — 1 profile, 25 posts inserted.';
END $$;
