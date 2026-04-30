import { config } from 'dotenv';
config();

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('\nMissing SUPABASE_SERVICE_ROLE_KEY in .env');
  console.error('Get it: Supabase Dashboard → Settings → API → service_role\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SEED_EMAIL = 'community@theway.app';

const POSTS = [
  // 5 days ago
  { body: "I've been wrestling with whether prayer actually changes anything or if it's just us sorting through our own thoughts. What do you all think?", type: 'curious', daysAgo: 5, hoursIn: 8 },
  { body: 'Read Psalm 22 this morning — "My God, my God, why have you forsaken me?" The rawness of it hit differently today. He\'s not pretending everything is fine.', type: 'seeking', daysAgo: 5, hoursIn: 10 },
  { body: "Genuinely curious: how do people reconcile the violence in the Old Testament with a God described as love? Not asking to argue — actually want to understand.", type: 'skeptic', daysAgo: 5, hoursIn: 13 },
  { body: "First time really reading the Gospels as an adult. The Jesus in there is so different from the one I grew up hearing about in church.", type: 'curious', daysAgo: 5, hoursIn: 16 },
  { body: "Something about the Sermon on the Mount feels more radical the more I sit with it. Blessed are the poor in spirit. Blessed are those who mourn. That's not comfortable.", type: 'new-faith', daysAgo: 5, hoursIn: 19 },
  // 4 days ago
  { body: "Been attending a small church for a few months but still feel like an outsider. Is that normal? Does that feeling eventually change?", type: 'seeking', daysAgo: 4, hoursIn: 7 },
  { body: 'Something about Ecclesiastes feels deeply honest in a way other books don\'t. "Vanity of vanities" — he\'s not pretending. That kind of honesty in scripture surprises me.', type: 'curious', daysAgo: 4, hoursIn: 11 },
  { body: "The idea of grace keeps stopping me. Not earning it. Not deserving it. Just receiving it. That's honestly harder to accept than I expected.", type: 'new-faith', daysAgo: 4, hoursIn: 14 },
  { body: "John 3:16 is everywhere — on signs, in tattoos, at stadiums. I wonder how many people have actually sat with what it claims.", type: 'skeptic', daysAgo: 4, hoursIn: 17 },
  { body: "Reading about early church history and it's messier than I expected — the disagreements, the councils, the politics. Somehow that makes it feel more real, not less.", type: 'curious', daysAgo: 4, hoursIn: 20 },
  // 3 days ago
  { body: "I came here skeptical and I'm still skeptical. But I keep coming back. I'm not sure what that means, but it means something.", type: 'skeptic', daysAgo: 3, hoursIn: 8 },
  { body: "The resurrection is either the most important claim in human history or an extraordinary lie. There's no comfortable middle ground on it.", type: 'skeptic', daysAgo: 3, hoursIn: 11 },
  { body: "What changed for you? If you went from not believing to believing — not just culturally, but actually — what shifted? Asking sincerely.", type: 'seeking', daysAgo: 3, hoursIn: 14 },
  { body: 'Proverbs 3:5 — "Trust in the Lord with all your heart and lean not on your own understanding." That\'s genuinely terrifying to try and live out.', type: 'new-faith', daysAgo: 3, hoursIn: 17 },
  { body: "Romans 8:28 gets quoted to explain away too much pain. But sitting with the whole chapter — it's something else entirely. Worth reading slowly.", type: 'curious', daysAgo: 3, hoursIn: 20 },
  // 2 days ago
  { body: "The Lord's Prayer is so short. I kept waiting for more and then realized maybe that's the point. Maybe simplicity is the instruction.", type: 'new-faith', daysAgo: 2, hoursIn: 9 },
  { body: "Been thinking about Job. He didn't get answers. He got a question back. And somehow — in the text — that was enough. Still sitting with that.", type: 'curious', daysAgo: 2, hoursIn: 12 },
  { body: "Luke 15 — three parables in a row about losing things and finding them. The father running. That image keeps coming back to me.", type: 'seeking', daysAgo: 2, hoursIn: 15 },
  { body: "Anyone else find that the more you understand the historical context of a passage, the more strange and alive it gets? Less abstract, not more.", type: 'curious', daysAgo: 2, hoursIn: 17 },
  { body: "The Beatitudes don't describe people who have it together. They describe the broken, the grieving, the overlooked. That's either really good news or really uncomfortable.", type: 'skeptic', daysAgo: 2, hoursIn: 20 },
  // 1 day ago
  { body: "I don't know if I'm a Christian yet. But I know I'm different than I was six months ago. Something has shifted and I can't fully explain it.", type: 'seeking', daysAgo: 1, hoursIn: 8 },
  { body: "Confession: I came here because I was desperate. Nowhere else to turn. That feels important to say out loud, even to strangers.", type: 'seeking', daysAgo: 1, hoursIn: 11 },
  { body: "Something about Communion — even just the concept of it — breaks me open a little. Something about a table with no conditions.", type: 'new-faith', daysAgo: 1, hoursIn: 14 },
  { body: "Faith isn't the absence of doubt. I think it's continuing anyway. At least that's what I'm going with for now.", type: 'curious', daysAgo: 1, hoursIn: 17 },
  { body: "If you're somewhere between belief and unbelief, you're in good company. Most of the Psalms live there too.", type: 'seeking', daysAgo: 1, hoursIn: 20 },
];

function daysAgoTs(daysAgo, hoursIn) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hoursIn, 0, 0, 0);
  return d.toISOString();
}

async function run() {
  console.log('Creating seed user…');

  // Create auth user via admin API
  const { data: userData, error: userErr } = await supabase.auth.admin.createUser({
    email: SEED_EMAIL,
    email_confirm: true,
    user_metadata: { display_name: 'The Community' },
  });

  let userId;
  if (userErr) {
    if (userErr.message?.includes('already been registered')) {
      // Already exists — fetch the user
      const { data: list } = await supabase.auth.admin.listUsers();
      const existing = list?.users?.find((u) => u.email === SEED_EMAIL);
      if (!existing) { console.error('Could not find existing seed user:', userErr.message); process.exit(1); }
      userId = existing.id;
      console.log('Seed user already exists, reusing:', userId);
    } else {
      console.error('Error creating user:', userErr.message);
      process.exit(1);
    }
  } else {
    userId = userData.user.id;
    console.log('Created auth user:', userId);
  }

  // Upsert profile
  const { error: profileErr } = await supabase.from('profiles').upsert({
    id: userId,
    display_name: 'The Community',
    person_type: 'curious',
  });
  if (profileErr) { console.error('Profile error:', profileErr.message); process.exit(1); }
  console.log('Profile ready.');

  // Insert posts
  const rows = POSTS.map((p) => ({
    author_id: userId,
    body: p.body,
    person_type: p.type,
    created_at: daysAgoTs(p.daysAgo, p.hoursIn),
  }));

  const { error: postsErr } = await supabase.from('posts').insert(rows);
  if (postsErr) { console.error('Posts error:', postsErr.message); process.exit(1); }

  console.log(`\n✓ Done — 25 posts seeded across 5 days.\n`);
}

run();
