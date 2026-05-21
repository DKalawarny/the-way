import { useEffect, useRef, useState } from 'react';
import { supabase, authedFetch } from './supabase.js';
import { T } from './theme.js';

const DEV_PASTOR_BYPASS = import.meta.env.DEV
  && import.meta.env.VITE_DEV_PASTOR_BYPASS === 'true';

const DENOMINATIONS = [
  'Catholic','Eastern Orthodox','Ethiopian Orthodox','Anglican / Episcopal',
  'Baptist','Presbyterian / Reformed','Methodist','Lutheran',
  'Pentecostal / Charismatic','Non-denominational Evangelical',
  'Adventist','Mennonite / Anabaptist','Other',
];

const PASTOR_ROLES = [
  'Senior Pastor','Lead Pastor','Pastor','Priest',
  'Rector / Vicar','Minister','Elder','Other',
];

const input = {
  width: '100%', border: `1px solid ${T.line}`, borderRadius: 10,
  padding: '11px 14px', fontSize: 15, background: T.cream, color: T.ink,
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
};
const select = { ...input, cursor: 'pointer' };

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: 'block', fontWeight: 500, color: T.ink, marginBottom: hint ? 2 : 6, fontSize: 14 }}>
        {label}
      </label>
      {hint && <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 6 }}>{hint}</div>}
      {children}
    </div>
  );
}

