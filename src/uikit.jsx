// Shared UI primitives. Replaces ad-hoc alert()/confirm() and the dozens
// of hand-rolled empty-state and text-button styles scattered across screens.
//
// Design intent:
//   - Native dialogs (alert/confirm) feel like 1995 and break the warm,
//     editorial mood of the app. Everything in here uses the same parchment
//     palette as cards.
//   - Confirm returns a Promise<boolean> so call sites stay one-liners.
//   - Toast auto-dismisses; the consumer doesn't need a timer.
//   - Touch targets meet a 32px minimum so "delete"/"revoke" links don't
//     get punished on mobile.

import { useEffect, useState, useCallback } from 'react';
import { T, RADIUS, SHADOW } from './theme.js';
import { KinwoveStar } from './components/brand/KinwoveStar.jsx';

/* ── Toast ────────────────────────────────────────────────────────── */

const TOAST_PALETTE = {
  info:    { bg: T.ink,        fg: T.cream,  rail: T.gold     },
  success: { bg: '#3F5635',    fg: '#F0F5E8', rail: '#7A9568' },
  error:   { bg: '#7A2A1F',    fg: '#FCE8E2', rail: T.error   },
};

// 7s (was 3.2s) — older readers need time; tap anywhere on it to dismiss early.
function ToastInternal({ text, kind = 'info', duration = 7000, onDone }) {
  useEffect(() => {
    const t = setTimeout(() => onDone?.(), duration);
    return () => clearTimeout(t);
  }, [duration, onDone]);

  const palette = TOAST_PALETTE[kind] ?? TOAST_PALETTE.info;
  return (
    <div
      role="status"
      aria-live="polite"
      onClick={() => onDone?.()}
      style={{
        position: 'fixed', left: '50%', bottom: 28, transform: 'translateX(-50%)',
        zIndex: 200,
        background: palette.bg, color: palette.fg,
        borderLeft: `3px solid ${palette.rail}`,
        borderRadius: RADIUS.md,
        padding: '12px 16px',
        fontFamily: T.sans, fontSize: 13.5, fontWeight: 500, letterSpacing: 0.1,
        boxShadow: SHADOW.lift,
        maxWidth: 360, lineHeight: 1.4,
        animation: 'badgeSlideUp 0.32s cubic-bezier(0.2, 0.8, 0.2, 1) both',
        cursor: 'pointer',
      }}
    >
      {text}
    </div>
  );
}

/* ── Confirm dialog ───────────────────────────────────────────────── */

