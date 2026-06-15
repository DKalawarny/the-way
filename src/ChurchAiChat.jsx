import { useEffect, useRef, useState } from 'react';
import { T } from './theme.js';
import { authedFetch, supabase } from './supabase.js';
import { useAiUsage } from './useAiUsage.js';
import { useTextToSpeech } from './useTextToSpeech.js';
import AiLimitWall from './AiLimitWall.jsx';
import MsgText from './MsgText.jsx';
import { KinwoveStar } from './components/brand/KinwoveStar.jsx';
import { PERSON_TYPES } from './constants.js';
import { PER_TYPE } from './prompts.js';

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

const RESEARCH_SYSTEM = `You are a theological research assistant helping a pastor or elder prepare for preaching and teaching. Your job is not to give one synthesized answer — it is to lay out the scholarly landscape so the pastor can think and decide for themselves.

Structure every response as a research brief using these sections:

── CONTEXT ──
What is happening in the passage or topic? Key background, authorship, audience, and setting in 2–4 sentences. Note any significant manuscript variants.

── ORIGINAL LANGUAGE ──
The key Greek or Hebrew word(s) at stake. Give the word in its original script, transliteration, pronunciation, and full semantic range. Explain how different Bible translations (ESV, NIV, KJV, NASB, NLT) render it and why those choices matter. Reference Strong's number where helpful.

── WHAT THE SCHOLARS SAY ──
Present 4–6 named perspectives. For each: name the scholar or source, their tradition, their specific reading, and the reasoning behind it. Let each voice speak distinctly — do not blend them into a false consensus. Draw from:
• Reformed/Calvinist — Calvin's Commentaries, Matthew Henry, Wayne Grudem, D.A. Carson, John Piper, R.C. Sproul
• Wesleyan/Arminian — John Wesley's Explanatory Notes, Adam Clarke, Thomas Oden
• Anglican/Evangelical — John Stott, N.T. Wright, F.F. Bruce, I. Howard Marshall, Alister McGrath
• Early Church Fathers — Chrysostom, Augustine, Origen, Jerome, Irenaeus (especially powerful for showing pre-modern consensus)
• Academic Commentaries — Word Biblical Commentary, NICNT/NICOT, IVP Bible Background Commentary, Expositor's Bible Commentary
• Catholic tradition — Aquinas, Jerome, modern Catholic exegesis where it adds meaningful perspective
Select the voices most relevant to the passage — not every tradition needs to appear in every answer.

── WHERE SCHOLARS DISAGREE ──
Name the fault lines plainly. What is actually contested? Reformed vs Arminian, literal vs figurative, historical-critical vs canonical, complementarian vs egalitarian — name the positions and explain what drives the disagreement. Show where faithful, orthodox scholars land differently and why.

── PREACHING ANGLES ──
2–3 angles a pastor could take, each grounded in a different reading above. These are options, not recommendations — the pastor decides. Each angle in 2 sentences.

── GO DEEPER ──
2–3 specific commentaries or books worth pulling for this passage or topic. Give the exact title, author, and one sentence on what makes it worth reading.

STANDARDS:
• Always cite by name. Never say "some scholars think" — say who.
• Every scripture reference: Book Chapter:Verse.
• If uncertain of a specific quote, paraphrase and note it.
• Do not hide complexity or manufacture certainty where real debate exists.
• No filler openers. No sycophancy. Get to the substance in the first line.`;

const STARTERS = [
  'What does the Greek word "charis" (grace) actually mean in its New Testament context?',
  'How do I preach on lament without losing hope?',
  'Walk me through Romans 8:28 — what does "all things work together" really promise?',
  'What should I know about pastoral care for someone leaving the faith?',
  'How did the early church understand communion — what do the church fathers say?',
];

const RESEARCH_STARTERS = [
  'Walk me through John 3:16 — what do the major commentators say?',
  'Research Romans 9 — how do Reformed and Arminian scholars read it differently?',
  'What does "hesed" mean in the Psalms? Original Hebrew + commentary perspectives.',
  'Survey what the early church fathers said about the resurrection accounts.',
  'What\'s the scholarly debate around 1 Corinthians 14:34 — women in the church?',
  'Break down Ephesians 2:8-9 — faith, grace, works — where do scholars land?',
];

// ── Tiny shared icons ────────────────────────────────────────────────────────
function BookmarkIcon({ filled, size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? T.gold : 'none'} stroke={filled ? T.gold : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function ShareIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
    </svg>
  );
}
function FlagIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
    </svg>
  );
}
function CopyIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  );
}
function CheckIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}
function SpeakerIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
    </svg>
  );
}

