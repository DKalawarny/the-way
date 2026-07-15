// Detects the Capacitor-wrapped native app (iOS/Android) vs the website.
// Capacitor injects window.Capacitor into its webview even when no plugin JS
// is imported; the protocol check is a belt-and-suspenders fallback.
// Used to hide web-only affordances that dead-end inside the app shell
// (Google OAuth, Stripe checkout, service worker, deploy-reload banner).
export const isNativeApp =
  typeof window !== 'undefined' &&
  (window.Capacitor?.isNativePlatform?.() === true ||
    window.location.protocol === 'capacitor:');

// window.open('mailto:…') returns null inside the native webview and the
// email never opens. Main-frame navigation works there — Capacitor's
// navigation delegate hands mailto:/tel:/sms: to the system and cancels
// the navigation, so the app stays put. Keep window.open on the web.
export function openMailto(href) {
  if (isNativeApp) window.location.href = href;
  else window.open(href);
}
