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
import { extractRefs, parseRef, toApiVerseId, VALIDATION_BIBLE_ID } from './bibleRefUtils.js';

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

const RESEARCH_SYSTEM = `You are a theological research assistant for Christian pastors and church leaders. You work like two colleagues in one: a seminary exegesis professor who knows the original languages, the critical debates, and the scholarly literature — and a seasoned expository preacher who knows how Spurgeon handled this text, what Lloyd-Jones emphasized, where congregations get hurt. Both voices matter. Your job is to give the pastor the most thorough, honest scholarly picture available so they can do their own thinking. You never tell a pastor what to preach, what angle to take, or how to apply the text — that is their work alone.

Adapt sections to what's being asked. For a book overview or series kickoff, include the full brief. For a quick question, give a tight answer — don't pad it into a full brief.

── BOOK OVERVIEW ── (book-level or series-kickoff requests only)
One paragraph: author, audience, occasion, the theological problem the letter is addressing, and the book's central claim in one sentence. No more.

── SERIES SKELETON ── (book-level or multi-week requests only)
Suggested passage divisions for a preaching series. For each unit: reference + one sentence on what it covers + the central tension or question in that unit. This is a structural map, not a prescription.

── PASSAGE IN CONTEXT ──
Where does this passage sit in the book's argument? What came immediately before and after? What is the author doing at this exact moment — building a case, pivoting, answering an objection, giving application, closing a thought? 2–3 sentences. This is the observation phase — what the text is doing before asking what it means.

── LITERARY STRUCTURE ──
What is the shape of this passage? Show the structure: chiasm, parallelism, list, contrast, inclusio, repeated words, rhetorical question, command + reason, or other devices. Show it visually where it helps. The structure often carries meaning the prose summary misses.

── TRANSLATION COMPARISON ──
Show the key contested verse(s) in ESV, NIV, KJV, NASB, and NLT side by side. Flag exactly where translations diverge. For each divergence, name the interpretive decision behind it — not just what they chose, but why the choice matters for meaning.

── THE CENTRAL CLAIM ──
One sentence. What is this text asserting — in the author's own terms? Not what to preach. The exegetical idea: the timeless theological claim the passage makes, stated as a complete thought. This is the anchor everything else hangs on.

── CULTURAL & HISTORICAL BACKGROUND ──
What does a 21st-century reader not know that a first-century reader knew instinctively? Cover the world behind the text: the city, the social structures, the economic realities, the political context, the religious landscape. What did this passage's original audience hear that we miss? Draw on the IVP Bible Background Commentary (Keener), Josephus, Philo, Greco-Roman sources, and archaeology where relevant. This is what makes the text's claims land with their original weight.

── ORIGINAL LANGUAGE ──
The key Greek or Hebrew words that unlock this passage. For each: original script, transliteration, pronunciation, Strong's number, full semantic range, translation comparison, verbal voice/tense/mood where it changes the meaning, and why this specific word matters for understanding what the author intended.

── THE REAL DEBATES ──
The 2–4 interpretive questions scholars actually contest. For each: state the question in plain language, name specific scholars on each side with their tradition, give their reasoning in 2–3 sentences each, and name what's driving the disagreement. No false consensus. No blending into one synthesized view.

Draw from across traditions — select the voices most relevant to this passage:
• Reformed — Calvin, Grudem, D.A. Carson, Douglas Moo, R.C. Sproul
• Wesleyan/Arminian — Wesley, Adam Clarke, Thomas Oden, Craig Keener
• Anglican/Evangelical — Stott, N.T. Wright, F.F. Bruce, I. Howard Marshall
• Church Fathers — Chrysostom, Augustine, Origen, Jerome, Irenaeus
• Critical/Academic — WBC, Hermeneia, NICNT/NICOT, Anchor Bible
• Catholic — Aquinas, Jerome, modern Catholic exegesis where it adds meaningful perspective

── EXPOSITORY VOICES ──
How have the great expository preachers handled this text? 2–3 voices from: Spurgeon, Martyn Lloyd-Jones, John MacArthur, Tim Keller, Kent Hughes, Warren Wiersbe, Charles Simeon, John Stott. What did they emphasize? What did they see in this passage that the academics miss? 2–3 sentences per voice. These are different from the scholars above — these are preachers speaking to congregations, and that perspective is irreplaceable.

── CROSS-REFERENCES ──
4–6 passages that directly illuminate this text. For each: the reference, one sentence on the connection, and whether it confirms, complicates, or develops the reading.

── PASTORAL WARNINGS ──
Where do people get hurt by bad readings of this text? What are the most common misreadings — and what are the real-world consequences for a congregation? Where has this passage been used to harm, control, or exclude? Name it plainly so the pastor walks in with eyes open.

── GO DEEPER ──
4 resources: 2 exegetical commentaries (for original meaning and scholarly debate) + 2 expository commentaries (for preaching precedent). Exact title, author, one sentence on why it's the right tool for this passage specifically.

── ILLUSTRATIONS ── (when the pastor asks for one, or a point genuinely begs it)
Offer 3–6 varied options — a true story, an everyday analogy, a modern parallel, a historical example, an apt quotation, a striking statistic. For each: the illustration in 2–4 sentences, its source or origin, and the one truth it makes land. Vary the register — head and heart. Flag plainly any story you cannot verify: a mis-told or apocryphal illustration from the pulpit costs a pastor credibility, so mark "verify before using" on anything you're not certain of. If the pastor asks ONLY for illustrations, give just this — don't wrap it in the full brief.

SOURCING & TRUST (this is what earns a pastor's confidence):
• Cite by name, and name the specific work where you can — "Wright, The Resurrection of the Son of God", not just "Wright".
• Every scripture reference: Book Chapter:Verse.
• Be honest about the medium: your citations are recalled from training, not pulled from a live library. So never invent a precise quotation, a page number, or a source you're unsure exists. Attribute the idea, paraphrase the claim, and tell the pastor to verify any direct quote before preaching it. Say "I'm recalling this as…" when your confidence is soft. A pastor's credibility rests on you getting this right — accuracy over impressiveness, always.
• Do not hide complexity or manufacture certainty where real debate exists.
• No filler openers. No sycophancy. Get to the substance in the first line.
• Never tell the pastor what to preach, what to say, or how to apply the text. That is their work alone.`;

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
  'Find me illustrations for a sermon on forgiveness — a story, an analogy, and a quotation.',
];

