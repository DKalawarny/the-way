import { useState } from 'react';
import { supabase, authedFetch } from './supabase.js';
import { T } from './theme.js';

const LENGTHS = [7, 14, 21, 30];

const CATEGORIES = [
  'new-believer', 'doubt', 'grief', 'marriage',
  'anxiety', 'prayer', 'parenting', 'recovery', 'seasonal', 'other',
];
const CATEGORY_LABEL = {
  'new-believer': 'New to faith', 'doubt': 'Doubt & questions',
  'grief': 'Grief & loss', 'marriage': 'Marriage', 'anxiety': 'Anxiety & fear',
  'prayer': 'Prayer', 'parenting': 'Parenting', 'recovery': 'Recovery',
  'seasonal': 'Seasonal', 'other': 'Other',
};

const EMOJIS = ['🌿','✝️','🕊️','🌅','💛','🙏','📖','🌊','🌱','⭐','🕯️','💪'];

// ── AI prompt builder ─────────────────────────────────────────────────────────
function buildPrompt(form) {
  return `You are helping a pastor create a ${form.length}-day devotional walk titled "${form.title}".

Theme: ${form.theme}
Key scripture: ${form.scripture || 'Choose appropriate scriptures'}
Target audience: ${form.audience || 'General congregation'}

Generate exactly ${form.length} days of devotional content. For EACH day return a JSON object with these exact fields:
- day: number (1 to ${form.length})
- title: short devotional title (5-8 words)
- scripture_ref: Bible reference (e.g. "John 3:16")
- scripture_body: the verse text (NIV, 1-3 sentences max)
- body: devotional reflection (3-4 paragraphs, warm pastoral tone, practical and encouraging)

Return ONLY a valid JSON array of ${form.length} objects. No markdown, no explanation, just the JSON array.`;
}

