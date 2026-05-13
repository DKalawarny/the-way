import { useEffect, useRef, useState } from 'react';
import { T } from './theme.js';

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

export default function InstallPrompt({ triggerNow = false }) {
  const [visible, setVisible]       = useState(false);
  const [installing, setInstalling] = useState(false);
  const deferredRef = useRef(null);

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

  // Auto-show after delay
  useEffect(() => {
    if (isAlreadyInstalled() || isIos()) return;
    if (localStorage.getItem(STORAGE_KEY)) return;

    const t = setTimeout(() => {
      if (deferredRef.current) setVisible(true);
    }, DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  // Parent can trigger early (e.g. after first AI message sent)
  useEffect(() => {
    if (!triggerNow) return;
    if (isAlreadyInstalled() || isIos()) return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    if (deferredRef.current) setVisible(true);
  }, [triggerNow]);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  }

  async function install() {
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

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 74, left: '50%', transform: 'translateX(-50%)',
      zIndex: 90, width: 'calc(100% - 32px)', maxWidth: 420,
      background: T.ink, borderRadius: 16,
      boxShadow: '0 8px 32px rgba(44,24,16,0.28)',
      padding: '14px 18px',
      display: 'flex', alignItems: 'center', gap: 14,
      animation: 'fadeUp 0.35s cubic-bezier(0.2,0.8,0.2,1) both',
    }}>
      <div style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>✦</div>
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
