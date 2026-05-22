import { useEffect, useRef, useState } from 'react';
import { T } from './theme.js';
import { authedFetch } from './supabase.js';
import { useAiUsage } from './useAiUsage.js';
import AiLimitWall from './AiLimitWall.jsx';
import MsgText from './MsgText.jsx';

const PASTORAL_SYSTEM = `You are a knowledgeable theological assistant built for church leaders and pastors. Your role is to support ministry work — sermon preparation, pastoral care, biblical exegesis, theological questions, church leadership challenges, and faith formation.

── VOICE ──
• Theologically grounded, pastorally warm. You are speaking with trained or self-taught ministry leaders, not beginners.
• Direct and substantive. Skip preamble. Go deep fast.
• Reference original languages (Greek/Hebrew) when relevant — always provide the English immediately.
• Cite scholars, traditions, and commentary by name (Calvin, Wright, Barth, Spurgeon, Chrysostom, etc.) when appropriate.
• Be honest about where traditions diverge. Name the Reformed, Catholic, Orthodox, Wesleyan, Anabaptist readings when they differ meaningfully.

── SCOPE ──
• Sermon preparation and biblical exposition
• Pastoral care — counselling, grief, crisis, doubt, spiritual direction
• Theological questions across all major doctrines
• Church history and the development of doctrine
• Hermeneutics, exegesis, biblical backgrounds
• Leadership, ethics, and church governance
• Cultural engagement — preaching to a pluralistic congregation
• Second-temple literature, intertestamental context, apocrypha

── STANDARDS ──
• Every scripture claim gets a citation (Book Chapter:Verse).
• Never fabricate verses or misquote scripture.
• When something is genuinely debated among serious scholars, say so — and name the positions.
• Where the text is clear, say so with confidence.
• Keep answers tight unless depth is clearly needed. Match the weight of the question.`;

const STARTERS = [
  'What does the Greek word "charis" (grace) actually mean in its New Testament context?',
  'How do I preach on lament without losing hope?',
  'Walk me through Romans 8:28 — what does "all things work together" really promise?',
  'What should I know about pastoral care for someone leaving the faith?',
  'How did the early church understand communion — what do the church fathers say?',
];

export default function ChurchAiChat({ session, profile, churchPlan }) {
  const userId = session?.user?.id;
  const plan = churchPlan ?? 'church_base';

  const aiUsage = useAiUsage(userId, plan);

  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState(null);

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(text) {
    const prompt = (text ?? input).trim();
    if (!prompt || busy || aiUsage.atLimit) return;

    setInput('');
    setError(null);

    const next = [...messages, { role: 'user', content: prompt }];
    setMessages(next);
    setBusy(true);
    let assistantContent = '';

    try {
      const res = await authedFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: PASTORAL_SYSTEM,
          messages: next,
          personType: 'deeper',
          plan,
        }),
      });

      if (!res.ok || !res.body) {
        const msg = await res.text().catch(() => 'Network error');
        throw new Error(msg || `HTTP ${res.status}`);
      }

      setMessages((m) => [...m, { role: 'assistant', content: '' }]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        const events = buf.split('\n\n');
        buf = events.pop() ?? '';

        for (const raw of events) {
          const lines = raw.split('\n');
          const ev = lines.find((l) => l.startsWith('event: '))?.slice(7).trim();
          const data = lines.find((l) => l.startsWith('data: '))?.slice(6);
          if (!ev || !data) continue;
          let payload;
          try { payload = JSON.parse(data); } catch { continue; }
          if (ev === 'text') {
            assistantContent += payload.delta;
            setMessages((m) => {
              const copy = m.slice();
              copy[copy.length - 1] = { role: 'assistant', content: copy[copy.length - 1].content + payload.delta };
              return copy;
            });
          } else if (ev === 'error') {
            throw new Error(payload.message || 'stream error');
          }
        }
      }
    } catch (e) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setBusy(false);
      if (assistantContent) aiUsage.increment();
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 130px)', minHeight: 400 }}>
      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0' }}>
        {isEmpty && !aiUsage.atLimit && (
          <div style={{ textAlign: 'center', padding: '24px 0 32px' }}>
            <div style={{ fontSize: 22, marginBottom: 10 }}>✦</div>
            <div style={{ fontFamily: T.serif, fontSize: 17, fontWeight: 500, color: T.ink, marginBottom: 6, letterSpacing: '-0.01em' }}>
              Pastoral AI
            </div>
            <div style={{ fontSize: 13, color: T.inkSoft, lineHeight: 1.6, maxWidth: 340, margin: '0 auto 24px' }}>
              Theology, sermon prep, pastoral care, exegesis — ask anything.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 440, margin: '0 auto', textAlign: 'left' }}>
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  style={{
                    background: T.parchment, border: `1px solid ${T.goldLight}`,
                    borderRadius: 10, padding: '10px 14px',
                    fontSize: 13, color: T.inkSoft, cursor: 'pointer',
                    textAlign: 'left', lineHeight: 1.45,
                    fontFamily: T.serif, fontStyle: 'italic',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} style={{
            marginBottom: 16,
            display: 'flex',
            flexDirection: 'column',
            alignItems: m.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            {m.role === 'user' ? (
              <div style={{
                maxWidth: '80%',
                background: T.ink,
                color: T.cream,
                borderRadius: '16px 16px 4px 16px',
                padding: '10px 14px',
                fontSize: 14,
                lineHeight: 1.55,
              }}>
                {m.content}
              </div>
            ) : (
              <div style={{
                maxWidth: '92%',
                background: T.white,
                border: `1px solid ${T.line}`,
                borderRadius: '4px 16px 16px 16px',
                padding: '12px 16px',
                fontSize: 14,
                lineHeight: 1.65,
                color: T.ink,
              }}>
                {m.content
                  ? <MsgText content={m.content} />
                  : <span style={{ color: T.inkMuted, fontStyle: 'italic' }}>…</span>
                }
              </div>
            )}
          </div>
        ))}

        {error && (
          <div style={{ fontSize: 13, color: '#A53F2B', padding: '8px 0', textAlign: 'center' }}>{error}</div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Limit wall or input */}
      {aiUsage.atLimit ? (
        <AiLimitWall plan={plan} panelMode onTopupSuccess={() => aiUsage.refreshAfterTopup()} />
      ) : (
        <>
          <div style={{
            borderTop: `1px solid ${T.line}`,
            padding: '12px 0 0',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
                }}
                placeholder="Ask a theological question…"
                rows={2}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 12,
                  border: `1px solid ${T.line}`,
                  fontSize: 14,
                  fontFamily: T.sans ?? 'inherit',
                  background: T.white,
                  color: T.ink,
                  outline: 'none',
                  resize: 'none',
                  lineHeight: 1.5,
                }}
              />
              <button
                onClick={() => send()}
                disabled={busy || !input.trim()}
                style={{
                  padding: '10px 18px',
                  borderRadius: 12,
                  border: 'none',
                  background: busy || !input.trim() ? T.line : T.ink,
                  color: T.cream,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: busy || !input.trim() ? 'default' : 'pointer',
                  flexShrink: 0,
                  alignSelf: 'flex-end',
                  marginBottom: 0,
                  transition: 'background 0.15s',
                }}
              >
                {busy ? '…' : '↑'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
