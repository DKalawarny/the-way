// ── Engagement streak ─────────────────────────────────────────────────────────
// Consecutive days with at least one REAL interaction — asking a question,
// finishing a chapter, posting, commenting, praying, or reflecting on the
// verse. Merely seeing the daily-verse popup does not count: showing up means
// doing something. Storage is unchanged (localStorage kinwove:verseStreak +
// profiles.verse_streak/verse_streak_at) so nobody's streak resets.
import { supabase } from './supabase.js';
import { getTodayKey, getYesterdayKey } from './dailyVerse.js';

// profiles.verse_streak_at is a Postgres date ('YYYY-MM-DD'). getTodayKey()
// is 0-indexed-month legacy — only used for localStorage, never the DB.
function isoDay(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getStreak() {
  try {
    const { count = 0, lastKey = '' } = JSON.parse(localStorage.getItem('kinwove:verseStreak') ?? '{}');
    return { count, lastKey };
  } catch { return { count: 0, lastKey: '' }; }
}

// Streak as it stands right now — 0 unless kept alive today or yesterday.
export function currentLocalStreak() {
  const { count, lastKey } = getStreak();
  return (lastKey === getTodayKey() || lastKey === getYesterdayKey()) ? count : 0;
}

function bumpLocal() {
  const today = getTodayKey();
  const { count, lastKey } = getStreak();
  if (lastKey === today) return count;
  const newCount = lastKey === getYesterdayKey() ? count + 1 : 1;
  try { localStorage.setItem('kinwove:verseStreak', JSON.stringify({ count: newCount, lastKey: today })); } catch {}
  return newCount;
}

// Server-backed: merge with the local count so an existing streak never
// regresses, then persist to profiles so it survives new devices.
async function syncStreakToServer(localCount) {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return localCount;
  const today = isoDay(new Date());
  const y = new Date(); y.setDate(y.getDate() - 1);
  const yesterday = isoDay(y);

  const { data } = await supabase.from('profiles')
    .select('verse_streak, verse_streak_at').eq('id', uid).single();
  const at = data?.verse_streak_at ?? '';
  let next = data?.verse_streak ?? 0;
  if (at !== today) next = (at === yesterday ? next + 1 : 1);
  next = Math.max(next, localCount);

  if (next !== (data?.verse_streak ?? 0) || at !== today) {
    supabase.from('profiles').update({ verse_streak: next, verse_streak_at: today })
      .eq('id', uid).then(null, () => {});
  }
  try { localStorage.setItem('kinwove:verseStreak', JSON.stringify({ count: next, lastKey: getTodayKey() })); } catch {}
  return next;
}

// Call from any real-interaction site. Cheap and idempotent per day — safe to
// fire liberally.
export function markEngaged() {
  if (getStreak().lastKey === getTodayKey()) return;
  const local = bumpLocal();
  syncStreakToServer(local).catch(() => {});
}
