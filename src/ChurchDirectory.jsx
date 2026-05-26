import { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase.js';
import { T } from './theme.js';
import { KinwoveStar } from './components/brand/KinwoveStar.jsx';

export default function ChurchDirectory({ session, profile, onBack, onOpenChurch, onApply }) {
  const [churches, setChurches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [memberCounts, setMemberCounts] = useState({});
  const [codeVal, setCodeVal] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState(null);

  async function joinByCode(e) {
    e.preventDefault();
    const code = codeVal.trim().toUpperCase();
    if (!code) return;
    setCodeLoading(true);
    setCodeError(null);
    const res = await fetch(`/api/church/by-invite-code?code=${encodeURIComponent(code)}`);
    const { church: ch } = await res.json();
    setCodeLoading(false);
    if (!ch) { setCodeError('No church found with that code.'); return; }
    onOpenChurch?.(ch.id);
  }

  useEffect(() => {
    setLoading(true);
    supabase
      .from('churches')
      .select('id, name, denomination, city, country, pastor_id, pinned_post, verification_status')
      .eq('is_public', true)
      .eq('verification_status', 'verified')
      .order('created_at', { ascending: false })
      .then(async ({ data }) => {
        const list = data ?? [];
        setChurches(list);
        if (list.length) {
          const ids = list.map((c) => c.id);
          const { data: members } = await supabase
            .from('profiles')
            .select('church_id')
            .in('church_id', ids);
          const counts = {};
          for (const m of members ?? []) counts[m.church_id] = (counts[m.church_id] ?? 0) + 1;
          setMemberCounts(counts);
        }
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return churches;
    return churches.filter((c) =>
      [c.name, c.denomination, c.city, c.country].filter(Boolean).join(' ').toLowerCase().includes(q)
    );
  }, [churches, query]);

  return (
    <div style={{ minHeight: '100vh', background: T.cream, paddingBottom: 80 }}>
      <header style={{
        background: T.white, borderBottom: `1px solid ${T.line}`,
        position: 'sticky', top: 0, zIndex: 10,
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}>
        <div style={{ padding: '0 16px', height: 56, display: 'flex', alignItems: 'center' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: T.goldDark, fontSize: 14, cursor: 'pointer', padding: '0 12px', minHeight: 44, display: 'flex', alignItems: 'center' }}>
          ← Back
        </button>
        <div style={{ marginLeft: 12, fontFamily: T.display, fontSize: 20, fontWeight: 600, color: T.ink, letterSpacing: '-0.015em' }}>
          Churches
        </div>
        {/* Push pastor CTA away from the fixed FAB cluster (bell + messages + search + menu ≈ 200px from right) */}
        {onApply && (
          <button onClick={onApply} style={{
            marginLeft: 'auto', marginRight: 164, background: T.parchment, border: `1px solid ${T.line}`,
            borderRadius: 999, padding: '6px 14px', fontSize: 13, color: T.goldDark, fontWeight: 600, cursor: 'pointer',
            flexShrink: 0,
          }}>
            <KinwoveStar size={12} style={{ verticalAlign: 'middle', marginRight: 5, flexShrink: 0 }} /> I'm a pastor
          </button>
        )}
        </div>
      </header>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 16px' }}>

        {/* Invite code entry */}
        <form onSubmit={joinByCode} style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 8 }}>
            Have an invite code?
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={codeVal}
              onChange={(e) => { setCodeVal(e.target.value.toUpperCase()); setCodeError(null); }}
              placeholder="Enter code…"
              maxLength={16}
              style={{
                flex: 1, boxSizing: 'border-box',
                border: `1px solid ${codeError ? '#a53f2b' : T.line}`, borderRadius: 12,
                padding: '11px 16px', fontSize: 14, background: T.white,
                color: T.ink, outline: 'none', fontFamily: 'ui-monospace, monospace',
                letterSpacing: 2, fontWeight: 600,
              }}
            />
            <button type="submit" disabled={!codeVal.trim() || codeLoading} style={{
              background: T.ink, color: T.cream, border: 'none', borderRadius: 12,
              padding: '11px 20px', fontSize: 14, fontWeight: 600,
              cursor: codeVal.trim() ? 'pointer' : 'not-allowed',
              opacity: codeVal.trim() ? 1 : 0.4, flexShrink: 0,
            }}>
              {codeLoading ? '…' : 'Go →'}
            </button>
          </div>
          {codeError && <div style={{ fontSize: 12, color: '#a53f2b', marginTop: 6 }}>{codeError}</div>}
        </form>

        <div style={{ fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: T.inkMuted, fontWeight: 700, marginBottom: 8 }}>
          Or search
        </div>
        <div style={{ marginBottom: 14 }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, city, or denomination…"
            style={{
              width: '100%', boxSizing: 'border-box',
              border: `1px solid ${T.line}`, borderRadius: 12,
              padding: '11px 16px', fontSize: 14, background: T.white,
              color: T.ink, outline: 'none', fontFamily: 'inherit',
            }}
          />
        </div>

        {loading && (
          <div style={{ textAlign: 'center', color: T.inkMuted, padding: 40, fontFamily: T.serif }}>Loading…</div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>⛪</div>
            <div style={{ fontFamily: T.serif, fontSize: 20, color: T.ink, marginBottom: 8 }}>
              {query ? 'No churches match.' : 'No churches yet.'}
            </div>
            <div style={{ fontSize: 14, color: T.inkMuted, lineHeight: 1.6, maxWidth: 360, margin: '0 auto' }}>
              {query ? 'Try a different search.' : 'Be the first — if you\u2019re a pastor, apply to bring your church to kinwove.'}
            </div>
            {!query && onApply && (
              <button onClick={onApply} style={{
                marginTop: 18, background: T.ink, color: T.cream, border: 'none',
                borderRadius: 999, padding: '11px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}>
                <KinwoveStar size={12} style={{ verticalAlign: 'middle', marginRight: 5, flexShrink: 0 }} /> Apply as a pastor
              </button>
            )}
          </div>
        )}

        {filtered.map((c) => {
          const count = memberCounts[c.id] ?? 0;
          const isMine = profile?.church_id === c.id;
          return (
            <button
              key={c.id}
              onClick={() => onOpenChurch?.(c.id)}
              style={{
                width: '100%', textAlign: 'left',
                background: T.white, border: `1px solid ${isMine ? T.gold : T.line}`,
                borderRadius: 14, padding: '14px 16px', marginBottom: 10,
                display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
              }}
            >
              <div style={{
                width: 46, height: 46, borderRadius: '50%',
                background: T.parchment, border: `1px solid ${T.line}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, flexShrink: 0,
              }}>⛪</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.name}
                  </div>
                  {isMine && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: T.goldDark, background: 'rgba(184,115,58,0.12)', padding: '2px 7px', borderRadius: 999, letterSpacing: 0.4, textTransform: 'uppercase' }}>
                      Yours
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: T.inkMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {[c.denomination, [c.city, c.country].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
                </div>
                {count > 0 && (
                  <div style={{ fontSize: 12, color: T.goldDark, marginTop: 3 }}>
                    {count} member{count !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
              <div style={{ color: T.inkMuted, fontSize: 18, flexShrink: 0 }}>›</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
