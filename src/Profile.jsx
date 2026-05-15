import { useEffect, useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { supabase } from './supabase.js';
import { T } from './theme.js';
import { PERSON_TYPES } from './constants.js';
import HomeFound from './HomeFound.jsx';
import FlagPicker from './FlagPicker.jsx';

const TRADITIONS = [
  'Still Discovering',
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

const BACKGROUNDS = ['No religious background', ...TRADITIONS.filter((t) => t !== 'Still Discovering')];

const LOOKING_FOR = [
  { id: 'exploring', label: 'Just exploring on my own' },
  { id: 'discussion', label: 'Open to discussion with others' },
  { id: 'study-group', label: 'Looking for a study group' },
  { id: 'discipleship', label: 'Open to discipleship (being mentored)' },
  { id: 'mentoring', label: 'Willing to mentor others' },
];

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: 'block', fontWeight: 500, color: T.ink, marginBottom: hint ? 2 : 6, fontSize: 14 }}>
        {label}
      </label>
      {hint && <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 6 }}>{hint}</div>}
      {children}
    </div>
  );
}

const input = {
  width: '100%',
  border: `1px solid ${T.line}`,
  borderRadius: 10,
  padding: '10px 14px',
  fontSize: 15,
  background: T.cream,
  color: T.ink,
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const select = { ...input, cursor: 'pointer' };

export default function ProfileSetup({ user, existing, onSave, onCancel }) {
  const [form, setForm] = useState({
    display_name: existing?.display_name ?? user?.user_metadata?.display_name ?? '',
    age_range: existing?.age_range ?? '',
    gender: existing?.gender ?? '',
    city: existing?.city ?? '',
    country: existing?.country ?? '',
    person_type: existing?.person_type ?? '',
    background: existing?.background ?? '',
    tradition: existing?.tradition ?? 'Still Discovering',
    exploring_since: existing?.exploring_since ?? '',
    what_brought: existing?.what_brought ?? '',
    looking_for: existing?.looking_for ?? [],
    tts_voice: existing?.tts_voice ?? 'onyx',
    flags: existing?.flags ?? [],
    show_flag: existing?.show_flag ?? false,
    preferred_language: existing?.preferred_language ?? (navigator.language?.split('-')[0] ?? 'en'),
  });

  const [prevTradition] = useState(existing?.tradition ?? 'Still Discovering');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showMilestone, setShowMilestone] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleLooking = (id) =>
    set('looking_for', form.looking_for.includes(id)
      ? form.looking_for.filter((x) => x !== id)
      : [...form.looking_for, id]
    );

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const isNewHome =
      prevTradition === 'Still Discovering' &&
      form.tradition !== 'Still Discovering';

    const payload = {
      id: user.id,
      ...form,
      ...(existing?.avatar_config ? { avatar_config: existing.avatar_config } : {}),
      ...(isNewHome ? { home_found_at: new Date().toISOString() } : {}),
      updated_at: new Date().toISOString(),
    };

    const { error: err } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' });

    setSaving(false);
    if (err) return setError(err.message);

    if (isNewHome) {
      setShowMilestone(true);
    } else {
      onSave(payload);
    }
  }

  return (
    <>
      {showMilestone && (
        <HomeFound
          tradition={form.tradition}
          name={form.display_name}
          onContinue={() => { setShowMilestone(false); onSave(form); }}
        />
      )}

      <div style={{
        minHeight: '100vh',
        background: T.cream,
        padding: '48px 20px',
        overflowY: 'auto',
      }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          {onCancel && (
            <button onClick={onCancel} style={{ background: 'none', border: 'none', color: T.goldDark, cursor: 'pointer', padding: 0, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 5, fontSize: 14 }}>
              <ArrowLeft size={15} strokeWidth={2} /> Back
            </button>
          )}
          <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: T.goldDark, marginBottom: 10 }}>
            {existing ? 'Edit your profile' : 'Set up your profile'}
          </div>
          <h2 style={{ fontFamily: T.display, fontSize: 34, fontWeight: 600, color: T.ink, margin: '0 0 8px', letterSpacing: '-0.022em', lineHeight: 1.08 }}>
            {existing ? 'Your profile' : 'Tell us a little about you'}
          </h2>
          <p style={{ color: T.inkSoft, fontSize: 15, lineHeight: 1.6, margin: '0 0 32px' }}>
            Only your display name and city are visible to others. Nothing here is permanent — you can change any of this any time.
          </p>

          <form onSubmit={handleSave}>
            <Field label="Display name">
              <input style={input} value={form.display_name} onChange={(e) => set('display_name', e.target.value)} placeholder="How you'll appear to others" required />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Age range">
                <select style={select} value={form.age_range} onChange={(e) => set('age_range', e.target.value)}>
                  <option value="">Select…</option>
                  {['18–24','25–34','35–49','50+'].map((a) => <option key={a}>{a}</option>)}
                </select>
              </Field>
              <Field label="Gender">
                <select style={select} value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                  <option value="">Select…</option>
                  {['Man','Woman','Prefer not to say'].map((g) => <option key={g}>{g}</option>)}
                </select>
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="City" hint="City only — never your address">
                <input style={input} value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="e.g. Toronto" />
              </Field>
              <Field label="Country">
                <input style={input} value={form.country} onChange={(e) => set('country', e.target.value)} placeholder="e.g. Canada" />
              </Field>
            </div>

            <Field label="Your countries (up to 2)">
              <FlagPicker value={form.flags} onChange={(v) => set('flags', v)} />
              {form.flags.length > 0 && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, cursor: 'pointer' }}>
                  <div
                    onClick={() => set('show_flag', !form.show_flag)}
                    style={{
                      width: 36, height: 20, borderRadius: 999, flexShrink: 0,
                      background: form.show_flag ? T.goldDark : T.line,
                      position: 'relative', transition: 'background 0.18s',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{
                      position: 'absolute', top: 2, left: form.show_flag ? 18 : 2,
                      width: 16, height: 16, borderRadius: '50%',
                      background: '#fff', transition: 'left 0.18s',
                    }} />
                  </div>
                  <span style={{ fontSize: 13, color: T.inkSoft }}>
                    Show my flag next to my name on posts
                  </span>
                </label>
              )}
            </Field>

            <Field label="Preferred language">
              <select style={select} value={form.preferred_language} onChange={(e) => set('preferred_language', e.target.value)}>
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="pt">Português</option>
                <option value="de">Deutsch</option>
                <option value="ko">한국어</option>
                <option value="zh">中文</option>
                <option value="hi">हिन्दी</option>
                <option value="sw">Kiswahili</option>
                <option value="yo">Yorùbá</option>
                <option value="ig">Igbo</option>
                <option value="ha">Hausa</option>
              </select>
            </Field>

            <Field label="How do you think of yourself right now?">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {PERSON_TYPES.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => set('person_type', p.id)}
                    style={{
                      textAlign: 'left',
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: `1px solid ${form.person_type === p.id ? T.gold : T.line}`,
                      background: form.person_type === p.id ? 'rgba(184,115,58,0.08)' : T.white,
                      cursor: 'pointer',
                      fontSize: 13,
                      color: T.ink,
                    }}
                  >
                    {p.emoji} {p.label}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Background" hint="Where you're coming from">
              <select style={select} value={form.background} onChange={(e) => set('background', e.target.value)}>
                <option value="">Select…</option>
                {BACKGROUNDS.map((b) => <option key={b}>{b}</option>)}
              </select>
            </Field>

            <Field label="Current tradition" hint="Be honest — 'Still Discovering' is a perfectly good answer">
              <select style={select} value={form.tradition} onChange={(e) => set('tradition', e.target.value)}>
                {TRADITIONS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>

            <Field label="How long exploring?">
              <select style={select} value={form.exploring_since} onChange={(e) => set('exploring_since', e.target.value)}>
                <option value="">Select…</option>
                {['Just started','A few months','About a year','Several years'].map((o) => <option key={o}>{o}</option>)}
              </select>
            </Field>

            <Field label="What brought you here?" hint="Optional — one honest line">
              <input style={input} value={form.what_brought} onChange={(e) => set('what_brought', e.target.value)} placeholder="e.g. A conversation that wouldn't leave me alone." />
            </Field>

            <Field label="What are you looking for?" hint="Select all that apply">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {LOOKING_FOR.map((opt) => (
                  <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, color: T.inkSoft }}>
                    <input
                      type="checkbox"
                      checked={form.looking_for.includes(opt.id)}
                      onChange={() => toggleLooking(opt.id)}
                      style={{ width: 16, height: 16, accentColor: T.gold }}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </Field>

            <Field label="Read-back voice" hint="The voice used when you tap Listen on any AI response">
              <div style={{ display: 'flex', gap: 10 }}>
                {[
                  { id: 'onyx', label: 'James', gender: 'Male', desc: 'Deep, rich, and unhurried — like a wise elder reading scripture' },
                  { id: 'nova', label: 'Grace', gender: 'Female', desc: 'Soft, gentle, and soothing — like a quiet prayer' },
                ].map((v) => {
                  const active = form.tts_voice === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => set('tts_voice', v.id)}
                      style={{
                        flex: 1,
                        padding: '12px 14px',
                        borderRadius: 12,
                        border: `1.5px solid ${active ? T.gold : T.line}`,
                        background: active ? 'rgba(184,115,58,0.08)' : T.white,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ fontSize: 11, color: T.inkMuted, marginBottom: 3 }}>{v.gender}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: T.ink, marginBottom: 4 }}>{v.label}</div>
                      <div style={{ fontSize: 11, color: T.inkMuted, lineHeight: 1.4 }}>{v.desc}</div>
                      {active && (
                        <div style={{ marginTop: 6, fontSize: 11, color: T.goldDark, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}><Check size={11} strokeWidth={2.5} /> selected</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </Field>

            {error && <div style={{ color: T.error, fontSize: 13, marginBottom: 12 }}>{error}</div>}

            <button
              type="submit"
              disabled={saving || !form.display_name}
              style={{
                width: '100%',
                background: T.ink,
                color: T.cream,
                border: 'none',
                borderRadius: 999,
                padding: '14px 20px',
                fontSize: 15,
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Saving…' : existing ? 'Save changes' : 'Save and continue'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
