import { useEffect, useRef, useState } from 'react';
import { T } from './theme.js';
import { authedFetch, supabase } from './supabase.js';
import { useAiUsage } from './useAiUsage.js';
import AiLimitWall from './AiLimitWall.jsx';
import MsgText from './MsgText.jsx';
import { KinwoveStar } from './components/brand/KinwoveStar.jsx';

const PASTORAL_SYSTEM = `You are a theological assistant for Christian church leaders and pastors. You speak from within the historic Christian faith — you hold that Jesus is Lord, that the Bible is the authoritative Word of God, and that the gospel is true. You are not a neutral academic observer. You are a well-read, pastorally grounded colleague helping a minister do their work better.

── VOICE ──
• Confident and direct. Never begin with "Good question" or any variant. Get straight to the substance.
• Theologically precise. You are speaking with a ministry leader, not a beginner.
• Warm but not casual. You are a trusted colleague, not a cheerleader.
• Reference original languages (Greek/Hebrew) when it clarifies meaning — always give the English immediately after.
• Cite scholars and commentators by name where useful (Wright, Calvin, Barth, Spurgeon, Chrysostom, Stott, Fee, etc.).
• Keep answers tight. Match the depth of the question. A simple question gets a clear answer, not a lecture.

── THEOLOGICAL POSTURE ──
• You speak from within orthodox, historic Christianity. Jesus is the Messiah — not "one interpretation among many." The resurrection happened. The gospel is not a perspective to be balanced against others.
• When discussing how other traditions (Jewish, secular, academic) read a text, do so as a resource to help the pastor understand the landscape — not as a reason to doubt the Christian reading. Give the pastor what they need to preach and lead with confidence.
• Where genuine debate exists within Christianity (eschatology, mode of baptism, spiritual gifts, Reformed vs Arminian soteriology, etc.) — name the positions fairly. Don't manufacture false certainty where real theological diversity exists among faithful Christians.
• Where the text is clear, say so plainly.

── SCOPE ──
• Sermon preparation and biblical exposition
• Pastoral care — grief, crisis, spiritual direction, counselling
• Exegesis, hermeneutics, biblical background and context
• Church history and doctrinal development
• Leadership, church governance, ethics in ministry
• Cultural engagement and preaching to a pluralistic congregation
• Second-temple literature and intertestamental context when relevant

── STANDARDS ──
• Every scripture claim gets a citation (Book Chapter:Verse).
• Never fabricate or misquote a verse. If uncertain of a reference, say so.
• No filler openers. No sycophancy. Just good, grounded theology.`;

const STARTERS = [
  'What does the Greek word "charis" (grace) actually mean in its New Testament context?',
  'How do I preach on lament without losing hope?',
  'Walk me through Romans 8:28 — what does "all things work together" really promise?',
  'What should I know about pastoral care for someone leaving the faith?',
  'How did the early church understand communion — what do the church fathers say?',
];

