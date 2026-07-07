import { useState } from 'react';
import { supabase } from './supabase.js';
import { T } from './theme.js';
import { getStoredUtm, clearStoredUtm } from './utm.js';
import { Turnstile, TURNSTILE_ENABLED } from './Turnstile.jsx';

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

const DEV_LOGIN_ENABLED =
  import.meta.env.DEV &&
  !!import.meta.env.VITE_DEV_LOGIN_EMAIL &&
  !!import.meta.env.VITE_DEV_LOGIN_PASSWORD;

function ResendButton({ email }) {
  const [state, setState] = useState('idle'); // idle | sending | sent | error
  async function resend() {
    setState('sending');
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    setState(error ? 'error' : 'sent');
    if (!error) setTimeout(() => setState('idle'), 5000);
  }
  return (
    <button
      onClick={resend}
      disabled={state === 'sending' || state === 'sent'}
      style={{
        width: '100%', background: T.gold, color: T.cream, border: 'none',
        borderRadius: 999, padding: '13px 20px', fontSize: 15, fontWeight: 600,
        cursor: state === 'sending' || state === 'sent' ? 'default' : 'pointer',
        opacity: state === 'sending' ? 0.7 : 1, marginTop: 4,
      }}
    >
      {state === 'sending' ? 'Sending…' : state === 'sent' ? '✓ Email sent!' : state === 'error' ? 'Try again' : 'Resend confirmation email'}
    </button>
  );
}

export default function Auth({ onAuth, onBack, initialMode = 'signin' }) {
  const [mode, setMode] = useState(initialMode); // signin | signup | verify
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaReset, setCaptchaReset] = useState(0);
  const resetCaptcha = () => setCaptchaReset((n) => n + 1);

  async function handleDevLogin() {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase.auth.signInWithPassword({
      email: import.meta.env.VITE_DEV_LOGIN_EMAIL,
      password: import.meta.env.VITE_DEV_LOGIN_PASSWORD,
    });
    setLoading(false);
    if (err) return setError(`Dev login failed: ${err.message}`);
    onAuth(data.session);
  }

  async function handleSignUp(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const utm = getStoredUtm();
    const { data: signUpData, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        captchaToken,
        data: {
          // First-touch attribution — stored in raw_user_meta_data,
          // visible in the Supabase dashboard under Authentication → Users.
          ...(utm?.utm_source   && { utm_source:   utm.utm_source }),
          ...(utm?.utm_medium   && { utm_medium:   utm.utm_medium }),
          ...(utm?.utm_campaign && { utm_campaign: utm.utm_campaign }),
          ...(utm?.ref          && { referral_ref:  utm.ref }),
          ...(utm?.landing_url  && { landing_url:   utm.landing_url }),
        },
      },
    });
    setLoading(false);
    if (err) { resetCaptcha(); return setError(err.message); }
    clearStoredUtm(); // attribution captured — clean up
    // If Supabase returns a session immediately (email confirmation disabled),
    // hand it to App.jsx so the wizard can run. Otherwise show the verify screen.
    if (signUpData?.session) {
      onAuth(signUpData.session);
    } else {
      setMode('verify');
    }
  }

  async function handleSignIn(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken } });
    setLoading(false);
    if (err) { resetCaptcha(); return setError(err.message); }
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
          <div style={eyebrow}>kinwove</div>
          <h2 style={title}>Check your email</h2>
          <p style={{ color: T.inkSoft, fontSize: 15, lineHeight: 1.6 }}>
            We sent a confirmation link to <strong>{email}</strong>. Click it to verify
            your account, then come back and sign in.
          </p>
          <p style={{ color: T.inkMuted, fontSize: 13, lineHeight: 1.6, marginTop: 0 }}>
            No email? Check spam, or tap below to send another.
          </p>
          <ResendButton email={email} />
          <button onClick={() => setMode('signin')} style={{ ...btn, background: 'transparent', color: T.inkMuted, border: `1px solid ${T.line}`, marginTop: 10 }}>
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
        <div style={eyebrow}>kinwove</div>
        <h2 style={title}>{mode === 'signin' ? 'Welcome back' : 'Join the journey'}</h2>

        <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp}>
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
            <div style={{ position: 'relative' }}>
              <input
                style={{ ...input, paddingRight: 44 }}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'At least 8 characters' : ''}
                minLength={8}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 12, color: T.inkMuted, padding: '2px 4px',
                }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </Field>

          {error && (
            <div style={{ color: T.error, fontSize: 13, marginBottom: 10 }}>{error}</div>
          )}

          {mode === 'signup' && (
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={ageConfirmed}
                onChange={(e) => setAgeConfirmed(e.target.checked)}
                style={{ marginTop: 3, accentColor: T.gold, width: 16, height: 16, flexShrink: 0 }}
              />
              <span style={{ fontSize: 13, color: T.inkSoft, lineHeight: 1.5 }}>
                I am 13 or older. Under 13? Your church can add you through the youth program.
              </span>
            </label>
          )}

          <Turnstile onToken={setCaptchaToken} resetKey={captchaReset} />

          {(() => {
            const disabled = loading || (mode === 'signup' && !ageConfirmed) || (TURNSTILE_ENABLED && !captchaToken);
            return (
          <button type="submit" style={{ ...btn, opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }} disabled={disabled}>
            {loading ? 'One moment…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
            );
          })()}
        </form>

        {DEV_LOGIN_ENABLED && (
          <button
            onClick={handleDevLogin}
            disabled={loading}
            style={{
              ...btn,
              background: 'transparent',
              color: T.goldDark,
              border: `1px dashed ${T.goldLight}`,
              marginTop: 12,
            }}
          >
            ⚡ Dev quick-login ({import.meta.env.VITE_DEV_LOGIN_EMAIL})
          </button>
        )}

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
          <br />kinwove is for users 13 and older. No real name required.
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
  padding: 'clamp(20px, 5.5vw, 32px)',
  maxWidth: 420,
  width: '100%',
};

const eyebrow = {
  fontFamily: T.display,
  fontSize: 18,
  fontWeight: 500,
  letterSpacing: '-0.02em',
  color: T.goldDark,
  marginBottom: 14,
};

const title = {
  fontFamily: T.display,
  fontSize: 30,
  fontWeight: 600,
  color: T.ink,
  letterSpacing: '-0.02em',
  lineHeight: 1.1,
  margin: '0 0 22px',
};
