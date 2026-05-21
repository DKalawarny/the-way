import { useEffect, useRef, useState } from 'react';
import { supabase } from './supabase.js';
import { T } from './theme.js';

const STARTER_QUESTIONS = [
  'What\u2019s actually in the Bible?',
  'Why does God seem hidden?',
  'How do I deal with anxiety from a faith perspective?',
  'What do Christians actually believe?',
  'Is doubt allowed?',
  'Why do bad things happen to good people?',
];

function sessionToken() {
  const KEY = 'theway:anon-session';
  let t = sessionStorage.getItem(KEY);
  if (!t) {
    t = (crypto.randomUUID?.() ?? String(Date.now()) + Math.random()).slice(0, 32);
    sessionStorage.setItem(KEY, t);
  }
  return t;
}

export default function AnonymousWelcome({ churchId, churchName, onSignUp, onTalkToSomeone, onClose }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, streaming]);

  async function ask(question) {
    if (!question.trim() || streaming) return;
    const userMsg = { role: 'user', content: question.trim() };
    setMessages((m) => [...m, userMsg]);
    setDraft('');
    setStreaming(true);
    setError(null);

    let assistant = '';
    setMessages((m) => [...m, { role: 'assistant', content: '' }]);

    try {
      const r = await fetch('/api/anon/ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          church_id: churchId ?? null,
          session_token: sessionToken(),
          question: question.trim(),
          history: messages.slice(-6),
        }),
      });
      if (!r.ok || !r.body) throw new Error('Network error');

      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';
        for (const evt of events) {
          if (!evt.trim()) continue;
          const lines = evt.split('\n');
          let event = 'message';
          let dataStr = '';
          for (const line of lines) {
            if (line.startsWith('event:')) event = line.slice(6).trim();
            else if (line.startsWith('data:')) dataStr += line.slice(5).trim();
          }
          if (!dataStr) continue;
          try {
            const data = JSON.parse(dataStr);
            if (event === 'text' && data.delta) {
              assistant += data.delta;
              setMessages((m) => {
                const copy = m.slice();
                copy[copy.length - 1] = { role: 'assistant', content: assistant };
                return copy;
              });
            }
          } catch {}
        }
      }
    } catch (e) {
      setError(e?.message ?? 'Something went wrong.');
      setMessages((m) => m.slice(0, -1));
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="scene" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <header style={{
        padding: '12px 16px', background: T.white,
        borderBottom: `1px solid ${T.line}`,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        {onClose && (
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: T.goldDark, fontSize: 14, cursor: 'pointer', padding: '6px 4px',
          }}>← Back</button>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700 }}>
            ✦ Anonymous · AI chat
          </div>
          <div style={{ fontFamily: T.display, fontSize: 18, fontWeight: 600, color: T.ink, letterSpacing: '-0.012em', lineHeight: 1.15 }}>
            Ask anything {churchName ? `· ${churchName}` : ''}
          </div>
        </div>
      </header>

      {/* Body */}
      <div ref={scrollRef} className="scroll" style={{
        flex: 1, overflowY: 'auto', padding: '24px 16px',
      }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          {messages.length === 0 && (
            <div className="stagger-in">
              <div className="halo" style={{ '--i': 0,
                width: 60, height: 60, borderRadius: '50%',
                background: T.parchment, border: `2px solid ${T.gold}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 26, color: T.goldDark, margin: '8px auto 18px',
              }}>✦</div>

              <div style={{ '--i': 1, textAlign: 'center', maxWidth: 420, margin: '0 auto 22px' }}>
                <div style={{ fontFamily: T.serif, fontSize: 26, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em', lineHeight: 1.12, marginBottom: 8 }}>
                  No sign-up. No name. Nobody sees this.
                </div>
                <div style={{ fontSize: 14, color: T.inkSoft, lineHeight: 1.65 }}>
                  Whatever's on your mind — life, meaning, faith, doubt — ask it here.
                </div>
              </div>

              <div style={{ '--i': 2, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.inkMuted, fontWeight: 700, margin: '6px 0 10px', textAlign: 'center' }}>
                Try one of these
              </div>
              <div style={{ '--i': 3, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {STARTER_QUESTIONS.map((q) => (
                  <button key={q} onClick={() => ask(q)} className="lift" style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    background: T.white, border: `1px solid ${T.line}`, borderRadius: 12,
                    padding: '12px 16px', cursor: 'pointer', fontFamily: T.serif,
                    fontSize: 14.5, color: T.ink, lineHeight: 1.5,
                  }}>
                    {q}
                  </button>
                ))}
              </div>

              <div style={{ '--i': 4, marginTop: 18, fontSize: 12, color: T.inkMuted, fontStyle: 'italic', lineHeight: 1.55, textAlign: 'center' }}>
                You're chatting with an AI — not a person. Want a real human? "Reach out" appears once you've started.
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: 12,
            }}>
              <div style={{
                maxWidth: '88%',
                background: m.role === 'user' ? T.ink : T.white,
                color: m.role === 'user' ? T.cream : T.ink,
                border: m.role === 'user' ? 'none' : `1px solid ${T.line}`,
                borderRadius: 16, padding: '12px 16px',
                fontFamily: T.serif, fontSize: 15, lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
                borderTopRightRadius: m.role === 'user' ? 4 : 16,
                borderTopLeftRadius:  m.role === 'user' ? 16 : 4,
              }}>
                {m.content || (
                  <span style={{ color: T.inkMuted, fontStyle: 'italic' }}>
                    <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: T.gold, animation: 'bounce 1s infinite' }}></span>
                    {' '}thinking…
                  </span>
                )}
              </div>
            </div>
          ))}

          {error && (
            <div style={{ color: T.error, fontSize: 13, padding: '10px 14px', background: 'rgba(165,63,43,0.08)', borderRadius: 10 }}>
              {error}
            </div>
          )}

          {messages.length >= 2 && !streaming && (
            <div style={{
              background: T.parchment, border: `1px solid ${T.goldLight}`, borderRadius: 14,
              padding: '16px 18px', marginTop: 16, fontSize: 13.5, color: T.inkSoft, lineHeight: 1.65,
            }}>
              <div style={{ fontWeight: 600, color: T.ink, marginBottom: 6, fontFamily: T.serif, fontSize: 15 }}>
                Want to talk to a real person?
              </div>
              You can reach out to someone at {churchName ?? 'this church'} — anonymously, by topic, or by name. Pastor never sees the conversation; only the person you pick.
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                {onTalkToSomeone && (
                  <button onClick={onTalkToSomeone} style={{
                    background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
                    padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}>Reach out</button>
                )}
                {onSignUp && (
                  <button onClick={onSignUp} style={{
                    background: 'transparent', border: `1px solid ${T.line}`, borderRadius: 999,
                    padding: '8px 16px', fontSize: 13, color: T.inkSoft, cursor: 'pointer',
                  }}>Make an account</button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div style={{
        borderTop: `1px solid ${T.line}`, padding: '12px 16px', background: T.white,
      }}>
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                ask(draft);
              }
            }}
            placeholder="Ask anything…"
            rows={1}
            disabled={streaming}
            style={{
              flex: 1, border: `1px solid ${T.line}`, borderRadius: 14,
              padding: '11px 14px', fontSize: 15, fontFamily: T.serif, lineHeight: 1.55,
              background: T.cream, outline: 'none', resize: 'none', minHeight: 44, maxHeight: 200,
              boxSizing: 'border-box',
            }}
          />
          <button
            onClick={() => ask(draft)}
            disabled={streaming || !draft.trim()}
            className={(streaming || !draft.trim()) ? '' : 'magnet'}
            style={{
              background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
              padding: '10px 20px', fontSize: 14, fontWeight: 600,
              cursor: (streaming || !draft.trim()) ? 'not-allowed' : 'pointer',
              opacity: (streaming || !draft.trim()) ? 0.5 : 1,
            }}
          >Ask</button>
        </div>
        <div style={{ maxWidth: 640, margin: '8px auto 0', textAlign: 'center', fontSize: 11, color: T.inkMuted }}>
          🔒 Anonymous · No account · Nothing tied to your identity
        </div>
      </div>
    </div>
  );
}
