import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { T } from './theme.js';

/* ── Auto-growing text boxes ─────────────────────────────────────────────────
   Makes every <textarea> grow with its content as you type instead of showing
   an inner scrollbar — so composing a long post, prayer, or sermon feels open
   rather than cramped. Caps at 45% of the viewport, then scrolls.

   Global (sweep + MutationObserver) like the spell-check helper, so it covers
   all textareas now and any added later with no per-field wiring. A field can
   opt out with `data-noautogrow`.
── */

function maxPx() {
  return Math.round((typeof window !== 'undefined' ? window.innerHeight : 800) * 0.45);
}

function grow(el) {
  if (!el || el.tagName !== 'TEXTAREA') return;
  if (el.dataset && el.dataset.noautogrow !== undefined) return;
  const cap = maxPx();
  el.style.height = 'auto';                                   // reset so scrollHeight is accurate
  const next = Math.min(el.scrollHeight, cap);
  el.style.height = next + 'px';
  el.style.overflowY = el.scrollHeight > cap ? 'auto' : 'hidden';
}

/* ── Offline banner ──────────────────────────────────────────────────────────
   A quiet strip at the top when the connection drops, so a failed post or load
   reads as "you're offline" rather than "the app is broken." Auto-hides when
   the connection returns (with a brief "Back online" confirmation).
── */
export function OfflineBanner() {
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine
  );
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let t = null;
    function goOnline() {
      setOnline(true);
      setJustReconnected(true);
      t = setTimeout(() => setJustReconnected(false), 2600);
    }
    function goOffline() { setOnline(false); setJustReconnected(false); }
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      if (t) clearTimeout(t);
    };
  }, []);

  if (online && !justReconnected) return null;

  const offlineStyle = {
    background: '#3a2a1a', color: '#F5EDD8', borderBottom: `1px solid ${T.gold}55`,
  };
  const backStyle = {
    background: T.gold, color: '#FDF8EE', borderBottom: 'none',
  };

  return createPortal(
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      padding: '7px 14px', fontFamily: T.display, fontSize: 13, fontWeight: 500,
      textAlign: 'center', paddingTop: 'calc(7px + env(safe-area-inset-top, 0px))',
      ...(online ? backStyle : offlineStyle),
    }}>
      {online ? 'Back online' : "You're offline — some things may not load or save until you reconnect."}
    </div>,
    document.body,
  );
}

/* ── "Copied!" confirmation ──────────────────────────────────────────────────
   Wraps navigator.clipboard.writeText once so ANY copy in the app — invite
   codes, share links, anything added later — flashes a small confirmation.
── */
export function CopyToast() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    const clip = navigator.clipboard;
    const original = clip.writeText.bind(clip);
    let hideTimer = null;
    function patched(text) {
      return original(text).then(
        (r) => {
          setShow(true);
          if (hideTimer) clearTimeout(hideTimer);
          hideTimer = setTimeout(() => setShow(false), 1600);
          return r;
        },
        (err) => { throw err; },   // copy failed — no toast
      );
    }
    try { clip.writeText = patched; } catch { /* non-writable — skip */ }
    return () => {
      try { clip.writeText = original; } catch { /* ignore */ }
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, []);

  if (!show) return null;

  return createPortal(
    <div style={{
      position: 'fixed', left: '50%', bottom: 'calc(78px + env(safe-area-inset-bottom, 0px))',
      transform: 'translateX(-50%)', zIndex: 100000, pointerEvents: 'none',
      background: T.ink, color: T.cream, borderRadius: 999,
      padding: '9px 18px', fontFamily: T.display, fontSize: 13.5, fontWeight: 600,
      boxShadow: '0 6px 22px rgba(26,17,8,0.28)',
      display: 'flex', alignItems: 'center', gap: 7,
    }}>
      <span aria-hidden>✓</span> Copied
    </div>,
    document.body,
  );
}

/* ── Cmd / Ctrl + Enter to submit ────────────────────────────────────────────
   Pressing ⌘/Ctrl + Enter while writing fires that composer's submit button.
   Opt-in + safe: it only acts inside a container marked `data-compose`, and
   only clicks a button marked `data-submit` that isn't disabled — so it can
   never trigger the wrong action. Add those two attributes to a composer to
   enable it there.
── */
export function CmdEnterSubmit() {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    function onKeyDown(e) {
      if (e.key !== 'Enter' || !(e.metaKey || e.ctrlKey)) return;
      const el = e.target;
      if (!el || (el.tagName !== 'TEXTAREA' && el.tagName !== 'INPUT')) return;
      const scope = el.closest && el.closest('[data-compose]');
      if (!scope) return;
      const btn = scope.querySelector('[data-submit]:not([disabled])');
      if (btn) { e.preventDefault(); btn.click(); }
    }
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, []);
  return null;
}

export function AutoGrowTextareas() {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    function onInput(e) {
      if (e.target && e.target.tagName === 'TEXTAREA') grow(e.target);
    }
    // Re-fit when the value changes programmatically (draft restore, AI fill)
    // or the window resizes — these don't fire `input`.
    function onResize() {
      document.querySelectorAll('textarea').forEach(grow);
    }

    document.addEventListener('input', onInput, true);
    window.addEventListener('resize', onResize);

    document.querySelectorAll('textarea').forEach(grow);

    const obs = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node.tagName === 'TEXTAREA') grow(node);
          else if (node.querySelectorAll) node.querySelectorAll('textarea').forEach(grow);
        }
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener('input', onInput, true);
      window.removeEventListener('resize', onResize);
      obs.disconnect();
    };
  }, []);

  return null;
}
