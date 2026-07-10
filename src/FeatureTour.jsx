import { useState, useEffect, useLayoutEffect } from 'react';
import { T } from './theme.js';
import { KinwoveStar } from './components/brand/KinwoveStar.jsx';
import { KinwoveAppIcon } from './components/brand/KinwoveAppIcon.jsx';

// ── Steps ─────────────────────────────────────────────────────────────────────
// tourId matches the data-tour-id attribute on the nav button.
// null = welcome card (centred, no spotlight).
const STEPS = [
  {
    tourId: null,
    title: 'Welcome to kinwove',
    body: "A place for the whole journey — whether you're just curious, rebuilding your faith, or leading a congregation. No pressure, no judgment.",
    color: T.gold,
  },
  {
    tourId: 'ask',
    title: 'Ask anything',
    body: 'Your AI companion. Ask hard questions about faith, doubt, or Scripture — it walks alongside you without judgment or pressure.',
    color: T.goldDark,
  },
  {
    tourId: 'feed',
    title: 'Your community',
    body: 'Posts from people and churches you follow. Share publicly, church-only, or just for yourself.',
    color: '#A85530',
  },
  {
    tourId: 'church',
    title: 'Church',
    body: 'Find your church, join the congregation feed, and follow your pastor\'s sermons and faith walks.',
    color: '#6b2438',
  },
  {
    tourId: 'bible',
    title: 'Open the Bible',
    body: 'Read any chapter — or tap Listen and it reads aloud to you. Tap any verse for plain-English explanations, historical context, and original-language insights.',
    color: '#4a1542',
  },
  {
    tourId: 'notifications',
    title: 'Stay in the loop',
    body: "You'll be notified when someone reacts to your post, prays for you, or sends you a message. Tap the bell to see it all.",
    color: '#2e5970',
  },
  {
    tourId: 'you',
    title: 'Your space',
    body: 'Your profile, faith walks, messages, prayer wall, and milestones — everything that\'s yours to explore and come back to.',
    color: '#1a3050',
  },
];

const STORAGE_KEY = 'tour_v1_done';
export function markTourDone() { try { localStorage.setItem(STORAGE_KEY, '1'); } catch {} }
export function isTourDone()   { try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; } }

const TIP_W   = 264; // tooltip card width
const H_PAD   = 8;   // extra padding around the spotlight highlight
const TIP_GAP = 14;  // gap between highlight edge and tooltip