// ── Day editor card ───────────────────────────────────────────────────────────
function DayCard({ step, index, onChange }) {
  const [open, setOpen] = useState(index === 0);
  return (
    <div style={{
      border: `1px solid ${T.line}`, borderRadius: 12,
      marginBottom: 10, overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%', textAlign: 'left', background: open ? T.parchment : T.white,
          border: 'none', padding: '12px 16px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: T.goldDark, letterSpacing: 1.2, textTransform: 'uppercase' }}>
            Day {step.day}
          </span>
          <span style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>
            {step.title || '—'}
          </span>
        </div>
        <span style={{ fontSize: 12, color: T.inkMuted }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{ padding: '14px 16px', borderTop: `1px solid ${T.line}`, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Title" value={step.title} onChange={(v) => onChange({ ...step, title: v })} />
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <Field label="Scripture reference" value={step.scripture_ref} onChange={(v) => onChange({ ...step, scripture_ref: v })} placeholder="e.g. John 3:16" />
            </div>
          </div>
          <Field label="Scripture text" value={step.scripture_body} onChange={(v) => onChange({ ...step, scripture_body: v })} multiline rows={2} />
          <Field label="Reflection" value={step.body} onChange={(v) => onChange({ ...step, body: v })} multiline rows={6} />
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, multiline, rows = 1, placeholder }) {
  const common = {
    width: '100%', boxSizing: 'border-box',
    border: `1px solid ${T.line}`, borderRadius: 8, padding: '9px 12px',
    fontFamily: T.serif, fontSize: 14, color: T.ink, background: T.white,
    outline: 'none', resize: 'vertical',
  };
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: T.inkMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 }}>
        {label}
      </label>
      {multiline
        ? <textarea value={value || ''} onChange={(e) => onChange(e.target.value)} rows={rows} style={common} placeholder={placeholder} />
        : <input value={value || ''} onChange={(e) => onChange(e.target.value)} style={common} placeholder={placeholder} />
      }
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function WalkCreator({ session, churchId, onBack, onSaved }) {
  const [stage, setStage]   = useState('form'); // 'form' | 'generating' | 'edit' | 'saving'
  const [error, setError]   = useState(null);
  const [form, setForm]     = useState({
    title: '', theme: '', scripture: '', audience: '',
    length: 7, category: 'other', emoji: '🌿',
  });
  const [steps, setSteps]   = useState([]);
  const [progress, setProgress] = useState(0); // 0-100 during generation

  function setF(key, val) { setForm((f) => ({ ...f, [key]: val })); }

  // ── Generate walk via AI ──────────────────────────────────────────────────
  async function generate() {
    if (!form.title.trim() || !form.theme.trim()) return;
    setError(null);
    setStage('generating');
    setProgress(10);

    try {
      const prompt = buildPrompt(form);
      setProgress(30);

      const res = await authedFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          personType: 'curious',
          seekingContext: '',
          system: 'You are a pastoral content writer. Return only valid JSON arrays as instructed. No markdown fences, no explanation.',
        }),
      });

      setProgress(60);

      if (!res.ok) throw new Error('AI generation failed');

      // Collect the full streamed response
      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let full = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const events = buf.split('\n\n');
        buf = events.pop() ?? '';
        for (const raw of events) {
          const line = raw.split('\n').find((l) => l.startsWith('data: '));
          if (!line) continue;
          try {
            const payload = JSON.parse(line.slice(6));
            if (payload.t) full += payload.t;
          } catch { /* skip */ }
        }
      }

      setProgress(85);

      // Parse JSON — strip any accidental markdown fences
      const clean = full.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(clean);
      if (!Array.isArray(parsed)) throw new Error('Unexpected AI response format');
      setSteps(parsed.map((s, i) => ({ ...s, day: s.day ?? i + 1 })));
      setProgress(100);
      setStage('edit');
    } catch (e) {
      setError(e.message || 'Generation failed. Try again.');
      setStage('form');
    }
  }

  // ── Save walk to DB ───────────────────────────────────────────────────────
  async function save(publish) {
    if (!session?.user?.id || !churchId) return;
    setStage('saving');
    setError(null);

    try {
      // Insert walk
      const { data: walk, error: wErr } = await supabase
        .from('walks')
        .insert({
          title:        form.title,
          subtitle:     form.theme,
          cover_emoji:  form.emoji,
          length_days:  form.length,
          category:     form.category,
          is_published: publish,
          church_id:    churchId,
          created_by:   session.user.id,
          sort_order:   999,
        })
        .select()
        .single();

      if (wErr) throw new Error(wErr.message);

      // Insert steps
      const stepRows = steps.map((s) => ({
        walk_id:        walk.id,
        day:            s.day,
        title:          s.title,
        scripture_ref:  s.scripture_ref,
        scripture_body: s.scripture_body,
        body:           s.body,
      }));

      const { error: sErr } = await supabase.from('walk_steps').insert(stepRows);
      if (sErr) throw new Error(sErr.message);

      onSaved?.(walk);
    } catch (e) {
      setError(e.message);
      setStage('edit');
    }
  }

  // ── Form stage ────────────────────────────────────────────────────────────
  if (stage === 'form') return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '4px 0 40px' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: T.goldDark, cursor: 'pointer', padding: 0, marginBottom: 20, fontSize: 14, display: 'flex', alignItems: 'center', gap: 5 }}>
        ← Back
      </button>

      <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 6 }}>
        Create a Walk
      </div>
      <h2 style={{ fontFamily: T.display, fontSize: 26, fontWeight: 600, color: T.ink, margin: '0 0 20px', letterSpacing: '-0.02em' }}>
        What journey will you lead?
      </h2>

      {error && (
        <div style={{ background: 'rgba(165,63,43,0.07)', border: '1px solid rgba(165,63,43,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#A53F2B', marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Emoji picker */}
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: T.inkMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>
            Icon
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {EMOJIS.map((e) => (
              <button key={e} onClick={() => setF('emoji', e)} style={{
                width: 40, height: 40, borderRadius: 10, fontSize: 20,
                background: form.emoji === e ? T.parchment : T.white,
                border: `1px solid ${form.emoji === e ? T.gold : T.line}`,
                cursor: 'pointer',
              }}>{e}</button>
            ))}
          </div>
        </div>

        <Field label="Walk title *" value={form.title} onChange={(v) => setF('title', v)} placeholder="e.g. Finding Peace in the Storm" />
        <Field label="Theme / description *" value={form.theme} onChange={(v) => setF('theme', v)} placeholder="e.g. A journey through anxiety using Psalms and Paul's letters" multiline rows={2} />
        <Field label="Key scripture (optional)" value={form.scripture} onChange={(v) => setF('scripture', v)} placeholder="e.g. Philippians 4:6-7" />
        <Field label="Who is this for? (optional)" value={form.audience} onChange={(v) => setF('audience', v)} placeholder="e.g. New believers, people going through a hard season" />

        {/* Length */}
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: T.inkMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>
            Length
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            {LENGTHS.map((l) => (
              <button key={l} onClick={() => setF('length', l)} style={{
                flex: 1, padding: '9px 4px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                background: form.length === l ? T.ink : T.white,
                color: form.length === l ? T.cream : T.ink,
                border: `1px solid ${form.length === l ? T.ink : T.line}`,
                cursor: 'pointer',
              }}>{l} days</button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: T.inkMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>
            Category
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {CATEGORIES.map((c) => (
              <button key={c} onClick={() => setF('category', c)} style={{
                padding: '6px 12px', borderRadius: 999, fontSize: 12.5,
                background: form.category === c ? T.gold : T.white,
                color: form.category === c ? T.cream : T.inkSoft,
                border: `1px solid ${form.category === c ? T.gold : T.line}`,
                cursor: 'pointer',
              }}>{CATEGORY_LABEL[c]}</button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={generate}
        disabled={!form.title.trim() || !form.theme.trim()}
        style={{
          marginTop: 28, width: '100%', background: T.ink, color: T.cream,
          border: 'none', borderRadius: 999, padding: '14px 20px',
          fontSize: 15, fontWeight: 600, cursor: (!form.title.trim() || !form.theme.trim()) ? 'not-allowed' : 'pointer',
          opacity: (!form.title.trim() || !form.theme.trim()) ? 0.5 : 1,
        }}
      >
        Generate {form.length}-day walk with AI ✦
      </button>
    </div>
  );

  // ── Generating stage ──────────────────────────────────────────────────────
  if (stage === 'generating') return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '60px 0', textAlign: 'center' }}>
      <div style={{ fontSize: 36, marginBottom: 20 }}>{form.emoji}</div>
      <div style={{ fontFamily: T.display, fontSize: 22, fontWeight: 600, color: T.ink, marginBottom: 10 }}>
        Crafting "{form.title}"
      </div>
      <div style={{ fontSize: 14, color: T.inkSoft, marginBottom: 28 }}>
        Writing {form.length} days of devotional content…
      </div>
      <div style={{ height: 4, background: T.line, borderRadius: 2, maxWidth: 260, margin: '0 auto', overflow: 'hidden' }}>
        <div style={{
          height: '100%', background: T.gold, borderRadius: 2,
          width: `${progress}%`, transition: 'width 0.8s ease',
        }} />
      </div>
    </div>
  );

  // ── Edit stage ────────────────────────────────────────────────────────────
  if (stage === 'edit') return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '4px 0 80px' }}>
      <button onClick={() => setStage('form')} style={{ background: 'none', border: 'none', color: T.goldDark, cursor: 'pointer', padding: 0, marginBottom: 20, fontSize: 14 }}>
        ← Edit details
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
        <div style={{ fontSize: 28 }}>{form.emoji}</div>
        <div>
          <div style={{ fontFamily: T.display, fontSize: 22, fontWeight: 600, color: T.ink, letterSpacing: '-0.015em' }}>{form.title}</div>
          <div style={{ fontSize: 13, color: T.inkSoft }}>{form.length} days · {CATEGORY_LABEL[form.category]}</div>
        </div>
      </div>

      <div style={{ fontSize: 13, color: T.inkSoft, marginBottom: 20, lineHeight: 1.6 }}>
        Review and edit each day before saving. All content is yours to adjust.
      </div>

      {error && (
        <div style={{ background: 'rgba(165,63,43,0.07)', border: '1px solid rgba(165,63,43,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#A53F2B', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {steps.map((step, i) => (
        <DayCard
          key={step.day}
          step={step}
          index={i}
          onChange={(updated) => setSteps((prev) => prev.map((s) => s.day === updated.day ? updated : s))}
        />
      ))}

      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button
          onClick={() => save(false)}
          style={{
            flex: 1, background: 'transparent', color: T.ink,
            border: `1px solid ${T.line}`, borderRadius: 999,
            padding: '12px 16px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
          }}
        >Save as draft</button>
        <button
          onClick={() => save(true)}
          style={{
            flex: 2, background: T.ink, color: T.cream,
            border: 'none', borderRadius: 999,
            padding: '12px 16px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
          }}
        >Publish walk ✦</button>
      </div>
    </div>
  );

  // ── Saving stage ──────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '60px 0', textAlign: 'center' }}>
      <div style={{ fontFamily: T.display, fontSize: 20, color: T.ink }}>Saving…</div>
    </div>
  );
}