// Reusable action button
function ActionBtn({ onClick, title, active, children, onMouseEnter, onMouseLeave }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{ background: 'transparent', border: 'none', padding: '4px 8px', cursor: 'pointer', color: active ? T.gold : T.inkMuted, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 5, transition: 'color 0.15s' }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </button>
  );
}

// ── Color schemes ────────────────────────────────────────────────────────────
const LIGHT = {
  bg: '#FDF8F0', text: T.ink, muted: T.inkMuted, soft: T.inkSoft,
  border: T.line, headerBg: '#FFFFFF', card: '#F5ECD9', inputBg: '#FDF8F0',
};
const DARK = {
  bg: '#150D05', text: 'rgba(253,248,240,0.92)', muted: 'rgba(253,248,240,0.38)', soft: 'rgba(253,248,240,0.6)',
  border: 'rgba(184,115,58,0.2)', headerBg: '#1A0E07', card: 'rgba(255,255,255,0.06)', inputBg: 'rgba(255,255,255,0.07)',
};

// ── localStorage helpers ─────────────────────────────────────────────────────
function convKey(userId, churchId) { return `church-pastoral-convs-${userId ?? 'anon'}-${churchId ?? 'x'}`; }
function readConvs(userId, churchId) { try { return JSON.parse(localStorage.getItem(convKey(userId, churchId))) ?? []; } catch { return []; } }
function writeConvs(userId, churchId, convs) { try { localStorage.setItem(convKey(userId, churchId), JSON.stringify(convs)); } catch {} }