// ── Tooltip positioning ────────────────────────────────────────────────────────
function placeTooltip(rect) {
  if (!rect) return { style: {}, arrowStyle: {}, arrowDir: null };

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cx = rect.left + rect.width / 2;
  const cy = rect.top  + rect.height / 2;

  // Left sidebar on desktop
  const isLeft   = rect.right < vw * 0.38;
  // Bottom bar on mobile
  const isBottom = rect.top   > vh * 0.58;
  // Top bar
  const isTop    = rect.bottom < vh * 0.25;

  if (isLeft) {
    // Tooltip to the RIGHT
    const top = Math.max(12, Math.min(cy - 72, vh - 200));
    const arrowTop = cy - top - 8;
    return {
      style: { position: 'fixed', left: rect.right + TIP_GAP, top, width: TIP_W },
      arrowStyle: {
        position: 'absolute', left: -8,
        top: Math.max(14, Math.min(arrowTop, 100)),
        borderTop: '8px solid transparent',
        borderBottom: '8px solid transparent',
        borderRight: `8px solid ${T.white}`,
        width: 0, height: 0,
      },
      arrowDir: 'left',
    };
  }

  if (isBottom) {
    // Tooltip ABOVE
    const left = Math.max(12, Math.min(cx - TIP_W / 2, vw - TIP_W - 12));
    const arrowLeft = cx - left - 8;
    return {
      style: {
        position: 'fixed',
        left,
        bottom: vh - rect.top + TIP_GAP,
        width: TIP_W,
      },
      arrowStyle: {
        position: 'absolute', bottom: -8,
        left: Math.max(14, Math.min(arrowLeft, TIP_W - 28)),
        borderLeft: '8px solid transparent',
        borderRight: '8px solid transparent',
        borderTop: `8px solid ${T.white}`,
        width: 0, height: 0,
      },
      arrowDir: 'down',
    };
  }

  if (isTop) {
    // Tooltip BELOW
    const left = Math.max(12, Math.min(cx - TIP_W / 2, vw - TIP_W - 12));
    const arrowLeft = cx - left - 8;
    return {
      style: {
        position: 'fixed',
        left,
        top: rect.bottom + TIP_GAP,
        width: TIP_W,
      },
      arrowStyle: {
        position: 'absolute', top: -8,
        left: Math.max(14, Math.min(arrowLeft, TIP_W - 28)),
        borderLeft: '8px solid transparent',
        borderRight: '8px solid transparent',
        borderBottom: `8px solid ${T.white}`,
        width: 0, height: 0,
      },
      arrowDir: 'up',
    };
  }

  // Fallback: above, centred
  const left = Math.max(12, Math.min(cx - TIP_W / 2, vw - TIP_W - 12));
  const arrowLeft = cx - left - 8;
  return {
    style: {
      position: 'fixed',
      left,
      bottom: vh - rect.top + TIP_GAP,
      width: TIP_W,
    },
    arrowStyle: {
      position: 'absolute', bottom: -8,
      left: Math.max(14, Math.min(arrowLeft, TIP_W - 28)),
      borderLeft: '8px solid transparent',
      borderRight: '8px solid transparent',
      borderTop: `8px solid ${T.white}`,
      width: 0, height: 0,
    },
    arrowDir: 'down',
  };
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function FeatureTour({ onClose }) {
  const [step,       setStep]       = useState(0);
  const [exiting,    setExiting]    = useState(false);
  const [targetRect, setTargetRect] = useState(null);

  const s      = STEPS[step];
  const isLast = step === STEPS.length - 1;
  // Step label counts only the spotlight steps (after welcome)
  const spotlightCount = STEPS.length - 1;
  const spotlightIdx   = step; // 1-based display: step 1 = first spotlight

  // Measure target element whenever step changes
  useLayoutEffect(() => {
    if (!s.tourId) { setTargetRect(null); return; }
    const el = document.querySelector(`[data-tour-id="${s.tourId}"]`);
    if (!el) { setTargetRect(null); return; }
    setTargetRect(el.getBoundingClientRect());
  }, [step, s.tourId]);

  // Keyboard nav
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') advance();
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')  retreat();
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function advance()     { if (step < STEPS.length - 1) setStep(v => v + 1); else handleClose(); }
  function retreat()     { if (step > 0) setStep(v => v - 1); }
  function handleClose() { setExiting(true); markTourDone(); setTimeout(() => onClose?.(), 280); }

  const { style: tipStyle, arrowStyle } = placeTooltip(targetRect);

  const stepDots = (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {STEPS.map((_, i) => (
        <button
          key={i}
          onClick={() => setStep(i)}
          aria-label={`Step ${i + 1}`}
          style={{
            width: i === step ? 16 : 5, height: 5, borderRadius: 2.5, padding: 0,
            background: i === step ? s.color : 'rgba(44,24,16,0.16)',
            border: 'none', cursor: 'pointer',
            transition: 'all 0.22s ease',
          }}
        />
      ))}
    </div>
  );

  return (
    <div style={{ opacity: exiting ? 0 : 1, transition: 'opacity 0.28s ease' }}>

      {/* ── Welcome step: full-screen blur overlay ── */}
      {!targetRect && (
        <div
          onClick={handleClose}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(14,7,3,0.80)',
            backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)',
            zIndex: 9000,
          }}
        />
      )}

      {/* ── Spotlight step: invisible backdrop (click-to-skip) ── */}
      {targetRect && (
        <div
          onClick={handleClose}
          style={{
            position: 'fixed', inset: 0,
            background: 'transparent',
            zIndex: 8999,
            cursor: 'default',
          }}
        />
      )}

      {/* ── Spotlight highlight ─────────────────────────────────
          The massive box-shadow creates the dark surround.       */}
      {targetRect && (
        <div style={{
          position: 'fixed',
          top:    targetRect.top    - H_PAD,
          left:   targetRect.left   - H_PAD,
          width:  targetRect.width  + H_PAD * 2,
          height: targetRect.height + H_PAD * 2,
          borderRadius: 14,
          boxShadow: '0 0 0 9999px rgba(14,7,3,0.80)',
          zIndex: 9000,
          pointerEvents: 'none',
          // Subtle pulse ring around highlight
          outline: `2px solid ${s.color}88`,
          outlineOffset: 2,
          transition: 'top 0.22s ease, left 0.22s ease, width 0.22s ease, height 0.22s ease',
        }} />
      )}

      {/* ── Welcome card (step 0) ── */}
      {/* Flex-centred wrapper avoids the top/left+transform trick which breaks
          when any ancestor has opacity < 1 or a CSS transform applied.         */}
      {!targetRect && (
        <div
          style={{
            position: 'fixed', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9002, padding: '16px',
          }}
          onClick={(e) => e.stopPropagation()}
        >
        <div
          key={step}
          style={{
            width: 'min(420px, calc(100vw - 32px))',
            background: T.cream,
            borderRadius: 24, overflow: 'hidden',
            boxShadow: '0 32px 80px rgba(0,0,0,0.45)',
            animation: 'tourFadeUp 0.3s ease both',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Gold accent bar */}
          <div style={{
            height: 3,
            background: `linear-gradient(90deg, transparent 0%, ${s.color} 30%, ${T.gold} 70%, transparent 100%)`,
          }} />
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 0' }}>
            {stepDots}
            <button
              onClick={handleClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.inkMuted, fontSize: 18, opacity: 0.5, padding: 4 }}
            >×</button>
          </div>
          {/* Content */}
          <div style={{ padding: '28px 28px 24px', textAlign: 'center', animation: 'tourFadeUp 0.3s ease both' }}>
            <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'center' }}>
              {s.tourId === null
                ? <KinwoveAppIcon size={88} />
                : <KinwoveStar size={52} color={s.color ?? T.gold} />}
            </div>
            <h2 style={{ fontFamily: T.serif, fontSize: 24, fontWeight: 600, color: T.ink, margin: '0 0 14px', letterSpacing: '-0.025em', lineHeight: 1.15 }}>
              {s.title}
            </h2>
            <p style={{ fontFamily: T.display, fontSize: 15.5, color: T.inkSoft, lineHeight: 1.7, margin: 0 }}>
              {s.body}
            </p>
          </div>
          {/* Footer */}
          <div style={{ padding: '0 20px 22px', display: 'flex', gap: 10 }}>
            <button
              onClick={handleClose}
              style={{ background: 'none', border: `1px solid ${T.line}`, borderRadius: 999, padding: '11px 18px', fontSize: 13.5, color: T.inkSoft, cursor: 'pointer' }}
            >
              Skip
            </button>
            <button
              onClick={advance}
              style={{ flex: 1, background: s.color, border: 'none', borderRadius: 999, padding: '12px 20px', fontSize: 14.5, fontWeight: 600, color: '#FDF8EE', cursor: 'pointer', letterSpacing: '-0.01em' }}
            >
              Show me around →
            </button>
          </div>
        </div>
        </div>
      )}

      {/* ── Spotlight tooltip card ── */}
      {targetRect && (
        <div
          key={step}
          style={{
            ...tipStyle,
            background: T.white,
            borderRadius: 16,
            padding: '16px 18px 14px',
            boxShadow: '0 8px 40px rgba(0,0,0,0.28), 0 0 0 1px rgba(26,17,8,0.06)',
            zIndex: 9002,
            animation: 'tourFadeUp 0.25s ease both',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Arrow */}
          <div style={arrowStyle} />

          {/* Step label */}
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: s.color, textTransform: 'uppercase', marginBottom: 5, fontFamily: T.sans }}>
            {spotlightIdx} of {spotlightCount}
          </div>

          {/* Title */}
          <div style={{ fontFamily: T.serif, fontSize: 16.5, fontWeight: 600, color: T.ink, lineHeight: 1.2, marginBottom: 6 }}>
            {s.title}
          </div>

          {/* Body */}
          <p style={{ fontFamily: T.display, fontSize: 13.5, color: T.inkSoft, lineHeight: 1.6, margin: '0 0 13px' }}>
            {s.body}
          </p>

          {/* Dots + buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {stepDots}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {step > 0 && (
                <button
                  onClick={retreat}
                  style={{ background: 'none', border: `1px solid ${T.line}`, borderRadius: 999, padding: '6px 12px', fontSize: 12.5, color: T.inkSoft, cursor: 'pointer' }}
                >
                  ←
                </button>
              )}
              <button
                onClick={advance}
                style={{ background: s.color, border: 'none', borderRadius: 999, padding: '7px 15px', fontSize: 13, fontWeight: 600, color: '#FDF8EE', cursor: 'pointer' }}
              >
                {isLast ? 'Done ✓' : 'Next →'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes tourFadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
