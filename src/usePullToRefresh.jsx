import { useEffect, useRef, useState } from 'react';
import { T } from './theme.js';
import { KinwoveStar } from './components/brand/KinwoveStar.jsx';

// Pull-to-refresh for window-scrolled feeds. Native overscroll is disabled
// app-wide (overscroll-behavior: none in theme.js), so this reimplements the
// gesture: drag down while already at the top → spinner → onRefresh().
// Touch-only by nature (no-op on desktop). The page itself doesn't move —
// only the indicator responds — which keeps scrolling silky and avoids
// fighting the browser for the gesture.
export function usePullToRefresh(onRefresh, scrollRef) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const pullRef = useRef(0);
  const busyRef = useRef(false);

  useEffect(() => {
    // Feeds scroll an inner container (.scene layouts), not the window.
    const scrollTop = () => (scrollRef?.current ? scrollRef.current.scrollTop : window.scrollY);
    function onTouchStart(e) {
      if (busyRef.current || scrollTop() > 0) { startY.current = null; return; }
      startY.current = e.touches[0].clientY;
    }
    function onTouchMove(e) {
      if (startY.current == null || busyRef.current) return;
      if (scrollTop() > 0) { startY.current = null; pullRef.current = 0; setPull(0); return; }
      const dy = e.touches[0].clientY - startY.current;
      const eased = dy > 0 ? Math.min(110, dy * 0.45) : 0; // resistance
      pullRef.current = eased;
      setPull(eased);
    }
    async function onTouchEnd() {
      if (startY.current == null) return;
      startY.current = null;
      const triggered = pullRef.current >= 40;
      pullRef.current = 0;
      if (!triggered || busyRef.current) { setPull(0); return; }
      busyRef.current = true;
      setRefreshing(true);
      setPull(0);
      try { await onRefresh?.(); } catch {}
      // Brief hold so the spinner reads as "did something" on fast reloads.
      setTimeout(() => { setRefreshing(false); busyRef.current = false; }, 350);
    }
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [onRefresh, scrollRef]);

  return { pull, refreshing };
}

// Floating indicator chip — renders under the fixed header, pointer-inert.
export function PullToRefreshIndicator({ pull, refreshing }) {
  const visible = refreshing || pull > 6;
  const progress = Math.min(1, pull / 40);
  return (
    <div aria-hidden style={{
      position: 'fixed', left: '50%', zIndex: 105,
      top: 'calc(env(safe-area-inset-top, 0px) + 62px)',
      transform: `translateX(-50%) translateY(${visible ? Math.min(pull, 80) * 0.35 : -16}px)`,
      opacity: visible ? (refreshing ? 1 : progress) : 0,
      transition: 'opacity 0.15s ease, transform 0.15s ease',
      width: 38, height: 38, borderRadius: '50%',
      background: T.parchment, border: '1px solid rgba(26,17,8,0.12)',
      boxShadow: '0 2px 10px rgba(44,24,16,0.14)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      pointerEvents: 'none',
    }}>
      <span style={{
        display: 'inline-flex',
        transform: refreshing ? undefined : `rotate(${progress * 180}deg)`,
        animation: refreshing ? 'kwPtrSpin 0.9s linear infinite' : 'none',
      }}>
        <KinwoveStar size={18} />
      </span>
    </div>
  );
}
