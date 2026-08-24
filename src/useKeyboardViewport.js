import { useState, useEffect } from 'react';

// {height, offsetTop} of the visual viewport while the on-screen keyboard is
// open, or null when it's closed.
//
// iOS Safari / WKWebView never shrink 100vh for the keyboard — they scroll the
// layout viewport instead, which strands position:fixed panels mid-screen: the
// composer ends up buried under the keyboard and the panel's own close button
// can slide off the top. Pinning a panel to the visual viewport instead keeps
// its header and composer where the user can actually reach them.
//
// Also mirrors the height into a --vvh CSS var so full-screen modals (comments,
// sermon threads) can shrink above the keyboard without wiring up the hook.
//
// Lives in its own module because both App (the Ask panel) and BibleReader (the
// commentary sheet) need it — the Bible sheet was still on a fixed 65vh, so on
// a phone the keyboard covered its input and the bottom of the conversation
// (Daniel, 8/24).
export function useKeyboardViewport() {
  const [kbViewport, setKbViewport] = useState(null);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onChange = () => {
      const kbOpen = document.documentElement.clientHeight - vv.height > 80;
      if (kbOpen) {
        document.documentElement.style.setProperty('--vvh', `${Math.round(vv.height)}px`);
      } else {
        document.documentElement.style.removeProperty('--vvh');
      }
      setKbViewport((prev) => {
        const next = kbOpen ? { height: Math.round(vv.height), offsetTop: Math.round(vv.offsetTop) } : null;
        if (!prev && !next) return prev;
        if (prev && next && prev.height === next.height && prev.offsetTop === next.offsetTop) return prev;
        return next;
      });
    };
    onChange();
    vv.addEventListener('resize', onChange);
    vv.addEventListener('scroll', onChange);
    return () => {
      vv.removeEventListener('resize', onChange);
      vv.removeEventListener('scroll', onChange);
    };
  }, []);
  return kbViewport;
}
