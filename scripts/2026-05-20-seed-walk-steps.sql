-- Seed walk steps. Run in Supabase SQL editor. Safe to re-run.

-- ============================================================
-- NEW TO FAITH - 7 days
-- ============================================================
DO $$
DECLARE wid uuid;
BEGIN
  SELECT id INTO wid FROM walks WHERE title = 'New to faith' LIMIT 1;
  IF wid IS NULL THEN RETURN; END IF;

  INSERT INTO walk_steps (walk_id, day, title, body, scripture_ref, scripture_body, reflection_prompt) VALUES
  (wid, 1, 'You belong here',
   'Starting something new always feels a little awkward. You don''t have to pretend otherwise. Faith isn''t a feeling you have to manufacture - it''s a relationship you''re being invited into. Today is just about showing up. That''s enough.',
   'John 1:12',
   'But to all who did receive him, who believed in his name, he gave the right to become children of God.',
   'What made you curious enough to start? You don''t need a polished answer. Just sit with the question honestly.'),
  (wid, 2, 'What the gospel actually says',
   'The word "gospel" means good news - but good news about what, exactly? Not that you need to try harder or be better. The news is that the gap between you and God has already been crossed, not by your effort but by his. That''s the part worth sitting with.',
   'Romans 5:8',
   'But God shows his love for us in that while we were still sinners, Christ died for us.',
   'What did you think Christianity was asking of you before today? How does that compare to what you''re reading?'),
  (wid, 3, 'Who Jesus is',
   'Jesus isn''t just a teacher with good advice. The claim Christians make is stranger and more specific than that - that he was God in human form, that he died and rose, and that this changes everything. You don''t have to believe it yet. But it''s worth knowing what the actual claim is.',
   'Colossians 1:15-17',
   'He is the image of the invisible God, the firstborn of all creation. For by him all things were created, in heaven and on earth... all things were created through him and for him.',
   'What''s the hardest part of the claim about Jesus for you personally? Write it down plainly.'),
  (wid, 4, 'Talking to God',
   'Prayer doesn''t require special language or a quiet room or a feeling of connection. It''s just honest conversation - saying what''s true, what you need, what you don''t understand. Jesus gave his disciples a pattern, not a script.',
   'Matthew 6:9-13',
   'Pray then like this: Our Father in heaven, hallowed be your name. Your kingdom come, your will be done, on earth as it is in heaven. Give us this day our daily bread, and forgive us our debts, as we also have forgiven our debtors. And lead us not into temptation, but deliver us from evil.',
   'Try writing a short, honest prayer in your own words - not formal, just real. What do you actually want to say?'),
  (wid, 5, 'Reading scripture',
   'The Bible isn''t one book - it''s a library written across 1,500 years by dozens of authors. Reading it well means asking who wrote this, to whom, and why. Start with the Gospels (Matthew, Mark, Luke, John). They''re the clearest window into Jesus.',
   'Psalm 119:105',
   'Your word is a lamp to my feet and a light to my path.',
   'Pick one short passage from the Gospel of John and read it slowly twice. What sticks out? What confuses you?'),
  (wid, 6, 'Why community matters',
   'Faith wasn''t designed to be a solo project. The early church gathered, ate together, asked hard questions together, and carried each other''s weight. You don''t need to agree with everyone in a community to belong to one - you just need to show up honestly.',
   'Hebrews 10:24-25',
   'And let us consider how to stir up one another to love and good works, not neglecting to meet together, as is the habit of some, but encouraging one another, and all the more as you see the Day drawing near.',
   'Is there a person or a community you could take one step toward this week? What''s the smallest possible step?'),
  (wid, 7, 'Living it forward',
   'Seven days in. You''ve started something. Faith isn''t a destination you arrive at - it''s a direction you keep choosing. Some days will feel clear; others won''t. The invitation is to keep showing up, keep being honest, and keep asking. That''s all.',
   'Colossians 3:17',
   'And whatever you do, in word or deed, do everything in the name of the Lord Jesus, giving thanks to God the Father through him.',
   'What''s one thing you want to carry forward from this week? And what''s one question you still want to sit with?')
  ON CONFLICT (walk_id, day) DO NOTHING;
END $$;


