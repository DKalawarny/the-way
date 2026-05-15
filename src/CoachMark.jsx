import { useState, useEffect, useRef } from 'react';
import { T } from './theme.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const SEEN_KEY  = 'kinwove:coach_v1_seen';
const LOGIN_KEY = 'kinwove:login_count';
const MAX_LOGINS = 3;
const CARD_W = 232;
const MARGIN = 10;

// Tab positions as % of nav width (5 tabs, each 20%)
const STEPS = [
  {
    id: 'feed',
    tabPct: 10,
    title: 'Your community',
    body: 'Share thoughts, ask questions, and see what others are exploring. Posts can be public, church-only, or just for you.',
  },
  {
    id: 'church',
    tabPct: 30,
    title: 'Your church',
    body: 'Find your congregation, join the feed, see prayer requests, and connect with your pastor.',
  },
  {
    id: 'ask',
    tabPct: 50,
    title: 'Ask anything',
    body: 'Tap ✦ to open your AI Bible companion. Ask hard questions about faith, doubt, or Scripture. It walks alongside — never lectures.',
  },
  {
    id: 'bible',
    tabPct: 70,
    title: 'Read Scripture',
    body: 'Open any book and chapter. Tap a verse to get plain-English context, historical background, and AI insights right there in the margin.',
  },
  {
    id: 'me',
    tabPct: 90,
    title: 'Your space',
    body: 'Your profile, reading history, and personal notes board. Private unless you choose to share.',
  },
];

// ── Storage helpers ────────────────────────────────────────────────────────────
function getSeen() {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]')); }
  catch { return new Set(); }
}
function saveSeen(set) {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify([...set])); } catch {}
}

export function incrementLoginCount() {
  try {
    const n = parseInt(localStorage.getItem(LOGIN_KEY) ?? '0', 10) + 1;
    localStorage.setItem(LOGIN_KEY, String(n));
    return n;
  } catch { return 1; }
}

export function getLoginCount() {
  try { return parseInt(localStorage.getItem(LOGIN_KEY) ?? '0', 10); }
  catch { return 0; }
}

// ── CoachMark component ────────────────────────────────────────────────────────
export default function CoachMark() {
  const [seen, setSeen] = useState(getSeen);
  const [winW, setWinW] = useState(() => window.innerWidth);
  const didMount = useRef(false);

  useEffect(() => {
    const handler = () => setWinW(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Animate out then move to next step
  const [exiting, setExiting] = useState(false);

  // Only show for first MAX_LOGINS sessions
  const loginCount = getLoginCount();
  if (loginCount > MAX_LOGINS) return null;

  const current = STEPS.find((s) => !seen.has(s.id));
  if (!current) return null;

  const currentIndex = STEPS.indexOf(current);
  const isLast = currentIndex === STEPS.length - 1;

  function dismiss() {
    setExiting(true);
    setTimeout(() => {
      const next = new Set([...seen, current.id]);
      saveSeen(next);
      setSeen(next);
      setExiting(false);
    }, 220);
  }

  function skipAll() {
    setExiting(true);
    setTimeout(() => {
      const next = new Set(STEPS.map((s) => s.id));
      saveSeen(next);
      setSeen(next);
      setExiting(false);
    }, 220);
  }

  // Compute card + arrow positions
  const tabCenter = (current.tabPct / 100) * winW;
  const cardLeft = Math.max(MARGIN, Math.min(tabCenter - CARD_W / 2, winW - CARD_W - MARGIN));
  const arrowLeft = Math.max(12, Math.min(tabCenter - cardLeft, CARD_W - 12));

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'calc(62px + env(safe-area-inset-bottom, 0px) + 10px)',
        left: cardLeft,
        width: CARD_W,
        zIndex: 150,
        opacity: exiting ? 0 : 1,
        transform: exiting ? 'translateY(6px)' : 'translateY(0)',
        transition: 'opacity 0.22s ease, transform 0.22s ease',
        animation: !didMount.current ? 'coachUp 0.28s ease both' : 'none',
      }}
      ref={(el) => { if (el) didMount.current = true; }}
    >
      {/* ── Card ── */}
      <div
        style={{
          background: T.white,
          border: `1px solid rgba(184,115,58,0.28)`,
          borderRadius: 16,
          padding: '14px 16px 12px',
          boxShadow: '0 10px 36px rgba(44,24,16,0.16), 0 2px 8px rgba(0,0,0,0.07)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Gold top accent */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, transparent 0%, ${T.gold} 40%, rgba(184,115,58,0.4) 100%)`,
        }} />

        {/* Skip all × */}
        <button
          onClick={skipAll}
          aria-label="Skip all tips"
          style={{
            position: 'absolute', top: 9, right: 10,
            background: 'none', border: 'none', cursor: 'pointer',
            color: T.inkMuted, fontSize: 17, lineHeight: 1,
            padding: 3, opacity: 0.45, transition: 'opacity 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.45')}
        >×</button>

        {/* Title */}
        <div style={{
          fontFamily: `'Fraunces', Georgia, serif`,
          fontSize: 14, fontWeight: 600,
          color: T.ink, marginBottom: 5, marginTop: 3,
          paddingRight: 22, letterSpacing: '-0.015em', lineHeight: 1.25,
        }}>
          {current.title}
        </div>

        {/* Body */}
        <div style={{
          fontFamily: `'Lora', Georgia, serif`,
          fontSize: 12.5, color: T.inkSoft,
          lineHeight: 1.6, marginBottom: 12,
        }}>
          {current.body}
        </div>

        {/* Footer: dots + button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {STEPS.map((s, i) => {
              const isCurrent = s.id === current.id;
              const isSeen    = seen.has(s.id);
              return (
                <span
                  key={s.id}
                  style={{
                    width: isCurrent ? 16 : 5,
                    height: 5, borderRadius: 3,
                    background: isCurrent
                      ? T.gold
                      : isSeen
                        ? 'rgba(184,115,58,0.38)'
                        : 'rgba(44,24,16,0.1)',
                    transition: 'all 0.2s ease',
                  }}
                />
              );
            })}
          </div>

          <button
            onClick={dismiss}
            style={{
              background: `linear-gradient(135deg, ${T.gold} 0%, #c47020 100%)`,
              border: 'none', borderRadius: 999,
              padding: '6px 14px',
              fontSize: 12, fontWeight: 600,
              color: '#FDF8EE', cursor: 'pointer',
              letterSpacing: '-0.01em', flexShrink: 0,
              boxShadow: '0 2px 8px rgba(184,115,58,0.3)',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.88')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            {isLast ? "Let's go" : 'Got it →'}
          </button>
        </div>
      </div>

      {/* ── Arrow pointing down to nav tab ── */}
      <div style={{ position: 'relative', height: 8 }}>
        {/* border triangle (slightly larger, behind) */}
        <div style={{
          position: 'absolute',
          left: arrowLeft - 8,
          top: 0,
          width: 0, height: 0,
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderTop: '8px solid rgba(184,115,58,0.28)',
        }} />
        {/* fill triangle */}
        <div style={{
          position: 'absolute',
          left: arrowLeft - 7,
          top: 0,
          width: 0, height: 0,
          borderLeft: '7px solid transparent',
          borderRight: '7px solid transparent',
          borderTop: `7px solid ${T.white}`,
        }} />
      </div>

      <style>{`
        @keyframes coachUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
