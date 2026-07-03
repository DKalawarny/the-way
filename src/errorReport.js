// Lightweight client-side error reporting — no third-party SDK.
// Sends crashes/unhandled errors to the server, which logs them (visible in
// Render logs) and can email an alert. Deduped + throttled so a looping error
// can't spam. Only reports in production; in dev it just logs to the console.

const seen = new Set();
let lastSentAt = 0;

export function reportClientError(err, context = {}) {
  try {
    const message = (err && err.message) ? err.message : String(err ?? 'Unknown error');
    const stack = (err && err.stack) ? String(err.stack) : '';

    if (!import.meta.env.PROD) {
      console.error('[client-error]', message, context, stack);
      return;
    }

    // Dedupe identical messages per session; throttle overall to 1 / 8s.
    const key = message.slice(0, 200);
    const now = Date.now();
    if (seen.has(key) || now - lastSentAt < 8000) return;
    seen.add(key);
    lastSentAt = now;

    const body = JSON.stringify({
      message,
      stack: stack.slice(0, 4000),
      url: typeof location !== 'undefined' ? location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      ...context,
    });

    // keepalive lets it send even during a navigation/unload.
    fetch('/api/client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Reporting must never throw.
  }
}

// Attach global handlers once. Call from app entry.
export function installGlobalErrorReporting() {
  if (typeof window === 'undefined') return;
  window.addEventListener('error', (e) => {
    reportClientError(e.error || e.message, { kind: 'window.onerror' });
  });
  window.addEventListener('unhandledrejection', (e) => {
    reportClientError(e.reason, { kind: 'unhandledrejection' });
  });
}
