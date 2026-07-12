import { useEffect, useRef, useState } from 'react';
import { T } from './theme.js';
import { KinwoveStar } from './components/brand/KinwoveStar.jsx';

/**
 * PWA "Add to Home Screen" nudge.
 *
 * Shows a small bottom banner after the user has been engaged for
 * DELAY_MS (45 s) or when the parent calls triggerNow().
 *
 * Rules:
 * - Never shows on iOS Safari (those users get the manual Share → Add to
 *   Home Screen flow, which we don't want to replicate badly).
 * - Never shows if the app is already running standalone (already installed).
 * - Dismissed state is persisted in localStorage — won't ask twice.
 * - Accepts and defers the browser's beforeinstallprompt event so we
 *   control the moment it fires instead of the browser doing it at random.
 */

const STORAGE_KEY  = 'tw_install_dismissed';
const DELAY_MS     = 45_000;

function isAlreadyInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
}

function isIos() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) && !window.MSStream;
}

// In-app webviews (Instagram, Facebook, Messenger…) have no Share → Add to
// Home Screen path, so the iOS instructions would be a dead end there.
function isInAppBrowser() {
  return /Instagram|FBAN|FBAV|FB_IAB|Messenger|Line\/|Twitter|GSA\//i.test(navigator.userAgent);
}

// The iOS Safari share glyph (square with up arrow), drawn inline so the
// instructions can point at the exact icon.
function IosShareIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: '-3px' }}>
      <path d="M12 3v12" /><path d="M8 6.5 12 3l4 3.5" />
      <path d="M6 10H5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-1" />
    </svg>
  );
}

export default function InstallPrompt({ triggerNow = false, suppressed = false }) {
  const [visible, setVisible]       = useState(false);
  const [installing, setInstalling] = useState(false);
  const [iosSheet, setIosSheet]     = useState(false);
  const deferredRef = useRef(null);
  const ios = isIos() && !isInAppBrowser();

  useEffect(() => {
    // Don't bother if already installed or dismissed before
    if (isAlreadyInstalled()) return;
    if (isIos()) return;
    if (localStorage.getItem(STORAGE_KEY)) return;

    const handler = (e) => {
      e.preventDefault();
      deferredRef.current = e;
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Auto-show after delay. iOS needs no beforeinstallprompt — the banner
  // opens the manual Share → Add to Home Screen instructions instead.
  useEffect(() => {
    if (isAlreadyInstalled()) return;
    if (isIos() && !ios) return; // iOS in-app browser: no install path at all
    if (localStorage.getItem(STORAGE_KEY)) return;

    const t = setTimeout(() => {
      if (ios || deferredRef.current) setVisible(true);
    }, DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  // Parent can trigger early (e.g. after first AI message sent)
  useEffect(() => {
    if (!triggerNow) return;
    if (isAlreadyInstalled()) return;
    if (isIos() && !ios) return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    if (ios || deferredRef.current) setVisible(true);
  }, [triggerNow]);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
    setIosSheet(false);
  }

  async function install() {
    if (ios) { setIosSheet(true); return; }
    if (!deferredRef.current) return;
    setInstalling(true);
    try {
      deferredRef.current.prompt();
      const { outcome } = await deferredRef.current.userChoice;
      if (outcome === 'accepted') {
        localStorage.setItem(STORAGE_KEY, '1');
        setVisible(false);
      }
    } finally {
      setInstalling(false);
    }
  }

  if (suppressed || !visible) return null;

  // ── iOS instruction sheet ──
  if (iosSheet) {
    const stepStyle = { display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 };
    const numStyle = {
      width: 24, height: 24, borderRadius: 999, background: T.gold, color: T.cream,
      fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center',
      justifyContent: 'center', flexShrink: 0, marginTop: 1,
    };
    const textStyle = { fontSize: 14.5, color: T.ink, lineHeight: 1.55, margin: 0 };
    return (
      <div
        onClick={dismiss}
        style={{
          position: 'fixed', inset: 0, zIndex: 95, background: 'rgba(14,7,3,0.55)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: 440, background: T.cream,
            borderRadius: '20px 20px 0 0', padding: '24px 22px calc(20px + env(safe-area-inset-bottom))',
            animation: 'fadeUp 0.3s cubic-bezier(0.2,0.8,0.2,1) both',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <KinwoveStar size={22} />
            <div style={{ fontFamily: T.serif, fontSize: 18, fontWeight: 600, color: T.ink }}>
              Add kinwove to your home screen
            </div>
          </div>
          <div style={stepStyle}>
            <div style={numStyle}>1</div>
            <p style={textStyle}>Tap the <strong>Share</strong> button <span style={{ color: '#2478D2' }}><IosShareIcon /></span> at the bottom of Safari.</p>
          </div>
          <div style={stepStyle}>
            <div style={numStyle}>2</div>
            <p style={textStyle}>Scroll down and tap <strong>Add to Home Screen</strong>.</p>
          </div>
          <div style={{ ...stepStyle, marginBottom: 20 }}>
            <div style={numStyle}>3</div>
            <p style={textStyle}>Tap <strong>Add</strong> — kinwove opens like an app, and you can get notifications.</p>
          </div>
          <button
            onClick={dismiss}
            style={{
              width: '100%', background: T.ink, color: T.cream, border: 'none',
              borderRadius: 999, padding: '13px 20px', fontSize: 14.5, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Got it
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      // Centered via left/right+margin, NOT translateX — the fadeUp animation's
      // final transform frame replaces inline transforms, which pushed the
      // banner half off-screen (buttons unreachable) on mobile.
      position: 'fixed', bottom: 74, left: 16, right: 16, margin: '0 auto',
      zIndex: 90, maxWidth: 420,
      background: T.ink, borderRadius: 16,
      boxShadow: '0 8px 32px rgba(44,24,16,0.28)',
      padding: '14px 18px',
      display: 'flex', alignItems: 'center', gap: 14,
      animation: 'fadeUp 0.35s cubic-bezier(0.2,0.8,0.2,1) both',
    }}>
      <div style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}><KinwoveStar size={28} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: T.cream, marginBottom: 2 }}>
          Add to your home screen
        </div>
        <div style={{ fontSize: 12.5, color: 'rgba(253,248,240,0.65)', lineHeight: 1.4 }}>
          Opens instantly, works offline, feels native.
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
        <button
          onClick={install}
          disabled={installing}
          style={{
            background: T.gold, color: T.cream, border: 'none', borderRadius: 8,
            padding: '7px 14px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
            opacity: installing ? 0.7 : 1, whiteSpace: 'nowrap',
          }}
        >
          {installing ? 'Installing…' : 'Add'}
        </button>
        <button
          onClick={dismiss}
          style={{
            background: 'transparent', color: 'rgba(253,248,240,0.5)',
            border: 'none', fontSize: 11.5, cursor: 'pointer', padding: '2px 0',
          }}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
