import { useState, useEffect } from 'react';
import { T } from './theme.js';
import { supabase } from './supabase.js';
import { getDailyVerse, getTodayKey, getYesterdayKey } from './dailyVerse.js';

// ISO local dates for the SERVER streak (profiles.verse_streak_at is a
// Postgres date, 'YYYY-MM-DD'). getTodayKey() is 0-indexed-month legacy —
// only used for the localStorage keys, never compared against the DB.
function isoDay(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Server-backed streak: merge with the local count so nobody's existing
// streak regresses, then persist to profiles so it survives new devices.
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

function getStreak() {
  try {
    const { count = 0, lastKey = '' } = JSON.parse(localStorage.getItem('kinwove:verseStreak') ?? '{}');
    return { count, lastKey };
  } catch { return { count: 0, lastKey: '' }; }
}

function bumpStreak() {
  const today = getTodayKey();
  const yesterday = getYesterdayKey();
  const { count, lastKey } = getStreak();
  if (lastKey === today) return count;
  const newCount = lastKey === yesterday ? count + 1 : 1;
  try { localStorage.setItem('kinwove:verseStreak', JSON.stringify({ count: newCount, lastKey: today })); } catch {}
  return newCount;
}

export function shouldShowDailyVerse() {
  try { return localStorage.getItem('kinwove:verseSeen') !== getTodayKey(); }
  catch { return false; }
}

export function markVerseAsSeen() {
  try { localStorage.setItem('kinwove:verseSeen', getTodayKey()); } catch {}
}

export default function DailyVerseCard({ onReflect, onOpenBible, onClose }) {
  const verse = getDailyVerse();
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const local = bumpStreak();
    setStreak(local);
    markVerseAsSeen();
    syncStreakToServer(local).then((n) => setStreak(n)).catch(() => {});
  }, []);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(26,17,10,0.78)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: T.cream, borderRadius: 20,
          maxWidth: 420, width: '100%',
          padding: '32px 28px',
          boxShadow: '0 24px 80px rgba(20,10,6,0.5)',
          position: 'relative',
          animation: 'fadeUp 0.3s ease both',
          borderTop: `3px solid ${T.honey}`,
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 14, right: 16,
            background: 'none', border: 'none', fontSize: 20,
            color: T.inkMuted, cursor: 'pointer', lineHeight: 1, padding: 4,
          }}
        >
          ×
        </button>

        {streak > 1 && (
          <div style={{
            fontSize: 11.5, color: T.goldDark, fontWeight: 700,
            letterSpacing: 1.5, textTransform: 'uppercase',
            marginBottom: 16, textAlign: 'center',
          }}>
            🔥 Day {streak} — keep the streak
          </div>
        )}

        <div style={{
          fontSize: 10, letterSpacing: 4, textTransform: 'uppercase',
          color: T.honey, textAlign: 'center', marginBottom: 20, fontWeight: 600,
        }}>
          Today's verse
        </div>

        <div style={{
          fontFamily: T.serif, fontSize: 19, lineHeight: 1.7,
          color: T.ink, textAlign: 'center', marginBottom: 10,
          fontStyle: 'italic',
        }}>
          "{verse.text}"
        </div>
        <div style={{
          textAlign: 'center', fontWeight: 700, fontSize: 13,
          color: T.honey, letterSpacing: 0.5, marginBottom: 30,
        }}>
          — {verse.ref}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={() => { onReflect(verse); onClose(); }}
            style={{
              background: T.ink, color: T.cream, border: 'none',
              borderRadius: 999, padding: '13px 20px',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
              width: '100%',
            }}
          >
            Reflect with others →
          </button>
          <button
            onClick={() => { onOpenBible?.(verse.ref); onClose(); }}
            style={{
              background: 'transparent', color: T.goldDark,
              border: `1px solid ${T.goldLight}`, borderRadius: 999,
              padding: '12px 20px', fontSize: 14, cursor: 'pointer',
              width: '100%',
            }}
          >
            Read in context ↗
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', color: T.inkMuted,
              border: 'none', fontSize: 13, cursor: 'pointer',
              padding: '6px', width: '100%',
            }}
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
