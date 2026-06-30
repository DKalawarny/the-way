import { useEffect, useRef } from 'react';

/* ── useDraft ────────────────────────────────────────────────────────────────
   Auto-saves a text field to localStorage so a half-written post / sermon /
   prayer survives a reload, a tab recycle, or an accidental navigation away.

   - Restores once on mount IF the field is currently empty (never clobbers
     text the user is already looking at).
   - Saves debounced as they type; clears the saved copy when the field empties.
   - Keys are user-scoped (`kw:draft:<userId>:<key>`) so one person's draft can
     never surface in another account on a shared device. See the localStorage
     privacy rule in memory.

   Returns clearDraft() — call it right after a successful submit so the draft
   doesn't linger.

   Usage:
     const clearDraft = useDraft('post:me', text, setText, session?.user?.id);
     // …after a successful post: reset(); clearDraft();
── */
export function useDraft(key, value, setValue, userId) {
  const storageKey = userId && key ? `kw:draft:${userId}:${key}` : null;
  const restored = useRef(false);

  // Restore once, only into an empty field.
  useEffect(() => {
    if (!storageKey || restored.current) return;
    restored.current = true;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved && !value) setValue(saved);
    } catch { /* private mode / quota — ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Save (debounced) as the value changes.
  useEffect(() => {
    if (!storageKey) return;
    const t = setTimeout(() => {
      try {
        if (value && value.trim()) localStorage.setItem(storageKey, value);
        else localStorage.removeItem(storageKey);
      } catch { /* ignore */ }
    }, 400);
    return () => clearTimeout(t);
  }, [storageKey, value]);

  return function clearDraft() {
    try { if (storageKey) localStorage.removeItem(storageKey); } catch { /* ignore */ }
  };
}
