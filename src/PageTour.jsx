/**
 * PageTour — generic spotlight / coachmark tour for in-page features.
 *
 * Usage:
 *   import PageTour, { isPageTourDone } from './PageTour.jsx';
 *
 *   const STEPS = [
 *     { tourId: 'my-element', title: 'Headline', body: 'Explanation…', color: T.gold },
 *   ];
 *   const STORAGE_KEY = 'kinwove:my_page_tour_done';
 *
 *   // Inside component:
 *   const [showTour, setShowTour] = useState(() => !isPageTourDone(STORAGE_KEY));
 *   {showTour && <PageTour steps={STEPS} storageKey={STORAGE_KEY} onClose={() => setShowTour(false)} />}
 */

import { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { T } from './theme.js';
import { acquireOverlay, releaseOverlay, overlayHolder, subscribeOverlay } from './overlayCoordinator.js';

export function isPageTourDone(storageKey) {
  try { return localStorage.getItem(storageKey) === '1'; } catch { return false; }
}
export function markPageTourDone(storageKey) {
  try { localStorage.setItem(storageKey, '1'); } catch {}
}

const TIP_W   = 264;
const H_PAD   = 8;
const TIP_GAP = 14;

const TIP_H_APPROX = 180; // rough tooltip card height for clamp maths

function placeTooltip(rect) {
  if (!rect) return { style: {}, arrowStyle: {}, arrowDir: null };
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cx  = rect.left + rect.width  / 2;
  const cy  = rect.top  + rect.height / 2;

  // TIP_H_APPROX is only an estimate — long step copy on narrow phones renders
  // far taller, pushing the action button below the screen edge with no way to
  // finish the tour. A hard maxHeight + internal scroll keeps it reachable.
  const fit = (top) => ({ maxHeight: vh - top - 12, overflowY: 'auto' });

  // Left sidebar → tooltip to the RIGHT
  if (rect.right < vw * 0.38) {
    const top      = Math.max(12, Math.min(cy - 72, vh - 200));
    const arrowTop = cy - top - 8;
    return {
      style: { position: 'fixed', left: rect.right + TIP_GAP, top, width: TIP_W, ...fit(top) },
      arrowStyle: {
        position: 'absolute', left: -8,
        top: Math.max(14, Math.min(arrowTop, 100)),
        borderTop: '8px solid transparent', borderBottom: '8px solid transparent',
        borderRight: `8px solid ${T.white}`, width: 0, height: 0,
      },
      arrowDir: 'left',
    };
  }

  const left      = Math.max(12, Math.min(cx - TIP_W / 2, vw - TIP_W - 12));
  const arrowLeft = cx - left - 8;
  const arrL      = Math.max(14, Math.min(arrowLeft, TIP_W - 28));

  // Prefer BELOW when element centre is in the top 55% of viewport
  const preferBelow = cy < vh * 0.55;

  if (preferBelow) {
    // Tooltip BELOW the element — clamp so it doesn't fall off the bottom
    const topVal = Math.min(rect.bottom + TIP_GAP, vh - TIP_H_APPROX - 12);
    return {
      style: { position: 'fixed', left, top: topVal, width: TIP_W, ...fit(topVal) },
      arrowStyle: {
        position: 'absolute', top: -8, left: arrL,
        borderLeft: '8px solid transparent', borderRight: '8px solid transparent',
        borderBottom: `8px solid ${T.white}`, width: 0, height: 0,
      },
      arrowDir: 'up',
    };
  }

  // Tooltip ABOVE the element — clamp so it doesn't clip the top
  const bottomVal = vh - rect.top + TIP_GAP;
  const topClamp  = vh - bottomVal - TIP_H_APPROX;
  if (topClamp < 12) {
    // Not enough room above — fall back to below
    const topVal = Math.min(rect.bottom + TIP_GAP, vh - TIP_H_APPROX - 12);
    return {
      style: { position: 'fixed', left, top: topVal, width: TIP_W, ...fit(topVal) },
      arrowStyle: {
        position: 'absolute', top: -8, left: arrL,
        borderLeft: '8px solid transparent', borderRight: '8px solid transparent',
        borderBottom: `8px solid ${T.white}`, width: 0, height: 0,
      },
      arrowDir: 'up',
    };
  }

  return {
    style: { position: 'fixed', left, bottom: bottomVal, width: TIP_W, maxHeight: vh - bottomVal - 12, overflowY: 'auto' },
    arrowStyle: {
      position: 'absolute', bottom: -8, left: arrL,
      borderLeft: '8px solid transparent', borderRight: '8px solid transparent',
      borderTop: `8px solid ${T.white}`, width: 0, height: 0,
    },
    arrowDir: 'down',
  };
}

export default function PageTour({ steps = [], storageKey, onClose }) {
  const [step,       setStep]       = useState(0);
  const [exiting,    setExiting]    = useState(false);
  const [targetRect, setTargetRect] = useState(null);
  const slotId = `page-tour:${storageKey ?? 'anon'}`;
  // One overlay at a time: wait until the shared slot frees up (e.g. the
  // welcome tour or a coach mark), then claim it.
  const [granted, setGranted] = useState(() => acquireOverlay(slotId));
  useEffect(() => {
    if (granted) return undefined;
    const unsub = subscribeOverlay(() => {
      if (!overlayHolder()) setGranted(acquireOverlay(slotId));
    });
    return unsub;
  }, [granted, slotId]);
  useEffect(() => () => releaseOverlay(slotId), [slotId]);

  const s      = steps[step] ?? steps[0];
  const isLast = step === steps.length - 1;
  const total  = steps.length;

  // Re-measure the target element's position and update the spotlight.
  // Called on mount, step change, scroll, and resize so sticky/fixed
  // elements always track correctly regardless of scroll state.
  const measureTarget = useCallback(() => {
    if (!s?.tourId) { setTargetRect(null); return; }
    const el = document.querySelector(`[data-tour-id="${s.tourId}"]`);
    if (!el) { setTargetRect(null); return; }
    // Scroll element into view (nearest edge only — avoids unexpected jumps
    // for elements inside sticky containers where 'center' can overshoot).
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const inView = r.top >= 0 && r.bottom <= vh;
    if (!inView) {
      el.scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'nearest' });
    }
    // Two rAF frames to let the browser finish any layout/sticky recalc
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTargetRect(el.getBoundingClientRect());
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, s?.tourId]);

  useLayoutEffect(() => {
    // Small initial delay so the page is fully laid out before first measurement
    const id = setTimeout(measureTarget, 80);
    return () => clearTimeout(id);
  }, [measureTarget]);

  // Keep spotlight tracking even when user scrolls or resizes
  useEffect(() => {
    window.addEventListener('scroll', measureTarget, { passive: true, capture: true });
    window.addEventListener('resize', measureTarget, { passive: true });
    return () => {
      window.removeEventListener('scroll', measureTarget, { capture: true });
      window.removeEventListener('resize', measureTarget);
    };
  }, [measureTarget]);

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

  function advance()     { if (step < steps.length - 1) setStep(v => v + 1); else handleClose(); }
  function retreat()     { if (step > 0) setStep(v => v - 1); }
  function handleClose() {
    setExiting(true);
    if (storageKey) markPageTourDone(storageKey);
    setTimeout(() => onClose?.(), 280);
  }

  if (!s) return null;
  if (!granted) return null;

  const { style: tipStyle, arrowStyle } = placeTooltip(targetRect);

  const stepDots = (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {steps.map((_, i) => (
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

  const overlay = (
    <div style={{ opacity: exiting ? 0 : 1, transition: 'opacity 0.28s ease', pointerEvents: exiting ? 'none' : undefined }}>

      {/* Dark surround — transparent backdrop if no target yet */}
      {targetRect ? (
        /* Click-to-dismiss invisible backdrop */
        <div
          onClick={handleClose}
          style={{ position: 'fixed', inset: 0, background: 'transparent', zIndex: 8999, cursor: 'default' }}
        />
      ) : (
        /* Full-screen dark blur while target is still being found */
        <div
          onClick={handleClose}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(14,7,3,0.55)',
            zIndex: 8999,
          }}
        />
      )}

      {/* Spotlight highlight */}
      {targetRect && (
        <div style={{
          position: 'fixed',
          top:    targetRect.top    - H_PAD,
          left:   targetRect.left   - H_PAD,
          width:  targetRect.width  + H_PAD * 2,
          height: targetRect.height + H_PAD * 2,
          borderRadius: 14,
          boxShadow: '0 0 0 9999px rgba(14,7,3,0.72)',
          zIndex: 9000,
          pointerEvents: 'none',
          outline: `2px solid ${s.color}88`,
          outlineOffset: 2,
          transition: 'top 0.22s ease, left 0.22s ease, width 0.22s ease, height 0.22s ease',
        }} />
      )}

      {/* Tooltip card */}
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
            animation: 'pageTourFadeUp 0.25s ease both',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={arrowStyle} />

          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
            color: s.color, textTransform: 'uppercase', marginBottom: 5, fontFamily: T.sans,
          }}>
            {step + 1} of {total}
          </div>

          <div style={{
            fontFamily: T.serif, fontSize: 16.5, fontWeight: 600,
            color: T.ink, lineHeight: 1.2, marginBottom: 6,
          }}>
            {s.title}
          </div>

          <p style={{
            fontFamily: T.display, fontSize: 13.5, color: T.inkSoft,
            lineHeight: 1.6, margin: '0 0 13px',
          }}>
            {s.body}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {stepDots}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {step > 0 && (
                <button
                  onClick={retreat}
                  style={{
                    background: 'none', border: `1px solid ${T.line}`, borderRadius: 999,
                    padding: '6px 12px', fontSize: 12.5, color: T.inkSoft, cursor: 'pointer',
                  }}
                >←</button>
              )}
              <button
                onClick={advance}
                style={{
                  background: s.color, border: 'none', borderRadius: 999,
                  padding: '7px 15px', fontSize: 13, fontWeight: 600,
                  color: '#FDF8EE', cursor: 'pointer',
                }}
              >{isLast ? 'Got it ✓' : 'Next →'}</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pageTourFadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );

  // Portal to document.body so position:fixed is always relative to the
  // true viewport, regardless of ancestor overflow or transform contexts.
  return createPortal(overlay, document.body);
}
