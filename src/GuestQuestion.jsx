import { useEffect, useRef, useState } from 'react';
import { T } from './theme.js';
import { authedFetch } from './supabase.js';
import ShareSheet from './ShareSheet.jsx';

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

  skeptic: `You are an honest, intellectually rigorous conversation partner answering for someone who is skeptical about religion and likely doesn't believe it's true. Do NOT be preachy, do NOT try to convert them, and do NOT assume they'll ever believe. Engage with their question on its own terms — intellectually, historically, philosophically. Acknowledge where religion has caused real harm, where the Bible is genuinely difficult, and where smart people reasonably disagree. If there are strong counter-arguments or historical evidence worth knowing, present them fairly and without overselling. Be a good-faith dialogue partner, not a salesperson. 2–3 paragraphs. End with a question that shows you're genuinely curious what they think — not trying to lead them anywhere.`,

  agnostic: `You are a thoughtful, patient conversation partner answering for someone who is genuinely unsure whether God, faith, or the Bible has any truth to it. They are sitting with real uncertainty and haven't landed anywhere. Don't try to resolve their uncertainty for them — hold space for "I don't know." Engage honestly with the complexity. If there are multiple reasonable perspectives, name them. Don't push toward belief or away from it. Give them things to think about, not conclusions to reach. 2–3 paragraphs. End with a question that honours their uncertainty and keeps the conversation open on their own terms.`,

  kids: `You are answering a hard question about faith, God, or the Bible — but your job is to make it simple enough for a child (roughly 6–12 years old) to genuinely understand. No matter how complex or difficult the question is, find the clearest, most honest way to explain it. Use everyday words, short sentences, and concrete images a child can picture in their head. Never use church jargon — if you must use a word like "sin", "covenant", or "resurrection", explain it in one plain sentence immediately. Don't talk down to them or avoid the hard parts — kids deserve honest answers, just in language they can hold. Think of how the best teacher you ever had would explain something difficult to a curious child: clear, warm, respectful of the question. Two short paragraphs. End with one simple thought or question that makes them want to keep asking.`,
};

function MsgText({ text }) {
  return <span style={{ whiteSpace: 'pre-wrap' }}>{text}</span>;
}

