import { useEffect } from 'react';

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
