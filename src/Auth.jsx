import { useState } from 'react';
import { supabase } from './supabase.js';
import { T } from './theme.js';

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 13, color: T.inkSoft, marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const input = {
  width: '100%',
  border: `1px solid ${T.line}`,
  borderRadius: 10,
  padding: '11px 14px',
  fontSize: 15,
  background: T.cream,
  color: T.ink,
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

export default function Auth({ onAuth, onBack }) {
  const [mode, setMode] = useState('signin'); // signin | signup | verify
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSignUp(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: name } },
    });
    setLoading(false);
    if (err) return setError(err.message);
    setMode('verify');
  }

  async function handleSignIn(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) return setError(err.message);
    onAuth(data.session);
  }

  const btn = {
    width: '100%',
    background: T.ink,
    color: T.cream,
    border: 'none',
    borderRadius: 999,
    padding: '13px 20px',
    fontSize: 15,
    fontWeight: 600,
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.6 : 1,
    marginTop: 8,
  };

  if (mode === 'verify') {
    return (
      <div style={wrap}>
        <div style={card}>
          <div style={eyebrow}>The Way</div>
          <h2 style={title}>Check your email</h2>
          <p style={{ color: T.inkSoft, fontSize: 15, lineHeight: 1.6 }}>
            We sent a confirmation link to <strong>{email}</strong>. Click it to verify your account,
            then come back and sign in.
          </p>
          <button onClick={() => setMode('signin')} style={{ ...btn, marginTop: 20 }}>
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={wrap}>
      <div style={card}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: T.goldDark, fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 16 }}>
          ← Back
        </button>
        <div style={eyebrow}>The Way</div>
        <h2 style={title}>{mode === 'signin' ? 'Welcome back' : 'Join the journey'}</h2>

        <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp}>
          {mode === 'signup' && (
            <Field label="Display name">
              <input
                style={input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="How you'll appear to others"
                required
              />
            </Field>
          )}
          <Field label="Email">
            <input
              style={input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@somewhere.com"
              required
            />
          </Field>
          <Field label="Password">
            <input
              style={input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'At least 8 characters' : ''}
              minLength={8}
              required
            />
          </Field>

          {error && (
            <div style={{ color: T.error, fontSize: 13, marginBottom: 10 }}>{error}</div>
          )}

          <button type="submit" style={btn} disabled={loading}>
            {loading ? 'One moment…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div style={{ marginTop: 16, textAlign: 'center', fontSize: 13, color: T.inkMuted }}>
          {mode === 'signin' ? (
            <>
              New here?{' '}
              <button
                onClick={() => { setMode('signup'); setError(null); }}
                style={{ background: 'none', border: 'none', color: T.goldDark, cursor: 'pointer', fontSize: 13 }}
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have one?{' '}
              <button
                onClick={() => { setMode('signin'); setError(null); }}
                style={{ background: 'none', border: 'none', color: T.goldDark, cursor: 'pointer', fontSize: 13 }}
              >
                Sign in
              </button>
            </>
          )}
        </div>

        <div style={{ marginTop: 20, fontSize: 12, color: T.inkMuted, textAlign: 'center', lineHeight: 1.5 }}>
          By joining you agree to keep this space safe and honest.
          <br />No real name required. Location is city-level only.
        </div>
      </div>
    </div>
  );
}

const wrap = {
  minHeight: '100vh',
  background: `linear-gradient(180deg, ${T.cream} 0%, ${T.parchment} 100%)`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20,
};

const card = {
  background: T.white,
  borderRadius: 18,
  border: `1px solid ${T.line}`,
  padding: 32,
  maxWidth: 420,
  width: '100%',
};

const eyebrow = {
  fontSize: 12,
  letterSpacing: 2,
  textTransform: 'uppercase',
  color: T.goldDark,
  marginBottom: 10,
};

const title = {
  fontFamily: T.serif,
  fontSize: 28,
  fontWeight: 600,
  color: T.ink,
  margin: '0 0 22px',
};
