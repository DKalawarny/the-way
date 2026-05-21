import { useEffect, useState } from 'react';
import { supabase } from './supabase.js';
import { T } from './theme.js';

export default function StudySession({ sessionId, onBegin }) {
  const [session, setSession] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    supabase
      .from('study_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()
      .then(({ data }) => {
        if (!data || !data.active) { setNotFound(true); return; }
        setSession(data);
      });

    const channel = supabase
      .channel(`study_session_${sessionId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'study_sessions',
        filter: `id=eq.${sessionId}`,
      }, ({ new: updated }) => {
        if (!updated.active) setNotFound(true);
        else setSession(updated);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [sessionId]);

  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', background: T.cream, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ fontFamily: T.serif, fontSize: 32, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 12 }}>Session ended</div>
        <div style={{ fontSize: 15, color: T.inkMuted, marginBottom: 32, lineHeight: 1.6 }}>
          This study session has ended or the link is no longer valid.
        </div>
        <button onClick={onBegin} style={{ background: T.gold, color: T.cream, border: 'none', borderRadius: 999, padding: '12px 28px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
          Open kinwove
        </button>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ minHeight: '100vh', background: T.cream, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: T.serif, fontSize: 18, color: T.inkMuted }}>Connecting…</div>
      </div>
    );
  }

  const messages = session.messages ?? [];

  return (
    <div style={{ minHeight: '100vh', background: T.cream, display: 'flex', flexDirection: 'column', fontFamily: T.sans }}>
      <div style={{ height: 3, background: `linear-gradient(90deg, transparent, ${T.gold}, transparent)` }} />

      <header style={{ padding: '14px 20px', background: T.white, borderBottom: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div style={{ fontFamily: T.serif, fontSize: 24, fontWeight: 500, color: T.ink, letterSpacing: '-0.025em' }}>kinwove</div>
        <div style={{ width: 1, height: 18, background: T.line }} />
        <div style={{ fontSize: 13, color: T.inkMuted }}>Live Group Study</div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#6B8758', animation: 'livePulse 2s infinite' }} />
          <div style={{ fontSize: 12, color: T.inkMuted }}>Live</div>
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px 120px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', padding: '64px 20px' }}>
              <div style={{ fontFamily: T.serif, fontSize: 26, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 10 }}>
                Waiting for the session to begin…
              </div>
              <div style={{ fontSize: 14, color: T.inkMuted, lineHeight: 1.6 }}>
                Your study leader is about to post questions. Stay on this page.
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} style={{ marginBottom: 24 }}>
              {m.role === 'user' && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                  <div style={{
                    background: T.gold, color: T.cream,
                    padding: '11px 18px', borderRadius: 18,
                    maxWidth: '78%', fontSize: 15, lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                  }}>
                    {m.content}
                  </div>
                </div>
              )}
              {m.role === 'assistant' && (
                <div style={{
                  fontFamily: T.serif, fontSize: 17, color: T.ink,
                  lineHeight: 1.75, padding: '4px 0', whiteSpace: 'pre-wrap',
                }}>
                  {m.content}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: T.white, borderTop: `1px solid ${T.line}`, padding: '14px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: T.inkMuted, marginBottom: 10 }}>
          Questions appear here as your group asks them
        </div>
        <button onClick={onBegin} style={{
          background: T.gold, color: T.cream, border: 'none',
          borderRadius: 999, padding: '11px 26px', fontSize: 14,
          fontWeight: 600, cursor: 'pointer',
        }}>
          Ask your own questions in kinwove →
        </button>
      </div>

      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
      `}</style>
    </div>
  );
}
