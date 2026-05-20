import { useState } from 'react';
import { T } from './theme.js';

// ── Storage helpers ───────────────────────────────────────────────────────────
const STORAGE_KEY = 'dismissed_tips_v1';

function getDismissed() {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')); }
  catch { return new Set(); }
}

export function dismissTip(tipId) {
  const set = getDismissed();
  set.add(tipId);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...set])); } catch {}
}

export function resetTips() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

// ── Component ─────────────────────────────────────────────────────────────────
// A small, dismissible in-context hint bubble. Shows once per tipId.
// Use sparingly — only for genuinely non-obvious interactions.
//
// <Tip tipId="bible_verse_tap" icon="👆" text="Tap any verse for instant AI insights." />
//
export default function Tip({ tipId, text, icon = '✦', dark = false, style: extraStyle }) {
  const [visible, setVisible] = useState(() => !getDismissed().has(tipId));

  if (!visible) return null;

  function dismiss() {
    dismissTip(tipId);
    setVisible(false);
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 9,
        padding: '10px 12px 10px 14px',
        background: dark ? 'rgba(245,237,216,0.05)' : 'rgba(184,115,58,0.07)',
        border: dark ? '1px solid rgba(245,237,216,0.12)' : '1px solid rgba(184,115,58,0.22)',
        borderRadius: 12,
        animation: 'tipFadeIn 0.35s ease both',
        ...extraStyle,
      }}
    >
      <span style={{
        fontSize: 13, flexShrink: 0, lineHeight: 1.5,
        color: dark ? 'rgba(245,237,216,0.65)' : T.gold, marginTop: 1,
      }}>{icon}</span>

      <span style={{
        flex: 1,
        fontSize: 13,
        color: dark ? 'rgba(245,237,216,0.75)' : T.inkSoft,
        lineHeight: 1.6,
        fontFamily: "'Lora', Georgia, serif",
      }}>
        {text}
      </span>

      <button
        onClick={dismiss}
        aria-label="Dismiss tip"
        style={{
          background: 'none', border: 'none',
          cursor: 'pointer',
          color: T.inkMuted,
          fontSize: 16,
          lineHeight: 1,
          padding: '0 0 0 6px',
          flexShrink: 0,
          opacity: 0.5,
          transition: 'opacity 0.15s',
          marginTop: 1,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.5')}
      >×</button>

      <style>{`
        @keyframes tipFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
