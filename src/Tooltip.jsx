import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { T } from './theme.js';

/* ── GlobalTooltip ───────────────────────────────────────────────────────────
   One component, mounted once at the app root, that gives every button a
   branded hover explanation. It reads the `title` (or `data-tip`) text already
   on elements, suppresses the plain native OS tooltip, and renders a parchment
   + serif bubble instead.

   - Works app-wide with zero per-button wiring: any element with a `title`
     attribute is picked up automatically.
   - Hover-only by design (no `hover: hover` → touch devices → does nothing),
     so phones/tablets are unaffected.
   - To give a button hover text, just add `title="…"` (or `data-tip="…"` to
     opt in without the native fallback) in its JSX.
── */

const SHOW_DELAY = 350;   // ms before a tip appears — avoids flicker on pass-through
const GAP        = 9;     // px between the bubble and the element
const MARGIN      = 8;    // px min distance from viewport edge
const MAX_WIDTH  = 260;

export function GlobalTooltip() {
  const [tip, setTip]   = useState(null);  // { text, rect }
  const [pos, setPos]   = useState(null);  // { left, top, below, arrowX }
  const timerRef        = useRef(null);
  const currentElRef    = useRef(null);
  const nodeRef         = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Only on devices that actually hover — skip touch (no hover there).
    if (!window.matchMedia || !window.matchMedia('(hover: hover)').matches) return;

    function tipElFrom(target) {
      return target && target.closest ? target.closest('[data-tip], [title], [aria-label]') : null;
    }

    function readText(el) {
      const dt = el.getAttribute('data-tip');
      if (dt) return dt;
      const title = el.getAttribute('title');
      if (title && title.trim()) {
        // Stash + remove so the browser's plain native tooltip won't also show.
        el.setAttribute('data-tip', title);
        el.removeAttribute('title');
        el.__tipFromTitle = true;
        return title;
      }
      // Fall back to the accessibility label — these sit on exactly the
      // icon-only buttons (Back, Close, Menu, Notifications…) that need a hint.
      // We only READ it (never remove it) so screen readers still work.
      const aria = el.getAttribute('aria-label');
      if (aria && aria.trim()) return aria;
      return '';
    }

    function restore(el) {
      if (el && el.__tipFromTitle) {
        const dt = el.getAttribute('data-tip');
        if (dt) el.setAttribute('title', dt);
        el.removeAttribute('data-tip');
        el.__tipFromTitle = false;
      }
    }

    function clearTimer() {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    }

    function hide() {
      clearTimer();
      if (currentElRef.current) restore(currentElRef.current);
      currentElRef.current = null;
      setTip(null);
      setPos(null);
    }

    function onOver(e) {
      const el = tipElFrom(e.target);
      if (!el || el === currentElRef.current) return;
      clearTimer();
      if (currentElRef.current) restore(currentElRef.current);
      currentElRef.current = el;
      const text = readText(el);
      if (!text) { currentElRef.current = null; return; }
      timerRef.current = setTimeout(() => {
        if (!el.isConnected) { hide(); return; }
        setTip({ text, rect: el.getBoundingClientRect() });
      }, SHOW_DELAY);
    }

    function onOut(e) {
      const el = tipElFrom(e.target);
      if (el && el === currentElRef.current) {
        const to = e.relatedTarget;
        if (!to || !el.contains(to)) hide();
      }
    }

    document.addEventListener('mouseover', onOver, true);
    document.addEventListener('mouseout', onOut, true);
    document.addEventListener('focusin', onOver, true);
    document.addEventListener('focusout', onOut, true);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('wheel', hide, { passive: true });
    window.addEventListener('pointerdown', hide, true);
    window.addEventListener('blur', hide);

    return () => {
      clearTimer();
      if (currentElRef.current) restore(currentElRef.current);
      document.removeEventListener('mouseover', onOver, true);
      document.removeEventListener('mouseout', onOut, true);
      document.removeEventListener('focusin', onOver, true);
      document.removeEventListener('focusout', onOut, true);
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('wheel', hide);
      window.removeEventListener('pointerdown', hide, true);
      window.removeEventListener('blur', hide);
    };
  }, []);

  // Measure the rendered bubble, then place it (above the element, flipping
  // below when there isn't room) and clamp it inside the viewport.
  useLayoutEffect(() => {
    if (!tip || !nodeRef.current) { setPos(null); return; }
    const node = nodeRef.current;
    const tw = node.offsetWidth;
    const th = node.offsetHeight;
    const r  = tip.rect;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const cx = r.left + r.width / 2;
    let left = Math.max(MARGIN, Math.min(cx - tw / 2, vw - tw - MARGIN));

    let below = false;
    let top   = r.top - th - GAP;
    if (top < MARGIN) { top = r.bottom + GAP; below = true; }
    if (below && top + th > vh - MARGIN) top = Math.max(MARGIN, vh - th - MARGIN);

    setPos({ left, top, below, arrowX: Math.max(12, Math.min(cx - left, tw - 12)) });
  }, [tip]);

  if (!tip) return null;

  const arrow = pos && {
    position: 'absolute',
    left: pos.arrowX - 5,
    width: 10, height: 10,
    transform: 'rotate(45deg)',
    background: T.parchment,
    [pos.below ? 'top' : 'bottom']: -5,
    [pos.below ? 'borderLeft' : 'borderRight']: `1px solid ${T.gold}40`,
    [pos.below ? 'borderTop' : 'borderBottom']: `1px solid ${T.gold}40`,
  };

  return createPortal(
    <div
      ref={nodeRef}
      role="tooltip"
      style={{
        position: 'fixed',
        left: pos ? pos.left : -9999,
        top:  pos ? pos.top  : -9999,
        zIndex: 99999,
        maxWidth: MAX_WIDTH,
        pointerEvents: 'none',
        background: T.parchment,
        color: T.ink,
        border: `1px solid ${T.gold}40`,
        borderRadius: 9,
        padding: '7px 11px',
        fontFamily: T.display,
        fontSize: 12.5,
        lineHeight: 1.4,
        boxShadow: '0 6px 22px rgba(26,17,8,0.16), 0 2px 6px rgba(26,17,8,0.10)',
        opacity: pos ? 1 : 0,
        transform: pos ? 'translateY(0)' : 'translateY(2px)',
        transition: 'opacity 0.12s ease, transform 0.12s ease',
      }}
    >
      {tip.text}
      {arrow && <span style={arrow} />}
    </div>,
    document.body,
  );
}
