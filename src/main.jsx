import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { captureUtm } from './utm.js';
import { reportClientError, installGlobalErrorReporting } from './errorReport.js';
import { isNativeApp } from './native.js';

// Capture UTM / referral params immediately — before React mounts.
// First-touch attribution: only stored if nothing is already saved.
captureUtm();

// Report uncaught errors + unhandled promise rejections (production only).
installGlobalErrorReporting();

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(err) { return { error: err }; }
  componentDidCatch(err, info) {
    reportClientError(err, { kind: 'react', componentStack: info?.componentStack?.slice(0, 2000) });
  }
  render() {
    if (this.state.error) {
      const dev = import.meta.env.DEV;
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', textAlign: 'center',
          padding: 32, background: '#FAF3E2', color: '#1A1108',
          fontFamily: 'Newsreader, Georgia, serif',
        }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>✦</div>
          <h2 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 8px' }}>
            Something went wrong on our end
          </h2>
          <p style={{ fontSize: 15, color: '#5A4733', maxWidth: 360, lineHeight: 1.6, margin: '0 0 22px' }}>
            The page hit a snag. Reloading usually sorts it out — your account and data are safe.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#1A1108', color: '#F5EDD8', border: 'none', borderRadius: 999,
              padding: '11px 24px', fontSize: 15, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Reload
          </button>
          {dev && (
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: '#933', fontSize: 12, marginTop: 24, textAlign: 'left', maxWidth: 620, fontFamily: 'monospace' }}>
              {this.state.error?.message}{'\n\n'}{this.state.error?.stack}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// Only register the service worker in production — in dev mode the SW
// caches Vite's source files and serves stale versions after code changes,
// causing persistent white screens that survive hard refreshes.
// Skip it in the native app too: the bundle there is baked into the binary,
// so the SW would only add a second stale-cache layer under capacitor://.
if (import.meta.env.PROD && !isNativeApp && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
