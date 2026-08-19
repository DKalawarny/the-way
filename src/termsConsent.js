import { TERMS_VERSION } from './constants.js';

// Recording that someone agreed to the Terms. The email path can do this inline
// because signUp returns a user id straight away. Google can't: the browser
// leaves for the OAuth round-trip and comes back into App.jsx, by which point
// the Auth screen — and the ticked box — are long gone. So the intent is parked
// in localStorage on the way out and flushed when a session reappears.
const PENDING_KEY = 'kw:terms-pending';

export function recordTermsAcceptance(userId, version = TERMS_VERSION) {
  if (!userId) return;
  // Fire and forget: the account exists either way, and a failed log must never
  // stand between someone and the app. The server stamps time, IP and agent.
  fetch('/api/terms-accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, version }),
  }).then(null, () => {});
}

// Called just before handing the browser to Google, only once the box is ticked.
export function markTermsPending() {
  try { localStorage.setItem(PENDING_KEY, TERMS_VERSION); } catch {}
}

// Called whenever a session appears. Deliberately does nothing without a parked
// version — arriving with a session is not itself agreement, and a log entry
// nobody actually consented to is worse than no entry at all.
export function flushPendingTerms(userId) {
  if (!userId) return;
  let pending = null;
  try { pending = localStorage.getItem(PENDING_KEY); } catch { return; }
  if (!pending) return;
  try { localStorage.removeItem(PENDING_KEY); } catch {}
  recordTermsAcceptance(userId, pending);
}
