import { useRef, useState } from 'react';
import { T } from './theme.js';
import { authedFetch } from './supabase.js';

const EXAMPLE_QUESTIONS = [
  "Why does God allow so much suffering?",
  "Is the Bible actually historically reliable?",
  "Can you believe in evolution and the Bible?",
  "Why is the Old Testament so violent?",
  "What if I die and none of this is real?",
  "Why does God seem so different in the Old vs New Testament?",
];

const LEVELS = [
  { id: 'curious',     emoji: '🤔', label: 'A bit curious',   hint: 'Heard of it, wondering where to start' },
  { id: 'believer',    emoji: '🙏', label: 'I believe',       hint: 'Growing in faith and want to go deeper' },
  { id: 'questioning', emoji: '💭', label: 'Used to Believe', hint: 'Had faith, now wrestling with doubts' },
  { id: 'new',         emoji: '🌱', label: 'Brand new',       hint: 'Never really thought about this before' },
];

const DENOMS = [
  { id: 'catholic',        label: 'Catholic' },
  { id: 'evangelical',     label: 'Evangelical / Baptist' },
  { id: 'pentecostal',     label: 'Pentecostal / Charismatic' },
  { id: 'lds',             label: 'Mormon / LDS' },
  { id: 'jw',              label: "Jehovah's Witness" },
  { id: 'nondenominational', label: 'Non-denominational' },
  { id: 'other',           label: 'Other / Not sure' },
];

const DENOM_NOTES = {
  catholic:        'They come from a Catholic background, where tradition, sacraments, and the authority of the Church play a major role. They may be wrestling with rules, hierarchy, or practices that feel distant from Jesus himself.',
  evangelical:     'They come from an Evangelical or Baptist background. They may have experienced pressure around beliefs, biblical inerrancy, or political alignment that felt disconnected from the grace-centered Jesus they read about.',
  pentecostal:     'They come from a Pentecostal or Charismatic background. They may be questioning experiences, spiritual pressure, or prosperity-gospel-adjacent teachings that felt more about performance than genuine faith.',
  lds:             'They come from a Mormon / LDS background, where additional scriptures, prophets, and a distinct theology of salvation through works and ordinances shape everything. They may be questioning how this aligns with the Jesus of the New Testament.',
  jw:              "They come from a Jehovah's Witness background, shaped by the Watchtower's specific doctrines, restricted access to outside information, and a salvation framework heavily tied to organisational loyalty and conduct.",
  nondenominational: 'They come from a non-denominational background. They may be questioning a specific church culture, leadership, or community rather than core doctrine — or feeling like "just the Bible" still left big questions unanswered.',
  other:           'Their exact faith background is unclear or mixed. Treat their question on its own terms without assuming a specific tradition.',
};

const SYSTEMS = {
  curious: `You are a friendly, non-preachy guide answering for someone who is genuinely curious about faith but has little real background. Keep things simple and story-forward — no church jargon. If you use any term like "gospel" or "grace", explain it briefly in plain words. 2–3 short paragraphs. Warm and inviting tone. End with a question that makes them want to explore more.`,

  believer: `You are a thoughtful Bible companion answering for someone who already believes and wants to understand their faith more deeply. You can reference scripture directly, use theological terms (with brief context where helpful), and engage with nuance. Bring in history, interpretation, and the richness of the text. 2–3 paragraphs. Be honest where things are complex or debated. End with a question that invites them to go deeper.`,

  questioning: (denom) => {
    const denomNote = denom && denom !== 'other' ? `\n\nBackground context: ${DENOM_NOTES[denom] ?? ''} Use this to gently help them see the difference between denominational rules or works-based systems and the core of what Jesus actually taught — grace, relationship, and love. Never attack their tradition, but be honest where human-made rules have been added on top of scripture.` : '';
    return `You are a compassionate, honest friend answering for someone who once had faith and is now wrestling with real doubts. Be especially gentle and non-defensive. Honour their doubts — don't rush to resolve them or paper over difficulty. Be honest where things are genuinely hard or uncertain. A key insight to hold: many people are questioning the denomination or religious system they grew up in, not Jesus himself. If that distinction is relevant, name it carefully and without pressure. 2–3 paragraphs. Never pressure. End with a question that shows you respect wherever they land.${denomNote}`;
  },

  new: `You are a warm, patient friend answering for someone who has never thought about the Bible or religion at all. Assume zero background — no church, no vocabulary, no prior reading. Use plain everyday language a curious teenager could follow. If you must use any term like "gospel", "sin", or "covenant", explain it immediately in one plain sentence. Keep your response to 2 short paragraphs. Be warm and human. End with one simple question that makes them want to keep talking.`,
};