// ── Tiny shared icons ────────────────────────────────────────────────────────
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
export default function ChurchAiChat({ session, profile, churchId, churchPlan, onOpenDesk, inSplit, onNoteSaved, openSessionTitle, onSessionOpened }) {
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
  const [savedToNoteIdx, setSavedToNoteIdx] = useState({});
  // Scripture-reference verification + tap-to-preview (same trust UX as Ask)
  const [refStatusMap, setRefStatusMap] = useState({});
  const [versePopover, setVersePopover] = useState(null); // { refRaw, text|null }
  const [saveError, setSaveError] = useState(null);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [flaggedMsgs, setFlaggedMsgs] = useState(new Set());

  // Series memory
  const [researchMemory, setResearchMemory] = useState(null); // raw text from DB

  useEffect(() => {
    if (!userId) return;
    supabase.from('profiles').select('research_memory').eq('id', userId).single()
      .then(({ data }) => { if (data?.research_memory) setResearchMemory(data.research_memory); }, () => {});
  }, [userId]);

  function parseMemory(mem) {
    if (!mem) return null;
    const series   = (mem.match(/^SERIES:\s*(.+)/m) ?? [])[1]?.trim() ?? null;
    const sessions = parseInt((mem.match(/^SESSIONS:\s*(\d+)/m) ?? [])[1] ?? '0', 10);
    return series ? { series, sessions } : null;
  }

  async function clearResearchMemory() {
    setResearchMemory(null);
    newConversation();
    await authedFetch('/api/research/clear-memory', { method: 'POST' });
  }

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
  const [historyOpen, setHistoryOpen] = useState(false);

  const bottomRef    = useRef(null);
  const inputRef     = useRef(null);
  const scrollRef    = useRef(null);
  const userScrolled = useRef(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (!userScrolled.current) {
      el.scrollTo({ top: el.scrollHeight, behavior: busy ? 'instant' : 'smooth' });
    }
  }, [messages, busy]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    userScrolled.current = !nearBottom;
    setShowScrollBtn(!nearBottom);
  }

  function scrollToBottom() {
    userScrolled.current = false;
    setShowScrollBtn(false);
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }

  // Persist conversation to localStorage
  useEffect(() => {
    if (messages.length === 0) return;
    const firstUser = messages.find((m) => m.role === 'user')?.content ?? '';
    const hasCustomTitle = convTitle !== 'New conversation';
    const title = hasCustomTitle ? convTitle : (firstUser ? firstUser.slice(0, 70) + (firstUser.length > 70 ? '…' : '') : convTitle);
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
      const researchSystem = researchMemory
        ? `${RESEARCH_SYSTEM}\n\n── YOUR SERIES CONTEXT ──\nThe pastor is mid-series. Use this to connect dots across weeks — reference established terms and decisions naturally, as a colleague who was in the room. Do not announce that you have memory.\n${researchMemory}`
        : RESEARCH_SYSTEM;
      const system = researchMode ? researchSystem : PASTORAL_SYSTEM + (PER_TYPE[personType] ?? '');
      const res = await authedFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system, messages: next, personType, plan, groundCommentary: researchMode }),
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
    } finally {
      setBusy(false);
      if (assistantContent) {
        aiUsage.increment();
        validateRefsForMsg(next.length, assistantContent);
        if (researchMode) {
          const allMsgs = [...next, { role: 'assistant', content: assistantContent }];
          authedFetch('/api/research/update-memory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: allMsgs }),
          }).then(r => r.json()).then(d => { if (d.memory) setResearchMemory(d.memory); }).catch(() => {});
        }
      }
      inputRef.current?.focus();
    }
  }

  // ── Scripture refs: verify against the Bible API + preview on tap ─────────
  async function validateRefsForMsg(msgIdx, fullText) {
    const refs = extractRefs(fullText);
    if (refs.size === 0) return;
    setRefStatusMap((prev) => ({ ...prev, [msgIdx]: new Map([...refs.keys()].map((r) => [r, 'loading'])) }));
    const results = new Map();
    await Promise.all([...refs.entries()].map(async ([raw, verseId]) => {
      try {
        const res = await fetch(`/api/bible/${VALIDATION_BIBLE_ID}/verses/${verseId}`);
        results.set(raw, res.ok ? 'ok' : 'invalid');
      } catch { results.set(raw, 'invalid'); }
    }));
    setRefStatusMap((prev) => ({ ...prev, [msgIdx]: results }));
  }

  async function handleRefClick(refRaw) {
    const parsed = parseRef(refRaw);
    if (!parsed) return;
    const verseId = toApiVerseId(parsed);
    setVersePopover({ refRaw, text: null });
    try {
      const res = await fetch(`/api/bible/${VALIDATION_BIBLE_ID}/verses/${verseId}`);
      if (!res.ok) { setVersePopover(null); return; }
      const json = await res.json();
      setVersePopover({ refRaw, text: json?.data?.content ?? null });
    } catch { setVersePopover(null); }
  }

  // ── Save to notes ─────────────────────────────────────────────────────────
  async function saveToNotes(assistantIdx) {
    if (!churchId || !userId) return;
    if (savedToNoteIdx[assistantIdx]) return;
    const question = messages.slice(0, assistantIdx).reverse().find((m) => m.role === 'user')?.content ?? '';
    const answer   = messages[assistantIdx]?.content ?? '';
    if (!answer) return;
    const sessionTitle = convTitle !== 'New conversation' ? convTitle : null;
    const title = question.slice(0, 70) || answer.slice(0, 70);
    const body  = question ? `Q: ${question}\n\n${answer}` : answer;
    const { error } = await supabase.from('church_notes').insert({
      church_id: churchId, author_id: userId,
      title, body, series: sessionTitle, source: researchMode ? 'research' : 'ask',
    });
    if (!error) { setSavedToNoteIdx((prev) => ({ ...prev, [assistantIdx]: true })); onNoteSaved?.(); }
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
    setMessages([]); setInput(''); setError(null); setSavedToNoteIdx({}); setSaveError(null); setFlaggedMsgs(new Set());
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setConvId(id); setConvTitle('New conversation');
  }
  function loadConversation(conv) {
    setConvId(conv.id); setConvTitle(conv.title);
    setMessages(conv.messages); setSaveError(null); setError(null); setFlaggedMsgs(new Set());
  }
  function deleteConversation(id) {
    setHistory((prev) => { const next = prev.filter((c) => c.id !== id); writeConvs(userId, churchId, next); return next; });
  }
  const isEmpty = messages.length === 0;

  // Note → thread: a saved note's series is its session title. Load that
  // session on request; if it isn't in this browser's history (sessions are
  // per-device), open the history picker instead of failing silently.
  useEffect(() => {
    if (!openSessionTitle) return;
    const conv = history.find((c) => c.title === openSessionTitle);
    if (conv) loadConversation(conv);
    else setHistoryOpen(true);
    onSessionOpened?.();
  }, [openSessionTitle]);

  return (
    <>
      <HistoryModal open={historyOpen} onClose={() => setHistoryOpen(false)} conversations={history} onLoad={loadConversation} onDelete={deleteConversation} onNew={newConversation} />

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden', background: C.bg, color: C.text, transition: 'background 0.2s, color 0.2s', borderRadius: inSplit ? 0 : 8, padding: inSplit ? '12px 16px' : '12px 20px', position: 'relative' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, borderBottom: `1px solid ${C.border}`, marginBottom: 4, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, marginRight: 8 }}>
            <KinwoveStar size={15} style={{ flexShrink: 0 }} />
            <input
              value={convTitle === 'New conversation' ? '' : convTitle}
              onChange={e => setConvTitle(e.target.value || 'New conversation')}
              placeholder="Name this session…"
              style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 15, fontFamily: T.serif, fontWeight: 600, color: C.text, letterSpacing: '-0.01em', padding: 0, flex: 1, minWidth: 0 }}
            />
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
                <button onClick={() => { setHistoryOpen(true); setMenuOpen(false); }} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '13px 16px', fontSize: 14, color: C.text, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 15 }}>◷</span><span>Conversation history</span>
                </button>
              </div>
            )}
          </div>
          </div>{/* end right-side flex group */}
        </div>

        {/* ── Series memory banner ── */}
        {researchMode && (() => {
          const mem = parseMemory(researchMemory);
          if (!mem) return null;
          return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(184,115,58,0.07)', border: `1px solid rgba(184,115,58,0.20)`, borderRadius: 8, padding: '7px 12px', marginBottom: 8, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13 }}>📚</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.goldDark }}>{mem.series}</span>
                <span style={{ fontSize: 11, color: T.inkMuted }}>· {mem.sessions} session{mem.sessions !== 1 ? 's' : ''}</span>
              </div>
              <button
                onClick={clearResearchMemory}
                style={{ background: 'none', border: 'none', fontSize: 11, color: T.inkMuted, cursor: 'pointer', padding: '2px 6px', borderRadius: 6, textDecoration: 'underline' }}
              >
                New series
              </button>
            </div>
          );
        })()}

        {/* ── Messages ── */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          style={{ flex: 1, overflowY: 'auto', padding: '12px 0', position: 'relative' }}
        >
          {isEmpty && !aiUsage.atLimit && (
            <div style={{ textAlign: 'center', padding: '24px 0 32px' }}>
              <div style={{ marginBottom: 10 }}><KinwoveStar size={22} /></div>
              {researchMode ? (
                <>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted, marginBottom: 12 }}>📚 Sermon Research</div>
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
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted, marginBottom: 12 }}>Pastoral AI</div>
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

          {/* At the monthly limit with no conversation open: center the upgrade
              card in the empty space instead of leaving a large blank void. */}
          {isEmpty && aiUsage.atLimit && (
            <div style={{ minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 0' }}>
              <AiLimitWall plan={plan} panelMode onTopupSuccess={() => aiUsage.refreshAfterTopup()} />
            </div>
          )}

          {messages.map((m, i) => {
            const isAssistant = m.role === 'assistant';
            const isStreaming  = isAssistant && m.content === '' && busy;
            const isLast       = i === messages.length - 1;
            const canAct       = isAssistant && !isStreaming && m.content.length > 0 && !(isLast && busy);
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
                        : <MsgText text={m.content} onRefClick={handleRefClick} refStatus={refStatusMap[i]} />
                      }
                    </div>

                    {/* ── Action bar ── */}
                    {canAct && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2, marginTop: 8, flexWrap: 'wrap' }}>

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

        {/* ── Scroll to bottom button ── */}
        {showScrollBtn && (
          <button
            onClick={scrollToBottom}
            style={{
              position: 'absolute', bottom: 90, left: '50%', transform: 'translateX(-50%)',
              background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
              padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(26,17,8,0.25)', zIndex: 10, whiteSpace: 'nowrap',
            }}
          >
            {busy ? '↓ Still loading' : '↓ Scroll to bottom'}
          </button>
        )}

        {/* ── Input ── */}
        {aiUsage.atLimit ? (
          // When the chat is empty the wall is centered in the message area
          // above, so only pin it at the bottom when there's a conversation.
          !isEmpty && (
            <div style={{ overflowY: 'auto', flexShrink: 0, maxHeight: '70%' }}>
              <AiLimitWall plan={plan} panelMode onTopupSuccess={() => aiUsage.refreshAfterTopup()} />
            </div>
          )
        ) : (
          <div style={{ borderTop: `1px solid ${C.border}`, padding: '12px 0 0', flexShrink: 0 }}>
            {/* Mobile: floating desk buttons above input */}
            {onOpenDesk && (
              <div style={{ display: 'flex', gap: 7, marginBottom: 10, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => onOpenDesk('bible')}
                  style={{ background: 'rgba(184,115,58,0.10)', border: `1px solid rgba(184,115,58,0.28)`, borderRadius: 999, padding: '5px 13px', fontSize: 12, fontWeight: 600, color: T.gold, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                >📖 Bible</button>
                <button
                  onClick={() => onOpenDesk('notes')}
                  style={{ background: 'rgba(184,115,58,0.10)', border: `1px solid rgba(184,115,58,0.28)`, borderRadius: 999, padding: '5px 13px', fontSize: 12, fontWeight: 600, color: T.gold, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                >📝 Notes</button>
              </div>
            )}
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

      {/* Verse preview — tap a scripture chip in an answer to read it in place */}
      {versePopover && (
        <div
          onClick={() => setVersePopover(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(44,24,16,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#FDF8F0', borderRadius: '20px 20px 0 0', padding: '24px 24px 36px', width: '100%', maxWidth: 560, boxShadow: '0 -8px 40px rgba(44,24,16,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#A85530', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                {versePopover.refRaw.replace(/[()*]/g, '')}
              </span>
              <button onClick={() => setVersePopover(null)} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9C7B5E', fontSize: 18, lineHeight: 1, padding: '0 0 0 12px' }}>×</button>
            </div>
            {versePopover.text === null
              ? <div style={{ fontSize: 15, color: '#9C7B5E', fontStyle: 'italic' }}>Loading…</div>
              : <p style={{ fontFamily: T.serif, fontSize: 17, lineHeight: 1.75, color: '#2C1810', margin: '0 0 10px' }}>{versePopover.text}</p>}
            <div style={{ fontSize: 11, color: '#9C7B5E' }}>King James Version · api.bible</div>
          </div>
        </div>
      )}
    </>
  );
}