-- ============================================================
-- RAISING CHILDREN OF FAITH - 7 days
-- ============================================================
DO $$
DECLARE wid uuid;
BEGIN
  SELECT id INTO wid FROM walks WHERE title = 'Raising children of faith' LIMIT 1;
  IF wid IS NULL THEN RETURN; END IF;

  INSERT INTO walk_steps (walk_id, day, title, body, scripture_ref, scripture_body, reflection_prompt) VALUES
  (wid, 1, 'The weight of the question',
   'Raising kids in faith is one of the most tender things a parent can attempt - and one of the most uncertain. You can''t hand them belief like a coat. You can only create conditions where it''s possible. That''s both humbling and freeing.',
   'Deuteronomy 6:6-7',
   'And these words that I command you today shall be on your heart. You shall teach them diligently to your children, and shall talk of them when you sit in your house, and when you walk by the way, and when you lie down, and when you rise.',
   'What do you most hope your children understand about faith - not just facts, but the feel of it? Write it out honestly.'),
  (wid, 2, 'Modeling, not just teaching',
   'Kids absorb more from how you live than from what you say. They notice whether faith makes you kinder, calmer, and more honest under pressure - or whether it''s mostly formal. This isn''t pressure to be perfect. It''s an invitation to be real.',
   'Proverbs 22:6',
   'Train up a child in the way he should go; even when he is old he will not depart from it.',
   'Think of one moment recently where your child watched how you handled something hard. What did they see?'),
  (wid, 3, 'When they ask the hard questions',
   'Kids ask questions adults avoid. "Why did grandpa die?" "If God is good, why is there war?" The instinct is to give a clean answer fast. But sitting with the question - saying "that''s a hard one, let''s think about it together" - teaches more than a quick answer ever could.',
   'Matthew 18:3-4',
   'Truly, I say to you, unless you turn and become like children, you will never enter the kingdom of heaven. Whoever humbles himself like this child is the greatest in the kingdom of heaven.',
   'What''s a question your child has asked that you didn''t know how to answer well? How might you revisit it with them?'),
  (wid, 4, 'Doubt is normal, even for kids',
   'Faith that has never been questioned is fragile. If your child says "I''m not sure I believe this anymore," that''s not failure - it might be the start of something real. The worst response is to panic. The best is to stay curious alongside them.',
   'Mark 10:14-16',
   'But when Jesus saw it, he was indignant and said to them, "Let the children come to me; do not hinder them, for to such belongs the kingdom of God."',
   'How do you respond when your child expresses doubt or disinterest in faith? What would it look like to respond with curiosity instead of anxiety?'),
  (wid, 5, 'Creating space at home',
   'You don''t need a family devotional program to raise kids in faith. You need a home where God is talked about naturally - at dinner, in hard moments, when something beautiful happens. Rhythms matter more than formal programs.',
   'Joshua 24:15',
   'But as for me and my house, we will serve the Lord.',
   'What''s one small rhythm you could start or strengthen at home this week - not a program, just a habit?'),
  (wid, 6, 'When they walk away',
   'Some children of faithful parents walk away from faith. This is one of the most painful things a parent can face. The parable of the prodigal son is partly a story about a parent who kept watching the road. You can''t control what your child chooses. You can control whether the door stays open.',
   'Luke 15:20',
   'And he arose and came to his father. But while he was still a long way off, his father saw him and felt compassion, and ran and embraced him and kissed him.',
   'If you''re carrying fear about your child''s spiritual future, write it out plainly. Then write one thing that is still true and good about them.'),
  (wid, 7, 'The long game',
   'Faith is planted slowly and grows in ways you don''t always see. A seed you plant at age eight might not surface until they''re thirty. Your job is faithfulness, not results. Trust the process - and trust the God who loves your child more than you do.',
   'Isaiah 40:31',
   'But they who wait for the Lord shall renew their strength; they shall mount up with wings like eagles; they shall run and not be weary; they shall walk and not faint.',
   'What would it look like to release the pressure of outcomes and simply commit to faithfulness this week? What would you stop doing? What would you keep?')
  ON CONFLICT (walk_id, day) DO NOTHING;
END $$;


