import { useEffect, useState } from 'react';
import { supabase } from './supabase.js';
import { T, SEMANTIC, SHADOW, RADIUS, SPACE } from './theme.js';
import { KinwoveStar } from './components/brand/KinwoveStar.jsx';

const DAILY_VERSES = [
  { text: 'Be still, and know that I am God.', ref: 'Psalm 46:10' },
  { text: 'The truth will set you free.', ref: 'John 8:32' },
  { text: 'Come to me, all you who are weary and burdened, and I will give you rest.', ref: 'Matthew 11:28' },
  { text: 'For I know the plans I have for you — plans to give you hope and a future.', ref: 'Jeremiah 29:11' },
  { text: 'Where can I go from your Spirit? Where can I flee from your presence?', ref: 'Psalm 139:7' },
  { text: 'Ask and it will be given to you; seek and you will find.', ref: 'Matthew 7:7' },
  { text: 'In the beginning was the Word, and the Word was with God.', ref: 'John 1:1' },
];

const DAILY_QUESTIONS = [
  'Where did you notice grace this week?',
  'What scripture is sitting with you right now?',
  'Who could you reach out to today?',
  'What would it look like to rest in trust?',
  'What part of the story do you want to live differently?',
  'Where are you being asked to forgive — including yourself?',
  'What would you ask God if you knew you would hear back?',
];

