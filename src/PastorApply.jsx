import { useEffect, useState } from 'react';
import { supabase } from './supabase.js';
import { T } from './theme.js';

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

export default function PastorApply({ session, profile, onClose }) {
  const [existing, setExisting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

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

  const regCountry = REG_COUNTRIES.find((c) => c.code === form.registration_country) ?? REG_COUNTRIES[0];

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase
      .from('pastor_applications')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        setExisting(data);
        setLoading(false);
      });
  }, [session]);

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

    const { error: err } = await supabase
      .from('pastor_applications')
      .insert({
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
      });

    setSaving(false);
    if (err) return setError(err.message);
    setSubmitted(true);
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: T.cream, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: T.inkMuted, fontFamily: T.serif }}>Loading…</div>
      </div>
    );
  }

  const showSuccess  = submitted || (existing && existing.status === 'pending');
  const showApproved = existing && existing.status === 'approved';
  const showRejected = existing && existing.status === 'rejected';

  return (
    <div style={{ minHeight: '100vh', background: T.cream, padding: '40px 20px 80px', overflowY: 'auto' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.goldDark, fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 18 }}>
          ← Back
        </button>

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
            <div style={{ fontFamily: T.serif, fontSize: 18, color: T.ink, marginBottom: 6 }}>
              Welcome, pastor.
            </div>
            <div style={{ color: T.inkSoft, fontSize: 14, lineHeight: 1.6 }}>
              Your church has been added. You'll see it from your profile menu. You can edit the welcome note and share a QR code for your congregation to find it.
            </div>
          </div>
        )}

        {showRejected && (
          <div style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 14, padding: 22, marginBottom: 20 }}>
            <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: T.inkMuted, fontWeight: 700, marginBottom: 8 }}>
              Application not approved
            </div>
            <div style={{ color: T.inkSoft, fontSize: 14, lineHeight: 1.6 }}>
              {existing.notes || 'Thanks for applying. If you think this was a mistake, write to us at hello@theway.app.'}
            </div>
          </div>
        )}

        {showSuccess && (
          <div style={{ background: T.parchment, border: `1px solid ${T.goldLight}`, borderRadius: 14, padding: 22, marginBottom: 20 }}>
            <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 8 }}>
              ⏱ Application received
            </div>
            <div style={{ fontFamily: T.serif, fontSize: 17, color: T.ink, marginBottom: 6 }}>
              Thank you.
            </div>
            <div style={{ color: T.inkSoft, fontSize: 14, lineHeight: 1.6 }}>
              We verify each application against the public registry — usually within 2 business days. You'll get an email when your church is live.
            </div>
          </div>
        )}

        {!showSuccess && !showApproved && !showRejected && (
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
            <p style={{ fontSize: 13, color: T.inkSoft, lineHeight: 1.6, marginTop: 0, marginBottom: 16 }}>
              We confirm your church on the public registry before going live. This is what stops fakes from claiming a church name.
            </p>

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

            <Field label="Why do you want your church on The Way?" hint="One honest paragraph">
              <textarea
                style={{ ...input, minHeight: 110, resize: 'vertical', fontFamily: T.serif, lineHeight: 1.6 }}
                value={form.reason}
                onChange={(e) => set('reason', e.target.value)}
                placeholder="What you'd hope this gives your congregation between Sundays…"
              />
            </Field>

            {error && <div style={{ color: T.error ?? '#c0392b', fontSize: 13, marginBottom: 12 }}>{error}</div>}

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