export default function PastorApply({ session, profile, onClose, onBecamePastor }) {
  const [step, setStep] = useState('form'); // 'form' | 'verify' | 'approved' | 'self-reported'
  const [applicationId, setApplicationId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [devBusy, setDevBusy] = useState(false);

  // Verification step state
  const [scraping, setScraping] = useState(false);
  const [scrapedEmails, setScrapedEmails] = useState(null); // null = not scraped yet
  const [selectedEmail, setSelectedEmail] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState(null);
  const [submittingUnverified, setSubmittingUnverified] = useState(false);
  const codeRef = useRef(null);

  const [form, setForm] = useState({
    full_name: profile?.display_name ?? '',
    pastor_role: '',
    church_name: '',
    denomination: '',
    city: profile?.city ?? '',
    country: profile?.country ?? '',
    website: '',
    reason: '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const activeEmail = selectedEmail || manualEmail;

  async function devBecomePastor() {
    setDevBusy(true); setError(null);
    try {
      const res = await authedFetch('/api/dev/become-pastor', { method: 'POST' });
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error || 'bypass failed'); }
      onBecamePastor?.();
    } catch (err) { setDevBusy(false); setError(err.message); }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true); setError(null);
    const payload = {
      user_id: session.user.id,
      full_name: form.full_name.trim(),
      pastor_role: form.pastor_role || null,
      church_name: form.church_name.trim(),
      denomination: form.denomination || null,
      city: form.city.trim() || null,
      country: form.country.trim() || null,
      website: form.website.trim() || null,
      reason: form.reason.trim() || null,
    };
    const { data, error: err } = await supabase
      .from('pastor_applications')
      .upsert({ ...payload, status: 'pending' }, { onConflict: 'user_id' })
      .select().single();
    setSaving(false);
    if (err) return setError(err.message);

    // Instant auto-approval via domain match trigger
    if (data?.status === 'approved' && data?.verification_method === 'auto_domain') {
      onBecamePastor?.(); return;
    }

    setApplicationId(data.id);
    setStep('verify');
    // Auto-scrape if they gave a website
    if (form.website.trim()) scrapeWebsite(form.website.trim());
  }

  async function scrapeWebsite(url) {
    setScraping(true); setScrapedEmails(null);
    try {
      const res = await authedFetch('/api/church/scrape-emails', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website: url }),
      });
      const { emails } = await res.json();
      setScrapedEmails(emails ?? []);
      if (emails?.length === 1) setSelectedEmail(emails[0]);
    } catch { setScrapedEmails([]); }
    setScraping(false);
  }

  async function handleSendCode() {
    if (!activeEmail || !applicationId) return;
    setSendingCode(true); setVerifyError(null);
    try {
      const res = await authedFetch('/api/church/send-code', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ application_id: applicationId, email: activeEmail }),
      });
      const body = await res.json();
      if (!res.ok) { setVerifyError(body.error || 'Could not send — try again.'); setSendingCode(false); return; }
      setCodeSent(true);
      setSendingCode(false);
      setTimeout(() => codeRef.current?.focus(), 100);
    } catch { setVerifyError('Network error — try again.'); setSendingCode(false); }
  }

  async function handleVerifyCode() {
    if (!code.trim() || !applicationId) return;
    setVerifying(true); setVerifyError(null);
    try {
      const res = await authedFetch('/api/church/verify-code', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ application_id: applicationId, code: code.trim() }),
      });
      const body = await res.json();
      if (!res.ok) { setVerifyError(body.error || 'Incorrect code.'); setVerifying(false); return; }
      setStep('approved');
      setTimeout(() => onBecamePastor?.(), 1800);
    } catch { setVerifyError('Network error — try again.'); setVerifying(false); }
  }

  async function handleSkipVerification() {
    if (!applicationId) return;
    setSubmittingUnverified(true); setVerifyError(null);
    try {
      const res = await authedFetch('/api/church/submit-unverified', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ application_id: applicationId }),
      });
      if (!res.ok) { const b = await res.json().catch(() => ({})); setVerifyError(b.error || 'Failed.'); setSubmittingUnverified(false); return; }
      setStep('self-reported');
      setTimeout(() => onBecamePastor?.(), 2000);
    } catch { setVerifyError('Network error — try again.'); setSubmittingUnverified(false); }
  }

  // ── Approved screen ────────────────────────────────────────────────────────
  if (step === 'approved') {
    return (
      <div style={{ minHeight: '100vh', background: T.cream, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 52, marginBottom: 20 }}>✦</div>
          <div style={{ fontFamily: T.serif, fontSize: 28, fontWeight: 600, color: T.ink, marginBottom: 12, letterSpacing: '-0.02em' }}>
            You're verified.
          </div>
          <div style={{ fontFamily: T.serif, fontSize: 16, color: T.inkSoft, lineHeight: 1.65 }}>
            Your church is live. Opening your dashboard…
          </div>
        </div>
      </div>
    );
  }

  // ── Self-reported screen ───────────────────────────────────────────────────
  if (step === 'self-reported') {
    return (
      <div style={{ minHeight: '100vh', background: T.cream, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 440 }}>
          <div style={{ fontSize: 40, marginBottom: 20 }}>🏛</div>
          <div style={{ fontFamily: T.serif, fontSize: 26, fontWeight: 600, color: T.ink, marginBottom: 12, letterSpacing: '-0.02em' }}>
            You're in — with one note.
          </div>
          <div style={{ fontFamily: T.serif, fontSize: 15, color: T.inkSoft, lineHeight: 1.7, marginBottom: 16 }}>
            Your church page is active and your dashboard is ready. Because we couldn't verify an email, your church shows a <strong style={{ color: T.ink }}>"Self-reported"</strong> badge and won't appear in the public directory yet.
          </div>
          <div style={{ background: T.parchment, border: `1px solid ${T.line}`, borderRadius: 12, padding: '14px 16px', fontSize: 13, color: T.inkSoft, lineHeight: 1.6, marginBottom: 20 }}>
            Once you have a church email set up, you can verify anytime from your dashboard to remove the badge and go fully public.
          </div>
          <div style={{ fontSize: 13, color: T.inkMuted }}>Opening your dashboard…</div>
        </div>
      </div>
    );
  }

  // ── Verify step ────────────────────────────────────────────────────────────
  if (step === 'verify') {
    const hasWebsite = !!form.website.trim();
    return (
      <div style={{ minHeight: '100vh', background: T.cream, padding: '40px 20px 80px', overflowY: 'auto' }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.goldDark, fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 24 }}>
            ← Back
          </button>

          <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: T.goldDark, marginBottom: 10 }}>
            Step 2 of 2
          </div>
          <h2 style={{ fontFamily: T.serif, fontSize: 30, fontWeight: 600, color: T.ink, letterSpacing: '-0.022em', lineHeight: 1.08, margin: '0 0 10px' }}>
            Verify your church
          </h2>
          <p style={{ color: T.inkSoft, fontSize: 15, lineHeight: 1.65, margin: '0 0 28px' }}>
            We'll send a 6-digit code to a contact email for <strong style={{ color: T.ink }}>{form.church_name}</strong>. Enter it and your church goes live instantly.
          </p>

          {/* Email selection */}
          {!codeSent && (
            <div style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 16, padding: 22, marginBottom: 16 }}>
              {scraping ? (
                <div style={{ color: T.inkMuted, fontFamily: T.serif, fontSize: 14, fontStyle: 'italic' }}>
                  Looking for contact emails on your website…
                </div>
              ) : scrapedEmails === null && hasWebsite ? (
                <div style={{ color: T.inkMuted, fontFamily: T.serif, fontSize: 14 }}>Scanning your website…</div>
              ) : scrapedEmails?.length > 0 ? (
                <>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 10 }}>
                    We found {scrapedEmails.length === 1 ? 'this email' : 'these emails'} on your website:
                  </div>
                  {scrapedEmails.map(email => (
                    <button
                      key={email}
                      onClick={() => { setSelectedEmail(email); setManualEmail(''); }}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '10px 14px', marginBottom: 6, borderRadius: 10,
                        border: `1.5px solid ${selectedEmail === email ? T.gold : T.line}`,
                        background: selectedEmail === email ? 'rgba(184,115,58,0.08)' : T.cream,
                        fontSize: 14, color: T.ink, cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      {selectedEmail === email ? '✓ ' : ''}{email}
                    </button>
                  ))}
                  <div style={{ fontSize: 12.5, color: T.inkMuted, margin: '12px 0 8px' }}>Or enter a different email:</div>
                </>
              ) : (
                <div style={{ fontSize: 13, color: T.inkSoft, marginBottom: 10 }}>
                  {!hasWebsite
                    ? 'Enter a contact email address for your church:'
                    : "We couldn't find an email on your website. Enter one manually:"}
                </div>
              )}

              {/* Manual email input */}
              {(scrapedEmails !== null || !hasWebsite) && (
                <input
                  type="email"
                  value={manualEmail}
                  onChange={e => { setManualEmail(e.target.value); setSelectedEmail(''); }}
                  placeholder="e.g. pastor@yourchurch.org"
                  style={{ ...input, marginTop: scrapedEmails?.length > 0 ? 0 : 0 }}
                />
              )}

              <button
                onClick={handleSendCode}
                disabled={!activeEmail || sendingCode}
                style={{
                  marginTop: 14, width: '100%', background: T.ink, color: T.cream,
                  border: 'none', borderRadius: 999, padding: '13px 20px',
                  fontSize: 14, fontWeight: 600, cursor: (!activeEmail || sendingCode) ? 'not-allowed' : 'pointer',
                  opacity: (!activeEmail || sendingCode) ? 0.5 : 1,
                }}
              >
                {sendingCode ? 'Sending…' : `Send code to ${activeEmail || 'email'}`}
              </button>
            </div>
          )}

          {/* Code entry */}
          {codeSent && (
            <div style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 16, padding: 22, marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: T.inkSoft, marginBottom: 14, lineHeight: 1.6 }}>
                Code sent to <strong style={{ color: T.ink }}>{activeEmail}</strong>. Check the inbox and enter it below.
              </div>
              <input
                ref={codeRef}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={e => { if (e.key === 'Enter' && code.length === 6) handleVerifyCode(); }}
                placeholder="6-digit code"
                style={{ ...input, fontSize: 28, fontFamily: 'monospace', letterSpacing: 10, textAlign: 'center' }}
              />
              {verifyError && (
                <div style={{ color: T.error, fontSize: 13, marginTop: 10 }}>{verifyError}</div>
              )}
              <button
                onClick={handleVerifyCode}
                disabled={code.length < 6 || verifying}
                style={{
                  marginTop: 14, width: '100%', background: T.gold, color: T.cream,
                  border: 'none', borderRadius: 999, padding: '13px 20px',
                  fontSize: 15, fontWeight: 600, cursor: (code.length < 6 || verifying) ? 'not-allowed' : 'pointer',
                  opacity: (code.length < 6 || verifying) ? 0.5 : 1,
                  boxShadow: '0 4px 20px rgba(184,115,58,0.35)',
                }}
              >
                {verifying ? 'Verifying…' : 'Verify & go live ✦'}
              </button>
              <button
                onClick={() => { setCodeSent(false); setCode(''); setVerifyError(null); }}
                style={{ marginTop: 10, width: '100%', background: 'none', border: 'none', color: T.inkMuted, fontSize: 13, cursor: 'pointer', padding: '6px 0' }}
              >
                Wrong email? Start over
              </button>
            </div>
          )}

          {/* Skip / self-reported fallback */}
          {!codeSent && (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: 13, color: T.inkMuted, marginBottom: 8 }}>
                Don't have a church email yet?
              </div>
              <button
                onClick={handleSkipVerification}
                disabled={submittingUnverified}
                style={{ background: 'none', border: `1px solid ${T.line}`, borderRadius: 999, padding: '10px 20px', fontSize: 13, color: T.inkSoft, cursor: 'pointer' }}
              >
                {submittingUnverified ? 'Setting up…' : 'Continue without verifying'}
              </button>
              <div style={{ fontSize: 11.5, color: T.inkMuted, marginTop: 8, lineHeight: 1.55 }}>
                Your church will show a "Self-reported" badge and won't appear in the public directory until verified.
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Form step ──────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: T.cream, padding: '40px 20px 80px', overflowY: 'auto' }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.goldDark, fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 18 }}>
          ← Back
        </button>

        {DEV_PASTOR_BYPASS && (
          <div style={{ background: 'rgba(184,115,58,0.1)', border: `1px dashed ${T.goldLight}`, borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
            <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 6 }}>⚡ Dev only</div>
            <button onClick={devBecomePastor} disabled={devBusy} style={{ background: T.goldDark, color: T.cream, border: 'none', borderRadius: 999, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: devBusy ? 'not-allowed' : 'pointer', opacity: devBusy ? 0.6 : 1 }}>
              {devBusy ? 'Working…' : 'Become a pastor instantly'}
            </button>
          </div>
        )}

        <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: T.goldDark, marginBottom: 10 }}>
          Step 1 of 2 — About your church
        </div>
        <h2 style={{ fontFamily: T.serif, fontSize: 32, fontWeight: 600, color: T.ink, letterSpacing: '-0.022em', lineHeight: 1.08, margin: '0 0 10px' }}>
          Bring your church to kinwove
        </h2>
        <p style={{ color: T.inkSoft, fontSize: 15, lineHeight: 1.65, margin: '0 0 28px' }}>
          A quiet space for your congregation between Sundays. Free. Takes two minutes — we verify instantly via a code to your church email.
        </p>

        <form onSubmit={handleSubmit} style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 16, padding: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 14 }}>About you</div>

          <Field label="Your full name">
            <input style={input} value={form.full_name} onChange={e => set('full_name', e.target.value)} required />
          </Field>
          <Field label="Your role">
            <select style={select} value={form.pastor_role} onChange={e => set('pastor_role', e.target.value)} required>
              <option value="">Select…</option>
              {PASTOR_ROLES.map(r => <option key={r}>{r}</option>)}
            </select>
          </Field>

          <div style={{ height: 1, background: T.line, margin: '4px 0 22px' }} />
          <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 14 }}>About the church</div>

          <Field label="Church name">
            <input style={input} value={form.church_name} onChange={e => set('church_name', e.target.value)} required />
          </Field>
          <Field label="Denomination">
            <select style={select} value={form.denomination} onChange={e => set('denomination', e.target.value)} required>
              <option value="">Select…</option>
              {DENOMINATIONS.map(d => <option key={d}>{d}</option>)}
            </select>
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="City">
              <input style={input} value={form.city} onChange={e => set('city', e.target.value)} placeholder="e.g. Toronto" />
            </Field>
            <Field label="Country">
              <input style={input} value={form.country} onChange={e => set('country', e.target.value)} placeholder="e.g. Canada" />
            </Field>
          </div>
          <Field label="Church website" hint="We'll look for a contact email here to verify you instantly">
            <input style={input} value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://yourchurch.org" />
          </Field>
          <Field label="Anything you'd like us to know? (optional)" hint="One sentence is plenty">
            <textarea
              style={{ ...input, minHeight: 60, resize: 'vertical', fontFamily: T.serif, lineHeight: 1.6 }}
              value={form.reason}
              onChange={e => set('reason', e.target.value)}
              placeholder="e.g. We want a quieter space for our small group leaders between Sundays."
            />
          </Field>

          {error && <div style={{ color: T.error, fontSize: 13, marginBottom: 12 }}>{error}</div>}

          <button
            type="submit"
            disabled={saving || !form.full_name || !form.pastor_role || !form.church_name || !form.denomination}
            style={{
              width: '100%', background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
              padding: '14px 20px', fontSize: 15, fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Continue to verification →'}
          </button>
        </form>
      </div>
    </div>
  );
}
