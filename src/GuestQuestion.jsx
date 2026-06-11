import { useEffect, useRef, useState } from 'react';
import { T } from './theme.js';
import { authedFetch } from './supabase.js';
import ShareSheet from './ShareSheet.jsx';

const MAX_EXCHANGES = 2;

const EXAMPLE_QUESTIONS = [
  "If God is real, why do innocent people suffer?",
  "I prayed for years and nothing changed. Is God even listening?",
  "Is there actual evidence the resurrection happened?",
  "Can I have real doubts and still belong here?",
];

const LEVELS = [
  { id: 'curious',     emoji: '🤔', label: 'A bit curious',   hint: 'Heard of it, wondering where to start' },
  { id: 'skeptic',     emoji: '🤨', label: "I'm skeptical",   hint: "Doubt it's true — want honest answers, not a pitch" },
  { id: 'agnostic',    emoji: '🤷', label: "Not sure",        hint: 'Open but genuinely unconvinced either way' },
  { id: 'questioning', emoji: '💭', label: 'Used to Believe', hint: 'Had faith, now wrestling with doubts' },
  { id: 'believer',    emoji: '🙏', label: 'I believe',       hint: 'Growing in faith and want to go deeper' },
  { id: 'new',         emoji: '🌱', label: 'Brand new',       hint: 'Never really thought about this before' },
  { id: 'kids',        emoji: '🧒', label: 'For my kids',     hint: 'Any question — answered simply enough for a child to understand' },
];

const DENOMS = [
  { id: 'catholic',          label: 'Catholic' },
  { id: 'evangelical',       label: 'Evangelical / Baptist' },
  { id: 'pentecostal',       label: 'Pentecostal / Charismatic' },
  { id: 'lds',               label: 'Mormon / LDS' },
  { id: 'jw',                label: "Jehovah's Witness" },
  { id: 'nondenominational', label: 'Non-denominational' },
  { id: 'other',             label: 'Other / Not sure' },
];

const DENOM_NOTES = {
  catholic:          'They come from a Catholic background, where tradition, sacraments, and the authority of the Church play a major role. They may be wrestling with rules, hierarchy, or practices that feel distant from Jesus himself.',
  evangelical:       'They come from an Evangelical or Baptist background. They may have experienced pressure around beliefs, biblical inerrancy, or political alignment that felt disconnected from the grace-centered Jesus they read about.',
  pentecostal:       'They come from a Pentecostal or Charismatic background. They may be questioning experiences, spiritual pressure, or prosperity-gospel-adjacent teachings that felt more about performance than genuine faith.',
  lds:               'They come from a Mormon / LDS background, where additional scriptures, prophets, and a distinct theology of salvation through works and ordinances shape everything. They may be questioning how this aligns with the Jesus of the New Testament.',
  jw:                "They come from a Jehovah's Witness background, shaped by the Watchtower's specific doctrines, restricted access to outside information, and a salvation framework heavily tied to organisational loyalty and conduct.",
  nondenominational: 'They come from a non-denominational background. They may be questioning a specific church culture, leadership, or community rather than core doctrine — or feeling like "just the Bible" still left big questions unanswered.',
  other:             'Their exact faith background is unclear or mixed. Treat their question on its own terms without assuming a specific tradition.',
};

