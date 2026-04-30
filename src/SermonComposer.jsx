import { useEffect, useState } from 'react';
import { supabase, authedFetch } from './supabase.js';
import { T } from './theme.js';

const KIND_LABEL = {
  daily_verse:    'Daily verse',
  group_question: 'Small-group question',
  going_deeper:   'Going deeper',
  kid_version:    'For kids',
};

function todayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  // pick the Monday of this week
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const monday = new Date(d.getTime() + diff * 86400000);
  return monday.toISOString().slice(0, 10);
}

const inputCss = {
  width: '100%', boxSizing: 'border-box',
  border: `1px solid ${T.line}`, borderRadius: 10, padding: '11px 14px',
  fontSize: 15, fontFamily: 'inherit', background: T.cream, color: T.ink, outline: 'none',
};

function ContentItem({ item, onChange, onRemove }) {
  return (
    <div style={{
      background: T.white, border: `1px solid ${T.line}`, borderRadius: 14,
      padding: '14px 16px', marginBottom: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{
          fontSize: 10.5, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase',
          background: T.parchment, color: T.goldDark, borderRadius: 999, padding: '3px 9px',
        }}>{KIND_LABEL[item.kind] ?? item.kind}</span>
        {item.day != null && (
          <span style={{ fontSize: 11.5, color: T.inkMuted }}>Day {item.day}</span>
        )}
        <button onClick={onRemove} style={{
          marginLeft: 'auto', background: 'none', border: 'none',
          color: T.inkMuted, fontSize: 14, cursor: 'pointer',
        }}>×</button>
      </div>
      {item.kind === 'daily_verse' && (
        <input
          value={item.scripture ?? ''}
          onChange={(e) => onChange({ ...item, scripture: e.target.value })}
          placeholder="Scripture reference (e.g. Romans 8:28)"
          style={{ ...inputCss, fontSize: 13, marginBottom: 8 }}
        />
      )}
      <textarea
        value={item.body}
        onChange={(e) => onChange({ ...item, body: e.target.value })}
        rows={item.kind === 'going_deeper' ? 5 : 3}
        style={{ ...inputCss, fontFamily: T.serif, lineHeight: 1.7, resize: 'vertical' }}
      />
    </div>
  );
}

export default function SermonComposer({ session, churchId, onBack }) {
  const [sermons, setSermons] = useState([]);
  const [view, setView] = useState('list');  // 'list' | 'edit'
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [title, setTitle] = useState('');
  const [scriptureRef, setScriptureRef] = useState('');
  const [summary, setSummary] = useState('');
  const [weekStartsOn, setWeekStartsOn] = useState(todayISO());
  const [content, setContent] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!churchId) return;
    setLoading(true);
    supabase
      .from('sermons')
      .select('*')
      .eq('church_id', churchId)
      .order('week_starts_on', { ascending: false })
      .then(({ data }) => {
        setSermons(data ?? []);
        setLoading(false);
      });
  }, [churchId]);

  function startNew() {
    setEditing(null);
    setTitle('');
    setScriptureRef('');
    setSummary('');
    setWeekStartsOn(todayISO());
    setContent([]);
    setError(null);
    setView('edit');
  }

  async function startEdit(sermon) {
    setEditing(sermon);
    setTitle(sermon.title ?? '');
    setScriptureRef(sermon.scripture_ref ?? '');
    setSummary(sermon.summary ?? '');
    setWeekStartsOn(sermon.week_starts_on ?? todayISO());
    setError(null);
    const { data } = await supabase
      .from('sermon_content')
      .select('*')
      .eq('sermon_id', sermon.id)
      .order('sort_order');
    setContent(data ?? []);
    setView('edit');
  }

  async function handleGenerate() {
    if (!summary.trim()) {
      setError('Paste your sermon outline first.');
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const r = await authedFetch('/api/sermon/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title, scripture_ref: scriptureRef, summary }),
      });
      if (!r.ok) throw new Error(await r.text());
      const { content: generated } = await r.json();
      setContent(generated.map((c, i) => ({ ...c, _local: true, sort_order: i })));
    } catch (e) {
      setError(e?.message ?? 'Generation failed.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave(publish = true) {
    if (!session?.user?.id || !churchId) return;
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    setSaving(true);
    setError(null);

    let sermonId = editing?.id;
    if (editing) {
      const { error: e1 } = await supabase
        .from('sermons')
        .update({
          title: title.trim(),
          scripture_ref: scriptureRef.trim() || null,
          summary: summary.trim() || null,
          week_starts_on: weekStartsOn,
          is_published: publish,
        })
        .eq('id', sermonId);
      if (e1) { setError(e1.message); setSaving(false); return; }
    } else {
      const { data, error: e1 } = await supabase
        .from('sermons')
        .insert({
          church_id: churchId,
          pastor_id: session.user.id,
          title: title.trim(),
          scripture_ref: scriptureRef.trim() || null,
          summary: summary.trim() || null,
          week_starts_on: weekStartsOn,
          is_published: publish,
        })
        .select()
        .single();
      if (e1) { setError(e1.message); setSaving(false); return; }
      sermonId = data.id;
    }

    // Replace content
    await supabase.from('sermon_content').delete().eq('sermon_id', sermonId);
    if (content.length > 0) {
      const rows = content.map((c, i) => ({
        sermon_id: sermonId,
        kind: c.kind,
        day: c.day ?? null,
        body: c.body,
        scripture: c.scripture ?? null,
        sort_order: i,
      }));
      const { error: e2 } = await supabase.from('sermon_content').insert(rows);
      if (e2) { setError(e2.message); setSaving(false); return; }
    }

    // Refresh list
    const { data: refreshed } = await supabase
      .from('sermons')
      .select('*')
      .eq('church_id', churchId)
      .order('week_starts_on', { ascending: false });
    setSermons(refreshed ?? []);

    setSaving(false);
    setView('list');
  }

  if (view === 'edit') {
    return (
      <div style={{ minHeight: '100vh', background: T.cream, padding: '32px 20px 80px', overflowY: 'auto' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <button onClick={() => setView('list')} style={{
            background: 'none', border: 'none', color: T.goldDark, fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 14,
          }}>← Sermons</button>

          <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: T.goldDark, marginBottom: 8 }}>
            This week's content
          </div>
          <h1 style={{ fontFamily: T.display, fontSize: 32, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em', lineHeight: 1.1, margin: '0 0 8px' }}>
            {editing ? 'Edit sermon' : 'New sermon'}
          </h1>
          <p style={{ color: T.inkSoft, fontSize: 14.5, lineHeight: 1.65, margin: '0 0 22px' }}>
            Paste Sunday's outline. Generate the week's content, then edit anything before you publish.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: T.inkSoft, fontWeight: 500, display: 'block', marginBottom: 6 }}>Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. The God who runs" style={inputCss} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: T.inkSoft, fontWeight: 500, display: 'block', marginBottom: 6 }}>Week starts</label>
              <input type="date" value={weekStartsOn} onChange={(e) => setWeekStartsOn(e.target.value)} style={inputCss} />
            </div>
          </div>

          <label style={{ fontSize: 12, color: T.inkSoft, fontWeight: 500, display: 'block', marginBottom: 6 }}>Scripture</label>
          <input value={scriptureRef} onChange={(e) => setScriptureRef(e.target.value)} placeholder="e.g. Luke 15:11–32" style={{ ...inputCss, marginBottom: 14 }} />

          <label style={{ fontSize: 12, color: T.inkSoft, fontWeight: 500, display: 'block', marginBottom: 6 }}>
            Sermon outline · paste your notes
          </label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder={`Paste your outline. Bullet points, paragraphs, partial thoughts — whatever you have.\n\nThe AI uses this to draft daily verses, small-group questions, a "going deeper" track, and a kid-friendly version. You'll be able to edit everything before publishing.`}
            rows={8}
            style={{ ...inputCss, fontFamily: T.serif, lineHeight: 1.7, resize: 'vertical', marginBottom: 14 }}
          />

          <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
            <button
              onClick={handleGenerate}
              disabled={generating || !summary.trim()}
              style={{
                background: T.gold, color: T.cream, border: 'none', borderRadius: 999,
                padding: '11px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                opacity: (generating || !summary.trim()) ? 0.5 : 1,
              }}
            >
              {generating ? 'Generating week…' : '✦ Generate the week'}
            </button>
            <button
              onClick={() => setContent((c) => [...c, { kind: 'daily_verse', day: (c.filter((x) => x.kind === 'daily_verse').length) + 1, body: '', scripture: '', _local: true }])}
              style={{
                background: 'transparent', border: `1px solid ${T.line}`, borderRadius: 999,
                padding: '11px 16px', fontSize: 13, color: T.inkSoft, cursor: 'pointer',
              }}
            >
              + Add item
            </button>
          </div>

          {error && (
            <div style={{ color: T.error, fontSize: 13, marginBottom: 14, padding: '10px 14px', background: 'rgba(165,63,43,0.08)', borderRadius: 10 }}>
              {error}
            </div>
          )}

          {content.length > 0 && (
            <>
              <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.inkMuted, fontWeight: 700, margin: '8px 0 8px' }}>
                Week's content
              </div>
              {content.map((c, i) => (
                <ContentItem
                  key={i}
                  item={c}
                  onChange={(updated) => setContent((arr) => arr.map((x, idx) => idx === i ? updated : x))}
                  onRemove={() => setContent((arr) => arr.filter((_, idx) => idx !== i))}
                />
              ))}
            </>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              style={{
                flex: 1, background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
                padding: '13px 20px', fontSize: 15, fontWeight: 600, cursor: 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Saving…' : editing ? 'Update & publish' : 'Publish to congregation'}
            </button>
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              style={{
                background: 'transparent', border: `1px solid ${T.line}`, borderRadius: 999,
                padding: '13px 18px', fontSize: 14, color: T.inkSoft, cursor: 'pointer',
              }}
            >
              Save draft
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: T.cream, padding: '32px 20px 80px', overflowY: 'auto' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', color: T.goldDark, fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 14,
        }}>← Pastor dashboard</button>

        <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: T.goldDark, marginBottom: 8 }}>
          Sermons
        </div>
        <h1 style={{ fontFamily: T.display, fontSize: 32, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em', lineHeight: 1.1, margin: '0 0 8px' }}>
          Sunday → the week
        </h1>
        <p style={{ color: T.inkSoft, fontSize: 14.5, lineHeight: 1.65, margin: '0 0 20px' }}>
          Paste a sermon, get a week of daily verses, group questions, a deeper track, and a kid-friendly version.
        </p>

        <button onClick={startNew} style={{
          width: '100%', background: T.parchment, border: `1px dashed ${T.goldLight}`,
          borderRadius: 14, padding: '14px', cursor: 'pointer', textAlign: 'center',
          color: T.goldDark, fontSize: 14, fontWeight: 600, marginBottom: 16,
        }}>+ New sermon</button>

        {loading ? (
          <div style={{ color: T.inkMuted, fontFamily: T.serif, textAlign: 'center', padding: 40 }}>Loading…</div>
        ) : sermons.length === 0 ? (
          <div style={{
            background: T.white, border: `1px dashed ${T.line}`, borderRadius: 14,
            padding: '32px 20px', textAlign: 'center',
            color: T.inkMuted, fontFamily: T.serif, fontStyle: 'italic', lineHeight: 1.65,
          }}>
            No sermons yet. Paste this Sunday's outline to begin.
          </div>
        ) : (
          sermons.map((s) => (
            <button key={s.id} onClick={() => startEdit(s)} style={{
              display: 'block', width: '100%', textAlign: 'left',
              background: T.white, border: `1px solid ${T.line}`, borderRadius: 14,
              padding: '14px 16px', cursor: 'pointer', marginBottom: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: T.display, fontSize: 19, fontWeight: 600, color: T.ink, letterSpacing: '-0.012em', lineHeight: 1.2, marginBottom: 4 }}>
                    {s.title}
                  </div>
                  {s.scripture_ref && (
                    <div style={{ fontSize: 13, color: T.goldDark, fontStyle: 'italic', marginBottom: 4 }}>
                      {s.scripture_ref}
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: T.inkMuted }}>
                    Week of {new Date(s.week_starts_on + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    {!s.is_published && <span style={{ marginLeft: 8, color: T.error }}>· draft</span>}
                  </div>
                </div>
                <div style={{ color: T.inkMuted, fontSize: 18 }}>›</div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