function ConfirmInternal({ title, body, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false, onConfirm, onCancel }) {
  // ESC closes; click on scrim closes; Enter confirms.
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onCancel?.();
      else if (e.key === 'Enter') onConfirm?.();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onConfirm, onCancel]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 250,
        background: 'rgba(44,24,16,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        animation: 'fadeIn 0.18s ease both',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: T.cream,
          border: `1px solid ${T.line}`,
          borderRadius: RADIUS.lg,
          maxWidth: 380, width: '100%',
          padding: '20px 22px 18px',
          boxShadow: SHADOW.candle,
          animation: 'fadeUp 0.22s cubic-bezier(0.2, 0.8, 0.2, 1) both',
        }}
      >
        <h3 style={{
          margin: 0, fontFamily: T.display, fontSize: 18, fontWeight: 600,
          color: T.ink, letterSpacing: '-0.01em', lineHeight: 1.3,
        }}>
          {title}
        </h3>
        {body && (
          <p style={{
            margin: '8px 0 18px', fontFamily: T.serif, fontSize: 14.5,
            color: T.inkSoft, lineHeight: 1.55,
          }}>
            {body}
          </p>
        )}
        {!body && <div style={{ height: 14 }} />}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              background: 'transparent',
              border: `1px solid ${T.line}`,
              color: T.inkSoft,
              borderRadius: RADIUS.pill,
              padding: '8px 16px',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              minHeight: 36,
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            autoFocus
            style={{
              background: danger ? T.error : T.ink,
              color: T.cream, border: 'none',
              borderRadius: RADIUS.pill,
              padding: '8px 18px',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              minHeight: 36,
              boxShadow: danger ? '0 4px 14px rgba(165,63,43,0.25)' : '0 4px 14px rgba(44,24,16,0.18)',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Empty state ──────────────────────────────────────────────────── */

/**
 * Standardized empty-state block. Use instead of one-off
 * `<div style={{ fontStyle: 'italic', color: ... }}>No X yet</div>` cells.
 *
 *   <EmptyState glyph="✦" title="No replies yet"
 *               body="Be the first to share a thought." />
 */
export function EmptyState({ glyph, title, body, action, dense = false }) {
  if (glyph === undefined) glyph = <KinwoveStar size={dense ? 22 : 30} />;
  return (
    <div style={{
      textAlign: 'center',
      padding: dense ? `${20}px ${16}px` : `${36}px ${20}px`,
      fontFamily: T.serif,
      color: T.inkMuted,
    }}>
      {glyph && (
        <div style={{
          fontSize: dense ? 22 : 30, color: T.gold, marginBottom: dense ? 6 : 12,
          letterSpacing: 1.5, opacity: 0.75,
        }}>
          {glyph}
        </div>
      )}
      {title && (
        <div style={{
          fontFamily: T.display, fontSize: dense ? 15 : 17, fontWeight: 600,
          color: T.inkSoft, letterSpacing: '-0.01em', marginBottom: 6,
        }}>
          {title}
        </div>
      )}
      {body && (
        <div style={{
          fontSize: dense ? 13 : 14, lineHeight: 1.6,
          color: T.inkMuted, maxWidth: 320, margin: '0 auto',
        }}>
          {body}
        </div>
      )}
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  );
}

/* ── Text button ──────────────────────────────────────────────────── */

/**
 * Tiny inline button (delete / revoke / cancel reply / etc.).
 *
 * Why this exists: the codebase has ~20 buttons styled
 * `{ background: 'none', border: 'none', color: T.inkMuted, fontSize: 12 }`.
 * They're 14px tall — well below the 44px Apple HIG / 48dp Material target.
 * This component enforces a 32px hit area while still LOOKING like a tiny
 * link, by absorbing the height into invisible padding.
 */
export function TextButton({ children, onClick, danger = false, disabled = false, title, type = 'button' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        background: 'none', border: 'none',
        color: danger ? T.error : T.inkMuted,
        fontSize: 12, fontWeight: 600, letterSpacing: 0.2,
        cursor: disabled ? 'default' : 'pointer',
        padding: '8px 4px', // 8px vertical absorbs into a 32px hit area
        minHeight: 32,
        opacity: disabled ? 0.4 : 1,
        textDecoration: 'none',
        lineHeight: 1,
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.color = danger ? '#7A2A1F' : T.ink; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = danger ? T.error : T.inkMuted; }}
    >
      {children}
    </button>
  );
}

/* ── Hook ─────────────────────────────────────────────────────────── */

/**
 * Single hook a screen mounts to gain replacements for window.confirm()
 * and a styled toast.
 *
 *   const { showToast, askConfirm, ui } = useUiKit();
 *   if (!await askConfirm({ title: 'Delete?', danger: true })) return;
 *   showToast('Deleted', 'success');
 *   return <>{ui}<div>...</div></>;
 *
 * `ui` MUST be rendered somewhere in the screen (typically as a sibling
 * to the main content). It's a fragment so it adds zero DOM when idle.
 */
export function useUiKit() {
  const [toast, setToast]               = useState(null);
  const [confirmState, setConfirmState] = useState(null);

  const showToast = useCallback((text, kind = 'info') => {
    setToast({ text, kind });
  }, []);

  const askConfirm = useCallback((opts) => new Promise((resolve) => {
    setConfirmState({
      ...opts,
      _resolve: resolve,
    });
  }), []);

  const ui = (
    <>
      {toast && (
        <ToastInternal
          key={`${toast.text}-${toast.kind}`}
          {...toast}
          onDone={() => setToast(null)}
        />
      )}
      {confirmState && (
        <ConfirmInternal
          {...confirmState}
          onConfirm={() => { confirmState._resolve(true);  setConfirmState(null); }}
          onCancel={()  => { confirmState._resolve(false); setConfirmState(null); }}
        />
      )}
    </>
  );

  return { showToast, askConfirm, ui };
}
