import { useEffect, useRef } from 'react';

// Cloudflare Turnstile — invisible-ish bot check on the auth forms.
// Renders nothing (and requires no token) until VITE_TURNSTILE_SITE_KEY is set,
// so the app works unchanged until you turn it on.
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;
export const TURNSTILE_ENABLED = !!SITE_KEY;

let scriptPromise = null;
function loadScript() {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.turnstile) return resolve();
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    document.head.appendChild(s);
  });
  return scriptPromise;
}

// onToken(token) fires when solved; onToken('') on expiry/error.
// Bump resetKey to force a fresh challenge (e.g. after a failed login, which
// consumes the token).
export function Turnstile({ onToken, resetKey = 0 }) {
  const boxRef = useRef(null);
  const idRef  = useRef(null);
  const cbRef  = useRef(onToken);
  cbRef.current = onToken;

  useEffect(() => {
    if (!SITE_KEY) return;
    let cancelled = false;
    loadScript().then(() => {
      if (cancelled || !boxRef.current || !window.turnstile || idRef.current != null) return;
      idRef.current = window.turnstile.render(boxRef.current, {
        sitekey: SITE_KEY,
        callback:            (t) => cbRef.current(t),
        'expired-callback':  ()  => cbRef.current(''),
        'error-callback':    ()  => cbRef.current(''),
      });
    });
    return () => {
      cancelled = true;
      try { if (idRef.current != null && window.turnstile) window.turnstile.remove(idRef.current); } catch { /* ignore */ }
      idRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (resetKey && idRef.current != null && window.turnstile) {
      try { window.turnstile.reset(idRef.current); cbRef.current(''); } catch { /* ignore */ }
    }
  }, [resetKey]);

  if (!SITE_KEY) return null;
  return <div ref={boxRef} style={{ margin: '10px 0 2px' }} />;
}
