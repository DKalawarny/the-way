import { useEffect, useState } from 'react';

/**
 * Lightweight viewport hook for responsive layouts.
 *
 * Breakpoints:
 *   narrow   < 480px  — compact phone
 *   mobile   < 640px  — all phones
 *   tablet   640–1023px
 *   desktop  ≥ 1024px — sidebar nav, docked chat panel
 */
export function useViewport() {
  const [width, setWidth] = useState(() => window.innerWidth);

  useEffect(() => {
    let frame;
    const h = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setWidth(window.innerWidth));
    };
    window.addEventListener('resize', h, { passive: true });
    return () => {
      window.removeEventListener('resize', h);
      cancelAnimationFrame(frame);
    };
  }, []);

  return {
    width,
    isNarrow:  width < 480,
    isMobile:  width < 640,
    isTablet:  width >= 640 && width < 1024,
    isDesktop: width >= 1024,
  };
}