-- ============================================================
-- WALKING THROUGH DOUBT - 7 days
-- ============================================================
DO $$
DECLARE wid uuid;
BEGIN
  SELECT id INTO wid FROM walks WHERE title = 'Walking through doubt' LIMIT 1;
  IF wid IS NULL THEN RETURN; END IF;

  INSERT INTO walk_steps (walk_id, day, title, body, scripture_ref, scripture_body, reflection_prompt) VALUES
  (wid, 1, 'Doubt is not the opposite of faith',
   'Most people treat doubt as a failure - a sign something has gone wrong. But doubt is what happens when you take belief seriously enough to ask whether it''s true. The father in the Gospels says "I believe; help my unbelief" and Jesus doesn''t correct him. He helps him.',
   'Mark 9:24',
   'Immediately the father of the child cried out and said, "I believe; help my unbelief!"',
   'What kind of doubt are you actually carrying right now? Name it specifically - not just "I have doubts" but what the doubt actually says.'),
  (wid, 2, 'The questions God can handle',
   'The Psalms are full of accusation, confusion, and raw grief directed at God. "Why have you forsaken me?" is the opening of Psalm 22 - and Jesus quotes it from the cross. The biblical tradition doesn''t ask you to clean up your questions before bringing them. Bring them as they are.',
   'Psalm 22:1-2',
   'My God, my God, why have you forsaken me? Why are you so far from saving me, so far from my cries of anguish? My God, I cry out by day, but you do not answer, by night, but I find no rest.',
   'Write out your most honest, unfiltered question to God right now. Don''t soften it.'),
  (wid, 3, 'When God feels absent',
   'There are seasons where prayer feels like talking to a wall and faith feels mechanical. Most serious believers describe this - it''s sometimes called the dark night of the soul. Feeling God''s absence doesn''t mean God is absent. But it does mean something real is happening that''s worth sitting with.',
   'Lamentations 3:17-18',
   'My soul is bereft of peace; I have forgotten what happiness is; so I say, "My endurance has perished; so has my hope from the Lord."',
   'Describe what God''s absence feels like for you right now, or in a season you''ve been through. Don''t rush to a resolution.'),
  (wid, 4, 'What to do with hard passages',
   'The Bible contains passages that are genuinely disturbing - violence, exclusion, commands that seem cruel. Pretending they''re not there doesn''t help. Engaging them honestly - with historical context, with scholarship, with humility - is what mature faith looks like. Difficulty in the text isn''t a reason to walk away. It''s an invitation to go deeper.',
   '2 Peter 3:16',
   'There are some things in them that are hard to understand, which the ignorant and unstable twist to their own destruction, as they do the other Scriptures.',
   'Is there a specific passage or story in the Bible that has bothered you? Name it. What makes it hard?'),
  (wid, 5, 'Faith and evidence',
   'Faith isn''t believing things without evidence - that''s credulity. Biblical faith is trust based on what you''ve seen and what you know. It''s the difference between trusting a bridge because you''ve watched it hold weight and jumping off a cliff because someone told you to. The question isn''t "can I believe without evidence" but "what does the evidence actually point toward?"',
   'Hebrews 11:1',
   'Now faith is the assurance of things hoped for, the conviction of things not seen.',
   'What evidence - from your own life, from history, from people you know - has pointed you toward belief? Be specific, not general.'),
  (wid, 6, 'Thomas was in the room',
   'Thomas is remembered as "the doubter" - but what''s often missed is that he was still in the room. Still with the community. Still present. And when Jesus appears, he doesn''t rebuke Thomas. He shows him his hands. Doubt that stays in community is different from doubt that isolates.',
   'John 20:27-28',
   'Then he said to Thomas, "Put your finger here, and see my hands; and put out your hand, and place it in my side. Do not disbelieve, but believe." Thomas answered him, "My Lord and my God!"',
   'Are you in community with people who know you''re doubting? What would it cost you to be honest about it with someone?'),
  (wid, 7, 'A faith worth having',
   'Faith that has survived honest doubt is more durable than faith that never asked hard questions. The goal isn''t to get back to certainty - it''s to arrive at a trust that has been tested and held. Not because the questions disappeared, but because you found something worth holding onto anyway.',
   '1 Peter 1:7',
   'So that the tested genuineness of your faith - more precious than gold that perishes though it is tested by fire - may be found to result in praise and glory and honor at the revelation of Jesus Christ.',
   'What would a faith worth having look like for you - not someone else''s faith, but yours? What would it need to be true for you to trust?')
  ON CONFLICT (walk_id, day) DO NOTHING;
