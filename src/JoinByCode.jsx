import { useState } from 'react';
import { supabase } from './supabase.js';
import { T } from './theme.js';

export default function JoinByCode({ session, profile, onJoined, prefilledCode = '' }) {
  const [code, setCode] = useState(prefilledCode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  async function submit(e) {
    e?.preventDefault?.();
    const cleaned = code.trim().toUpperCase();
    if (!cleaned) return;
    if (!session?.user?.id) { setError('Please sign in first.'); return; }
    if (!profile?.display_name) {
      setError('Please finish setting up your profile before joining a church.');
      return;
    }
    setBusy(true);
    setError(null);

    const { data: rows, error: lookupErr } = await supabase
      .rpc('church_by_invite_code', { p_code: cleaned });
    const ch = rows?.[0] ?? null;

    if (lookupErr || !ch) {
      setBusy(false);
      setError(`We couldn't find a church with that code. Double-check with whoever sent it.`);
      return;
    }

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ church_id: ch.id })
      .eq('id', session.user.id);

    setBusy(false);
    if (updateErr) {
      const msg = (updateErr.message || '').toLowerCase().includes('rejoin')
        ? `You can no longer rejoin ${ch.name}. If this is a mistake, ask the pastor to lift the block.`
        : `Couldn't join: ${updateErr.message}`;
      setError(msg);
      return;
    }

    setSuccess(`Welcome to ${ch.name}.`);
    onJoined?.(ch);
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 360 }}>
        <input
          value={code}
          onChange={(e) => { setCode(e.target.value); setError(null); }}
          placeholder="ABCD1234"
          maxLength={8}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          style={{
            flex: 1, minWidth: 0,
            background: T.white, border: `1px solid ${T.line}`, borderRadius: 10,
            padding: '11px 14px', fontSize: 16,
            fontFamily: 'ui-monospace, SFMono-Regular, monospace',
            letterSpacing: 2, textTransform: 'uppercase',
            color: T.ink, outline: 'none',
            textAlign: 'center', fontWeight: 600,
          }}
        />
        <button
          type="submit"
          disabled={busy || !code.trim()}
          style={{
            background: T.ink, color: T.cream, border: 'none', borderRadius: 10,
            padding: '11px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            opacity: (busy || !code.trim()) ? 0.5 : 1,
            whiteSpace: 'nowrap',
          }}
        >{busy ? 'Joining…' : 'Join'}</button>
      </div>
      {error && (
        <div style={{
          fontSize: 13, color: T.error, fontFamily: T.serif, lineHeight: 1.5,
          maxWidth: 360, textAlign: 'left',
        }}>{error}</div>
      )}
      {success && (
        <div style={{ fontSize: 13.5, color: T.goldDark, fontFamily: T.serif, fontStyle: 'italic' }}>
          {success}
        </div>
      )}
    </form>
  );
}