// ── Board modal ──────────────────────────────────────────────────────────────
function BoardModal({ open, onClose, churchId, onReopenInAsk }) {
  const [posts, setPosts]     = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !churchId) return;
    setLoading(true);
    supabase.from('posts').select('id, body, body_data, created_at')
      .eq('scope', 'church').eq('scope_id', churchId)
      .contains('body_data', { saved_from_ask: true })
      .order('created_at', { ascending: false }).limit(30)
      .then(({ data }) => { setPosts(data ?? []); setLoading(false); });
  }, [open, churchId]);

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  if (!open) return null;

  async function remove(postId) {
    await supabase.from('posts').delete().eq('id', postId);
    setPosts((p) => p.filter((x) => x.id !== postId));
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(44,24,16,0.55)', zIndex: 300, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '20px 16px', overflowY: 'auto', animation: 'fadeIn 0.15s ease' }}>
      <div onClick={(e) => e.stopPropagation()} className="fade-up" style={{ background: T.parchment, borderRadius: 18, maxWidth: 680, width: '100%', margin: '40px 0', border: `1px solid ${T.line}`, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px', borderBottom: `1px solid ${T.line}`, background: T.cream, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: T.goldDark, marginBottom: 3 }}>Church feed</div>
            <div style={{ fontFamily: T.serif, fontSize: 22, color: T.ink, fontWeight: 600, letterSpacing: '-0.018em' }}>
              {loading ? 'Your board' : posts.length === 0 ? 'Nothing saved yet' : `📌 ${posts.length} saved ${posts.length === 1 ? 'post' : 'posts'}`}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: `1px solid ${T.line}`, borderRadius: 999, padding: '8px 14px', fontSize: 13, color: T.inkSoft, cursor: 'pointer' }}>Close</button>
        </div>
        {loading && <div style={{ padding: 40, textAlign: 'center', color: T.inkSoft, fontSize: 13 }}>Loading…</div>}
        {!loading && posts.length === 0 && (
          <div style={{ padding: '48px 32px', textAlign: 'center', color: T.inkMuted, fontFamily: T.serif, fontSize: 16, lineHeight: 1.6 }}>
            Nothing saved yet.<br /><span style={{ fontSize: 14 }}>Hit "📌 Save to board" below any AI response.</span>
          </div>
        )}
        {posts.map((p) => {
          const q = p.body_data?.question ?? '';
          const answer = p.body.replace(/^\*\*Q:.*?\*\*\n\n/, '');
          return (
            <div key={p.id} onClick={() => { onReopenInAsk({ question: q, answer }); onClose(); }}
              style={{ padding: '16px 20px', borderBottom: `1px solid ${T.line}`, cursor: 'pointer', background: T.white }}
              onMouseEnter={(e) => (e.currentTarget.style.background = T.parchment)}
              onMouseLeave={(e) => (e.currentTarget.style.background = T.white)}
            >
              {q && <div style={{ fontFamily: T.serif, fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 6 }}>{q.length > 120 ? q.slice(0, 120) + '…' : q}</div>}
              <div style={{ fontSize: 13, color: T.inkSoft, lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{answer}</div>
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: T.inkMuted }}>
                  {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  <span style={{ color: T.goldDark, marginLeft: 8 }}>Tap to reopen →</span>
                </span>
                <button onClick={(e) => { e.stopPropagation(); remove(p.id); }} style={{ background: 'none', border: 'none', fontSize: 12, color: T.inkMuted, cursor: 'pointer', padding: '2px 4px' }}>Remove</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── History modal ────────────────────────────────────────────────────────────
function HistoryModal({ open, onClose, conversations, onLoad, onDelete, onNew }) {
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  if (!open) return null;
  const convs = conversations.filter((c) => c.messages.length > 0);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(44,24,16,0.55)', zIndex: 300, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '20px 16px', overflowY: 'auto', animation: 'fadeIn 0.15s ease' }}>
      <div onClick={(e) => e.stopPropagation()} className="fade-up" style={{ background: T.parchment, borderRadius: 18, maxWidth: 680, width: '100%', margin: '40px 0', border: `1px solid ${T.line}`, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px', borderBottom: `1px solid ${T.line}`, background: T.cream, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: T.goldDark, marginBottom: 3 }}>Your history</div>
            <div style={{ fontFamily: T.serif, fontSize: 22, color: T.ink, fontWeight: 600, letterSpacing: '-0.018em' }}>Conversations</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { onNew(); onClose(); }} style={{ background: T.ink, color: T.cream, border: 'none', borderRadius: 999, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>+ New</button>
            <button onClick={onClose} style={{ background: 'transparent', border: `1px solid ${T.line}`, borderRadius: 999, padding: '8px 14px', fontSize: 13, color: T.inkSoft, cursor: 'pointer' }}>Close</button>
          </div>
        </div>
        {convs.length === 0 && (
          <div style={{ padding: '48px 32px', textAlign: 'center', color: T.inkMuted, fontFamily: T.serif, fontSize: 16, lineHeight: 1.6 }}>
            No conversations yet.<br />Start asking — your history will appear here.
          </div>
        )}
        {convs.map((c) => (
          <div key={c.id} onClick={() => { onLoad(c); onClose(); }}
            style={{ padding: '16px 20px', borderBottom: `1px solid ${T.line}`, cursor: 'pointer', background: T.white, display: 'flex', alignItems: 'center', gap: 12 }}
            onMouseEnter={(e) => (e.currentTarget.style.background = T.parchment)}
            onMouseLeave={(e) => (e.currentTarget.style.background = T.white)}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: T.serif, fontSize: 14, fontWeight: 600, color: T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title}</div>
              <div style={{ fontSize: 11, color: T.inkMuted, marginTop: 2 }}>
                {new Date(c.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                {' · '}{c.messages.length} message{c.messages.length !== 1 ? 's' : ''}
              </div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); onDelete(c.id); }} style={{ background: 'none', border: 'none', fontSize: 13, color: T.inkMuted, cursor: 'pointer', flexShrink: 0, padding: '4px 6px' }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function ChurchAiChat({ session, profile, churchId, churchPlan }) {
  const userId  = session?.user?.id;
  const plan    = churchPlan ?? 'church_base';
  const ttsVoice = profile?.tts_voice ?? 'onyx';

  const [dark, setDark] = useState(() => localStorage.getItem('church_ask_dark') === '1');
  const [researchMode, setResearchMode] = useState(() => localStorage.getItem('church_ask_research') === '1');
  const C = dark ? DARK : LIGHT;
  function toggleDark() { setDark((d) => { localStorage.setItem('church_ask_dark', d ? '0' : '1'); return !d; }); }
  function toggleResearch() { setResearchMode((v) => { const next = !v; localStorage.setItem('church_ask_research', next ? '1' : '0'); return next; }); }

  const aiUsage = useAiUsage(userId, plan);
  const { speakingId, paused: ttsPaused, speak: speakMsg, stop: stopTts, pause: pauseTts, resume: resumeTts, rewind: rewindTts, supported: ttsSupported } = useTextToSpeech({ voice: ttsVoice });

  // Conversation persistence
  const [convId, setConvId]       = useState(() => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
  const [convTitle, setConvTitle] = useState('New conversation');
  const [history, setHistory]     = useState(() => readConvs(userId, churchId));

  // Chat state
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState('');
  const [busy, setBusy]           = useState(false);
  const [error, setError]         = useState(null);

  // Action bar state
  const [savedIdx, setSavedIdx]         = useState({});   // { [msgIdx]: true } — saved to board
  const [savedToNoteIdx, setSavedToNoteIdx] = useState({});
  const [saveError, setSaveError] = useState(null);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [flaggedMsgs, setFlaggedMsgs] = useState(new Set());

  // Mode
  const [personType, setPersonType]     = useState(() => localStorage.getItem(`church_ask_mode_${userId}`) ?? 'deeper');
  const [modePickerOpen, setModePickerOpen] = useState(false);

  function setMode(id) {
    if (id === '__research__') {
      setResearchMode(true);
      localStorage.setItem('church_ask_research', '1');
      newConversation();
    } else {
      setPersonType(id);
      localStorage.setItem(`church_ask_mode_${userId}`, id);
      if (researchMode) { setResearchMode(false); localStorage.setItem('church_ask_research', '0'); newConversation(); }
    }
    setModePickerOpen(false);
  }

  // UI
  const [menuOpen, setMenuOpen]       = useState(false);
  const [boardOpen, setBoardOpen]     = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    if (messages.length > 0) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Persist conversation to localStorage
  useEffect(() => {
    if (messages.length === 0) return;
    const firstUser = messages.find((m) => m.role === 'user')?.content ?? '';
    const title = firstUser ? firstUser.slice(0, 70) + (firstUser.length > 70 ? '…' : '') : convTitle;
    setConvTitle(title);
    const updated = { id: convId, title, messages, updatedAt: Date.now() };
    setHistory((prev) => {
      const next = [updated, ...prev.filter((c) => c.id !== convId)].slice(0, 50);
      writeConvs(userId, churchId, next);
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // ── Send ──────────────────────────────────────────────────────────────────
  async function send(text) {
    const prompt = (text ?? input).trim();
    if (!prompt || busy || aiUsage.atLimit) return;
    setInput(''); setError(null); setTimeout(() => inputRef.current?.focus(), 0);
    const next = [...messages, { role: 'user', content: prompt }];
    setMessages(next);
    setBusy(true);
    let assistantContent = '';
    try {
      const system = researchMode ? RESEARCH_SYSTEM : PASTORAL_SYSTEM + (PER_TYPE[personType] ?? '');
      const res = await authedFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system, messages: next, personType, plan }),
      });
      if (!res.ok || !res.body) throw new Error((await res.text().catch(() => '')) || `HTTP ${res.status}`);
      setMessages((m) => [...m, { role: 'assistant', content: '' }]);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const events = buf.split('\n\n'); buf = events.pop() ?? '';
        for (const raw of events) {
          const lines = raw.split('\n');
          const ev   = lines.find((l) => l.startsWith('event: '))?.slice(7).trim();
          const data = lines.find((l) => l.startsWith('data: '))?.slice(6);
          if (!ev || !data) continue;
          let payload; try { payload = JSON.parse(data); } catch { continue; }
          if (ev === 'text') {
            assistantContent += payload.delta;
            setMessages((m) => { const c = m.slice(); c[c.length - 1] = { role: 'assistant', content: c[c.length - 1].content + payload.delta }; return c; });
          } else if (ev === 'error') throw new Error(payload.message || 'stream error');
        }
      }
    } catch (e) { setError(e.message || 'Something went wrong.');
    } finally { setBusy(false); if (assistantContent) aiUsage.increment(); inputRef.current?.focus(); }
  }

  // ── Save to board ─────────────────────────────────────────────────────────
  async function saveToBoard(assistantIdx) {
    if (!churchId || !userId) return;
    setSaveError(null);
    const question = messages.slice(0, assistantIdx).reverse().find((m) => m.role === 'user')?.content ?? '';
    const answer   = messages[assistantIdx]?.content ?? '';
    if (!answer) return;
    const body = question ? `**Q: ${question}**\n\n${answer}` : answer;
    const { error: err } = await supabase.from('posts').insert({
      author_id: userId, kind: 'text', scope: 'church', scope_id: churchId,
      visibility: 'public', body, body_data: { saved_from_ask: true, question },
    });
    if (err) { console.error('saveToBoard:', err); setSaveError(err.message || 'Could not save.'); }
    else setSavedIdx((prev) => ({ ...prev, [assistantIdx]: true }));
  }

  // ── Save to notes ─────────────────────────────────────────────────────────
  async function saveToNotes(assistantIdx) {
    if (!churchId || !userId) return;
    const question = messages.slice(0, assistantIdx).reverse().find((m) => m.role === 'user')?.content ?? '';
    const answer   = messages[assistantIdx]?.content ?? '';
    if (!answer) return;
    const title = question.slice(0, 70) || answer.slice(0, 70);
    const body  = question ? `Q: ${question}\n\n${answer}` : answer;
    const { error } = await supabase.from('church_notes').insert({
      church_id: churchId, author_id: userId,
      title, body, source: researchMode ? 'research' : 'ask',
    });
    if (!error) setSavedToNoteIdx((prev) => ({ ...prev, [assistantIdx]: true }));
  }

  // ── Flag ──────────────────────────────────────────────────────────────────
  async function handleFlag(msgIdx, msgText) {
    setFlaggedMsgs((prev) => new Set([...prev, msgIdx]));
    try {
      await authedFetch('/api/ai-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_text: msgText?.slice(0, 4000) }),
      });
    } catch { /* fire-and-forget */ }
  }

  // ── Conversation management ───────────────────────────────────────────────
  function newConversation() {
    setMessages([]); setInput(''); setError(null); setSavedIdx({}); setSaveError(null); setFlaggedMsgs(new Set());
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setConvId(id); setConvTitle('New conversation');
  }
  function loadConversation(conv) {
    setConvId(conv.id); setConvTitle(conv.title);
    setMessages(conv.messages); setSavedIdx({}); setSaveError(null); setError(null); setFlaggedMsgs(new Set());
  }
  function deleteConversation(id) {
    setHistory((prev) => { const next = prev.filter((c) => c.id !== id); writeConvs(userId, churchId, next); return next; });
  }
  function reopenInAsk({ question, answer }) {
    const msgs = [];
    if (question) msgs.push({ role: 'user', content: question });
    if (answer)   msgs.push({ role: 'assistant', content: answer });
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setConvId(id); setConvTitle(question || 'Saved answer');
    setMessages(msgs); setSavedIdx({}); setSaveError(null); setError(null); setFlaggedMsgs(new Set());
  }

  const isEmpty = messages.length === 0;

  return (
    <>
      <BoardModal open={boardOpen} onClose={() => setBoardOpen(false)} churchId={churchId} onReopenInAsk={reopenInAsk} />
      <HistoryModal open={historyOpen} onClose={() => setHistoryOpen(false)} conversations={history} onLoad={loadConversation} onDelete={deleteConversation} onNew={newConversation} />

      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 130px)', minHeight: 400, background: C.bg, color: C.text, transition: 'background 0.2s, color 0.2s', borderRadius: 8, padding: '12px 20px' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, borderBottom: `1px solid ${C.border}`, marginBottom: 4, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <KinwoveStar size={15} />
            <span style={{ fontFamily: T.serif, fontSize: 15, fontWeight: 600, color: C.text, letterSpacing: '-0.01em' }}>Pastoral AI</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

            {/* ── Switch Mode button ── */}
            <div style={{ position: 'relative' }}>
              {(() => {
                const person = researchMode ? { emoji: '📚', label: 'Research' } : PERSON_TYPES.find((p) => p.id === personType);
                return (
                  <button
                    onClick={() => setModePickerOpen((v) => !v)}
                    style={{
                      background: modePickerOpen ? 'rgba(184,115,58,0.22)' : C.card,
                      border: `1px solid ${modePickerOpen ? T.gold : C.border}`,
                      borderRadius: 999, padding: '4px 12px',
                      fontSize: 12, color: modePickerOpen ? T.goldDark : C.soft,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                      transition: 'all 0.15s',
                    }}
                  >
                    {person?.emoji} {person?.label}
                    <span style={{ fontSize: 9, opacity: 0.6, marginLeft: 1 }}>▾</span>
                  </button>
                );
              })()}

              {modePickerOpen && <div onClick={() => setModePickerOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 199 }} />}
              {modePickerOpen && (
                <div style={{
                  position: 'fixed', top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  background: T.white, border: `1px solid ${T.line}`,
                  borderRadius: 16, boxShadow: '0 12px 48px rgba(44,24,16,0.18)',
                  padding: 10, zIndex: 200,
                  width: 'min(calc(100vw - 32px), 420px)',
                  maxHeight: '85vh', overflowY: 'auto',
                }}>
                  <div style={{ padding: '2px 4px 8px', fontSize: 10, letterSpacing: '0.07em', textTransform: 'uppercase', color: T.inkMuted, fontWeight: 700 }}>
                    Switch mode
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {/* Sermon Research — full-width hero card */}
                    {(() => {
                      const active = researchMode;
                      return (
                        <button
                          onClick={() => setMode('__research__')}
                          onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = active ? 'rgba(184,115,58,0.14)' : 'rgba(184,115,58,0.08)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = active ? 'rgba(184,115,58,0.10)' : 'rgba(184,115,58,0.04)'; }}
                          style={{
                            gridColumn: '1 / -1',
                            textAlign: 'left', cursor: 'pointer',
                            background: active ? 'rgba(184,115,58,0.10)' : 'rgba(184,115,58,0.04)',
                            border: `1.5px solid ${active ? T.gold : 'rgba(184,115,58,0.30)'}`,
                            borderRadius: 12, padding: '14px 14px',
                            transition: 'background 0.12s', position: 'relative',
                            display: 'flex', alignItems: 'center', gap: 14,
                          }}
                        >
                          {active && <span style={{ position: 'absolute', top: 10, right: 12, fontSize: 10, color: T.goldDark, fontWeight: 700 }}>✓</span>}
                          <div style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>📚</div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: active ? T.goldDark : T.ink }}>Sermon Research</span>
                              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: T.gold, background: 'rgba(184,115,58,0.12)', borderRadius: 999, padding: '2px 7px' }}>For pastors</span>
                            </div>
                            <div style={{ fontSize: 11, color: T.inkMuted, lineHeight: 1.45 }}>Original languages · named scholars · where traditions disagree · preaching angles</div>
                          </div>
                        </button>
                      );
                    })()}
                    {PERSON_TYPES.map((pt) => {
                      const active = !researchMode && pt.id === personType;
                      return (
                        <button
                          key={pt.id}
                          onClick={() => setMode(pt.id)}
                          onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(184,115,58,0.06)'; }}
                          onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = T.parchment; }}
                          style={{
                            textAlign: 'left', cursor: 'pointer',
                            background: active ? 'rgba(184,115,58,0.10)' : T.parchment,
                            border: `1.5px solid ${active ? T.gold : 'transparent'}`,
                            borderRadius: 12, padding: '10px 10px',
                            transition: 'background 0.12s', position: 'relative',
                          }}
                        >
                          {active && <span style={{ position: 'absolute', top: 7, right: 9, fontSize: 10, color: T.goldDark, fontWeight: 700 }}>✓</span>}
                          <div style={{ fontSize: 20, marginBottom: 5, lineHeight: 1 }}>{pt.emoji}</div>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: active ? T.goldDark : T.ink, marginBottom: 3 }}>{pt.label}</div>
                          <div style={{ fontSize: 10.5, color: T.inkMuted, lineHeight: 1.45 }}>{pt.description}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

          <div style={{ position: 'relative' }}>
            <button onClick={() => setMenuOpen((v) => !v)} style={{ background: menuOpen ? 'rgba(184,115,58,0.18)' : 'transparent', border: `1px solid ${menuOpen ? T.gold : C.border}`, color: C.soft, borderRadius: 999, padding: '5px 11px', fontSize: 16, cursor: 'pointer', lineHeight: 1 }}>⋮</button>
            {menuOpen && <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 199 }} />}
            {menuOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: C.headerBg, border: `1px solid ${C.border}`, borderRadius: 14, boxShadow: '0 8px 32px rgba(44,24,16,0.18)', overflow: 'hidden', minWidth: 220, zIndex: 200 }}>
                {/* Dark mode toggle */}
                <button onClick={() => { toggleDark(); setMenuOpen(false); }} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', borderBottom: `1px solid ${C.border}`, padding: '13px 16px', fontSize: 14, color: C.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 15 }}>{dark ? '☀' : '🌙'}</span>
                    <span>{dark ? 'Light mode' : 'Dark mode'}</span>
                  </span>
                </button>
                <button onClick={() => { newConversation(); setMenuOpen(false); }} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', borderBottom: `1px solid ${C.border}`, padding: '13px 16px', fontSize: 14, color: C.text, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 16, lineHeight: 1 }}>+</span><span style={{ fontWeight: 700 }}>New conversation</span>
                </button>
                {churchId && (
                  <button onClick={() => { setBoardOpen(true); setMenuOpen(false); }} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', borderBottom: `1px solid ${C.border}`, padding: '13px 16px', fontSize: 14, color: C.text, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 15 }}>📌</span><span>Your board</span>
                  </button>
                )}
                <button onClick={() => { setHistoryOpen(true); setMenuOpen(false); }} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '13px 16px', fontSize: 14, color: C.text, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 15 }}>◷</span><span>Conversation history</span>
                </button>
              </div>
            )}
          </div>
          </div>{/* end right-side flex group */}
        </div>

        {/* ── Messages ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
          {isEmpty && !aiUsage.atLimit && (
            <div style={{ textAlign: 'center', padding: '24px 0 32px' }}>
              <div style={{ marginBottom: 10 }}><KinwoveStar size={22} /></div>
              {researchMode ? (
                <>
                  <div style={{ fontFamily: T.serif, fontSize: 17, fontWeight: 500, color: C.text, marginBottom: 6, letterSpacing: '-0.01em' }}>📚 Sermon Research</div>
                  <div style={{ fontSize: 13, color: C.soft, lineHeight: 1.6, maxWidth: 380, margin: '0 auto 6px' }}>
                    Multi-source commentary briefs — Calvin, Wesley, N.T. Wright, Church Fathers, and more.
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, maxWidth: 360, margin: '0 auto 24px' }}>
                    Every response shows what different scholars say and where they disagree — so you can come to your own conclusion.
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 480, margin: '0 auto', textAlign: 'left' }}>
                    {RESEARCH_STARTERS.map((s) => (
                      <button key={s} onClick={() => send(s)} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: C.soft, cursor: 'pointer', textAlign: 'left', lineHeight: 1.45, fontFamily: T.serif, fontStyle: 'italic' }}>{s}</button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontFamily: T.serif, fontSize: 17, fontWeight: 500, color: C.text, marginBottom: 6, letterSpacing: '-0.01em' }}>Pastoral AI</div>
                  <div style={{ fontSize: 13, color: C.soft, lineHeight: 1.6, maxWidth: 340, margin: '0 auto 24px' }}>Theology, sermon prep, pastoral care, exegesis — ask anything.</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 440, margin: '0 auto', textAlign: 'left' }}>
                    {STARTERS.map((s) => (
                      <button key={s} onClick={() => send(s)} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: C.soft, cursor: 'pointer', textAlign: 'left', lineHeight: 1.45, fontFamily: T.serif, fontStyle: 'italic' }}>{s}</button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {messages.map((m, i) => {
            const isAssistant = m.role === 'assistant';
            const isStreaming  = isAssistant && m.content === '' && busy;
            const isLast       = i === messages.length - 1;
            const canAct       = isAssistant && !isStreaming && m.content.length > 0 && !(isLast && busy);
            const saved        = !!savedIdx[i];

            return (
              <div key={i} style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                {m.role === 'user' ? (
                  <div style={{ maxWidth: '80%', background: T.ink, color: T.cream, borderRadius: '16px 16px 4px 16px', padding: '10px 14px', fontSize: 14, lineHeight: 1.55 }}>
                    {m.content}
                  </div>
                ) : (
                  <>
                    <div style={{ maxWidth: '100%', background: 'transparent', fontSize: 15, lineHeight: 1.72, color: C.text, fontFamily: T.serif, letterSpacing: '-0.01em', wordBreak: 'break-word' }}>
                      {isStreaming
                        ? <span style={{ color: T.inkMuted, fontStyle: 'italic' }}>…</span>
                        : <MsgText text={m.content} />
                      }
                    </div>

                    {/* ── Action bar ── */}
                    {canAct && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2, marginTop: 8, flexWrap: 'wrap' }}>

                        {/* Save to board */}
                        {churchId && (
                          <ActionBtn
                            onClick={() => saveToBoard(i)}
                            title={saved ? 'Saved to board' : 'Save to board'}
                            active={saved}
                          >
                            <BookmarkIcon filled={saved} size={13} />
                            {saved ? 'Saved' : 'Save'}
                          </ActionBtn>
                        )}

                        {/* Save to notes */}
                        {churchId && (
                          <ActionBtn
                            onClick={() => saveToNotes(i)}
                            title={savedToNoteIdx[i] ? 'Saved to Notes' : 'Save to Notes'}
                            active={savedToNoteIdx[i]}
                          >
                            📝 {savedToNoteIdx[i] ? 'Noted' : 'Note'}
                          </ActionBtn>
                        )}

                        {/* Share */}
                        <ActionBtn
                          onClick={async () => {
                            const text = m.content;
                            if (navigator.share) {
                              try { await navigator.share({ text }); } catch {}
                            } else {
                              try { await navigator.clipboard.writeText(text); } catch {}
                            }
                          }}
                          title="Share this response"
                        >
                          <ShareIcon size={13} />
                          Share
                        </ActionBtn>

                        {/* Flag */}
                        {!flaggedMsgs.has(i) ? (
                          <ActionBtn
                            onClick={() => handleFlag(i, m.content)}
                            title="Something seems off — flag this response"
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#c05050')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = T.inkMuted)}
                          >
                            <FlagIcon size={13} />
                            Flag
                          </ActionBtn>
                        ) : (
                          <span style={{ padding: '4px 8px', fontSize: 12, color: T.inkMuted }}>Flagged</span>
                        )}

                        {/* Copy */}
                        <ActionBtn
                          onClick={async () => {
                            try { await navigator.clipboard.writeText(m.content); setCopiedIdx(i); setTimeout(() => setCopiedIdx(null), 2000); } catch {}
                          }}
                          title="Copy response"
                          active={copiedIdx === i}
                        >
                          {copiedIdx === i ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
                          {copiedIdx === i ? 'Copied' : 'Copy'}
                        </ActionBtn>

                        {/* Listen / playback controls */}
                        {ttsSupported && (
                          speakingId === i ? (
                            // ── Active playback bar ──
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, background: dark ? 'rgba(184,115,58,0.12)' : 'rgba(184,115,58,0.08)', borderRadius: 999, padding: '2px 6px 2px 4px' }}>
                              {/* Waveform indicator */}
                              {!ttsPaused && (
                                <span style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 2, height: 13, marginRight: 4, marginLeft: 2 }}>
                                  {[1, 0.5, 0.8, 0.4].map((h, k) => (
                                    <span key={k} style={{ width: 3, borderRadius: 2, background: T.gold, height: `${h * 100}%`, animation: `micPulse 0.8s ease-in-out ${k * 0.15}s infinite alternate` }} />
                                  ))}
                                </span>
                              )}
                              {/* ⏪ -10s */}
                              <button
                                onClick={() => rewindTts(10)}
                                title="Back 10 seconds"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.gold, fontSize: 12, padding: '4px 6px', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/>
                                </svg>
                                <span style={{ fontSize: 10, fontWeight: 700 }}>10</span>
                              </button>
                              {/* ⏸/▶ pause/resume */}
                              <button
                                onClick={() => ttsPaused ? resumeTts() : pauseTts()}
                                title={ttsPaused ? 'Resume' : 'Pause'}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.gold, fontSize: 12, padding: '4px 6px', display: 'inline-flex', alignItems: 'center' }}
                              >
                                {ttsPaused ? (
                                  // ▶ play
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill={T.gold} stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                ) : (
                                  // ⏸ pause
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill={T.gold} stroke="none"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                                )}
                              </button>
                              {/* ■ stop */}
                              <button
                                onClick={() => stopTts()}
                                title="Stop"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.soft, fontSize: 12, padding: '4px 6px', display: 'inline-flex', alignItems: 'center' }}
                              >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                              </button>
                            </span>
                          ) : (
                            <ActionBtn onClick={() => speakMsg(i, m.content)} title="Read aloud">
                              <SpeakerIcon size={13} />
                              Listen
                            </ActionBtn>
                          )
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}

          {error && <div style={{ fontSize: 13, color: '#A53F2B', padding: '8px 0', textAlign: 'center' }}>{error}</div>}
          {saveError && <div style={{ fontSize: 12, color: '#A53F2B', padding: '6px 0', textAlign: 'center' }}>{saveError}</div>}
          <div ref={bottomRef} />
        </div>

        {/* ── Input ── */}
        {aiUsage.atLimit ? (
          <AiLimitWall plan={plan} panelMode onTopupSuccess={() => aiUsage.refreshAfterTopup()} />
        ) : (
          <div style={{ borderTop: `1px solid ${C.border}`, padding: '12px 0 0', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={researchMode ? 'Enter a passage or topic to research…' : 'Ask a theological question…'}
                rows={2}
                style={{ flex: 1, padding: '10px 14px', borderRadius: 12, border: `1px solid ${C.border}`, fontSize: 14, fontFamily: T.sans ?? 'inherit', background: C.inputBg, color: C.text, outline: 'none', resize: 'none', lineHeight: 1.5 }}
              />
              <button
                onClick={() => send()}
                disabled={busy || !input.trim()}
                style={{ padding: '10px 18px', borderRadius: 12, border: 'none', background: busy || !input.trim() ? T.line : T.ink, color: T.cream, fontSize: 14, fontWeight: 600, cursor: busy || !input.trim() ? 'default' : 'pointer', flexShrink: 0, alignSelf: 'flex-end', transition: 'background 0.15s' }}
              >{busy ? '…' : '↑'}</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