export default function ChurchAiChat({ session, profile, churchId, churchPlan }) {
  const userId = session?.user?.id;
  const plan = churchPlan ?? 'church_base';

  const aiUsage = useAiUsage(userId, plan);

  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState('');
  const [busy, setBusy]           = useState(false);
  const [error, setError]         = useState(null);
  const [savedIdx, setSavedIdx]   = useState({});   // which assistant messages are saved
  const [saveError, setSaveError] = useState(null); // surface save failures
  const [menuOpen, setMenuOpen]   = useState(false);
  const [showBoard, setShowBoard] = useState(false); // board history panel
  const [boardPosts, setBoardPosts] = useState([]);
  const [boardLoading, setBoardLoading] = useState(false);

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

  async function saveToBoard(assistantIdx) {
    if (!churchId || !userId) return;
    setSaveError(null);

    const question = messages.slice(0, assistantIdx).reverse().find((m) => m.role === 'user')?.content ?? '';
    const answer   = messages[assistantIdx]?.content ?? '';
    if (!answer) return;

    const body = question
      ? `**Q: ${question}**\n\n${answer}`
      : answer;

    const { error: err } = await supabase.from('posts').insert({
      author_id:  userId,
      kind:       'text',
      scope:      'church',
      scope_id:   churchId,
      visibility: 'public',
      body,
      body_data:  { saved_from_ask: true, question },
    });

    if (err) {
      console.error('saveToBoard error:', err);
      setSaveError(err.message || 'Could not save — check permissions.');
    } else {
      setSavedIdx((prev) => ({ ...prev, [assistantIdx]: true }));
      // Refresh board list if panel is open
      if (showBoard) loadBoard();
    }
  }

  async function loadBoard() {
    if (!churchId) return;
    setBoardLoading(true);
    const { data } = await supabase
      .from('posts')
      .select('id, body, body_data, created_at')
      .eq('scope', 'church')
      .eq('scope_id', churchId)
      .contains('body_data', { saved_from_ask: true })
      .order('created_at', { ascending: false })
      .limit(30);
    setBoardPosts(data ?? []);
    setBoardLoading(false);
  }

  async function openBoard() {
    setShowBoard(true);
    loadBoard();
  }

  function newConversation() {
    setMessages([]);
    setInput('');
    setError(null);
    setSavedIdx({});
    setSaveError(null);
  }

  async function deleteFromBoard(postId) {
    await supabase.from('posts').delete().eq('id', postId);
    setBoardPosts((prev) => prev.filter((p) => p.id !== postId));
  }

  const isEmpty = messages.length === 0;

  // ── Board history panel ──────────────────────────────────────────────────
  if (showBoard) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 130px)', minHeight: 400 }}>
        {/* Board header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '0 0 12px', borderBottom: `1px solid ${T.line}`, marginBottom: 16,
          flexShrink: 0,
        }}>
          <button
            onClick={() => setShowBoard(false)}
            style={{
              background: 'none', border: 'none', fontSize: 18,
              color: T.inkSoft, cursor: 'pointer', padding: '0 4px', lineHeight: 1,
            }}
          >←</button>
          <span style={{ fontFamily: T.serif, fontSize: 16, fontWeight: 600, color: T.ink }}>
            📌 Board history
          </span>
        </div>

        {/* Board list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {boardLoading && (
            <div style={{ textAlign: 'center', padding: 32, color: T.inkSoft, fontSize: 13 }}>Loading…</div>
          )}
          {!boardLoading && boardPosts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: T.inkSoft, fontSize: 14 }}>
              <div style={{ fontSize: 24, marginBottom: 10 }}>📌</div>
              <div>Nothing saved yet.<br />Hit "Save to board" on any AI response.</div>
            </div>
          )}
          {boardPosts.map((p) => {
            const q = p.body_data?.question ?? '';
            // Show just the question as title, truncate answer
            const preview = p.body.length > 220 ? p.body.slice(0, 220) + '…' : p.body;
            return (
              <div key={p.id} style={{
                background: T.parchment,
                border: `1px solid rgba(26,17,8,0.09)`,
                borderRadius: 12,
                padding: '14px 16px',
                marginBottom: 10,
              }}>
                {q && (
                  <div style={{ fontFamily: T.serif, fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 6 }}>
                    {q.length > 100 ? q.slice(0, 100) + '…' : q}
                  </div>
                )}
                <div style={{ fontSize: 12, color: T.inkSoft, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                  {/* Strip the Q: header since we show it above */}
                  {preview.replace(/^\*\*Q:.*?\*\*\n\n/, '')}
                </div>
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: T.inkMuted }}>
                    {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <button
                    onClick={() => deleteFromBoard(p.id)}
                    style={{
                      background: 'none', border: 'none', fontSize: 11,
                      color: T.inkMuted, cursor: 'pointer', padding: '2px 4px',
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Main chat view ───────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 130px)', minHeight: 400 }}>

      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingBottom: 10, borderBottom: `1px solid ${T.line}`, marginBottom: 4, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <KinwoveStar size={15} />
          <span style={{ fontFamily: T.serif, fontSize: 15, fontWeight: 600, color: T.ink, letterSpacing: '-0.01em' }}>
            Pastoral AI
          </span>
        </div>

        {/* Three-dot menu */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            style={{
              background: menuOpen ? `rgba(184,115,58,0.12)` : 'transparent',
              border: `1px solid ${menuOpen ? T.gold : T.line}`,
              color: T.inkSoft, borderRadius: 999,
              padding: '5px 11px', fontSize: 16, cursor: 'pointer', lineHeight: 1,
            }}
          >⋮</button>

          {/* Backdrop */}
          {menuOpen && (
            <div
              onClick={() => setMenuOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 199 }}
            />
          )}

          {/* Dropdown */}
          {menuOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              background: T.cream, border: `1px solid ${T.line}`,
              borderRadius: 14, boxShadow: '0 8px 32px rgba(44,24,16,0.15)',
              overflow: 'hidden', minWidth: 210, zIndex: 200,
            }}>
              {/* New conversation */}
              <button
                onClick={() => { newConversation(); setMenuOpen(false); }}
                style={{
                  width: '100%', textAlign: 'left', background: 'none',
                  border: 'none', borderBottom: `1px solid ${T.line}`,
                  padding: '12px 16px', fontSize: 14, color: T.ink,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                }}
              >
                <KinwoveStar size={14} style={{ flexShrink: 0 }} />
                <span style={{ fontWeight: 600 }}>New conversation</span>
              </button>

              {/* Board history */}
              {churchId && (
                <button
                  onClick={() => { openBoard(); setMenuOpen(false); }}
                  style={{
                    width: '100%', textAlign: 'left', background: 'none',
                    border: 'none', padding: '12px 16px', fontSize: 14, color: T.ink,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                  }}
                >
                  <span style={{ fontSize: 14 }}>📌</span>
                  <span>Board history</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Messages ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
        {isEmpty && !aiUsage.atLimit && (
          <div style={{ textAlign: 'center', padding: '24px 0 32px' }}>
            <div style={{ fontSize: 22, marginBottom: 10 }}><KinwoveStar size={22} /></div>
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
              <div style={{ maxWidth: '92%' }}>
                <div style={{
                  background: T.white,
                  border: `1px solid ${T.line}`,
                  borderRadius: '4px 16px 16px 16px',
                  padding: '12px 16px',
                  fontSize: 14,
                  lineHeight: 1.65,
                  color: T.ink,
                }}>
                  {m.content
                    ? <MsgText text={m.content} />
                    : <span style={{ color: T.inkMuted, fontStyle: 'italic' }}>…</span>
                  }
                </div>

                {/* Save to board button — only when done streaming + churchId exists */}
                {m.content && !busy && churchId && (
                  <div style={{ marginTop: 6, paddingLeft: 2 }}>
                    {savedIdx[i] ? (
                      <span style={{ fontSize: 12, color: T.goldDark, fontWeight: 600 }}>✓ Saved to board</span>
                    ) : (
                      <button
                        onClick={() => saveToBoard(i)}
                        style={{
                          background: 'none',
                          border: `1px solid ${T.goldLight}`,
                          borderRadius: 8,
                          padding: '4px 10px',
                          fontSize: 12,
                          color: T.inkSoft,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        📌 Save to board
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {error && (
          <div style={{ fontSize: 13, color: '#A53F2B', padding: '8px 0', textAlign: 'center' }}>{error}</div>
        )}
        {saveError && (
          <div style={{ fontSize: 12, color: '#A53F2B', padding: '6px 0', textAlign: 'center' }}>{saveError}</div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      {aiUsage.atLimit ? (
        <AiLimitWall plan={plan} panelMode onTopupSuccess={() => aiUsage.refreshAfterTopup()} />
      ) : (
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
      )}
    </div>
  );
}