function MsgText({ text }) {
  return <span style={{ whiteSpace: 'pre-wrap' }}>{text}</span>;
}

export default function GuestQuestion({ onSignUp }) {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [level, setLevel] = useState('curious');
  const [denom, setDenom] = useState(null);
  const [questionCount, setQuestionCount] = useState(0);
  const taRef = useRef(null);

  function getSystem() {
    const s = SYSTEMS[level];
    return typeof s === 'function' ? s(denom) : s;
  }

  async function ask(question) {
    const q = (question ?? input).trim();
    if (!q || busy) return;
    setInput(q);
    setResponse('');
    setDone(false);
    setBusy(true);

    try {
      const res = await authedFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: getSystem(),
          messages: [{ role: 'user', content: q }],
          personType: 'skeptic',
        }),
      });
      if (!res.ok || !res.body) throw new Error('Network error');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

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
            try { setResponse((prev) => prev + JSON.parse(data).delta); } catch {}
          }
        }
      }
    } catch {}

    setBusy(false);
    setDone(true);
    setQuestionCount((c) => c + 1);
  }

  function reset() {
    setInput('');
    setResponse('');
    setDone(false);
    setBusy(false);
    setTimeout(() => taRef.current?.focus(), 50);
  }

  return (
    <div style={{ width: '100%' }}>

      {/* Input area — always visible */}
      {!response && !busy && (
        <>
          {/* Level selector */}
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
                    background: level === l.id ? 'rgba(196,129,58,0.2)' : 'rgba(255,255,255,0.04)',
                    border: `1.5px solid ${level === l.id ? T.gold : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: 999,
                    padding: '7px 16px',
                    fontSize: 13,
                    color: level === l.id ? T.cream : 'rgba(253,248,240,0.5)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.15s',
                    fontWeight: level === l.id ? 600 : 400,
                  }}
                >
                  <span>{l.emoji}</span>
                  <span>{l.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Denomination follow-up — only for Questioning */}
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
                      background: denom === d.id ? 'rgba(196,129,58,0.2)' : 'rgba(255,255,255,0.04)',
                      border: `1.5px solid ${denom === d.id ? T.gold : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: 999,
                      padding: '6px 14px',
                      fontSize: 12,
                      color: denom === d.id ? T.cream : 'rgba(253,248,240,0.45)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
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

          <div style={{ position: 'relative', marginBottom: 16 }}>
            <textarea
              ref={taRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); } }}
              placeholder="Type your hardest question about faith, God, or the Bible…"
              rows={3}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.06)',
                border: `1.5px solid rgba(196,129,58,0.35)`,
                borderRadius: 16, padding: '16px 18px',
                fontSize: 16, fontFamily: T.serif,
                color: T.cream, outline: 'none', resize: 'none',
                lineHeight: 1.6,
                transition: 'border-color 0.15s',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = T.gold)}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(196,129,58,0.35)')}
            />
            <button
              onClick={() => ask()}
              disabled={!input.trim()}
              style={{
                position: 'absolute', bottom: 12, right: 12,
                background: input.trim() ? T.gold : 'rgba(196,129,58,0.2)',
                color: T.cream, border: 'none', borderRadius: 999,
                padding: '8px 18px', fontSize: 13, fontWeight: 600,
                cursor: input.trim() ? 'pointer' : 'default',
                transition: 'background 0.15s',
              }}
            >
              Ask →
            </button>
          </div>

          {/* Example question chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {EXAMPLE_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => ask(q)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(196,129,58,0.25)',
                  borderRadius: 999, padding: '7px 14px',
                  fontSize: 12, color: 'rgba(253,248,240,0.65)',
                  cursor: 'pointer', lineHeight: 1.4,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.gold; e.currentTarget.style.color = T.cream; e.currentTarget.style.background = 'rgba(196,129,58,0.1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(196,129,58,0.25)'; e.currentTarget.style.color = 'rgba(253,248,240,0.65)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              >
                {q}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Streaming / response */}
      {(busy || response) && (
        <div style={{ animation: 'fadeIn 0.3s ease', textAlign: 'left', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(196,129,58,0.18)', borderRadius: 20, padding: '24px 28px' }}>
          {/* The question */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
            <div style={{
              background: T.gold, color: T.cream,
              borderRadius: 18, padding: '12px 18px',
              fontSize: 15, fontFamily: T.sans,
              lineHeight: 1.5, maxWidth: '80%',
            }}>
              {input}
            </div>
          </div>

          {/* The response */}
          <div style={{
            fontFamily: T.serif, fontSize: 17, lineHeight: 1.78,
            color: 'rgba(253,248,240,0.88)',
            whiteSpace: 'pre-wrap', marginBottom: busy ? 0 : 28,
            textAlign: 'left',
          }}>
            {response}
            {busy && (
              <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center', marginLeft: 6, verticalAlign: 'middle' }}>
                {[0, 1, 2].map((i) => (
                  <span key={i} style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: T.gold, display: 'inline-block',
                    animation: `bounce 1.2s ease ${i * 0.2}s infinite`,
                  }} />
                ))}
              </span>
            )}
          </div>

          {/* Post-response CTAs */}
          {done && (
            <div style={{ animation: 'fadeUp 0.4s ease both' }}>
              <div style={{ height: 1, background: 'rgba(196,129,58,0.2)', marginBottom: 24 }} />
              <div style={{ textAlign: 'center' }}>
                {questionCount < 3 ? (
                  <>
                    <div style={{ fontFamily: T.display, fontSize: 22, color: T.cream, fontWeight: 600, letterSpacing: '-0.015em', lineHeight: 1.15, marginBottom: 8 }}>
                      What else are you wondering?
                    </div>
                    <div style={{ fontSize: 13, color: 'rgba(253,248,240,0.45)', marginBottom: 22, lineHeight: 1.6 }}>
                      Keep asking — no account needed yet.
                    </div>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button
                        onClick={reset}
                        style={{
                          background: `linear-gradient(135deg, ${T.gold} 0%, #c47020 100%)`,
                          color: T.cream, border: 'none', borderRadius: 999,
                          padding: '13px 32px', fontSize: 14, fontWeight: 600,
                          cursor: 'pointer', boxShadow: '0 4px 20px rgba(196,129,58,0.4)',
                        }}
                      >
                        Ask another →
                      </button>
                      <button
                        onClick={onSignUp}
                        style={{
                          background: 'transparent', color: 'rgba(253,248,240,0.45)',
                          border: '1px solid rgba(253,248,240,0.15)',
                          borderRadius: 999, padding: '13px 24px',
                          fontSize: 14, cursor: 'pointer',
                        }}
                      >
                        Continue free
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontFamily: T.display, fontSize: 22, color: T.cream, fontWeight: 600, letterSpacing: '-0.015em', lineHeight: 1.15, marginBottom: 8 }}>
                      Want to keep going?
                    </div>
                    <div style={{ fontSize: 13, color: 'rgba(253,248,240,0.45)', marginBottom: 22, lineHeight: 1.6 }}>
                      Save your conversations, explore scripture at your own pace,<br />and ask anything — no judgment, ever.
                    </div>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button
                        onClick={onSignUp}
                        style={{
                          background: `linear-gradient(135deg, ${T.gold} 0%, #c47020 100%)`,
                          color: T.cream, border: 'none', borderRadius: 999,
                          padding: '13px 32px', fontSize: 14, fontWeight: 600,
                          cursor: 'pointer', boxShadow: '0 4px 20px rgba(196,129,58,0.4)',
                        }}
                      >
                        Continue free →
                      </button>
                      <button
                        onClick={reset}
                        style={{
                          background: 'transparent', color: 'rgba(253,248,240,0.45)',
                          border: '1px solid rgba(253,248,240,0.15)',
                          borderRadius: 999, padding: '13px 24px',
                          fontSize: 14, cursor: 'pointer',
                        }}
                      >
                        Ask another
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
