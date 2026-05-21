import { useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { supabase } from './supabase.js';
import { T } from './theme.js';
import { PERSON_TYPES } from './constants.js';
import HomeFound from './HomeFound.jsx';
import FlagPicker from './FlagPicker.jsx';
import { COUNTRIES } from './countries.js';

// Spiritual-state options only — chat-mode types (group, guided, kids) are
// intentionally excluded here; they live in constants.js for the AI prompts.
const PROFILE_PERSON_TYPES = ['curious','seeking','skeptic','heard-things','new-faith','deeper','inter-faith'];

const AGE_RANGES = ['Under 18','18–24','25–34','35–49','50–64','65+'];

const EXPLORING_SINCE = [
  'Just starting out',
  'A few weeks',
  'A few months',
  'About a year',
  '2–5 years',
  'More than 5 years',
  'Grew up in it',
];

const TRADITIONS = [
  'Still Discovering','Catholic','Eastern Orthodox','Ethiopian Orthodox',
  'Anglican / Episcopal','Baptist','Presbyterian / Reformed','Methodist',
  'Lutheran','Pentecostal / Charismatic','Non-denominational Evangelical',
  'Adventist','Mennonite / Anabaptist','Other',
];
const BACKGROUNDS = ['No religious background', ...TRADITIONS.filter((t) => t !== 'Still Discovering')];
const LOOKING_FOR = [
  { id: 'exploring',    label: 'Just exploring on my own' },
  { id: 'discussion',  label: 'Open to discussion with others' },
  { id: 'study-group', label: 'Looking for a study group' },
  { id: 'discipleship',label: 'Open to discipleship (being mentored)' },
  { id: 'mentoring',   label: 'Willing to mentor others' },
];

const iStyle = {
  width: '100%', border: `1px solid ${T.line}`, borderRadius: 10,
  padding: '11px 14px', fontSize: 15, background: T.white,
  color: T.ink, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
};
const sStyle = { ...iStyle, cursor: 'pointer' };

// Decorative inline SVG — open book (scripture motif)
function BookMark() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ display: 'block' }}>
      <circle cx="24" cy="24" r="23" stroke="rgba(184,115,58,0.25)" strokeWidth="1"/>
      <path d="M24 10C20 7 13 7 8 10v22c5-3 12-3 16 0 4-3 11-3 16 0V10c-5-3-12-3-16 0z"
            stroke="#B8733A" strokeWidth="1.5" strokeLinejoin="round" fill="rgba(184,115,58,0.07)"/>
      <path d="M24 10v22" stroke="#B8733A" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M16 16h4M16 20h4M28 16h4M28 20h4" stroke="rgba(184,115,58,0.5)" strokeWidth="1" strokeLinecap="round"/>
    </svg>
  );
}

function CrossMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 3v14M4 8h12" stroke={T.gold} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function Section({ icon, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '32px 0 22px' }}>
      <div style={{
        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
        background: 'rgba(184,115,58,0.1)', border: `1px solid rgba(184,115,58,0.22)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 15,
      }}>{icon}</div>
      <span style={{ fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700 }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: 'rgba(184,115,58,0.15)' }} />
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: T.ink, marginBottom: hint ? 3 : 7, letterSpacing: '0.005em' }}>
        {label}
      </label>
      {hint && <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 5 }}>{hint}</div>}
      {children}
    </div>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none', marginBottom: 16 }}>
      <div
        onClick={onChange}
        style={{
          width: 38, height: 22, borderRadius: 999, flexShrink: 0,
          background: checked ? T.gold : T.line,
          position: 'relative', transition: 'background 0.2s', cursor: 'pointer',
        }}
      >
        <div style={{
          position: 'absolute', top: 3, left: checked ? 19 : 3,
          width: 16, height: 16, borderRadius: '50%',
          background: '#fff', transition: 'left 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
        }} />
      </div>
      <span style={{ fontSize: 13, color: T.inkSoft }}>{label}</span>
    </label>
  );
}

export default function ProfileSetup({ user, existing, onSave, onCancel }) {
  const [form, setForm] = useState({
    display_name:       existing?.display_name ?? user?.user_metadata?.display_name ?? '',
    age_range:          existing?.age_range ?? '',
    gender:             existing?.gender ?? '',
    city:               existing?.city ?? '',
    person_type:        existing?.person_type ?? '',
    background:         existing?.background ?? '',
    tradition:          existing?.tradition ?? 'Still Discovering',
    exploring_since:    existing?.exploring_since ?? '',
    what_brought:       existing?.what_brought ?? '',
    looking_for:        existing?.looking_for ?? [],
    tts_voice:          existing?.tts_voice ?? 'onyx',
    flags:              existing?.flags ?? [],
    show_flag:          existing?.show_flag ?? false,
    preferred_language: existing?.preferred_language ?? (navigator.language?.split('-')[0] ?? 'en'),
  });

  const [prevTradition] = useState(existing?.tradition ?? 'Still Discovering');
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState(null);
  const [showMilestone, setShowMilestone] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleLooking = (id) =>
    set('looking_for', form.looking_for.includes(id)
      ? form.looking_for.filter((x) => x !== id)
      : [...form.looking_for, id]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const isNewHome = prevTradition === 'Still Discovering' && form.tradition !== 'Still Discovering';
    const countryText = form.flags.length > 0
      ? (COUNTRIES.find(([c]) => c === form.flags[0])?.[1] ?? '') : '';

    const payload = {
      id: user.id, ...form,
      country: countryText,
      ...(existing?.avatar_config ? { avatar_config: existing.avatar_config } : {}),
      ...(isNewHome ? { home_found_at: new Date().toISOString() } : {}),
      updated_at: new Date().toISOString(),
    };

    const { error: err } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
    setSaving(false);
    if (err) return setError(err.message);
    if (isNewHome) setShowMilestone(true);
    else onSave(payload);
  }

  const isEdit = !!existing;

  return (
    <>
      {showMilestone && (
        <HomeFound
          tradition={form.tradition}
          name={form.display_name}
          onContinue={() => { setShowMilestone(false); onSave(form); }}
        />
      )}

      <div style={{ minHeight: '100vh', background: T.cream, padding: '36px 20px 100px', overflowY: 'auto' }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>

          {onCancel && (
            <button onClick={onCancel} style={{ background: 'none', border: 'none', color: T.goldDark, cursor: 'pointer', padding: 0, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 5, fontSize: 14 }}>
              <ArrowLeft size={15} strokeWidth={2} /> Back
            </button>
          )}

          {/* ── Hero card ── */}
          <div style={{
            background: `linear-gradient(150deg, rgba(184,115,58,0.1) 0%, rgba(184,115,58,0.04) 60%, rgba(253,248,240,0) 100%)`,
            border: `1px solid rgba(184,115,58,0.2)`,
            borderRadius: 20,
            padding: '32px 28px 28px',
            marginBottom: 10,
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Decorative gold rings */}
            <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', border: '1px solid rgba(184,115,58,0.12)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: -20, right: -20, width: 90, height: 90, borderRadius: '50%', border: '1px solid rgba(184,115,58,0.1)', pointerEvents: 'none' }} />

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
              <BookMark />
              <div>
                <div style={{ fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 6 }}>
                  {isEdit ? 'Edit your profile' : 'Set up your profile'}
                </div>
                <h2 style={{ fontFamily: T.serif, fontSize: 28, fontWeight: 600, color: T.ink, margin: '0 0 8px', letterSpacing: '-0.022em', lineHeight: 1.1 }}>
                  {isEdit ? 'Your profile' : 'Tell us about you'}
                </h2>
                <p style={{ color: T.inkMuted, fontSize: 13.5, lineHeight: 1.5, margin: 0 }}>
                  Only your name and city are visible to others.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSave}>

            {/* ── The basics ── */}
            <Section icon="👤" label="The basics" />

            <Field label="Display name">
              <input style={iStyle} value={form.display_name} onChange={(e) => set('display_name', e.target.value)} placeholder="How you'll appear to others" required />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Age range">
                <select style={sStyle} value={form.age_range} onChange={(e) => set('age_range', e.target.value)}>
                  <option value="">Select…</option>
                  {AGE_RANGES.map((a) => <option key={a}>{a}</option>)}
                </select>
              </Field>
              <Field label="Gender">
                <select style={sStyle} value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                  <option value="">Select…</option>
                  {['Man','Woman','Prefer not to say'].map((g) => <option key={g}>{g}</option>)}
                </select>
              </Field>
            </div>

            <Field label="City" hint="City only — never your address">
              <input style={iStyle} value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="e.g. Toronto" />
            </Field>

            <Field label="Country" hint={form.flags.length < 2 ? 'Add a second if you have dual citizenship' : undefined}>
              <FlagPicker
                value={form.flags}
                onChange={(v) => {
                  set('flags', v);
                  if (v.length > 0 && form.flags.length === 0) set('show_flag', true);
                }}
              />
            </Field>

            {form.flags.length > 0 && (
              <Toggle
                checked={form.show_flag}
                onChange={() => set('show_flag', !form.show_flag)}
                label="Show my flag next to my name on posts"
              />
            )}

            <Field label="Language">
              <select style={sStyle} value={form.preferred_language} onChange={(e) => set('preferred_language', e.target.value)}>
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

            {/* ── Faith journey ── */}
            <Section icon={<CrossMark />} label="Faith journey" />

            <Field label="Where are you at right now?">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {PERSON_TYPES.filter((p) => PROFILE_PERSON_TYPES.includes(p.id)).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => set('person_type', p.id)}
                    style={{
                      textAlign: 'left', padding: '11px 14px', borderRadius: 10,
                      border: `1.5px solid ${form.person_type === p.id ? T.gold : T.line}`,
                      background: form.person_type === p.id ? 'rgba(184,115,58,0.08)' : T.white,
                      cursor: 'pointer', fontSize: 13, color: T.ink,
                      transition: 'border-color 0.12s, background 0.12s',
                    }}
                  >
                    {p.emoji} {p.label}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Tradition" hint="'Still Discovering' is a good answer">
              <select style={sStyle} value={form.tradition} onChange={(e) => set('tradition', e.target.value)}>
                {TRADITIONS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>

            <Field label="How long have you been exploring?">
              <select style={sStyle} value={form.exploring_since} onChange={(e) => set('exploring_since', e.target.value)}>
                <option value="">Select…</option>
                {EXPLORING_SINCE.map((o) => <option key={o}>{o}</option>)}
              </select>
            </Field>

            {/* ── Optional ── */}
            <Section icon="💬" label="Optional" />

            <Field label="What brought you here?" hint="One honest line — or leave it blank">
              <input style={iStyle} value={form.what_brought} onChange={(e) => set('what_brought', e.target.value)} placeholder="e.g. A conversation that wouldn't leave me alone." />
            </Field>

            <Field label="What are you looking for?">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {LOOKING_FOR.map((opt) => (
                  <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, color: T.inkSoft }}>
                    <input
                      type="checkbox"
                      checked={form.looking_for.includes(opt.id)}
                      onChange={() => toggleLooking(opt.id)}
                      style={{ width: 16, height: 16, accentColor: T.gold, flexShrink: 0 }}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </Field>

            {/* ── Preferences ── */}
            <Section icon="🎧" label="Preferences" />

            <Field label="Read-back voice" hint="Used when you tap Listen on an AI response">
              <div style={{ display: 'flex', gap: 10 }}>
                {[
                  { id: 'onyx', label: 'James', gender: 'Male',   desc: 'Deep and unhurried' },
                  { id: 'nova', label: 'Grace', gender: 'Female', desc: 'Soft and soothing' },
                ].map((v) => {
                  const active = form.tts_voice === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => set('tts_voice', v.id)}
                      style={{
                        flex: 1, padding: '14px', borderRadius: 12,
                        border: `1.5px solid ${active ? T.gold : T.line}`,
                        background: active ? 'rgba(184,115,58,0.08)' : T.white,
                        cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ fontSize: 11, color: T.inkMuted, marginBottom: 2 }}>{v.gender}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: T.ink, marginBottom: 3 }}>{v.label}</div>
                      <div style={{ fontSize: 12, color: T.inkMuted }}>{v.desc}</div>
                      {active && (
                        <div style={{ marginTop: 8, fontSize: 11, color: T.goldDark, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Check size={11} strokeWidth={2.5} /> selected
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </Field>

            {/* ── Save ── */}
            {error && <div style={{ color: T.error, fontSize: 13, marginBottom: 12 }}>{error}</div>}

            <div style={{ marginTop: 32, borderTop: `1px solid rgba(184,115,58,0.15)`, paddingTop: 24 }}>
              <button
                type="submit"
                disabled={saving || !form.display_name}
                style={{
                  width: '100%',
                  background: saving || !form.display_name
                    ? T.line
                    : `linear-gradient(135deg, ${T.gold} 0%, #c47020 100%)`,
                  color: T.cream, border: 'none', borderRadius: 999,
                  padding: '15px 20px', fontSize: 15, fontWeight: 600,
                  cursor: saving || !form.display_name ? 'not-allowed' : 'pointer',
                  boxShadow: saving || !form.display_name ? 'none' : '0 4px 20px rgba(184,115,58,0.35)',
                  transition: 'all 0.15s',
                  letterSpacing: '0.01em',
                }}
              >
                {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save and continue'}
              </button>
              <div style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: T.inkMuted }}>
                Nothing here is permanent — you can change this any time.
              </div>
            </div>

          </form>
        </div>
      </div>
    </>
  );
}
