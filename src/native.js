// Detects the Capacitor-wrapped native app (iOS/Android) vs the website.
// Capacitor injects window.Capacitor into its webview even when no plugin JS
// is imported; the protocol check is a belt-and-suspenders fallback.
// Used to hide web-only affordances that dead-end inside the app shell
// (Google OAuth, Stripe checkout, service worker, deploy-reload banner).
export const isNativeApp =
  typeof window !== 'undefined' &&
  (window.Capacitor?.isNativePlatform?.() === true ||
    window.location.protocol === 'capacitor:');

// In the native app the page is served from capacitor://localhost, so every
// relative '/api/…' fetch resolves to a dead capacitor URL — the Bible reader,
// AI chat, TTS, and every other backend feature silently fails. Rewriting at
// the fetch layer fixes all call sites at once; the server's CORS allowlist
// already includes capacitor://localhost.
const API_ORIGIN = 'https://www.kinwove.com';
if (isNativeApp && typeof window.fetch === 'function') {
  const origFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    if (typeof input === 'string' && input.startsWith('/api/')) {
      input = API_ORIGIN + input;
    } else if (input instanceof Request) {
      const u = new URL(input.url);
      if (u.protocol === 'capacitor:' && u.pathname.startsWith('/api/')) {
        input = new Request(API_ORIGIN + u.pathname + u.search, input);
      }
    }
    return origFetch(input, init);
  };
}

// window.open('mailto:…') returns null inside the native webview and the
// email never opens. Main-frame navigation works there — Capacitor's
// navigation delegate hands mailto:/tel:/sms: to the system and cancels
// the navigation, so the app stays put. Keep window.open on the web.
export function openMailto(href) {
  if (isNativeApp) window.location.href = href;
  else window.open(href);
}
