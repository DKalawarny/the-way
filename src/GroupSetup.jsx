import { useState } from 'react';
import { supabase } from './supabase.js';
import { T } from './theme.js';

const TRADITIONS = [
  'Non-denominational', 'Baptist', 'Catholic', 'Anglican / Episcopal',
  'Pentecostal / Charismatic', 'Methodist', 'Presbyterian', 'Lutheran',
  'Orthodox', 'Other',
];

const PLANS = [
  {
    id: 'church_base',
    label: 'Church Base',
    members: 'Home group, Sunday school, or growing congregation',
    price: '$41.99',
    desc: 'Everything your group needs to study, pray, and grow together.',
  },
  {
    id: 'church_pro',
    label: 'Church Pro',
    members: 'Large congregation with full leadership tools',
    price: '$82.99',
    desc: 'Advanced tools, sermon threads, care team routing, and priority support.',
    featured: true,
  },
];

function makeInviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export default function GroupSetup({ session, onJoined, onClose }) {
  const [tab, setTab] = useState('join');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [tradition, setTradition] = useState('Non-denominational');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);

  async function join() {
    if (!code.trim()) return;
    setBusy(true);
    setError('');
    const { data: group, error: gErr } = await supabase
      .from('church_groups')
      .select('*')
      .eq('invite_code', code.trim().toUpperCase())
      .single();
    if (gErr || !group) { setError('No group found with that code. Check the code and try again.'); setBusy(false); return; }

    const { error: mErr } = await supabase.from('group_members').insert({
      group_id: group.id,
      member_id: session.user.id,
      role: 'member',
    });
    if (mErr && !mErr.message.includes('unique')) { setError('Something went wrong. Try again.'); setBusy(false); return; }
    setBusy(false);
    onJoined({ group, role: 'member' });
  }

  async function checkout() {
    if (!name.trim() || !selectedPlan) return;
    setBusy(true);
    setError('');

    const inviteCode = makeInviteCode();
    const { data: group, error: gErr } = await supabase.from('church_groups').insert({
      name: name.trim(),
      tradition,
      pastor_id: session.user.id,
      invite_code: inviteCode,
    }).select().single();
    if (gErr) { setError('Something went wrong. Try again.'); setBusy(false); return; }

    await supabase.from('group_members').insert({
      group_id: group.id,
      member_id: session.user.id,
      role: 'pastor',
    });

    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authSession.access_token}` },
          body: JSON.stringify({
            price_plan: selectedPlan,
            user_id: session.user.id,
            user_email: session.user.email,
            return_url: window.location.origin,
          }),
        }
      );
      const { url } = await res.json();
      if (url) { window.location.href = url; return; }
    } catch (e) {
      console.error('[GroupSetup] Stripe checkout error:', e);
      // Payment not configured yet — land on the success screen anyway so
      // the group invite code is visible. Payment can be collected separately.
    }

    // Stripe redirect not available — show the group anyway with invite code
    setBusy(false);
    setCreated({ group, inviteCode });
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (created) {
    return (
      <div style={{ minHeight: '100vh', background: T.cream, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 11, letterSpacing: 4, color: T.gold, textTransform: 'uppercase', marginBottom: 18, opacity: 0.8 }}>Group created</div>
          <div style={{ fontFamily: T.serif, fontSize: 32, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 10 }}>{created.group.name}</div>
          <div style={{ fontSize: 14, color: T.inkMuted, lineHeight: 1.65, marginBottom: 36 }}>
            Share this code with your group members so they can join.
          </div>
          <div style={{ background: 'rgba(184,115,58,0.1)', border: '1px solid rgba(184,115,58,0.35)', borderRadius: 16, padding: '28px 24px', marginBottom: 32 }}>
            <div style={{ fontSize: 11, letterSpacing: 3, color: T.gold, textTransform: 'uppercase', marginBottom: 12, opacity: 0.7 }}>Invite code</div>
            <div style={{ fontFamily: T.serif, fontSize: 44, fontWeight: 600, color: T.ink, letterSpacing: 8 }}>{created.inviteCode}</div>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(created.inviteCode).catch(() => {})}
            style={{ background: 'transparent', border: `1px solid rgba(184,115,58,0.35)`, color: T.ink, borderRadius: 999, padding: '10px 24px', fontSize: 13, cursor: 'pointer', marginBottom: 16 }}
          >
            Copy code
          </button>
          <br />
          <button
            onClick={() => onJoined({ group: created.group, role: 'pastor' })}
            style={{ background: T.gold, color: T.cream, border: 'none', borderRadius: 999, padding: '13px 32px', fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 16px rgba(184,115,58,0.3)' }}
          >
            Enter your group →
          </button>
        </div>
      </div>
    );
  }

  const plan = PLANS.find((p) => p.id === selectedPlan);

  return (
    <div style={{ minHeight: '100vh', background: T.cream, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${T.gold}, transparent)` }} />

      <header style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, borderBottom: '1px solid rgba(184,115,58,0.15)', background: T.cream }}>
        <button
          onClick={selectedPlan && tab === 'create' ? () => setSelectedPlan(null) : onClose}
          style={{ background: 'none', border: 'none', color: T.inkMuted, fontSize: 13, cursor: 'pointer', padding: 0 }}
        >
          ← Back
        </button>
        <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 600, color: T.ink, letterSpacing: '-0.015em', flex: 1 }}>Church</div>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(184,115,58,0.12)', background: T.parchment, flexShrink: 0 }}>
        {[{ id: 'join', label: 'Join a group' }, { id: 'create', label: 'Start a group' }].map((t) => (
          <button key={t.id} onClick={() => { setTab(t.id); setSelectedPlan(null); }} style={{
            flex: 1, padding: 14, background: 'none', border: 'none',
            borderBottom: tab === t.id ? `2px solid ${T.gold}` : '2px solid transparent',
            color: tab === t.id ? T.goldDark : '#9B8C73',
            fontSize: 13, fontWeight: tab === t.id ? 600 : 400, cursor: 'pointer', marginBottom: -1,
          }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 20px', maxWidth: 520, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>

        {/* ── JOIN TAB ── */}
        {tab === 'join' && (
          <>
            <div style={{ fontFamily: T.serif, fontSize: 28, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em', lineHeight: 1.12, marginBottom: 10 }}>Join your group</div>
            <div style={{ fontSize: 14, color: T.inkMuted, lineHeight: 1.65, marginBottom: 32 }}>
              Your pastor or group leader will have an 8-character invite code. Enter it below.
            </div>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC12345"
              maxLength={8}
              style={{
                background: T.white, border: '1px solid rgba(184,115,58,0.25)',
                borderRadius: 12, padding: '14px 18px', fontSize: 22, color: T.ink,
                outline: 'none', letterSpacing: 6, fontWeight: 700, marginBottom: 12,
                width: '100%', boxSizing: 'border-box', textAlign: 'center',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(184,115,58,0.6)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(184,115,58,0.25)')}
              onKeyDown={(e) => e.key === 'Enter' && join()}
            />
            {error && <div style={{ fontSize: 13, color: '#E07070', marginBottom: 12 }}>{error}</div>}
            <button onClick={join} disabled={busy || code.length < 6} style={{
              background: busy || code.length < 6 ? 'rgba(184,115,58,0.3)' : T.gold,
              color: T.ink, border: 'none', borderRadius: 999,
              padding: '14px', fontSize: 14, fontWeight: 600, cursor: busy || code.length < 6 ? 'default' : 'pointer', width: '100%',
            }}>
              {busy ? 'Joining…' : 'Join group'}
            </button>
          </>
        )}

        {/* ── CREATE TAB — PLAN SELECTION ── */}
        {tab === 'create' && !selectedPlan && (
          <>
            <div style={{ fontSize: 11, letterSpacing: 3, color: T.gold, textTransform: 'uppercase', marginBottom: 12, opacity: 0.8 }}>Church plans</div>
            <div style={{ fontFamily: T.serif, fontSize: 28, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em', lineHeight: 1.12, marginBottom: 8 }}>Choose your plan</div>
            <div style={{ fontSize: 14, color: T.inkMuted, lineHeight: 1.6, marginBottom: 28 }}>
              All plans include the full AI companion, group space, weekly focus, and live study sessions.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {PLANS.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedPlan(p.id)}
                  style={{
                    background: p.featured ? 'rgba(184,115,58,0.12)' : T.white,
                    border: `1px solid ${p.featured ? 'rgba(184,115,58,0.5)' : T.line}`,
                    borderRadius: 16, padding: '20px 22px', cursor: 'pointer',
                    position: 'relative', transition: 'all 0.18s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.gold; e.currentTarget.style.background = 'rgba(184,115,58,0.1)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = p.featured ? 'rgba(184,115,58,0.5)' : T.line; e.currentTarget.style.background = p.featured ? 'rgba(184,115,58,0.12)' : T.white; }}
                >
                  {p.featured && (
                    <div style={{ position: 'absolute', top: -11, left: 20, background: T.gold, color: T.cream, fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', padding: '3px 12px', borderRadius: 999 }}>
                      Most popular
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: T.ink, marginBottom: 3 }}>{p.label}</div>
                      <div style={{ fontSize: 12, color: T.inkMuted }}>{p.members}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: T.serif, fontSize: 24, fontWeight: 600, color: T.gold, letterSpacing: '-0.018em' }}>{p.price}</div>
                      <div style={{ fontSize: 11, color: T.inkMuted }}>CAD / month</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: '#4A3828', marginTop: 8 }}>{p.desc}</div>
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#B0A28A' }}>
              All prices in CAD. Cancel anytime.
            </div>
          </>
        )}

        {/* ── CREATE TAB — GROUP FORM (after plan selected) ── */}
        {tab === 'create' && selectedPlan && (
          <>
            {/* Selected plan pill */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(184,115,58,0.1)', border: '1px solid rgba(184,115,58,0.3)', borderRadius: 12, padding: '12px 16px', marginBottom: 28 }}>
              <div>
                <div style={{ fontSize: 12, color: T.gold, fontWeight: 600 }}>{plan?.label}</div>
                <div style={{ fontSize: 11, color: T.inkMuted, marginTop: 2 }}>{plan?.price} CAD/month</div>
              </div>
              <button onClick={() => setSelectedPlan(null)} style={{ background: 'none', border: 'none', color: '#9B8C73', fontSize: 12, cursor: 'pointer', padding: 0 }}>
                Change
              </button>
            </div>

            <div style={{ fontFamily: T.serif, fontSize: 28, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em', lineHeight: 1.12, marginBottom: 10 }}>Name your group</div>
            <div style={{ fontSize: 14, color: T.inkMuted, lineHeight: 1.65, marginBottom: 28 }}>
              You'll get an invite code to share with your members.
            </div>

            <label style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: T.inkMuted, marginBottom: 8, display: 'block' }}>Group name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="First Baptist Small Group"
              style={{
                background: T.white, border: `1px solid ${T.line}`,
                borderRadius: 12, padding: '13px 16px', fontSize: 15, color: T.ink,
                outline: 'none', marginBottom: 20, width: '100%', boxSizing: 'border-box',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = T.gold)}
              onBlur={(e) => (e.currentTarget.style.borderColor = T.line)}
            />

            <label style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: T.inkMuted, marginBottom: 8, display: 'block' }}>Tradition</label>
            <select
              value={tradition}
              onChange={(e) => setTradition(e.target.value)}
              style={{
                background: T.white, border: `1px solid ${T.line}`,
                borderRadius: 12, padding: '13px 16px', fontSize: 15, color: T.ink,
                outline: 'none', marginBottom: 28, width: '100%', boxSizing: 'border-box',
              }}
            >
              {TRADITIONS.map((t) => <option key={t} value={t} style={{ background: T.cream }}>{t}</option>)}
            </select>

            {error && <div style={{ fontSize: 13, color: '#E07070', marginBottom: 12 }}>{error}</div>}

            <button onClick={checkout} disabled={busy || !name.trim()} style={{
              background: busy || !name.trim() ? 'rgba(184,115,58,0.3)' : `linear-gradient(135deg, ${T.gold} 0%, #c47020 100%)`,
              color: T.ink, border: 'none', borderRadius: 999,
              padding: '14px', fontSize: 14, fontWeight: 600,
              cursor: busy || !name.trim() ? 'default' : 'pointer', width: '100%',
              boxShadow: !busy && name.trim() ? '0 4px 16px rgba(184,115,58,0.35)' : 'none',
            }}>
              {busy ? 'Setting up…' : 'Continue to payment →'}
            </button>
          </>
        )}
      </div>

    </div>
  );
}