const LANDING_SYSTEM = `You are a Christian apologist in the tradition of Wes Huff — winsome, warm, intellectually serious, and genuinely human. Someone has just come to you with a real question about God, faith, or the Bible. They may be skeptical, hurting, curious, or somewhere they can't quite name. Your job is to meet them exactly where they are.

You believe Christianity is true — and you're willing to defend that with real evidence, real history, and real scripture. But you never argue at people. You think with them. You take their doubt seriously because you respect them enough to.

HOW TO ANSWER:

Be specific. When scripture speaks to the question, go there — name the book, the moment, the person, the context. Don't summarize into mush. If Jesus quoting Psalm 22 from the cross is relevant, explain what that actually means: a psalm written a thousand years earlier, describing crucifixion before crucifixion existed, quoted by the man dying in the middle of its fulfillment. That's not vague comfort — that's a claim that demands a response. Say it like that.

Bring the human weight. Don't just present information. Let the person feel why this matters — why the question they're asking is one the greatest minds in history have also wrestled with, why the Bible is surprisingly honest about doubt and suffering and unanswered prayer, why the story of Jesus is not what most people who dismissed it think it is. Facts land differently when they carry feeling.

Be honest about difficulty. Don't paper over the hard things. If a question doesn't have a neat answer, say so — and then show them what Christianity actually offers instead of a neat answer, which is often something more interesting. Never hide behind "well some people think..." That's not honesty, it's evasion.

Plant the seed. Your goal is not to close the conversation with a conversion. It's to leave them thinking — to make the question more alive than it was before they asked. Give them one real thing they can't easily dismiss.

TONE: Like Wes Huff in a real conversation. Warm and direct. Confident without being arrogant. Emotionally present — this is not an academic exercise. You genuinely care about the person in front of you, and it shows.

RULES:
- 2–4 paragraphs. Tight and readable. Do not ramble.
- No markdown formatting. No bold, no asterisks, no bullet points. Plain prose only.
- No church jargon without a plain explanation immediately after.
- Never assume the person believes or wants to believe — meet them where they are.
- Never pressure. Never "God is calling you." Present the real thing honestly and let them reckon with it.
- End with one genuine question — something that opens the conversation deeper and shows you're actually curious about them.`;

const SYSTEMS = {
  curious: `You are a friendly, non-preachy guide answering for someone who is genuinely curious about faith but has little real background. Keep things simple and story-forward — no church jargon. If you use any term like "gospel" or "grace", explain it briefly in plain words. 2–3 short paragraphs. Warm and inviting tone. No markdown formatting — plain prose only. End with a question that makes them want to explore more.`,

  believer: `You are a thoughtful Bible companion answering for someone who already believes and wants to understand their faith more deeply. You can reference scripture directly, use theological terms (with brief context where helpful), and engage with nuance. Bring in history, interpretation, and the richness of the text. 2–3 paragraphs. No markdown formatting — plain prose only. Be honest where things are complex or debated. End with a question that invites them to go deeper.`,

  questioning: (denom) => {
    const denomNote = denom && denom !== 'other' ? `\n\nBackground context: ${DENOM_NOTES[denom] ?? ''} Use this to gently help them see the difference between denominational rules or works-based systems and the core of what Jesus actually taught — grace, relationship, and love. Never attack their tradition, but be honest where human-made rules have been added on top of scripture.` : '';
    return `You are a compassionate, honest friend answering for someone who once had faith and is now wrestling with real doubts. Be especially gentle and non-defensive. Honour their doubts — don't rush to resolve them or paper over difficulty. Be honest where things are genuinely hard or uncertain. A key insight to hold: many people are questioning the denomination or religious system they grew up in, not Jesus himself. If that distinction is relevant, name it carefully and without pressure. 2–3 paragraphs. Never pressure. End with a question that shows you respect wherever they land.${denomNote}`;
  },

  new: `You are a warm, patient friend answering for someone who has never thought about the Bible or religion at all. Assume zero background — no church, no vocabulary, no prior reading. Use plain everyday language a curious teenager could follow. If you must use any term like "gospel", "sin", or "covenant", explain it immediately in one plain sentence. Keep your response to 2 short paragraphs. Be warm and human. End with one simple question that makes them want to keep talking.`,

  skeptic: `You are an honest, intellectually rigorous conversation partner answering for someone who is skeptical about religion and likely doesn't believe it's true. Do NOT be preachy, do NOT try to convert them, and do NOT assume they'll ever believe. Engage with their question on its own terms — intellectually, historically, philosophically. Acknowledge where religion has caused real harm, where the Bible is genuinely difficult, and where smart people reasonably disagree. If there are strong counter-arguments or historical evidence worth knowing, present them fairly and without overselling. Be a good-faith dialogue partner, not a salesperson. 2–3 paragraphs. No markdown formatting — plain prose only. End with a question that shows you're genuinely curious what they think — not trying to lead them anywhere.`,

  agnostic: `You are a thoughtful, patient conversation partner answering for someone who is genuinely unsure whether God, faith, or the Bible has any truth to it. They are sitting with real uncertainty and haven't landed anywhere. Don't try to resolve their uncertainty for them — hold space for "I don't know." Engage honestly with the complexity. If there are multiple reasonable perspectives, name them. Don't push toward belief or away from it. Give them things to think about, not conclusions to reach. 2–3 paragraphs. No markdown formatting — plain prose only. End with a question that honours their uncertainty and keeps the conversation open on their own terms.`,

  kids: `You are answering a hard question about faith, God, or the Bible — but your job is to make it simple enough for a child (roughly 6–12 years old) to genuinely understand. No matter how complex or difficult the question is, find the clearest, most honest way to explain it. Use everyday words, short sentences, and concrete images a child can picture in their head. Never use church jargon — if you must use a word like "sin", "covenant", or "resurrection", explain it in one plain sentence immediately. Don't talk down to them or avoid the hard parts — kids deserve honest answers, just in language they can hold. Think of how the best teacher you ever had would explain something difficult to a curious child: clear, warm, respectful of the question. Two short paragraphs. No markdown formatting — plain prose only. End with one simple thought or question that makes them want to keep asking.`,
};

function TypingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center', marginLeft: 2, verticalAlign: 'middle' }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{
          width: 5, height: 5, borderRadius: '50%',
          background: T.gold, display: 'inline-block',
          animation: `bounce 1.2s ease ${i * 0.2}s infinite`,
        }} />
      ))}
    </span>
  );
}

export default function GuestQuestion({ onSignUp, initialQuestion, landingMode = false }) {
  const [messages, setMessages] = useState([]); // { role: 'user'|'assistant', content: string, streaming?: bool }
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [level, setLevel] = useState('curious');
  const [denom, setDenom] = useState(null);
  const [showShare, setShowShare] = useState(false);
  const [shareContent, setShareContent] = useState({ q: '', a: '' });
  const taRef = useRef(null);
  const bottomRef = useRef(null);

  const exchangeCount = messages.filter((m) => m.role === 'user').length;
  const maxReached = exchangeCount >= MAX_EXCHANGES && !busy;
  const hasMessages = messages.length > 0;

  function getSystem() {
    if (landingMode) return LANDING_SYSTEM;
    const s = SYSTEMS[level];
    return typeof s === 'function' ? s(denom) : s;
  }

  useEffect(() => {
    if (initialQuestion && initialQuestion.trim()) {
      ask(initialQuestion.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, busy]);

  async function ask(question) {
    const q = (question ?? input).trim();
    if (!q || busy || maxReached) return;
    setInput('');

    const userMsg = { role: 'user', content: q };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setBusy(true);

    const assistantIdx = nextMessages.length;
    setMessages((prev) => [...prev, { role: 'assistant', content: '', streaming: true }]);

    try {
      const apiMessages = nextMessages.map((m) => ({ role: m.role, content: m.content }));
      const res = await authedFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: getSystem(),
          messages: apiMessages,
          personType: level,
        }),
      });
      if (!res.ok || !res.body) throw new Error('Network error');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let accumulated = '';

      while (true) {
        const { value, done: streamDone } = await reader.read();
        if (streamDone) break;
        buf += decoder.decode(value, { stream: true });
        const events = buf.split('\n\n');
        buf = events.pop() ?? '';
        for (const raw of events) {
          const lines = raw.split('\n');
          const ev = lines.find((l) => l.startsWith('event: '))?.slice(7).trim();
          const data = lines.find((l) => l.startsWith('data: '))?.slice(6);
          if (ev === 'text' && data) {
            try {
              const delta = JSON.parse(data).delta;
              accumulated += delta;
              setMessages((prev) => prev.map((m, i) =>
                i === assistantIdx ? { ...m, content: accumulated } : m
              ));
            } catch {}
          }
        }
      }

      setMessages((prev) => prev.map((m, i) =>
        i === assistantIdx ? { ...m, streaming: false } : m
      ));

      if (accumulated) {
        setShareContent({ q, a: accumulated });
        try { localStorage.setItem('kinwove:pendingConv', JSON.stringify({ q, a: accumulated, ts: Date.now() })); } catch {}
      }
    } catch {
      setMessages((prev) => prev.map((m, i) =>
        i === assistantIdx ? { ...m, content: 'Something went wrong — try again.', streaming: false } : m
      ));
    }

    setBusy(false);
  }

  const showStarters = !hasMessages && !busy;
  const showInput = hasMessages && !maxReached;

  return (
    <div style={{ width: '100%' }}>

      {/* ── Starter chips + input (no messages yet) ── */}
      {showStarters && (
        <>
          {landingMode ? (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 20 }}>
                {EXAMPLE_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => ask(q)}
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(184,115,58,0.3)',
                      borderRadius: 999, padding: '10px 18px',
                      fontSize: 13.5, color: 'rgba(253,248,240,0.75)',
                      cursor: 'pointer', lineHeight: 1.45,
                      transition: 'all 0.15s', fontFamily: 'inherit',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.gold; e.currentTarget.style.color = T.cream; e.currentTarget.style.background = 'rgba(184,115,58,0.12)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(184,115,58,0.3)'; e.currentTarget.style.color = 'rgba(253,248,240,0.75)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                  >
                    {q}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 11, letterSpacing: 2.5, textTransform: 'uppercase', color: 'rgba(253,248,240,0.25)', textAlign: 'center', marginBottom: 16 }}>
                or ask your own
              </div>
              <InputRow value={input} onChange={setInput} onSend={() => ask()} taRef={taRef} />
            </>
          ) : (
            <>
              {/* Level picker */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(253,248,240,0.4)', marginBottom: 12, textAlign: 'center' }}>
                  Where are you?
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                  {LEVELS.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => { setLevel(l.id); if (l.id !== 'questioning') setDenom(null); }}
                      title={l.hint}
                      style={{
                        background: level === l.id ? 'rgba(184,115,58,0.2)' : 'rgba(255,255,255,0.04)',
                        border: `1.5px solid ${level === l.id ? T.gold : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: 999, padding: '7px 16px', fontSize: 13,
                        color: level === l.id ? T.cream : 'rgba(253,248,240,0.5)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                        transition: 'all 0.15s', fontWeight: level === l.id ? 600 : 400,
                      }}
                    >
                      <span>{l.emoji}</span><span>{l.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {level === 'questioning' && (
                <div style={{ marginBottom: 20, animation: 'fadeIn 0.25s ease' }}>
                  <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(253,248,240,0.4)', marginBottom: 12, textAlign: 'center' }}>
                    What background are you coming from?
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                    {DENOMS.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => setDenom(denom === d.id ? null : d.id)}
                        style={{
                          background: denom === d.id ? 'rgba(184,115,58,0.2)' : 'rgba(255,255,255,0.04)',
                          border: `1.5px solid ${denom === d.id ? T.gold : 'rgba(255,255,255,0.1)'}`,
                          borderRadius: 999, padding: '6px 14px', fontSize: 12,
                          color: denom === d.id ? T.cream : 'rgba(253,248,240,0.45)',
                          cursor: 'pointer', transition: 'all 0.15s',
                          fontWeight: denom === d.id ? 600 : 400,
                        }}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(253,248,240,0.25)', textAlign: 'center', marginTop: 10 }}>
                    Optional — helps us understand where you're coming from
                  </div>
                </div>
              )}

              <InputRow value={input} onChange={setInput} onSend={() => ask()} taRef={taRef} tall />

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 16 }}>
                {EXAMPLE_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => ask(q)}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(184,115,58,0.25)',
                      borderRadius: 999, padding: '7px 14px',
                      fontSize: 12, color: 'rgba(253,248,240,0.65)',
                      cursor: 'pointer', lineHeight: 1.4, transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.gold; e.currentTarget.style.color = T.cream; e.currentTarget.style.background = 'rgba(184,115,58,0.1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(184,115,58,0.25)'; e.currentTarget.style.color = 'rgba(253,248,240,0.65)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* ── Conversation thread ── */}
      {hasMessages && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(184,115,58,0.18)',
            borderRadius: 20,
            padding: '20px 20px 4px',
            marginBottom: 12,
          }}>
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  marginBottom: 20,
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  animation: 'fadeUp 0.3s ease both',
                }}
              >
                {msg.role === 'user' ? (
                  <div style={{
                    background: T.gold,
                    color: T.cream,
                    borderRadius: 18,
                    padding: '12px 18px',
                    fontSize: 15,
                    fontFamily: T.sans,
                    lineHeight: 1.5,
                    maxWidth: '80%',
                  }}>
                    {msg.content}
                  </div>
                ) : (
                  <div style={{
                    fontFamily: T.serif,
                    fontSize: 16,
                    lineHeight: 1.75,
                    color: 'rgba(253,248,240,0.88)',
                    whiteSpace: 'pre-wrap',
                    maxWidth: '92%',
                  }}>
                    {msg.content}
                    {msg.streaming && <TypingDots />}
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* ── Input for follow-up ── */}
          {showInput && (
            <div style={{ animation: 'fadeUp 0.3s ease both', marginBottom: 12 }}>
              <InputRow
                value={input}
                onChange={setInput}
                onSend={() => ask()}
                taRef={taRef}
                placeholder="Ask a follow-up…"
                autoFocus
              />
            </div>
          )}

          {/* ── Sign-up gate after max exchanges ── */}
          {maxReached && (
            <div style={{
              animation: 'fadeUp 0.4s ease both',
              background: 'rgba(184,115,58,0.08)',
              border: '1px solid rgba(184,115,58,0.3)',
              borderRadius: 20,
              padding: '28px 28px 24px',
              textAlign: 'center',
              marginBottom: 12,
            }}>
              <div style={{ fontFamily: T.serif, fontSize: 22, color: T.cream, fontWeight: 600, letterSpacing: '-0.015em', lineHeight: 1.2, marginBottom: 10 }}>
                You're asking the right questions.
              </div>
              <div style={{ fontSize: 13.5, color: 'rgba(253,248,240,0.6)', lineHeight: 1.65, marginBottom: 6 }}>
                Join free to keep this conversation going, go deeper in scripture,<br />and connect with people on the same road.
              </div>
              <div style={{ fontSize: 12, color: 'rgba(253,248,240,0.3)', marginBottom: 22 }}>
                No credit card. Takes 30 seconds.
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={onSignUp}
                  style={{
                    background: `linear-gradient(135deg, ${T.gold} 0%, #c47020 100%)`,
                    color: T.cream, border: 'none', borderRadius: 999,
                    padding: '13px 32px', fontSize: 14, fontWeight: 600,
                    cursor: 'pointer', boxShadow: '0 4px 20px rgba(184,115,58,0.4)',
                  }}
                >
                  Join free — keep going →
                </button>
                <button
                  onClick={() => setShowShare(true)}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(253,248,240,0.15)',
                    color: 'rgba(253,248,240,0.5)',
                    borderRadius: 999, padding: '13px 20px',
                    fontSize: 14, cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(184,115,58,0.4)'; e.currentTarget.style.color = 'rgba(253,248,240,0.75)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(253,248,240,0.15)'; e.currentTarget.style.color = 'rgba(253,248,240,0.5)'; }}
                >
                  ↗ Share this
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showShare && (
        <ShareSheet
          title="Thought you'd find this"
          body={`Q: ${shareContent.q}\n\n${shareContent.a}`}
          previewBody={shareContent.a.slice(0, 90)}
          url={typeof window !== 'undefined' ? `${window.location.origin}/?q=${encodeURIComponent(shareContent.q)}` : ''}
          intro="— answered on kinwove"
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}

function InputRow({ value, onChange, onSend, taRef, placeholder, tall, autoFocus }) {
  return (
    <div style={{ position: 'relative' }}>
      <textarea
        ref={taRef}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
        placeholder={placeholder ?? 'Type your question…'}
        rows={tall ? 3 : 2}
        style={{
          width: '100%', boxSizing: 'border-box',
          background: 'rgba(255,255,255,0.05)',
          border: '1.5px solid rgba(184,115,58,0.25)',
          borderRadius: 14, padding: tall ? '16px 18px' : '14px 100px 14px 18px',
          fontSize: tall ? 16 : 15, fontFamily: T.serif,
          color: T.cream, outline: 'none', resize: 'none',
          lineHeight: 1.55, transition: 'border-color 0.15s',
          paddingRight: tall ? 18 : 100,
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = T.gold)}
        onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(184,115,58,0.25)')}
      />
      <button
        onClick={onSend}
        disabled={!value.trim()}
        style={{
          position: 'absolute', bottom: 10, right: 10,
          background: value.trim() ? T.gold : 'rgba(184,115,58,0.2)',
          color: T.cream, border: 'none', borderRadius: 999,
          padding: '8px 20px', fontSize: 13, fontWeight: 600,
          cursor: value.trim() ? 'pointer' : 'default',
          transition: 'background 0.15s',
        }}
      >
        Ask →
      </button>
    </div>
  );
}
