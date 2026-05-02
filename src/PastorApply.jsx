import { useEffect, useState } from 'react';
import { supabase, authedFetch } from './supabase.js';
import { T } from './theme.js';

// Gated on an explicit env var, not just DEV mode, so screenshares and
// preview builds don't expose the bypass card. Set VITE_DEV_PASTOR_BYPASS=true
// in .env.local when you want to use it.
const DEV_PASTOR_BYPASS = import.meta.env.DEV
  && import.meta.env.VITE_DEV_PASTOR_BYPASS === 'true';

// Save-and-resume: pastors abandon long forms and come back later. Store the
// in-progress form per user so they don't lose work. Cleared on successful
// submit, on reapply (existing rejection takes precedence), or on explicit
// discard. v1 in the key so we can reset all drafts safely if the schema
// changes.
const DRAFT_KEY = (userId) => `pastorApply:draft:v1:${userId}`;
const DRAFT_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

function readDraft(userId) {
  try {
    const raw = localStorage.getItem(DRAFT_KEY(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.savedAt || !parsed?.form) return null;
    if (Date.now() - parsed.savedAt > DRAFT_TTL_MS) {
      localStorage.removeItem(DRAFT_KEY(userId));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeDraft(userId, form) {
  try {
    localStorage.setItem(DRAFT_KEY(userId), JSON.stringify({ savedAt: Date.now(), form }));
  } catch {}
}

function clearDraft(userId) {
  try { localStorage.removeItem(DRAFT_KEY(userId)); } catch {}
}

function relativeTime(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  if (diff < 5_000)        return 'just now';
  if (diff < 60_000)       return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000)    return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000)   return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

const DENOMINATIONS = [
  'Catholic',
  'Eastern Orthodox',
  'Ethiopian Orthodox',
  'Anglican / Episcopal',
  'Baptist',
  'Presbyterian / Reformed',
  'Methodist',
  'Lutheran',
  'Pentecostal / Charismatic',
  'Non-denominational Evangelical',
  'Adventist',
  'Mennonite / Anabaptist',
  'Other',
];

const REG_COUNTRIES = [
  { code: 'CA', label: 'Canada',         field: 'CRA Charity Registration Number',     hint: '9 digits + RR0001 — e.g. 123456789RR0001',  lookup: 'apps.cra-arc.gc.ca' },
  { code: 'US', label: 'United States',  field: 'EIN (Employer Identification Number)', hint: 'XX-XXXXXXX — confirm 501(c)(3) status',     lookup: 'IRS Tax Exempt Org Search' },
  { code: 'UK', label: 'United Kingdom', field: 'Charity Commission Number',            hint: 'Searchable on gov.uk',                       lookup: 'gov.uk/charities' },
  { code: 'AU', label: 'Australia',      field: 'ABN (Australian Business Number)',     hint: '11 digits',                                  lookup: 'abr.business.gov.au' },
  { code: 'OTHER', label: 'Other country', field: 'Registration / charity number',      hint: 'Whatever ID confirms your church is a registered religious organization', lookup: '' },
];

const PASTOR_ROLES = [
  'Senior Pastor',
  'Lead Pastor',
  'Pastor',
  'Priest',
  'Rector / Vicar',
  'Minister',
  'Elder',
  'Other',
];

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
  const [existing, setExisting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [reapplying, setReapplying] = useState(false);
  const [devBusy, setDevBusy] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState(null);

  async function devBecomePastor() {
    setDevBusy(true);
    setError(null);
    try {
      const res = await authedFetch('/api/dev/become-pastor', { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `bypass failed (${res.status})`);
      }
      onBecamePastor?.();
    } catch (err) {
      setDevBusy(false);
      setError(err.message || 'bypass failed');
    }
  }

  const [form, setForm] = useState({
    full_name: profile?.display_name ?? '',
    pastor_role: '',
    church_name: '',
    denomination: '',
    city: profile?.city ?? '',
    country: profile?.country ?? '',
    registration_country: 'CA',
    registration_number: '',
    no_registration: false,
    denominational_reference: '',
    website: '',
    reason: '',
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function startReapply() {
    if (!existing) return;
    // Bring the form into view so the pastor isn't disoriented after the
    // rejection card collapses.
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    setForm({
      full_name: existing.full_name ?? profile?.display_name ?? '',
      pastor_role: existing.pastor_role ?? '',
      church_name: existing.church_name ?? '',
      denomination: existing.denomination ?? '',
      city: existing.city ?? profile?.city ?? '',
      country: existing.country ?? profile?.country ?? '',
      registration_country: existing.registration_country ?? 'CA',
      registration_number: existing.registration_number ?? '',
      no_registration: !!existing.no_registration,
      denominational_reference: existing.denominational_reference ?? '',
      website: existing.website ?? '',
      reason: existing.reason ?? '',
    });
    // Reapply takes precedence over any first-time draft — clear it.
    if (session?.user?.id) clearDraft(session.user.id);
    setDraftRestored(false);
    setDraftSavedAt(null);
    setReapplying(true);
  }

  function discardDraft() {
    if (session?.user?.id) clearDraft(session.user.id);
    setDraftRestored(false);
    setDraftSavedAt(null);
    setForm({
      full_name: profile?.display_name ?? '',
      pastor_role: '',
      church_name: '',
      denomination: '',
      city: profile?.city ?? '',
      country: profile?.country ?? '',
      registration_country: 'CA',
      registration_number: '',
      no_registration: false,
      denominational_reference: '',
      website: '',
      reason: '',
    });
  }

  const regCountry = REG_COUNTRIES.find((c) => c.code === form.registration_country) ?? REG_COUNTRIES[0];

  // Derived form-visibility flags — computed early so the auto-save effect
  // can depend on `showFormOpen` to avoid persisting drafts when the form
  // isn't on screen.
  const showSuccess  = submitted || (existing && existing.status === 'pending');
  const showApproved = existing && existing.status === 'approved';
  const showRejected = existing && existing.status === 'rejected' && !reapplying;
  const showFormOpen = (!showSuccess && !showApproved && !showRejected) || reapplying;

  useEffect(() => {
    if (!session?.user?.id) return;
    const userId = session.user.id;
    supabase
      .from('pastor_applications')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        setExisting(data);
        setLoading(false);
        // Only restore drafts for first-time applicants. If they've already
        // applied (pending/approved/rejected), the existing row is the source
        // of truth — startReapply seeds from the rejection if they re-open.
        if (!data) {
          const draft = readDraft(userId);
          if (draft) {
            setForm((f) => ({ ...f, ...draft.form }));
            setDraftRestored(true);
            setDraftSavedAt(draft.savedAt);
          }
        }
      });
  }, [session]);

  // Auto-save the form to localStorage on edits (debounced).
  // Skipped when the form isn't visible, when nothing has been typed yet,
  // and during the loading flash so we don't write a half-restored form
  // back over the real draft.
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    if (loading) return;
    if (!showFormOpen) return;
    const hasContent = !!(
      form.church_name.trim()
      || form.website.trim()
      || form.registration_number.trim()
      || form.reason.trim()
      || form.denominational_reference.trim()
      || form.pastor_role
      || form.denomination
    );
    if (!hasContent) return;
    const t = setTimeout(() => {
      writeDraft(userId, form);
      setDraftSavedAt(Date.now());
      setDraftRestored(false); // banner gives way to the "saved" indicator
    }, 600);
    return () => clearTimeout(t);
  }, [form, session, loading, showFormOpen]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!session?.user?.id) return;
    if (!form.no_registration && !form.registration_number.trim()) {
      setError('Please enter your church\u2019s registration number, or check the box below if you don\u2019t have one.');
      return;
    }
    if (form.no_registration && !form.denominational_reference.trim()) {
      setError('If your church isn\u2019t registered, please give us a denominational reference we can contact.');
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      user_id: session.user.id,
      full_name: form.full_name.trim(),
      pastor_role: form.pastor_role || null,
      church_name: form.church_name.trim(),
      denomination: form.denomination || null,
      city: form.city.trim() || null,
      country: form.country.trim() || null,
      registration_country: form.no_registration ? null : form.registration_country,
      registration_number: form.no_registration ? null : form.registration_number.trim(),
      no_registration: form.no_registration,
      denominational_reference: form.no_registration ? form.denominational_reference.trim() : null,
      website: form.website.trim() || null,
      reason: form.reason.trim() || null,
    };

    // Use .select().single() so we get the row BACK after the BEFORE-trigger
    // has run. The trigger may have flipped status to 'approved' on the
    // domain-match fast path — see scripts/2026-05-01-pastor-domain-verification.sql.
    const { data: row, error: err } = reapplying && existing?.id
      ? await supabase
          .from('pastor_applications')
          .update({ ...payload, status: 'pending', notes: null, reviewed_at: null })
          .eq('id', existing.id)
          .select()
          .single()
      : await supabase
          .from('pastor_applications')
          .insert(payload)
          .select()
          .single();

    setSaving(false);
    if (err) return setError(err.message);

    // Application is in the database — wipe the draft either way.
    clearDraft(session.user.id);
    setDraftRestored(false);
    setDraftSavedAt(null);

    // Tier 1 instant approval — the trigger created the church and flipped
    // is_pastor=true. Hand off to the parent so the app reloads the profile
    // and routes into the new pastor dashboard.
    if (row?.status === 'approved' && row?.verification_method === 'auto_domain') {
      onBecamePastor?.();
      return;
    }

    setSubmitted(true);
    setReapplying(false);
    if (existing) setExisting({ ...existing, ...(row ?? payload), status: row?.status ?? 'pending', notes: row?.notes ?? null });
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: T.cream, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: T.inkMuted, fontFamily: T.serif }}>Loading…</div>
      </div>
    );
  }

  // Alias kept for the JSX below so the diff stays small.
  const showForm = showFormOpen;

  return (
    <div style={{ minHeight: '100vh', background: T.cream, padding: '40px 20px 80px', overflowY: 'auto' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.goldDark, fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 18 }}>
          ← Back
        </button>

        {DEV_PASTOR_BYPASS && (
          <div style={{
            background: 'rgba(196,129,58,0.1)', border: `1px dashed ${T.goldLight}`,
            borderRadius: 12, padding: '14px 16px', marginBottom: 20,
          }}>
            <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 6 }}>
              ⚡ Dev only
            </div>
            <div style={{ fontSize: 13, color: T.inkSoft, lineHeight: 1.5, marginBottom: 10 }}>
              Skip the form and become a verified pastor of "Test Chapel" instantly. Server gates this on <code>DEV_PASTOR_BYPASS=true</code>.
            </div>
            <button
              onClick={devBecomePastor}
              disabled={devBusy}
              style={{
                background: T.goldDark, color: T.cream, border: 'none', borderRadius: 999,
                padding: '10px 18px', fontSize: 13, fontWeight: 600,
                cursor: devBusy ? 'not-allowed' : 'pointer', opacity: devBusy ? 0.6 : 1,
              }}
            >
              {devBusy ? 'Working…' : 'Become a pastor instantly'}
            </button>
          </div>
        )}

        <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: T.goldDark, marginBottom: 10 }}>
          For pastors & church leaders
        </div>
        <h2 style={{ fontFamily: T.display, fontSize: 34, fontWeight: 600, color: T.ink, letterSpacing: '-0.022em', lineHeight: 1.08, margin: '0 0 12px' }}>
          Bring your church to The Way
        </h2>
        <p style={{ color: T.inkSoft, fontSize: 15, lineHeight: 1.65, margin: '0 0 28px' }}>
          A quiet, honest space your congregation can use between Sundays — for questions, prayer, and going deeper. Apply once; we read every application personally.
        </p>

        {showApproved && (
          <div style={{ background: T.white, border: `1px solid ${T.gold}`, borderRadius: 14, padding: 22, marginBottom: 20 }}>
            <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 8 }}>
              ✦ Approved
            </div>
            <div style={{ fontFamily: T.display, fontSize: 22, fontWeight: 600, color: T.ink, letterSpacing: '-0.015em', marginBottom: 8 }}>
              Welcome, pastor.
            </div>
            <div style={{ color: T.inkSoft, fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
              Your church is live. Here's your three-step ramp to the first Sunday:
            </div>
            <ol style={{ margin: '0 0 18px', paddingLeft: 20, color: T.ink, fontSize: 14, lineHeight: 1.75 }}>
              <li>Write a welcome note your members will see when they open the church.</li>
              <li>Publish your first sermon — the page builds itself around it.</li>
              <li>Print your QR code and share it Sunday.</li>
            </ol>
            <button
              onClick={() => onBecamePastor?.()}
              style={{
                background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
                padding: '12px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              ✦ Open your dashboard →
            </button>
          </div>
        )}

        {showRejected && (
          <div style={{ background: T.parchment, border: `1px solid ${T.goldLight}`, borderRadius: 14, padding: 22, marginBottom: 20 }}>
            <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 8 }}>
              Needs another look
            </div>
            <div style={{ fontFamily: T.display, fontSize: 20, fontWeight: 600, color: T.ink, letterSpacing: '-0.015em', marginBottom: 10 }}>
              We couldn't verify this — yet.
            </div>
            {existing.notes && (
              <div style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                <div style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: T.inkMuted, fontWeight: 600, marginBottom: 4 }}>
                  What we found
                </div>
                <div style={{ fontFamily: T.serif, fontSize: 14.5, color: T.ink, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {existing.notes}
                </div>
              </div>
            )}
            <div style={{ color: T.inkSoft, fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
              Update your details and we'll review again. If something feels off, write directly: <a href="mailto:dkalawarny@hotmail.com" style={{ color: T.goldDark, textDecoration: 'underline' }}>dkalawarny@hotmail.com</a>.
            </div>
            <button
              onClick={startReapply}
              style={{
                background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
                padding: '12px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Update and resubmit
            </button>
          </div>
        )}

        {showSuccess && (
          <div style={{ background: T.parchment, border: `1px solid ${T.goldLight}`, borderRadius: 14, padding: 22, marginBottom: 20 }}>
            <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 8 }}>
              ⏱ Application received
            </div>
            <div style={{ fontFamily: T.display, fontSize: 19, fontWeight: 600, color: T.ink, letterSpacing: '-0.012em', marginBottom: 6 }}>
              Thank you.
            </div>
            <div style={{ color: T.inkSoft, fontSize: 14, lineHeight: 1.65, marginBottom: 14 }}>
              We verify every application against the public registry — usually within 2 business days. You'll get an email when your church is live.
            </div>
            <div style={{
              background: T.white, border: `1px solid ${T.line}`, borderRadius: 10,
              padding: '12px 14px', marginBottom: 14,
            }}>
              <div style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: T.inkMuted, fontWeight: 600, marginBottom: 4 }}>
                While you wait
              </div>
              <div style={{ fontFamily: T.serif, fontSize: 14, color: T.ink, lineHeight: 1.6 }}>
                Browse The Way as a member — see what your congregation will see. Drop your church name into a sermon mockup, share early thoughts in community, learn the rhythm. The dashboard unlocks the moment you're approved.
              </div>
            </div>
            <div style={{ fontSize: 12.5, color: T.inkMuted, lineHeight: 1.55 }}>
              Been waiting more than 3 days?{' '}
              <a href="mailto:dkalawarny@hotmail.com?subject=Pastor%20application%20status" style={{ color: T.goldDark, textDecoration: 'underline' }}>
                Write to us
              </a>{' '}— we'll look it up the same day.
            </div>
          </div>
        )}

        {showForm && reapplying && existing?.notes && (
          <div style={{
            background: 'rgba(196,129,58,0.07)', border: `1px solid ${T.goldLight}`,
            borderRadius: 12, padding: '14px 16px', marginBottom: 18,
          }}>
            <div style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 6 }}>
              ↻ What we found last time
            </div>
            <div style={{ fontFamily: T.serif, fontSize: 14, color: T.ink, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {existing.notes}
            </div>
          </div>
        )}

        {showForm && draftRestored && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            background: T.parchment, border: `1px solid ${T.goldLight}`, borderRadius: 12,
            padding: '12px 14px', marginBottom: 14,
          }}>
            <div style={{ fontSize: 13, color: T.inkSoft, lineHeight: 1.5 }}>
              <strong style={{ color: T.goldDark, fontWeight: 700 }}>↻ We saved your progress.</strong>{' '}
              Picked up where you left off {relativeTime(draftSavedAt)}.
            </div>
            <button
              type="button"
              onClick={discardDraft}
              style={{
                background: 'none', border: `1px solid ${T.line}`, borderRadius: 999,
                padding: '6px 12px', fontSize: 12, color: T.inkSoft, cursor: 'pointer',
                fontFamily: 'inherit', whiteSpace: 'nowrap',
              }}
            >
              Start fresh
            </button>
          </div>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 16, padding: 24 }}>
            <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 14 }}>
              About you
            </div>

            <Field label="Your full name">
              <input style={input} value={form.full_name} onChange={(e) => set('full_name', e.target.value)} required />
            </Field>

            <Field label="Your role">
              <select style={select} value={form.pastor_role} onChange={(e) => set('pastor_role', e.target.value)} required>
                <option value="">Select…</option>
                {PASTOR_ROLES.map((r) => <option key={r}>{r}</option>)}
              </select>
            </Field>

            <div style={{ height: 1, background: T.line, margin: '8px 0 22px' }} />

            <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 14 }}>
              About the church
            </div>

            <Field label="Church name" hint="The legal name as registered">
              <input style={input} value={form.church_name} onChange={(e) => set('church_name', e.target.value)} required />
            </Field>

            <Field label="Denomination">
              <select style={select} value={form.denomination} onChange={(e) => set('denomination', e.target.value)} required>
                <option value="">Select…</option>
                {DENOMINATIONS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="City">
                <input style={input} value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="e.g. Toronto" />
              </Field>
              <Field label="Country">
                <input style={input} value={form.country} onChange={(e) => set('country', e.target.value)} placeholder="e.g. Canada" />
              </Field>
            </div>

            <Field label="Public website" hint="So we can confirm your name is listed on the staff page">
              <input style={input} value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://…" required />
            </Field>

            <div style={{ height: 1, background: T.line, margin: '8px 0 22px' }} />

            <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 6 }}>
              Verification
            </div>
            <p style={{ fontSize: 13, color: T.inkSoft, lineHeight: 1.6, marginTop: 0, marginBottom: 12 }}>
              We confirm every church on the public registry so members can trust who they find here.
            </p>
            <div style={{
              background: 'rgba(196,129,58,0.08)', border: `1px solid ${T.goldLight}`,
              borderRadius: 10, padding: '10px 12px', marginBottom: 18,
              fontSize: 12.5, color: T.inkSoft, lineHeight: 1.55,
            }}>
              <strong style={{ color: T.goldDark, fontWeight: 700 }}>✦ Fast-track:</strong> if you signed up with an email at your church's domain (e.g. <code style={{ fontSize: 12 }}>you@yourchurch.org</code>), and your church website matches, we'll approve you instantly — no waiting.
            </div>

            {!form.no_registration && (
              <>
                <Field label="Registration country">
                  <select style={select} value={form.registration_country} onChange={(e) => set('registration_country', e.target.value)}>
                    {REG_COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                  </select>
                </Field>

                <Field label={regCountry.field} hint={regCountry.hint}>
                  <input
                    style={input}
                    value={form.registration_number}
                    onChange={(e) => set('registration_number', e.target.value)}
                    placeholder={regCountry.code === 'CA' ? '123456789RR0001' : ''}
                  />
                </Field>
              </>
            )}

            <label style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              background: T.parchment, border: `1px solid ${T.goldLight}`, borderRadius: 12,
              padding: '12px 14px', marginBottom: 18, cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={form.no_registration}
                onChange={(e) => set('no_registration', e.target.checked)}
                style={{ marginTop: 3, accentColor: T.gold, transform: 'scale(1.1)' }}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13.5, color: T.ink, marginBottom: 2 }}>
                  Our church isn't formally registered
                </div>
                <div style={{ fontSize: 12, color: T.inkSoft, lineHeight: 1.5 }}>
                  Common for church plants, house churches, and parachurch ministries. We'll ask for a denominational reference instead.
                </div>
              </div>
            </label>

            {form.no_registration && (
              <Field
                label="Denominational reference"
                hint="A network or denomination we can contact to confirm — name, role, email or phone"
              >
                <textarea
                  style={{ ...input, minHeight: 88, resize: 'vertical', fontFamily: T.serif, lineHeight: 1.6 }}
                  value={form.denominational_reference}
                  onChange={(e) => set('denominational_reference', e.target.value)}
                  placeholder="e.g. Pastor Sarah Lee, Acts 29 Canada church planting director — sarah@acts29.org"
                />
              </Field>
            )}

            <div style={{ height: 1, background: T.line, margin: '8px 0 22px' }} />

            <Field label="Anything you want us to know? (optional)" hint="What you'd hope this gives your congregation. One sentence is plenty.">
              <textarea
                style={{ ...input, minHeight: 64, resize: 'vertical', fontFamily: T.serif, lineHeight: 1.6 }}
                value={form.reason}
                onChange={(e) => set('reason', e.target.value)}
                placeholder="e.g. We've been looking for a quieter way for our small group leaders to keep the conversation going midweek."
              />
            </Field>

            {error && <div style={{ color: T.error ?? '#c0392b', fontSize: 13, marginBottom: 12 }}>{error}</div>}

            {draftSavedAt && !draftRestored && (
              <div style={{
                fontSize: 11.5, color: T.inkMuted, marginBottom: 10, textAlign: 'right',
                fontFamily: T.serif, fontStyle: 'italic',
              }}>
                ✓ Draft saved · {relativeTime(draftSavedAt)}
              </div>
            )}

            <button
              type="submit"
              disabled={saving || !form.full_name || !form.pastor_role || !form.church_name || !form.denomination || !form.website}
              style={{
                width: '100%', background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
                padding: '14px 20px', fontSize: 15, fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Submitting…' : 'Submit application'}
            </button>

            <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 14, textAlign: 'center', lineHeight: 1.5 }}>
              We verify by hand against the public registry. Usually 2 business days.
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
