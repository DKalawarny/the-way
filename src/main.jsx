import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { captureUtm } from './utm.js';

// Capture UTM / referral params immediately — before React mounts.
// First-touch attribution: only stored if nothing is already saved.
captureUtm();

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(err) { return { error: err }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: 'monospace', background: '#fff', minHeight: '100vh' }}>
          <h2 style={{ color: '#c00' }}>App crashed — runtime error</h2>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: '#333', fontSize: 13 }}>
            {this.state.error?.message}{'\n\n'}{this.state.error?.stack}
          </pre>
          <button onClick={() => this.setState({ error: null })} style={{ marginTop: 16, padding: '8px 16px' }}>
            Try again
          </button>
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
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
