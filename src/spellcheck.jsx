import { useEffect } from 'react';

/* ── Site-wide spell check ───────────────────────────────────────────────────
   Turns the browser's built-in spell checker ON for every prose field — so
   misspelled words get the red squiggle (right-click to fix) as people write
   posts, prayers, comments, chat messages, and notes.

   Why a global helper instead of adding spellCheck to each field:
   - Covers all 47 textareas + the contentEditable note editor at once, and any
     added in future, with zero per-field wiring.
   - Browsers usually default textareas to spell-check ON, but that default is
     NOT guaranteed inside the iOS/Android Capacitor webview (App Store build) —
     setting it explicitly makes it reliable there too.

   Scope is prose fields only (textarea + contenteditable). Plain <input>s are
   left alone so structured fields — emails, names, invite codes, search — don't
   get pointless squiggles. Any field can opt out with spellCheck={false}.
── */

const SELECTOR = 'textarea, [contenteditable=""], [contenteditable="true"]';

function enable(el) {
  if (!el || typeof el.getAttribute !== 'function') return;
  if (el.getAttribute('spellcheck') === 'false') return;   // respect opt-out
  if (el.getAttribute('spellcheck') !== 'true') el.setAttribute('spellcheck', 'true');
}

export function SpellcheckEnabler() {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    // Initial sweep over anything already mounted.
    document.querySelectorAll(SELECTOR).forEach(enable);

    // Catch fields mounted later (modals, composers, lazy routes).
    const obs = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node.matches && node.matches(SELECTOR)) enable(node);
          if (node.querySelectorAll) node.querySelectorAll(SELECTOR).forEach(enable);
        }
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });

    return () => obs.disconnect();
  }, []);

  return null;
}
