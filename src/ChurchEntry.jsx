import { useEffect, useState } from 'react';
import { supabase } from './supabase.js';
import { T } from './theme.js';

// QR landing: someone scans a church's code. Don't dump them into AI by default —
// give them a clear choice between asking AI privately or messaging a real person.
export default function ChurchEntry({ churchId, session, onAskAI, onAskSomeone, onSignUp, onClose }) {
  const [church, setChurch] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!churchId) { setLoading(false); return; }
    supabase
      .from('churches')
      .select('id, name, denomination, city, country, verification_status')
      .eq('id', churchId)
      .maybeSingle()
      .then(({ data }) => {
        setChurch(data ?? null);
        setLoading(false);
      });
  }, [churchId]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: T.cream, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: T.inkMuted, fontFamily: T.serif }}>Loading…</div>
      </div>
    );
  }

  // Church not found OR not verified yet — RLS blocks unverified churches.
  if (!church) {
    return (
      <div style={{ minHeight: '100vh', background: T.cream, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 38, marginBottom: 12 }}>⛪</div>
        <div style={{ fontFamily: T.display, fontSize: 26, color: T.ink, fontWeight: 600, letterSpacing: '-0.018em', lineHeight: 1.15, marginBottom: 10 }}>
          This church isn't live yet.
        </div>
        <div style={{ fontSize: 15, color: T.inkSoft, lineHeight: 1.65, maxWidth: 380, marginBottom: 28 }}>
          We verify every church on The Way before listing it. This one is still being reviewed, or the link is out of date.
        </div>
        <button onClick={onClose} style={{
          background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
          padding: '12px 28px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>
          Open The Way
        </button>
      </div>
    );
  }

  const subline = [church.denomination, [church.city, church.country].filter(Boolean).join(', ')].filter(Boolean).join(' · ');

  function handleAskSomeone() {
    if (!session) { onSignUp?.(); return; }
    onAskSomeone?.();
  }

  return (
    <div className="scene" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${T.gold}, transparent)` }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div className="stagger-in" style={{ maxWidth: 460, width: '100%', textAlign: 'center' }}>
          <div className="halo" style={{ '--i': 0, width: 72, height: 72, borderRadius: '50%',
            background: T.parchment, border: `2px solid ${T.gold}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 30, margin: '0 auto 22px',
          }}>⛪</div>

          <h1 style={{ '--i': 1, fontFamily: T.display, fontSize: 34, fontWeight: 600, color: T.ink, margin: '0 0 6px', lineHeight: 1.08, letterSpacing: '-0.022em' }}>
            {church.name}
          </h1>
          {subline && (
            <div style={{ '--i': 2, fontSize: 13, color: T.inkMuted, marginBottom: 26 }}>
              {subline}
            </div>
          )}

          <p style={{ '--i': 3, fontFamily: T.serif, fontStyle: 'italic', fontSize: 17, color: T.inkSoft, lineHeight: 1.6, margin: subline ? '0 0 24px' : '4px 0 24px' }}>
            What would help most right now?
          </p>

          <div style={{ '--i': 4, display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left' }}>
            <button
              onClick={onAskAI}
              className="lift"
              style={{
                background: T.white, border: `1px solid ${T.line}`, borderRadius: 16,
                padding: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14,
                textAlign: 'left',
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12, background: 'rgba(196,129,58,0.10)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: T.goldDark, fontSize: 22, flexShrink: 0,
              }}>✦</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: T.display, fontSize: 18, fontWeight: 600, color: T.ink, letterSpacing: '-0.012em', marginBottom: 3 }}>
                  Ask anything
                </div>
                <div style={{ fontSize: 13, color: T.inkSoft, lineHeight: 1.5 }}>
                  Private AI chat. No name, no signup. Try a question, see how it answers.
                </div>
              </div>
            </button>

            <button
              onClick={handleAskSomeone}
              className="lift"
              style={{
                background: T.white, border: `1px solid ${T.line}`, borderRadius: 16,
                padding: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14,
                textAlign: 'left',
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12, background: T.parchment,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: T.goldDark, fontSize: 22, flexShrink: 0,
              }}>☎</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: T.display, fontSize: 18, fontWeight: 600, color: T.ink, letterSpacing: '-0.012em', marginBottom: 3 }}>
                  Ask someone
                </div>
                <div style={{ fontSize: 13, color: T.inkSoft, lineHeight: 1.5 }}>
                  Message a real person from {church.name}. {session ? 'Anonymous, by topic, or by name.' : 'Quick signup so they can reach you back.'}
                </div>
              </div>
            </button>
          </div>

          <div style={{ '--i': 5, marginTop: 18, fontSize: 12, color: T.inkMuted, fontStyle: 'italic', lineHeight: 1.5 }}>
            Your pastor never sees what you write — only the person you choose.
          </div>

          <button onClick={onClose} style={{ '--i': 6,
            background: 'none', border: 'none', color: T.inkMuted, fontSize: 13,
            cursor: 'pointer', padding: '18px 0 0',
          }}>
            Just looking around →
          </button>
        </div>
      </div>
    </div>
  );
}
