import { useState } from 'react';
import { supabase, authedFetch } from './supabase.js';
import { T } from './theme.js';

const TRADITIONS = [
  'Non-denominational', 'Baptist', 'Catholic', 'Anglican / Episcopal',
  'Pentecostal / Charismatic', 'Methodist', 'Presbyterian', 'Lutheran',
  'Orthodox', 'Other',
];

function makeInviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export default function GroupSetup({ session, onJoined, onClose, initialCode, initialTab }) {
  const [tab, setTab]           = useState(initialTab ?? 'join');
  const [code, setCode]         = useState(initialCode ?? '');
  const [name, setName]         = useState('');
  const [tradition, setTradition] = useState('Non-denominational');
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState('');
  const [created, setCreated]   = useState(null);
  const [copied, setCopied]     = useState(false);

  // ── Join ──────────────────────────────────────────────────────────────────
  async function join() {
    if (!code.trim()) return;
    setBusy(true);
    setError('');
    const { data: group, error: gErr } = await supabase
      .from('church_groups')
      .select('*')
      .eq('invite_code', code.trim().toUpperCase())
      .single();
    if (gErr || !group) {
      setError('No group found with that code — check it and try again.');
      setBusy(false);
      return;
    }
    const { error: mErr } = await supabase.from('group_members').insert({
      group_id: group.id,
      member_id: session.user.id,
      role: 'member',
    });
    if (mErr && !mErr.message.includes('unique')) {
      setError('Something went wrong. Try again.');
      setBusy(false);
      return;
    }
    // Tell the circle's creator someone arrived (fire-and-forget; skip if we
    // were already a member — the unique-violation path returns above only on
    // real errors, so a fresh join always lands here exactly once).
    if (!mErr) {
      authedFetch('/api/groups/joined-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: group.id }),
      }).catch(() => {});
    }
    setBusy(false);
    onJoined({ group, role: 'member' });
  }

  // ── Create (free — no Stripe) ─────────────────────────────────────────────
  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    setError('');
    const inviteCode = makeInviteCode();
    const { data: group, error: gErr } = await supabase
      .from('church_groups')
      .insert({ name: name.trim(), created_by: session.user.id, invite_code: inviteCode })
      .select()
      .single();
    if (gErr) { setError(gErr.message || 'Something went wrong. Try again.'); setBusy(false); return; }
    await supabase.from('group_members').insert({
      group_id: group.id, member_id: session.user.id, role: 'pastor',
    });
    setBusy(false);
    setCreated({ group, inviteCode });
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (created) {
    return (
      <div style={{
        minHeight: '100vh', background: T.cream,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 32,
      }}>
        <div style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 11, letterSpacing: 4, color: T.gold, textTransform: 'uppercase', marginBottom: 18, opacity: 0.8 }}>
            Group created
          </div>
          <div style={{ fontFamily: T.serif, fontSize: 32, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 10 }}>
            {created.group.name}
          </div>
          <div style={{ fontSize: 14, color: T.inkMuted, lineHeight: 1.65, marginBottom: 36 }}>
            Share this code with your group — they enter it on the "Join a group" screen.
          </div>
          <div style={{ background: 'rgba(184,115,58,0.1)', border: '1px solid rgba(184,115,58,0.35)', borderRadius: 16, padding: '28px 24px', marginBottom: 24 }}>
            <div style={{ fontSize: 11, letterSpacing: 3, color: T.gold, textTransform: 'uppercase', marginBottom: 12, opacity: 0.7 }}>
              Invite code
            </div>
            <div style={{ fontFamily: T.serif, fontSize: 44, fontWeight: 600, color: T.ink, letterSpacing: 8 }}>
              {created.inviteCode}
            </div>
          </div>
          <button
            onClick={() => {
              const text = created.inviteCode;
              if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }).catch(() => {
                  // fallback
                  const el = document.createElement('input');
                  el.value = text;
                  document.body.appendChild(el);
                  el.select();
                  document.execCommand('copy');
                  document.body.removeChild(el);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                });
              } else {
                const el = document.createElement('input');
                el.value = text;
                document.body.appendChild(el);
                el.select();
                document.execCommand('copy');
                document.body.removeChild(el);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }
            }}
            style={{
              background: copied ? 'rgba(80,160,80,0.12)' : 'transparent',
              border: `1px solid ${copied ? 'rgba(80,160,80,0.4)' : 'rgba(184,115,58,0.35)'}`,
              color: copied ? '#4a9a4a' : T.ink,
              borderRadius: 999, padding: '10px 24px',
              fontSize: 13, cursor: 'pointer', marginBottom: 16,
              transition: 'all 0.2s',
            }}
          >
            {copied ? '✓ Copied!' : 'Copy code'}
          </button>
          <br />
          <button
            onClick={() => onJoined({ group: created.group, role: 'pastor' })}
            style={{
              background: T.gold, color: T.cream, border: 'none', borderRadius: 999,
              padding: '13px 32px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(184,115,58,0.3)',
            }}
          >
            Enter your group →
          </button>
        </div>
      </div>
    );
  }

  // ── Main screen ───────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: T.cream, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${T.gold}, transparent)` }} />

      <header style={{
        padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14,
        borderBottom: '1px solid rgba(184,115,58,0.15)', background: T.cream,
      }}>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: T.inkMuted,
          fontSize: 13, cursor: 'pointer', padding: 0,
        }}>← Back</button>
        <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 600, color: T.ink, letterSpacing: '-0.015em', flex: 1 }}>
          Circle
        </div>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(184,115,58,0.12)', background: T.parchment, flexShrink: 0 }}>
        {[{ id: 'join', label: 'Join a group' }, { id: 'create', label: 'Start a group' }].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
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

        {/* ── JOIN ── */}
        {tab === 'join' && (
          <>
            <div style={{ fontFamily: T.serif, fontSize: 28, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em', lineHeight: 1.12, marginBottom: 10 }}>
              Join your group
            </div>
            <div style={{ fontSize: 14, color: T.inkMuted, lineHeight: 1.65, marginBottom: 32 }}>
              Your group leader will share a 6-character invite code. Enter it below.
            </div>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
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
              color: busy || code.length < 6 ? T.inkMuted : T.cream,
              border: 'none', borderRadius: 999, padding: '14px', fontSize: 14,
              fontWeight: 600, cursor: busy || code.length < 6 ? 'default' : 'pointer', width: '100%',
            }}>
              {busy ? 'Joining…' : 'Join group'}
            </button>
          </>
        )}

        {/* ── CREATE ── */}
        {tab === 'create' && (
          <>
            <div style={{ fontFamily: T.serif, fontSize: 28, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em', lineHeight: 1.12, marginBottom: 8 }}>
              Start a group
            </div>
            <div style={{ fontSize: 14, color: T.inkMuted, lineHeight: 1.65, marginBottom: 28 }}>
              Free for everyone. Create a Bible study, discipleship circle, or prayer group — you'll get an invite code to share with your people.
            </div>

            <label style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: T.inkMuted, marginBottom: 8, display: 'block' }}>
              Group name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Friday morning Bible study"
              style={{
                background: T.white, border: `1px solid ${T.line}`,
                borderRadius: 12, padding: '13px 16px', fontSize: 15, color: T.ink,
                outline: 'none', marginBottom: 20, width: '100%', boxSizing: 'border-box',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = T.gold)}
              onBlur={(e) => (e.currentTarget.style.borderColor = T.line)}
            />

            {error && <div style={{ fontSize: 13, color: '#E07070', marginBottom: 12 }}>{error}</div>}

            <button onClick={create} disabled={busy || !name.trim()} style={{
              background: busy || !name.trim()
                ? 'rgba(184,115,58,0.3)'
                : `linear-gradient(135deg, ${T.gold} 0%, #c47020 100%)`,
              color: busy || !name.trim() ? T.inkMuted : T.cream,
              border: 'none', borderRadius: 999, padding: '14px', fontSize: 14, fontWeight: 600,
              cursor: busy || !name.trim() ? 'default' : 'pointer', width: '100%',
              boxShadow: !busy && name.trim() ? '0 4px 16px rgba(184,115,58,0.35)' : 'none',
            }}>
              {busy ? 'Creating…' : 'Create circle →'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