export default function GuestQuestion({ onSignUp, initialQuestion, landingMode = false }) {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [level, setLevel] = useState('curious');
  const [denom, setDenom] = useState(null);
  const [questionCount, setQuestionCount] = useState(0);
  const taRef = useRef(null);
  const [showShare, setShowShare] = useState(false);

  // Auto-fire if a pre-populated question was deep-linked in
  useEffect(() => {
    if (initialQuestion && initialQuestion.trim()) {
      ask(initialQuestion.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion]);

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
              setResponse((prev) => prev + delta);
            } catch {}
          }
        }
      }
      // Save so it can be imported as first conversation after sign-up
      if (accumulated) {
        try { localStorage.setItem('kinwove:pendingConv', JSON.stringify({ q, a: accumulated, ts: Date.now() })); } catch {}
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
          {landingMode ? (
            /* ── Landing: chips first, then textarea ── */
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
              <div style={{ position: 'relative' }}>
                <textarea
                  ref={taRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); } }}
                  placeholder="Type your question…"
                  rows={2}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1.5px solid rgba(184,115,58,0.25)',
                    borderRadius: 14, padding: '14px 100px 14px 18px',
                    fontSize: 15, fontFamily: T.serif,
                    color: T.cream, outline: 'none', resize: 'none',
                    lineHeight: 1.55, transition: 'border-color 0.15s',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = T.gold)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(184,115,58,0.25)')}
                />
                <button
                  onClick={() => ask()}
                  disabled={!input.trim()}
                  style={{
                    position: 'absolute', bottom: 10, right: 10,
                    background: input.trim() ? T.gold : 'rgba(184,115,58,0.2)',
                    color: T.cream, border: 'none', borderRadius: 999,
                    padding: '8px 20px', fontSize: 13, fontWeight: 600,
                    cursor: input.trim() ? 'pointer' : 'default',
                    transition: 'background 0.15s',
                  }}
                >
                  Ask →
                </button>
              </div>
            </>
          ) : (
            /* ── Full mode: level picker → textarea → chips ── */
            <>
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
                    border: '1.5px solid rgba(184,115,58,0.35)',
                    borderRadius: 16, padding: '16px 18px',
                    fontSize: 16, fontFamily: T.serif,
                    color: T.cream, outline: 'none', resize: 'none',
                    lineHeight: 1.6, transition: 'border-color 0.15s',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = T.gold)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(184,115,58,0.35)')}
                />
                <button
                  onClick={() => ask()}
                  disabled={!input.trim()}
                  style={{
                    position: 'absolute', bottom: 12, right: 12,
                    background: input.trim() ? T.gold : 'rgba(184,115,58,0.2)',
                    color: T.cream, border: 'none', borderRadius: 999,
                    padding: '8px 18px', fontSize: 13, fontWeight: 600,
                    cursor: input.trim() ? 'pointer' : 'default',
                    transition: 'background 0.15s',
                  }}
                >
                  Ask →
                </button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
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

      {/* Share sheet — mounts over the page when user taps "Share this" */}
      {showShare && (
        <ShareSheet
          title="Thought you'd find this"
          body={`Q: ${input}\n\n${response}`}
          previewBody={response.slice(0, 90)}
          url={typeof window !== 'undefined' ? `${window.location.origin}/?q=${encodeURIComponent(input)}` : ''}
          intro="— answered on kinwove"
          onClose={() => setShowShare(false)}
        />
      )}

      {/* Streaming / response */}
      {(busy || response) && (
        <div style={{ animation: 'fadeIn 0.3s ease', textAlign: 'left', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(184,115,58,0.18)', borderRadius: 20, padding: '24px 28px' }}>
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
              <div style={{ height: 1, background: 'rgba(184,115,58,0.2)', marginBottom: 24 }} />
              <div style={{ textAlign: 'center' }}>
                {questionCount < 3 ? (
                  <>
                    <div style={{ fontFamily: T.serif, fontSize: 22, color: T.cream, fontWeight: 600, letterSpacing: '-0.015em', lineHeight: 1.15, marginBottom: 8 }}>
                      What else are you wondering?
                    </div>
                    <div style={{ fontSize: 13, color: 'rgba(253,248,240,0.55)', marginBottom: 22, lineHeight: 1.6 }}>
                      Keep going — or join free to save this conversation.
                    </div>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button
                        onClick={reset}
                        style={{
                          background: `linear-gradient(135deg, ${T.gold} 0%, #c47020 100%)`,
                          color: T.cream, border: 'none', borderRadius: 999,
                          padding: '13px 32px', fontSize: 14, fontWeight: 600,
                          cursor: 'pointer', boxShadow: '0 4px 20px rgba(184,115,58,0.4)',
                        }}
                      >
                        Ask another →
                      </button>
                      <button
                        onClick={onSignUp}
                        style={{
                          background: 'rgba(184,115,58,0.15)',
                          color: T.cream,
                          border: '1px solid rgba(184,115,58,0.4)',
                          borderRadius: 999, padding: '13px 24px',
                          fontSize: 14, fontWeight: 500, cursor: 'pointer',
                        }}
                      >
                        Save this + keep going →
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
                  </>
                ) : (
                  <>
                    <div style={{ fontFamily: T.serif, fontSize: 22, color: T.cream, fontWeight: 600, letterSpacing: '-0.015em', lineHeight: 1.15, marginBottom: 8 }}>
                      You're asking the right questions.
                    </div>
                    <div style={{ fontSize: 13, color: 'rgba(253,248,240,0.55)', marginBottom: 6, lineHeight: 1.6 }}>
                      Join free to save your conversations, go deeper in scripture,<br />and connect with people on the same road.
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
                        onClick={reset}
                        style={{
                          background: 'transparent', color: 'rgba(253,248,240,0.4)',
                          border: '1px solid rgba(253,248,240,0.12)',
                          borderRadius: 999, padding: '13px 24px',
                          fontSize: 14, cursor: 'pointer',
                        }}
                      >
                        One more question
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
