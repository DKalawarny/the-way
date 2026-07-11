import { useRef, useState } from 'react';

/**
 * SwipeableSheet — drop-in replacement for a modal inner panel.
 *
 * On mobile (≤639px) the .modal-sheet CSS snaps this to the bottom of the
 * viewport and slides it up. The drag handle at the top lets users swipe
 * down to dismiss — the same gesture every native iOS/Android sheet uses.
 *
 * On desktop the .modal-sheet media query has no effect, so this renders
 * as a normal centered dialog panel. The swipe logic is touch-only and is
 * a no-op with a mouse.
 *
 * Usage:
 *   <SwipeableSheet onDismiss={onClose} style={{ background: T.cream, ... }}>
 *     …modal content…
 *   </SwipeableSheet>
 *
 * Props:
 *   onDismiss   — called after the dismiss animation completes
 *   canDismiss  — set false while an async action is running so the user
 *                 can't accidentally swipe away mid-save (default true)
 *   className   — extra classes merged with "modal-sheet" (e.g. "fade-up")
 *   style       — inline styles for the panel (background, padding, etc.)
 */
export default function SwipeableSheet({
  onDismiss,
  children,
  className = '',
  style = {},
  canDismiss = true,
  ...rest
}) {
  const [dragY,  setDragY]  = useState(0);
  const [phase,  setPhase]  = useState('idle'); // idle | dragging | springing | dismissing
  const dragRef = useRef(null);

  function onTouchStart(e) {
    dragRef.current = {
      startY: e.touches[0].clientY,
      startT: Date.now(),
      lastY:  e.touches[0].clientY,
    };
  }

  function onTouchMove(e) {
    if (!dragRef.current) return;
    const dy = e.touches[0].clientY - dragRef.current.startY;
    dragRef.current.lastY = e.touches[0].clientY;
    if (dy > 0) { setPhase('dragging'); setDragY(dy); }
  }

  function onTouchEnd() {
    if (!dragRef.current) return;
    const elapsed  = Date.now() - dragRef.current.startT;
    const velocity = dragY / Math.max(elapsed, 1);
    dragRef.current = null;

    if (!canDismiss) {
      // Bounce back — can't dismiss while busy
      setPhase('springing');
      setDragY(0);
      setTimeout(() => setPhase('idle'), 320);
      return;
    }

    if (dragY > 100 || velocity > 0.45) {
      // Dismiss
      setPhase('dismissing');
      setTimeout(onDismiss, 310);
    } else {
      // Spring back
      setPhase('springing');
      setDragY(0);
      setTimeout(() => setPhase('idle'), 320);
    }
  }

  const transform =
    phase === 'dismissing' ? 'translateY(110%)' :
    phase === 'dragging'   ? `translateY(${dragY}px)` :
    undefined;

  const transition =
    phase === 'springing'  ? 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)' :
    phase === 'dismissing' ? 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)' :
    undefined;

  return (
    <div
      role="dialog"
      aria-modal="true"
      {...rest}
      className={`modal-sheet ${className}`.trim()}
      style={{ ...style, transform, transition }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* ── Drag handle ────────────────────────────────────────────────────
          Only this area intercepts touch events — the modal content below
          can still scroll freely without triggering the dismiss gesture. */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        aria-label="Drag to dismiss"
        style={{
          padding: '10px 0 6px',
          display: 'flex',
          justifyContent: 'center',
          touchAction: 'none',
          cursor: 'grab',
          marginTop: -4,
          marginBottom: 4,
          userSelect: 'none',
        }}
      >
        <div style={{
          width: 36,
          height: 4,
          borderRadius: 2,
          background: 'rgba(44,24,16,0.13)',
          flexShrink: 0,
        }} />
      </div>

      {children}
    </div>
  );
}
