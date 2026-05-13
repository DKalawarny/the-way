/**
 * UTM / referral capture
 *
 * Call captureUtm() once on app load (in main.jsx).
 * It reads the URL's query string and saves any marketing params to
 * localStorage — so even if the user signs up later in a different session
 * the attribution data is still there.
 *
 * Call getStoredUtm() anywhere you want to read the stored params
 * (e.g. on signup to attach to the user profile or a waitlist record).
 */

const STORAGE_KEY = 'tw_utm';
const UTM_PARAMS  = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref'];

export function captureUtm() {
  try {
    const p = new URLSearchParams(window.location.search);
    const found = {};
    UTM_PARAMS.forEach((k) => { if (p.get(k)) found[k] = p.get(k); });

    // Only write if we actually found something, and only if we don't
    // already have a stored value (first-touch attribution).
    if (Object.keys(found).length && !localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...found,
        landing_url: window.location.href,
        captured_at: new Date().toISOString(),
      }));
    }
  } catch {
    // localStorage blocked (private browsing, storage full) — fail silently
  }
}

export function getStoredUtm() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
  } catch {
    return null;
  }
}

export function clearStoredUtm() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}