END $$;


-- ============================================================
-- IN THE VALLEY - 14 days (grief)
-- ============================================================
DO $$
DECLARE wid uuid;
BEGIN
  SELECT id INTO wid FROM walks WHERE title = 'In the valley' LIMIT 1;
  IF wid IS NULL THEN RETURN; END IF;

  INSERT INTO walk_steps (walk_id, day, title, body, scripture_ref, scripture_body, reflection_prompt) VALUES
  (wid, 1, 'Permission to grieve',
   'The shortest verse in the Bible is "Jesus wept." At the tomb of his friend Lazarus - knowing full well he was about to raise him - Jesus wept. Grief isn''t the absence of faith. It''s the presence of love. You don''t have to hold it together.',
   'John 11:35',
   'Jesus wept.',
   'What are you grieving right now? Name it as specifically as you can. Not just "loss" - but what, exactly, is gone.'),
  (wid, 2, 'God in the dark',
   'The valley of the shadow of death is not a place God leaves you in alone. The Psalm doesn''t say the valley disappears - it says God walks through it with you. That''s different from being rescued out of it. Sometimes the presence is all there is.',
   'Psalm 23:4',
   'Even though I walk through the valley of the shadow of death, I will fear no evil, for you are with me; your rod and your staff, they comfort me.',
   'What would it mean to you today if God were actually present in this - not fixing it, just present? Write what that might feel like.'),
  (wid, 3, 'The numbness',
   'Grief isn''t always tears. Sometimes it''s a flatness - an inability to feel much of anything, good or bad. This is normal. The body protects itself. Lamentations is one of the most honest books in the Bible about what it''s like when everything collapses and there''s nothing left to say.',
   'Lamentations 3:1-3',
   'I am the man who has seen affliction under the rod of his wrath; he has driven me into darkness without any light; surely against me he turns his hand again and again the whole day long.',
   'Describe where you are today in plain language. Not how you think you should feel - how you actually feel.'),
  (wid, 4, 'Anger is allowed',
   'Some grief comes with anger - at God, at the situation, at yourself, at the person who died or left. That anger is real and it belongs somewhere. Screaming it at the ceiling is not the same as losing faith. The Psalms model this: bringing the full weight of emotion to God rather than managing it away from him.',
   'Psalm 22:1-2',
   'My God, my God, why have you forsaken me? Why are you so far from saving me, so far from my cries of anguish?',
   'Is there anger underneath your grief? Who or what is it aimed at? Write it out without softening it.'),
  (wid, 5, 'The question of why',
   'Romans 8:28 is one of the most misused verses in grief situations. It''s not a promise that loss won''t hurt, or that God caused it to teach you something. It''s a longer, harder promise - that in the end, nothing is wasted. That''s a different claim. It doesn''t demand that you feel it today.',
   'Romans 8:18',
   'For I consider that the sufferings of this present time are not worth comparing with the glory that is to be revealed to us.',
   'What explanation for your loss have you been offered that felt wrong or hollow? What would you actually need to hear?'),
  (wid, 6, 'When people say the wrong thing',
   'Job''s friends sat with him in silence for seven days - and that''s the best thing they did. The moment they started explaining why this happened to him, they became a burden rather than a comfort. You may be surrounded by people saying unhelpful things. That''s not a reason to isolate. It''s a reason to find the one person who can just sit.',
   'Job 2:13',
   'And they sat with him on the ground seven days and seven nights, and no one spoke a word to him, for they saw that his suffering was very great.',
   'Who in your life has been genuinely helpful in this season? What did they do that helped? What do you wish others would stop saying?'),
  (wid, 7, 'Memory as sacred ground',
   'What was lost was real. The memories are not nostalgia to get past - they are witnesses to what mattered. Honoring memory is not the same as getting stuck. It''s acknowledging that the love was worth having, even now.',
   'Deuteronomy 32:7',
   'Remember the days of old; consider the years of many generations; ask your father, and he will show you, your elders, and they will tell you.',
   'Write about one specific memory of what you''ve lost - a moment, a detail, something small. Let yourself be there for a minute.'),
  (wid, 8, 'The body keeps score',
   'Grief lives in the body - in interrupted sleep, in exhaustion, in the tightness in your chest, in forgetting to eat. This is not weakness. It''s the body doing what bodies do when love is disrupted. Be patient with it. The body will take longer than the mind to catch up.',
   'Psalm 6:6-7',
   'I am weary with my moaning; every night I flood my bed with tears; I drench my couch with my weeping. My eye wastes away because of grief; it grows weak because of all my foes.',
   'How is your body doing right now? Sleep, appetite, energy, physical pain. Name it honestly. What is one small thing you could do to take care of yourself today?'),
  (wid, 9, 'Hope without denial',
   'Hope in grief is not pretending the loss didn''t happen or that it doesn''t still hurt. It''s the slow, stubborn conviction that this is not the last word. You don''t have to feel hopeful to hold onto hope. Sometimes you just carry it forward like a stone in your pocket.',
   'Romans 8:24-25',
   'For in this hope we were saved. Now hope that is seen is not hope. For who hopes for what he sees? But if we hope for what we do not see, we wait for it with patience.',
   'What would it mean for you to have hope right now - not optimism, but hope? Is there anything you still believe is possible?'),
  (wid, 10, 'The courage to continue',
   'Some days the bravest thing is just getting up. Making coffee. Going through the motions until the motions start to carry some meaning again. The promise isn''t that the pain disappears - it''s that you will not be left without strength for the walk.',
   'Isaiah 43:2',
   'When you pass through the waters, I will be with you; and through the rivers, they shall not overwhelm you; when you walk through fire you shall not be burned, and the flame shall not consume you.',
   'What is one thing you have done in this season that took more courage than it looks like from the outside? Name it. Don''t minimize it.'),
  (wid, 11, 'What was real',
   'Grief is the evidence that something was worth loving. The depth of the loss is a measure of what mattered. You are not wrong to have loved this much. You are not broken because it hurts this much.',
   'Philippians 4:8',
   'Finally, brothers, whatever is true, whatever is honorable, whatever is just, whatever is pure, whatever is lovely, whatever is commendable, if there is any excellence, if there is anything worthy of praise, think about these things.',
   'What was true and good about what you''ve lost - person, relationship, season of life? Write it plainly, as a tribute, not an obituary.'),
  (wid, 12, 'Allowing joy again',
   'There will come a moment when something makes you laugh, or when you notice something beautiful, and for a second you forget to be sad - and then you feel guilty for forgetting. That moment is not betrayal. It''s the beginning of something. Let it happen.',
   'Ecclesiastes 3:4',
   'A time to weep, and a time to laugh; a time to mourn, and a time to dance.',
   'Has there been a moment recently where you felt something other than grief - even briefly? What was it? How did you feel about feeling it?'),
  (wid, 13, 'Grief and faith together',
   'Paul writes to the Thessalonians about grief - not telling them not to grieve, but asking them not to grieve as those who have no hope. This is not the same thing. You are allowed to grieve deeply and still hold a thread of hope. Both things are true at once.',
   '1 Thessalonians 4:13',
   'But we do not want you to be uninformed, brothers, about those who are asleep, that you may not grieve as others do who have no hope.',
   'What does it look like for you personally to hold grief and faith at the same time - not resolving the tension, but living in it?'),
  (wid, 14, 'The promise ahead',
   'The last pages of Revelation describe a world where every tear is wiped away - not where tears never existed, but where they are finally, fully tended to. That''s the shape of the promise. Not that the loss didn''t happen, but that it will not have the last word.',
   'Revelation 21:4',
   'He will wipe away every tear from their eyes, and death shall be no more, neither shall there be mourning, nor crying, nor pain anymore, for the former things have passed away.',
   'Where are you now compared to Day 1 of this journey? Not better or worse - just where. And what do you want to carry forward from these fourteen days?')
  ON CONFLICT (walk_id, day) DO NOTHING;
END $$;
