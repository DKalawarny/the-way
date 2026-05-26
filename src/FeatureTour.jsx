import { useState, useEffect } from 'react';
import { T } from './theme.js';
import { KinwoveStar } from './components/brand/KinwoveStar.jsx';

// ── Steps ────────────────────────────────────────────────────────────────────
const STEPS = [
  {
    emoji: <KinwoveStar size={52} />,
    title: 'Welcome to kinwove',
    body: "A place for the whole journey — whether you're just curious, rebuilding your faith, or leading a congregation. No pressure, no judgment.",
    tag: null,
    color: T.gold,
  },
  {
    emoji: '💬',
    title: 'Ask anything, honestly',
    body: 'Tap ✦ Ask to open your AI guide. Ask hard questions about faith, doubt, Scripture, or life. It never preaches — it just walks alongside you.',
    tag: 'ASK',
    color: T.goldDark,
  },
  {
    emoji: '📖',
    title: 'Read. Tap. Understand.',
    body: 'Open the Bible tab and start any chapter. Tap any verse to get plain-English explanations, historical context, and original language insights — right there in the margin.',
    tag: 'BIBLE',
    color: '#4a1542',
  },
  {
    emoji: '⛪',
    title: 'Your church, connected',
    body: "Find your church, join the congregation feed, and see your pastor's questions. Post publicly, church-only, or just for yourself.",
    tag: 'COMMUNITY',
    color: '#6b2438',
  },
  {
    emoji: '🙏',
    title: 'Carry each other',
    body: "Add prayer requests and pray for others. You'll be quietly notified every time someone prays for you.",
    tag: 'PRAYER',
    color: '#B85C38',
  },
];

const STORAGE_KEY = 'tour_v1_done';

export function markTourDone() {
  try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}
}

export function isTourDone() {
  try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function FeatureTour({ onClose }) {
  const [step, setStep] = useState(0);
  const [exiting, setExiting] = useState(false);

  // Keyboard nav
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') advance();
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')  retreat();
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [step]);

  function advance() {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else handleClose();
  }

  function retreat() {
    if (step > 0) setStep((s) => s - 1);
  }

  function handleClose() {
    setExiting(true);
    markTourDone();
    setTimeout(() => onClose?.(), 280);
  }

  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(20,10,6,0.78)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 9000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px 16px',
        opacity: exiting ? 0 : 1,
        transition: 'opacity 0.28s ease',
      }}
    >
      <div
        style={{
          background: T.cream,
          borderRadius: 24,
          width: '100%',
          maxWidth: 420,
          overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.45)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* ── Gold accent bar ── */}
        <div style={{
          height: 3,
          background: `linear-gradient(90deg, transparent 0%, ${s.color} 30%, ${T.gold} 70%, transparent 100%)`,
          transition: 'background 0.4s ease',
        }} />

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px 0',
        }}>
          {/* Step dots */}
          <div style={{ display: 'flex', gap: 5 }}>
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                aria-label={`Step ${i + 1}`}
                style={{
                  width: i === step ? 18 : 6,
                  height: 6,
                  borderRadius: 3,
                  background: i === step ? s.color : 'rgba(44,24,16,0.15)',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'all 0.25s ease',
                }}
              />
            ))}
          </div>

          {/* Tag + close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {s.tag && (
              <span style={{
                fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em',
                color: s.color, textTransform: 'uppercase',
                opacity: 0.75,
              }}>{s.tag}</span>
            )}
            <button
              onClick={handleClose}
              aria-label="Skip tour"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: T.inkMuted, fontSize: 18, lineHeight: 1, padding: 2,
                borderRadius: 6, opacity: 0.55,
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.55')}
            >×</button>
          </div>
        </div>

        {/* ── Content ── */}
        <div
          key={step}
          style={{
            padding: '28px 28px 24px',
            textAlign: 'center',
            animation: 'tourFadeUp 0.3s ease both',
          }}
        >
          <div style={{ fontSize: 52, marginBottom: 20, lineHeight: 1 }}>{s.emoji}</div>
          <h2 style={{
            fontFamily: "'Fraunces', Georgia, serif",
            fontSize: 24, fontWeight: 600,
            color: T.ink, margin: '0 0 14px',
            letterSpacing: '-0.025em', lineHeight: 1.15,
          }}>
            {s.title}
          </h2>
          <p style={{
            fontFamily: "'Lora', Georgia, serif",
            fontSize: 15.5, color: T.inkSoft,
            lineHeight: 1.7, margin: 0,
          }}>
            {s.body}
          </p>
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: '4px 20px 22px',
          display: 'flex', gap: 10,
        }}>
          {step > 0 && (
            <button
              onClick={retreat}
              style={{
                flex: '0 0 auto',
                background: 'none',
                border: `1px solid ${T.line}`,
                borderRadius: 999,
                padding: '11px 20px',
                fontSize: 14, fontWeight: 500,
                color: T.inkSoft, cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = T.gold)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = T.line)}
            >← Back</button>
          )}
          <button
            onClick={advance}
            style={{
              flex: 1,
              background: s.color,
              border: 'none',
              borderRadius: 999,
              padding: '12px 20px',
              fontSize: 14.5, fontWeight: 600,
              color: '#FDF8EE',
              cursor: 'pointer',
              transition: 'opacity 0.15s, transform 0.15s',
              letterSpacing: '-0.01em',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'none'; }}
          >
            {isLast ? "Let's go →" : 'Next →'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes tourFadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
