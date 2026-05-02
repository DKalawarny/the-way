import { useState } from 'react';
import { supabase } from './supabase.js';
import { T } from './theme.js';

const KINDS = [
  { id: 'text',              label: 'Share',     emoji: '✦', placeholder: 'What\u2019s on your heart?' },
  { id: 'verse',             label: 'Verse',     emoji: '📖', placeholder: 'A reflection on this passage\u2026' },
  { id: 'question',          label: 'Question',  emoji: '?',  placeholder: 'Ask anything\u2026' },
  { id: 'journey_milestone', label: 'Journey',   emoji: '✶', placeholder: 'A note about where you\u2019re at\u2026' },
];

const inputCss = {
  width: '100%', boxSizing: 'border-box',
  border: `1px solid ${T.line}`, borderRadius: 10, padding: '10px 12px',
  fontSize: 14.5, fontFamily: 'inherit', background: T.cream, color: T.ink, outline: 'none',
};

/**
 * Unified composer that posts into the public.posts table.
 * scope: 'me' | 'church' | 'group'  — determines which feed the post lands in
 * scopeId: required when scope is 'church' or 'group'
 * placeholder: optional override for the collapsed teaser
 */
export default function PostComposer({ session, scope = 'me', scopeId = null, placeholder, onPosted }) {
  const [open, setOpen]         = useState(false);
  const [kind, setKind]         = useState('text');
  const [text, setText]         = useState('');
  const [scriptureRef, setScriptureRef] = useState('');
  const [anon, setAnon]         = useState(false);
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState(null);

  function reset() {
    setText(''); setScriptureRef(''); setAnon(false); setKind('text'); setError(null);
  }

  async function submit() {
    if (!session?.user?.id) { setError('Sign in first.'); return; }
    if (!text.trim()) { setError('Say something first.'); return; }
    setBusy(true); setError(null);
    // body (text) holds the textual content; body_data (jsonb) holds the
    // structured extras the feed_items view merges back together.
    const bodyData = {};
    if (kind === 'verse' || kind === 'text') {
      if (scriptureRef.trim()) bodyData.scripture_ref = scriptureRef.trim();
    }
    const { data, error: err } = await supabase
      .from('posts')
      .insert({
        author_id:    session.user.id,
        scope,
        scope_id:     scope === 'me' ? null : scopeId,
        kind,
        body:         text.trim(),
        body_data:    bodyData,
        is_anonymous: anon,
      })
      .select()
      .single();
    setBusy(false);
    if (err) { setError(err.message); return; }
    reset();
    setOpen(false);
    onPosted?.(data);
  }

  const teaserText = placeholder
    ?? (scope === 'church' ? 'Post to your congregation\u2026' : 'Share something\u2026');

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          width: '100%', textAlign: 'left', cursor: 'pointer',
          background: T.white, border: `1px solid ${T.line}`, borderRadius: 14,
          padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
          color: T.inkMuted, fontSize: 14.5, fontFamily: T.serif, fontStyle: 'italic',
          marginBottom: 14,
        }}
      >
        <span style={{
          width: 28, height: 28, borderRadius: '50%', background: T.parchment,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: T.goldDark, fontSize: 14, fontStyle: 'normal',
        }}>✦</span>
        {teaserText}
      </button>
    );
  }

  const active = KINDS.find((k) => k.id === kind) ?? KINDS[0];

  // Journey milestones are personal/temporal — they belong in the user's
  // own feed, not in the shared church feed where they'd read like noise
  // ("✶ Day 4 of my prayer streak" doesn't belong next to a sermon question).
  const visibleKinds = scope === 'church'
    ? KINDS.filter((k) => k.id !== 'journey_milestone')
    : KINDS;

  return (
    <div style={{
      background: T.white, border: `1px solid ${T.line}`, borderRadius: 14,
      padding: '14px 16px', marginBottom: 14,
    }}>
      {/* Kind chips */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {visibleKinds.map((k) => {
          const isActive = k.id === kind;
          return (
            <button
              key={k.id}
              onClick={() => { setKind(k.id); if (k.id !== 'question') setAnon(false); }}
              style={{
                background: isActive ? T.ink : 'transparent',
                color: isActive ? T.cream : T.inkSoft,
                border: isActive ? 'none' : `1px solid ${T.line}`,
                borderRadius: 999, padding: '6px 12px', fontSize: 12.5, fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <span style={{ marginRight: 5 }}>{k.emoji}</span>{k.label}
            </button>
          );
        })}
      </div>

      {(kind === 'verse' || kind === 'text') && (
        <input
          value={scriptureRef}
          onChange={(e) => setScriptureRef(e.target.value)}
          placeholder={kind === 'verse' ? 'Scripture reference (e.g. Romans 8:28)' : 'Scripture reference (optional)'}
          style={{ ...inputCss, fontSize: 13, marginBottom: 8 }}
        />
      )}

      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={active.placeholder}
        rows={kind === 'text' ? 3 : 4}
        style={{ ...inputCss, fontFamily: T.serif, lineHeight: 1.65, resize: 'vertical' }}
      />

      {error && (
        <div style={{ color: T.error, fontSize: 13, margin: '8px 0 0', padding: '8px 10px', background: 'rgba(165,63,43,0.08)', borderRadius: 8 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
        {kind === 'question' ? (
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: T.inkSoft, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={anon}
              onChange={(e) => setAnon(e.target.checked)}
              style={{ accentColor: T.gold }}
            />
            Ask anonymously
          </label>
        ) : (
          <span style={{ fontSize: 12, color: T.inkMuted, fontStyle: 'italic' }}>
            Posted publicly under your name
          </span>
        )}
        <div style={{ flex: 1 }} />
        <button
          onClick={() => { reset(); setOpen(false); }}
          disabled={busy}
          style={{
            background: 'transparent', border: `1px solid ${T.line}`, borderRadius: 999,
            padding: '8px 14px', fontSize: 13, color: T.inkSoft, cursor: 'pointer',
          }}
        >Cancel</button>
        <button
          onClick={submit}
          disabled={busy || !text.trim()}
          style={{
            background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
            padding: '9px 18px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
            opacity: (busy || !text.trim()) ? 0.5 : 1,
          }}
        >{busy ? 'Posting\u2026' : 'Post'}</button>
      </div>
    </div>
  );
}
