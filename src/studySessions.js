// ── Saved Study (pastoral research) chat sessions ────────────────────────────
// localStorage, per device. Shared between ChurchAiChat (owner) and the
// Desk/Notes surfaces, which check which series names actually have a saved
// session before offering "Open session →" — a series named by hand has no
// session, and the button shouldn't promise one.

export function convKey(userId, churchId) { return `church-pastoral-convs-${userId ?? 'anon'}-${churchId ?? 'x'}`; }
export function readConvs(userId, churchId) { try { return JSON.parse(localStorage.getItem(convKey(userId, churchId))) ?? []; } catch { return []; } }
export function writeConvs(userId, churchId, convs) { try { localStorage.setItem(convKey(userId, churchId), JSON.stringify(convs)); } catch {} }
export function studySessionTitles(userId, churchId) { return readConvs(userId, churchId).map((c) => c.title).filter(Boolean); }
