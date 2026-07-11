// Logical data backup via PostgREST — a stopgap until Supabase Pro backups.
// Exports every application table as JSON to ~/kinwove-backups/<date>/.
// Run: node scripts/backup-data.mjs   (uses .env service key; NEVER commit output)
import { config } from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
config();

const URL_ = process.env.VITE_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) { console.error('missing env'); process.exit(1); }
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

const TABLES = [
  'profiles', 'posts', 'post_comments', 'reactions', 'post_reactions', 'poll_votes',
  'personal_prayers', 'personal_prayer_support', 'personal_prayer_encouragements', 'prayers',
  'churches', 'church_roles', 'church_follows', 'church_join_requests', 'pastor_applications',
  'sermons', 'sermon_content', 'sermon_discussions',
  'walks', 'walk_steps', 'walk_progress',
  'follows', 'friend_requests', 'friends', 'blocked_users',
  'dm_conversations', 'dm_messages', 'care_conversations', 'care_messages', 'care_team_members',
  'groups', 'group_members', 'group_posts', 'group_messages',
  'notifications', 'saved_posts', 'user_notes', 'bible_notes', 'bible_highlights', 'bible_progress',
  'shared_conversations', 'study_sessions', 'qa_events', 'topic_counts',
  'ai_usage', 'ai_feedback', 'user_reports', 'post_reports', 'gift_codes', 'promo_codes',
  'push_subscriptions', 'sponsored_posts',
];

const dir = path.join(os.homedir(), 'kinwove-backups', new Date().toISOString().slice(0, 10));
fs.mkdirSync(dir, { recursive: true });

let total = 0, skipped = [];
for (const t of TABLES) {
  let rows = [], from = 0;
  const page = 1000;
  while (true) {
    const r = await fetch(`${URL_}/rest/v1/${t}?select=*`, { headers: { ...H, Range: `${from}-${from + page - 1}` } });
    if (!r.ok) { skipped.push(t); rows = null; break; }
    const batch = await r.json();
    rows.push(...batch);
    if (batch.length < page) break;
    from += page;
  }
  if (rows === null) continue;
  fs.writeFileSync(path.join(dir, `${t}.json`), JSON.stringify(rows));
  total += rows.length;
  console.log(`${t}: ${rows.length}`);
}
console.log(`\n✓ backup complete → ${dir}`);
console.log(`  ${total} rows across ${TABLES.length - skipped.length} tables`);
if (skipped.length) console.log(`  skipped (no such table): ${skipped.join(', ')}`);