function dayIndex(arr) {
  const d = new Date();
  const seed = d.getFullYear() * 1000 + d.getMonth() * 31 + d.getDate();
  return arr[seed % arr.length];
}
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
function greeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  if (h >= 17 && h < 21) return 'Good evening';
  return 'Still up';
}
function formattedDate() {
  return new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

export default function Home({
  session,
  profile,
  onOpenFeed,
  onOpenPrayer,
  onOpenRead,
  onOpenChurch,
  onOpenMe,
  onOpenAsk,
  onOpenChurches,
  onFindPeople,
  onOpenSermon,
}) {
  const verse = dayIndex(DAILY_VERSES);
  const question = dayIndex(DAILY_QUESTIONS);
  const firstName = (profile?.display_name ?? '').split(' ')[0] || '';

  const [revealed, setRevealed] = useState(() => {
    try { return localStorage.getItem('kinwove:dailyQ:revealed') === todayKey(); }
    catch { return false; }
  });
  const reveal = () => {
    setRevealed(true);
    try { localStorage.setItem('kinwove:dailyQ:revealed', todayKey()); } catch {}
  };

  const [churchName, setChurchName] = useState(null);
  const [latestSermon, setLatestSermon] = useState(null);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!profile?.church_id) return;
      const [{ data: church }, { data: sermon }] = await Promise.all([
        supabase.from('churches').select('name').eq('id', profile.church_id).maybeSingle(),
        supabase.from('sermons').select('id, title, scripture_ref, week_starts_on')
          .eq('church_id', profile.church_id).eq('is_published', true)
          .order('week_starts_on', { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (cancelled) return;
      setChurchName(church?.name ?? null);
      setLatestSermon(sermon ?? null);
    }
    load();
    return () => { cancelled = true; };
  }, [profile?.church_id]);

  return (
    <div className="scene" style={{ minHeight: '100vh', paddingBottom: 90 }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: `${SPACE[6]}px ${SPACE[5]}px ${SPACE[4]}px` }}>

        {/* ── Salutation ─────────────────────────────────── */}
        <div className="float-in" style={{ marginBottom: SPACE[6] }}>
          <div className="section-eyebrow" style={{ marginBottom: SPACE[2] }}>
            {formattedDate()}
          </div>
          <div className="editorial-h1" style={{ fontSize: 32, marginBottom: 4 }}>
            {greeting()}{firstName ? `, ${firstName}` : ''}.
          </div>
          <div style={{ fontFamily: T.serif, fontSize: 16, color: T.inkSoft, lineHeight: 1.55, fontStyle: 'italic' }}>
            A small place to listen, ask, and stay with what you find.
          </div>
        </div>

        {/* ── This week at {Church} ─────────────────────── */}
        {churchName && latestSermon && onOpenSermon && (
          <button
            onClick={() => onOpenSermon(latestSermon.id)}
            className="lift float-in"
            style={{
              width: '100%', textAlign: 'left', cursor: 'pointer',
              position: 'relative', overflow: 'hidden',
              background: `linear-gradient(135deg, ${T.ink} 0%, #2a1810 100%)`,
              border: `1px solid ${T.goldDark}`,
              borderRadius: RADIUS.xl,
              padding: `${SPACE[5]}px ${SPACE[5]}px`,
              marginBottom: SPACE[5],
              boxShadow: '0 8px 28px rgba(184,115,58,0.18)',
            }}
          >
            <div style={{
              position: 'absolute', top: -30, right: -30, width: 120, height: 120,
              background: 'radial-gradient(circle, rgba(184,115,58,0.28), transparent 70%)',
              pointerEvents: 'none',
            }} />
            <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: T.gold, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center' }}>
              <KinwoveStar size={12} style={{ verticalAlign: 'middle', marginRight: 5, flexShrink: 0 }} /> This week at {churchName}
            </div>
            <div className="editorial-h2" style={{ fontSize: 21, color: T.cream, marginBottom: 6, lineHeight: 1.25 }}>
              {latestSermon.title}
            </div>
            {latestSermon.scripture_ref && (
              <div style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: T.gold, opacity: 0.85, marginBottom: SPACE[3] }}>
                {latestSermon.scripture_ref}
              </div>
            )}
            <div style={{ fontFamily: T.serif, fontSize: 14, fontStyle: 'italic', color: 'rgba(253,248,240,0.7)', lineHeight: 1.55 }}>
              Read, sit with the questions, and join the conversation →
            </div>
          </button>
        )}

        {/* ── Daily verse ─────────────────────────────────── */}
        <article className="float-in" style={{
          background: `linear-gradient(180deg, ${T.parchment} 0%, ${T.cream} 100%)`,
          border: `1px solid ${T.line}`,
          borderRadius: RADIUS.xl,
          padding: `${SPACE[7]}px ${SPACE[6]}px`,
          marginBottom: SPACE[6],
          boxShadow: SHADOW.warm,
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: -20, right: -20, width: 140, height: 140,
            background: 'radial-gradient(circle, rgba(184,115,58,0.18), transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div className="section-eyebrow" style={{ marginBottom: SPACE[3], display: 'flex', alignItems: 'center' }}><KinwoveStar size={12} style={{ verticalAlign: 'middle', marginRight: 5, flexShrink: 0 }} /> Today's verse</div>
          <blockquote className="editorial-h2" style={{
            fontSize: 22, margin: 0, marginBottom: SPACE[3], color: T.ink,
          }}>
            "{verse.text}"
          </blockquote>
          <div style={{ fontFamily: T.sans, fontSize: 12.5, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: T.goldDark }}>
            {verse.ref}
          </div>
        </article>

        {/* ── Today's question (reveal) ─────────────────── */}
        <section style={{ marginBottom: SPACE[7] }}>
          {!revealed ? (
            <button onClick={reveal} className="lift" style={{
              display: 'flex', alignItems: 'center', gap: SPACE[4],
              width: '100%', textAlign: 'left',
              background: `linear-gradient(135deg, ${T.parchment} 0%, ${T.parchmentDark} 100%)`,
              border: `1px solid ${T.line}`, borderRadius: RADIUS.lg,
              padding: `${SPACE[4]}px ${SPACE[5]}px`, cursor: 'pointer',
            }}>
              <div className="halo" style={{
                flexShrink: 0, width: 38, height: 38, borderRadius: '50%',
                background: T.cream, border: `2px solid ${T.gold}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: T.goldDark, fontSize: 18,
              }}><KinwoveStar size={18} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="section-eyebrow">Today's question</div>
                <div style={{ fontFamily: T.serif, fontSize: 14, color: T.inkSoft, fontStyle: 'italic', marginTop: 2 }}>
                  Tap to reveal
                </div>
              </div>
              <div style={{ color: T.goldDark, fontSize: 14, fontWeight: 600 }}>Open ▸</div>
            </button>
          ) : (
            <div style={{
              background: T.white,
              border: `1px solid ${T.line}`, borderRadius: RADIUS.lg,
              padding: `${SPACE[5]}px ${SPACE[5]}px`,
              animation: 'questionReveal 0.55s cubic-bezier(0.2, 0.8, 0.2, 1) both',
            }}>
              <div className="section-eyebrow" style={{ marginBottom: SPACE[2] }}>Today's question</div>
              <div className="editorial-h2" style={{ fontSize: 19, marginBottom: SPACE[3] }}>
                {question}
              </div>
              <button onClick={onOpenAsk} className="magnet" style={{
                background: T.ink, color: T.cream, border: 'none', borderRadius: RADIUS.pill,
                padding: '9px 18px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
              }}>
                Sit with this →
              </button>
            </div>
          )}
        </section>

        {/* ── Three doors ─────────────────────────────────── */}
        <div style={{ marginBottom: SPACE[3], display: 'flex', alignItems: 'center', gap: SPACE[3] }}>
          <div className="section-eyebrow">Where to begin</div>
          <div className="rule-gold" style={{ flex: 1 }} />
        </div>

        <div className="stagger-in" style={{ display: 'flex', flexDirection: 'column', gap: SPACE[3], marginBottom: SPACE[7] }}>
          <DoorCard
            i={0}
            tone="prayer"
            eyebrow="Pray together"
            title="Lift something up"
            blurb="Share a need or pray with someone. Anonymous if you want."
            onClick={onOpenPrayer}
          />
          <DoorCard
            i={1}
            tone="scripture"
            eyebrow="Read scripture"
            title="Open the Bible"
            blurb="Plain text. Plain language. Ask the AI alongside as you go."
            onClick={onOpenRead}
          />
          <DoorCard
            i={2}
            tone="connection"
            eyebrow="Belong"
            title={churchName ? `Walk with ${churchName}` : 'Find a church'}
            blurb={churchName
              ? (latestSermon?.title
                  ? `This week: "${latestSermon.title}"${latestSermon.scripture_ref ? ` · ${latestSermon.scripture_ref}` : ''}`
                  : 'See what your community is doing this week.')
              : 'Browse churches near you, or join one a friend recommends.'}
            onClick={churchName ? onOpenChurch : onOpenChurches}
          />
        </div>

        {/* ── Quiet invitation ───────────────────────────── */}
        <div className="float-in" style={{
          textAlign: 'center', padding: `${SPACE[5]}px ${SPACE[4]}px`,
          fontFamily: T.serif, fontSize: 14, fontStyle: 'italic',
          color: T.inkMuted, lineHeight: 1.6,
        }}>
          Not sure where to start?
          <br />
          <button onClick={onOpenAsk} style={{
            background: 'none', border: 'none', color: T.goldDark,
            fontFamily: T.serif, fontStyle: 'italic', fontSize: 14,
            cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3,
          }}>
            Ask anything — there's no wrong question.
          </button>
        </div>

        {/* ── Feed peek ─────────────────────────────────── */}
        <div style={{ marginTop: SPACE[6] }}>
          <button onClick={onOpenFeed} className="lift" style={{
            width: '100%',
            background: T.white, border: `1px dashed ${T.line}`, borderRadius: RADIUS.md,
            padding: `${SPACE[3]}px ${SPACE[4]}px`,
            color: T.inkSoft, fontSize: 13.5, fontFamily: T.serif,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            cursor: 'pointer',
          }}>
            <span>See the full feed — posts, prayers, conversations</span>
            <span style={{ color: T.goldDark, fontWeight: 600 }}>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function DoorCard({ i, tone, eyebrow, title, blurb, onClick }) {
  const palette = tone === 'scripture'
    ? { bg: 'rgba(184,115,58,0.10)', rail: T.gold, eyebrow: T.goldDark }
    : tone === 'connection'
      ? { bg: SEMANTIC.connection.bg, rail: SEMANTIC.connection.rail, eyebrow: SEMANTIC.connection.text }
      : { bg: SEMANTIC.prayer.bg, rail: SEMANTIC.prayer.rail, eyebrow: SEMANTIC.prayer.text };

  return (
    <button onClick={onClick} className="lift" style={{
      '--i': i,
      position: 'relative', textAlign: 'left',
      background: `linear-gradient(180deg, ${palette.bg}, ${T.white} 70%)`,
      border: `1px solid ${T.line}`, borderRadius: RADIUS.lg,
      padding: `${SPACE[5]}px ${SPACE[5]}px ${SPACE[5]}px ${SPACE[6]}px`,
      cursor: 'pointer', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
        background: palette.rail,
      }} />
      <div className="section-eyebrow" style={{ color: palette.eyebrow, marginBottom: 6 }}>{eyebrow}</div>
      <div className="editorial-h2" style={{ fontSize: 19, marginBottom: 4 }}>{title}</div>
      <div style={{ fontFamily: T.serif, fontSize: 14.5, color: T.inkSoft, lineHeight: 1.55 }}>{blurb}</div>
    </button>
  );
}
