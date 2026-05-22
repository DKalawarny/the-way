import { useEffect, useState } from 'react';
import { supabase, authedFetch } from './supabase.js';
import { T } from './theme.js';
import { useSermonAiUsage, FREE_SERMON_LIMIT } from './useSermonAiUsage.js';
import { SermonAiNudge } from './PlanGate.jsx';
import { useUiKit } from './uikit.jsx';
import { useImageDrafts, ImageDraftGrid, ImageAttachButton } from './imageAttach.jsx';
import PostImageGrid from './PostImageGrid.jsx';

const KIND_LABEL = {
  daily_verse:    'Daily question',
  // Retained for backwards compatibility with older sermons that still have
  // group_question rows. New content is consolidated into the daily flow.
  group_question: 'Group question (legacy)',
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

// Convert a UTC ISO string → 'YYYY-MM-DDTHH:MM' in local time (for datetime-local inputs).
function toDatetimeLocal(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Given weekStartsOn ('YYYY-MM-DD', Monday) and day (1=Mon…7=Sun),
// return the UTC ISO string for 8 AM local time on that day.
function defaultScheduledAt(weekStartsOn, day) {
  if (!weekStartsOn || day == null) return null;
  const d = new Date(`${weekStartsOn}T08:00:00`); // 8 AM local on Monday
  d.setDate(d.getDate() + (day - 1));
  return d.toISOString();
}

const inputCss = {
  width: '100%', boxSizing: 'border-box',
  border: `1px solid ${T.line}`, borderRadius: 10, padding: '11px 14px',
  fontSize: 15, fontFamily: 'inherit', background: T.cream, color: T.ink, outline: 'none',
};

function ContentItem({ item, onChange, onRemove, onRegenerate, regenerating, anyBusy }) {
  const canRegen = item.kind === 'daily_verse' && typeof onRegenerate === 'function';
  const regenDisabled = anyBusy || !canRegen;
  return (
    <div style={{
      background: T.white, border: `1px solid ${T.line}`, borderRadius: 14,
      padding: '14px 16px', marginBottom: 10,
      opacity: regenerating ? 0.7 : 1,
      transition: 'opacity 0.15s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{
          fontSize: 10.5, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase',
          background: T.parchment, color: T.goldDark, borderRadius: 999, padding: '3px 9px',
        }}>{KIND_LABEL[item.kind] ?? item.kind}</span>
        {item.day != null && (
          <span style={{ fontSize: 11.5, color: T.inkMuted }}>Day {item.day}</span>
        )}
        {canRegen && (
          <button
            onClick={onRegenerate}
            disabled={regenDisabled}
            title={regenerating
              ? 'Regenerating this question…'
              : anyBusy
                ? 'Another generation is in progress'
                : 'Replace this one with a fresh angle from the sermon'}
            style={{
              marginLeft: 'auto',
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: 'transparent',
              border: `1px solid ${regenDisabled ? T.line : T.goldLight}`,
              borderRadius: 999, padding: '3px 9px',
              fontSize: 11.5, fontWeight: 600,
              color: regenDisabled ? T.inkMuted : T.goldDark,
              cursor: regenDisabled ? 'not-allowed' : 'pointer',
              opacity: regenDisabled ? 0.6 : 1,
            }}
          >
            {regenerating ? '⏳ Regenerating…' : '↺ Regenerate'}
          </button>
        )}
        <button
          onClick={onRemove}
          disabled={regenerating}
          style={{
            marginLeft: canRegen ? 0 : 'auto',
            background: 'none', border: 'none',
            color: T.inkMuted, fontSize: 14, cursor: regenerating ? 'not-allowed' : 'pointer',
          }}
        >×</button>
      </div>
      {item.kind === 'daily_verse' && (
        <>
          <input
            value={item.scripture ?? ''}
            onChange={(e) => onChange({ ...item, scripture: e.target.value })}
            placeholder="Topic heading (e.g. Grace before the apology is finished)"
            style={{ ...inputCss, fontSize: 13, marginBottom: 8 }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 11.5, color: T.inkSoft, whiteSpace: 'nowrap', flexShrink: 0 }}>
              Post at
            </span>
            <input
              type="datetime-local"
              value={toDatetimeLocal(item.scheduled_at)}
              onChange={(e) => onChange({
                ...item,
                scheduled_at: e.target.value ? new Date(e.target.value).toISOString() : null,
              })}
              style={{ ...inputCss, fontSize: 13, flex: 1 }}
            />
          </div>
        </>
      )}
      <textarea
        value={item.body}
        onChange={(e) => onChange({ ...item, body: e.target.value })}
        placeholder={item.kind === 'daily_verse' ? 'Context (2–3 sentences) then a question on a new line…' : undefined}
        rows={item.kind === 'going_deeper' ? 5 : item.kind === 'daily_verse' ? 4 : 3}
        style={{ ...inputCss, fontFamily: T.serif, lineHeight: 1.7, resize: 'vertical' }}
      />
    </div>
  );
}

export default function SermonComposer({ session, churchId, onBack, initialSermonId, onOpenSermon, embedded = false, userPlan = 'free' }) {
  const [sermons, setSermons] = useState([]);
  const [view, setView] = useState('list');  // 'list' | 'edit'
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoOpened, setAutoOpened] = useState(false);

  // Edit state
  const [title, setTitle] = useState('');
  const [scriptureRef, setScriptureRef] = useState('');
  const [summary, setSummary] = useState('');
  const [weekStartsOn, setWeekStartsOn] = useState(todayISO());
  const [content, setContent] = useState([]);
  const [activeTab, setActiveTab] = useState('daily_verse');
  const [existingImageUrls, setExistingImageUrls] = useState([]);
  const imageDrafts = useImageDrafts(4);
  const [generating, setGenerating] = useState(false);
  const [sectionGenerating, setSectionGenerating] = useState(null); // kind string | null
  const [regeneratingIdx, setRegeneratingIdx] = useState(null);   // content array index | null
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null); // sermon id pending delete
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const { showToast, ui: uikitUi } = useUiKit();
  const sermonAi = useSermonAiUsage(session?.user?.id, userPlan);

  // Series state — null means standalone (no series). Loaded once per church.
  const [seriesList, setSeriesList] = useState([]);
  const [seriesId, setSeriesId] = useState(null);
  const [seriesIndex, setSeriesIndex] = useState(null);
  const [showNewSeries, setShowNewSeries] = useState(false);
  const [newSeriesName, setNewSeriesName] = useState('');
  const [newSeriesArc, setNewSeriesArc] = useState('');
  const [creatingSeries, setCreatingSeries] = useState(false);

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
        if (initialSermonId && !autoOpened) {
          const target = (data ?? []).find((s) => s.id === initialSermonId);
          if (target) {
            setAutoOpened(true);
            startEdit(target);
          }
        }
      });
    supabase
      .from('sermon_series')
      .select('id, name, scripture_arc, started_on, ended_on')
      .eq('church_id', churchId)
      .order('started_on', { ascending: false })
      .then(({ data }) => setSeriesList(data ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [churchId, initialSermonId]);

  function startNew() {
    setEditing(null);
    setTitle('');
    setScriptureRef('');
    setSummary('');
    setWeekStartsOn(todayISO());
    setContent([]);
    setExistingImageUrls([]);
    setSeriesId(null);
    setSeriesIndex(null);
    setShowNewSeries(false);
    setNewSeriesName('');
    setNewSeriesArc('');
    imageDrafts.clear();
    setError(null);
    setView('edit');
  }

  async function startEdit(sermon) {
    setEditing(sermon);
    setTitle(sermon.title ?? '');
    setScriptureRef(sermon.scripture_ref ?? '');
    setSummary(sermon.summary ?? '');
    setWeekStartsOn(sermon.week_starts_on ?? todayISO());
    setExistingImageUrls(Array.isArray(sermon.image_urls) ? sermon.image_urls : []);
    setSeriesId(sermon.series_id ?? null);
    setSeriesIndex(sermon.series_index ?? null);
    setShowNewSeries(false);
    setNewSeriesName('');
    setNewSeriesArc('');
    imageDrafts.clear();
    setError(null);
    const { data } = await supabase
      .from('sermon_content')
      .select('*')
      .eq('sermon_id', sermon.id)
      .order('sort_order');
    setContent(data ?? []);
    setView('edit');
  }

  async function handleCreateSeries() {
    const name = newSeriesName.trim();
    if (!name || !session?.user?.id || !churchId) return;
    setCreatingSeries(true);
    setError(null);
    const { data, error: e1 } = await supabase
      .from('sermon_series')
      .insert({
        church_id: churchId,
        pastor_id: session.user.id,
        name,
        scripture_arc: newSeriesArc.trim() || null,
      })
      .select('id, name, scripture_arc, started_on, ended_on')
      .single();
    setCreatingSeries(false);
    if (e1) { setError(e1.message); return; }
    setSeriesList((prev) => [data, ...prev]);
    setSeriesId(data.id);
    setShowNewSeries(false);
    setNewSeriesName('');
    setNewSeriesArc('');
  }

  async function handleGenerate() {
    if (sermonAi.atLimit) return;
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
      setContent(generated.map((c, i) => ({
        ...c,
        _local: true,
        sort_order: i,
        scheduled_at: c.kind === 'daily_verse' && c.day != null
          ? defaultScheduledAt(weekStartsOn, c.day)
          : (c.scheduled_at ?? null),
      })));
      sermonAi.increment();
    } catch (e) {
      setError(e?.message ?? 'Generation failed.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleGenerateSection(kind) {
    if (sermonAi.atLimit) return;
    if (!summary.trim()) { setError('Paste your sermon outline first.'); return; }
    setSectionGenerating(kind);
    setError(null);
    try {
      const r = await authedFetch('/api/sermon/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title, scripture_ref: scriptureRef, summary, targetKind: kind }),
      });
      if (!r.ok) throw new Error(await r.text());
      const { content: generated } = await r.json();
      setContent((prev) => {
        const others = prev.filter((c) => c.kind !== kind);
        const newItems = generated.map((c, i) => ({
          ...c,
          _local: true,
          sort_order: others.length + i,
          scheduled_at: c.kind === 'daily_verse' && c.day != null
            ? defaultScheduledAt(weekStartsOn, c.day)
            : (c.scheduled_at ?? null),
        }));
        return [...others, ...newItems];
      });
      sermonAi.increment();
    } catch (e) {
      setError(e?.message ?? 'Generation failed.');
    } finally {
      setSectionGenerating(null);
    }
  }

  async function handleRegenerateOne(idx) {
    if (sermonAi.atLimit) return;
    if (!summary.trim()) { setError('Paste your sermon outline first.'); return; }
    if (regeneratingIdx != null || generating || sectionGenerating) return;
    const target = content[idx];
    if (!target || target.kind !== 'daily_verse') return;

    setRegeneratingIdx(idx);
    setError(null);
    try {
      const existingItems = content
        .filter((c, i) => i !== idx && c.kind === 'daily_verse')
        .map((c) => ({ day: c.day ?? null, scripture: c.scripture ?? '', body: c.body ?? '' }));

      const r = await authedFetch('/api/sermon/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title, scripture_ref: scriptureRef, summary,
          targetKind: 'daily_verse',
          singleDay: target.day ?? null,
          existingItems,
        }),
      });
      if (!r.ok) throw new Error(await r.text());
      const { content: generated } = await r.json();
      const replacement = Array.isArray(generated) ? generated[0] : null;
      if (!replacement) throw new Error('No replacement returned.');

      setContent((arr) => arr.map((x, i) => i === idx ? {
        ...x,
        kind: 'daily_verse',
        day: target.day ?? replacement.day ?? null,
        scripture: replacement.scripture ?? '',
        body: replacement.body ?? '',
        scheduled_at: x.scheduled_at ?? null,
        _local: true,
      } : x));
      sermonAi.increment();
    } catch (e) {
      setError(e?.message ?? 'Regeneration failed.');
    } finally {
      setRegeneratingIdx(null);
    }
  }

  async function handleDeleteSermon(sermonId) {
    if (!sermonId || deleting) return;
    setDeleting(true);
    // 1. Remove any announcement posts from the feed
    await supabase.from('posts')
      .delete()
      .contains('body_data', { sermon_id: sermonId, is_sermon_announcement: true });
    // 2. sermon_content rows cascade on FK, but delete explicitly to be safe
    await supabase.from('sermon_content').delete().eq('sermon_id', sermonId);
    // 3. Delete the sermon itself
    await supabase.from('sermons').delete().eq('id', sermonId);
    // 4. Remove from local list
    setSermons((prev) => prev.filter((s) => s.id !== sermonId));
    setConfirmDeleteId(null);
    setDeleting(false);
  }

  async function handleSave(publish = true) {
    if (!session?.user?.id) {
      setError('You must be signed in to save.');
      return;
    }
    if (!churchId) {
      setError("Couldn't find your church. Reload the page and try again.");
      return;
    }
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    setSaving(true);
    setError(null);

    let uploadedUrls = [];
    if (imageDrafts.drafts.length > 0) {
      try {
        uploadedUrls = await imageDrafts.uploadAll(session.user.id);
      } catch (e) {
        setError(`Image upload failed: ${e?.message ?? e}`);
        setSaving(false);
        return;
      }
    }
    const allImageUrls = [...existingImageUrls, ...uploadedUrls];

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
          image_urls: allImageUrls,
          series_id: seriesId,
          series_index: seriesId ? (seriesIndex ?? null) : null,
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
          image_urls: allImageUrls,
          series_id: seriesId,
          series_index: seriesId ? (seriesIndex ?? null) : null,
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
        sermon_id:    sermonId,
        kind:         c.kind,
        day:          c.day ?? null,
        body:         c.body,
        scripture:    c.scripture ?? null,
        sort_order:   i,
        scheduled_at: c.kind === 'daily_verse' ? (c.scheduled_at ?? null) : null,
      }));
      const { error: e2 } = await supabase.from('sermon_content').insert(rows);
      if (e2) { setError(e2.message); setSaving(false); return; }
    }

    // Announce this sermon in the church feed so members can discuss it.
    // Stored as kind='text' with body_data.sermon_id + is_sermon_announcement.
    // PostCard detects the flag and renders a "Discuss this sermon →" CTA.
    // We update an existing announcement on edit (so comments/reactions survive)
    // and only delete it if the sermon is unpublished.
    //
    // NOTE: We intentionally avoid .maybeSingle() here — if duplicates already
    // exist (e.g. from earlier test saves) it would throw an error and return
    // null, causing yet another duplicate on every subsequent save. Instead we
    // fetch up to 10, keep the first, and silently delete any extras.
    const { data: existingAnns } = await supabase
      .from('posts')
      .select('id')
      .eq('scope', 'church')
      .eq('scope_id', churchId)
      .contains('body_data', { sermon_id: sermonId, is_sermon_announcement: true })
      .limit(10);

    const existingAnn = existingAnns?.[0] ?? null;

    // Clean up any duplicates that snuck in during testing.
    if (existingAnns && existingAnns.length > 1) {
      const dupeIds = existingAnns.slice(1).map((a) => a.id);
      await supabase.from('posts').delete().in('id', dupeIds);
    }

    if (publish) {
      const announcementBody = summary.trim()
        ? `${title.trim()}\n\n${summary.trim()}`
        : title.trim();
      const announcementData = {
        sermon_id:               sermonId,
        is_sermon_announcement:  true,
        sermon_title:            title.trim(),
        scripture_ref:           scriptureRef.trim() || null,
        ...(allImageUrls.length ? { image_urls: allImageUrls } : {}),
      };

      if (existingAnn) {
        const { error: eAnn } = await supabase
          .from('posts')
          .update({ body: announcementBody, body_data: announcementData })
          .eq('id', existingAnn.id);
        if (eAnn) {
          console.warn('sermon announcement update failed', eAnn.message);
          showToast(`Sermon saved, but the feed post couldn't be updated: ${eAnn.message}`, 'error');
        }
      } else {
        const { error: eAnn } = await supabase.from('posts').insert({
          author_id:    session.user.id,
          scope:        'church',
          scope_id:     churchId,
          kind:         'text',
          body:         announcementBody,
          body_data:    announcementData,
          is_anonymous: false,
        });
        if (eAnn) {
          console.warn('sermon announcement insert failed', eAnn.message);
          showToast(`Sermon saved, but it didn't post to the feed: ${eAnn.message}`, 'error');
        } else {
          showToast('Sermon published — your church can discuss it now.', 'success');
        }
      }
    } else if (existingAnn) {
      // Sermon was unpublished — pull the announcement from the feed.
      await supabase.from('posts').delete().eq('id', existingAnn.id);
      showToast('Sermon unpublished — the feed post is gone.', 'info');
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
      <div style={{ minHeight: embedded ? 'auto' : '100vh', background: T.cream, padding: embedded ? 0 : '32px 20px 80px', overflowY: 'auto' }}>
        {uikitUi}
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <button onClick={() => setView('list')} style={{
            background: 'none', border: 'none', color: T.goldDark, fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 14,
          }}>← Sermons</button>

          {!embedded && (
            <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: T.goldDark, marginBottom: 8 }}>
              This week's content
            </div>
          )}
          <h1 style={{ fontFamily: T.serif, fontSize: embedded ? 24 : 32, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em', lineHeight: 1.1, margin: '0 0 8px' }}>
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

          {/* Series picker — null means standalone. New series can be created
              inline. Series-index is only relevant when a series is chosen. */}
          <label style={{ fontSize: 12, color: T.inkSoft, fontWeight: 500, display: 'block', marginBottom: 6 }}>
            Series <span style={{ color: T.inkMuted, fontWeight: 400 }}>· optional</span>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: seriesId ? '1fr 120px' : '1fr', gap: 14, marginBottom: 14 }}>
            <select
              value={seriesId ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                if (v === '__new__') { setShowNewSeries(true); setSeriesId(null); }
                else { setShowNewSeries(false); setSeriesId(v || null); if (!v) setSeriesIndex(null); }
              }}
              style={{ ...inputCss, appearance: 'auto' }}
            >
              <option value="">Standalone (no series)</option>
              {seriesList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}{s.scripture_arc ? ` — ${s.scripture_arc}` : ''}
                </option>
              ))}
              <option value="__new__">+ New series…</option>
            </select>
            {seriesId && (
              <input
                type="number"
                min="1"
                value={seriesIndex ?? ''}
                onChange={(e) => setSeriesIndex(e.target.value ? Number(e.target.value) : null)}
                placeholder="Week #"
                style={inputCss}
                title="Week number within the series"
              />
            )}
          </div>

          {showNewSeries && (
            <div style={{
              background: T.parchment, border: `1px solid ${T.goldLight}`,
              borderRadius: 12, padding: '12px 14px', marginBottom: 14,
            }}>
              <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 8 }}>
                New series
              </div>
              <input
                value={newSeriesName}
                onChange={(e) => setNewSeriesName(e.target.value)}
                placeholder="Series name (e.g. Walking with Paul)"
                style={{ ...inputCss, marginBottom: 8 }}
              />
              <input
                value={newSeriesArc}
                onChange={(e) => setNewSeriesArc(e.target.value)}
                placeholder="Scripture arc (optional, e.g. Romans 1–8)"
                style={{ ...inputCss, marginBottom: 10 }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleCreateSeries}
                  disabled={creatingSeries || !newSeriesName.trim()}
                  style={{
                    background: T.gold, color: T.cream, border: 'none', borderRadius: 999,
                    padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    opacity: (creatingSeries || !newSeriesName.trim()) ? 0.5 : 1,
                  }}
                >
                  {creatingSeries ? 'Creating…' : 'Create series'}
                </button>
                <button
                  onClick={() => { setShowNewSeries(false); setNewSeriesName(''); setNewSeriesArc(''); }}
                  style={{
                    background: 'transparent', border: `1px solid ${T.line}`, borderRadius: 999,
                    padding: '8px 14px', fontSize: 13, color: T.inkSoft, cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

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

          {/* Image attachments — appear with the announcement post in the
              church feed and at the top of the sermon detail page. */}
          <label style={{ fontSize: 12, color: T.inkSoft, fontWeight: 500, display: 'block', marginBottom: 6 }}>Photos (optional)</label>
          {existingImageUrls.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <PostImageGrid urls={existingImageUrls} />
              <button
                type="button"
                onClick={() => setExistingImageUrls([])}
                style={{
                  marginTop: 6, background: 'none', border: 'none',
                  color: T.inkMuted, fontSize: 12, cursor: 'pointer', padding: 0,
                  textDecoration: 'underline', textDecorationStyle: 'dotted',
                }}
              >Remove existing photos</button>
            </div>
          )}
          <ImageDraftGrid drafts={imageDrafts.drafts} onRemove={imageDrafts.remove} />
          <div style={{ marginTop: 10, marginBottom: 14 }}>
            <ImageAttachButton
              drafts={imageDrafts.drafts}
              max={imageDrafts.max}
              fileInputRef={imageDrafts.fileInputRef}
              onPick={imageDrafts.pick}
            />
          </div>

          <div style={{ marginBottom: 18 }}>
            {sermonAi.atLimit ? (
              /* ── Inline AI upgrade gate ── */
              <div style={{
                background: 'linear-gradient(135deg, rgba(184,115,58,0.08) 0%, rgba(184,115,58,0.04) 100%)',
                border: `1px solid rgba(184,115,58,0.28)`,
                borderRadius: 14, padding: '16px 18px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 14, flexWrap: 'wrap',
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 3 }}>
                    ✦ {sermonAi.isTrial ? `You've used all ${sermonAi.limit} trial AI uses` : `You've used your ${FREE_SERMON_LIMIT} free AI sermons`}
                  </div>
                  <div style={{ fontSize: 12.5, color: T.inkSoft, lineHeight: 1.5 }}>
                    Upgrade to keep generating — your congregation won't notice the difference in prep time, but you will.
                  </div>
                </div>
                <a
                  href={`mailto:hello@kinwove.com?subject=${encodeURIComponent('kinwove — AI Upgrade')}&body=${encodeURIComponent('Hi, I would like to upgrade to unlock unlimited AI sermon generation.')}`}
                  style={{
                    background: `linear-gradient(135deg, ${T.gold} 0%, #c47020 100%)`,
                    color: '#FDF8EE', borderRadius: 999,
                    padding: '9px 18px', fontSize: 13, fontWeight: 600,
                    textDecoration: 'none', flexShrink: 0,
                    boxShadow: '0 3px 12px rgba(184,115,58,0.3)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Unlock AI →
                </a>
              </div>
            ) : (
              <>
                <button
                  onClick={handleGenerate}
                  disabled={generating || !summary.trim()}
                  style={{
                    background: `linear-gradient(135deg, ${T.gold} 0%, #c47020 100%)`,
                    color: T.cream, border: 'none', borderRadius: 999,
                    padding: '11px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    boxShadow: '0 3px 14px rgba(184,115,58,0.35)',
                    opacity: (generating || !summary.trim()) ? 0.5 : 1,
                  }}
                >
                  {generating ? 'Generating week…' : content.length > 0 ? '✦ Regenerate the week' : '✦ Generate the week'}
                </button>
                {!sermonAi.loading && (
                  <SermonAiNudge
                    remaining={sermonAi.remaining}
                    isTrial={sermonAi.isTrial}
                    isFree={sermonAi.isFree}
                  />
                )}
              </>
            )}
          </div>

          {error && (
            <div style={{ color: T.error, fontSize: 13, marginBottom: 14, padding: '10px 14px', background: 'rgba(165,63,43,0.08)', borderRadius: 10 }}>
              {error}
            </div>
          )}

          {/* Tabbed view of generated content. Each kind gets its own focused
              editor list. "Add item" inside a tab creates an item of that kind.
              Each tab also has a "Repopulate" button to regenerate just that section. */}
          {(() => {
            // group_question is no longer generated; legacy rows on older
            // sermons still load and stay editable but get folded into the
            // Daily questions tab so the pastor can clean them up.
            const KINDS = [
              { id: 'daily_verse',    label: 'Daily questions' },
              { id: 'going_deeper',   label: 'Going deeper' },
              { id: 'kid_version',    label: 'For kids' },
            ];
            // Daily questions tab also surfaces legacy group_question rows so
            // they can be edited or removed from the same place.
            const inTab = (kind, tab) =>
              tab === 'daily_verse'
                ? (kind === 'daily_verse' || kind === 'group_question')
                : kind === tab;
            const counts = Object.fromEntries(KINDS.map((k) => [k.id, content.filter((c) => inTab(c.kind, k.id)).length]));
            const filteredIdxs = content
              .map((c, i) => ({ c, i }))
              .filter(({ c }) => inTab(c.kind, activeTab));

            const activeKindMeta = KINDS.find((k) => k.id === activeTab);
            const isSectionBusy  = sectionGenerating === activeTab;
            const anyBusy        = generating || !!sectionGenerating || regeneratingIdx != null;

            function addItemOfKind() {
              setContent((arr) => {
                if (activeTab === 'daily_verse') {
                  // Pick the next unused day number (1–7), wrapping past 7 by
                  // continuing to count up — pastors can run multi-week arcs.
                  const usedDays = new Set(
                    arr.filter((x) => x.kind === 'daily_verse' && x.day != null).map((x) => x.day)
                  );
                  let day = 1;
                  while (usedDays.has(day)) day += 1;
                  // Default schedule: 8 AM local on that day of the configured week.
                  const scheduled_at = day <= 7
                    ? defaultScheduledAt(weekStartsOn, day)
                    : null;
                  return [
                    ...arr,
                    { kind: 'daily_verse', day, body: '', scripture: '', scheduled_at, _local: true },
                  ];
                }
                return [...arr, { kind: activeTab, day: null, body: '', scripture: '', _local: true }];
              });
            }

            // Daily-verse week strip — shows all 7 days at a glance with
            // scripture filled in / empty so the pastor can spot gaps quickly.
            const versesByDay = Object.fromEntries(
              content.filter((c) => c.kind === 'daily_verse').map((c) => [c.day, c])
            );
            const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

            return (
              <>
                {/* ── Tab strip ─────────────────────────────────────────── */}
                <div style={{
                  display: 'flex', gap: 4, marginBottom: 0,
                  borderBottom: `1px solid ${T.line}`,
                  overflowX: 'auto', whiteSpace: 'nowrap',
                }}>
                  {KINDS.map((k) => {
                    const active = activeTab === k.id;
                    return (
                      <button
                        key={k.id}
                        onClick={() => setActiveTab(k.id)}
                        style={{
                          background: 'none', border: 'none',
                          padding: '10px 14px',
                          fontSize: 13.5, fontWeight: active ? 700 : 500,
                          color: active ? T.goldDark : T.inkMuted,
                          cursor: 'pointer',
                          borderBottom: active ? `2px solid ${T.gold}` : '2px solid transparent',
                          marginBottom: -1,
                          display: 'flex', alignItems: 'center', gap: 6,
                          flexShrink: 0,
                        }}
                      >
                        <span>{k.label}</span>
                        <span style={{
                          background: active ? 'rgba(184,115,58,0.15)' : T.parchment,
                          color: active ? T.goldDark : T.inkMuted,
                          borderRadius: 999, padding: '1px 8px',
                          fontSize: 11, fontWeight: 700,
                          minWidth: 18, textAlign: 'center',
                        }}>{counts[k.id]}</span>
                      </button>
                    );
                  })}
                </div>

                {/* ── Per-section repopulate bar ─────────────────────────── */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                  padding: '8px 0 12px',
                }}>
                  <button
                    onClick={() => handleGenerateSection(activeTab)}
                    disabled={anyBusy || !summary.trim() || sermonAi.atLimit}
                    title={sermonAi.atLimit ? 'Upgrade to unlock AI generation' : !summary.trim() ? 'Paste your outline above first' : `Regenerate only the ${activeKindMeta.label.toLowerCase()}`}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      background: 'transparent',
                      border: `1px solid ${anyBusy || !summary.trim() || sermonAi.atLimit ? T.line : T.goldLight}`,
                      borderRadius: 999, padding: '6px 12px',
                      fontSize: 12.5, fontWeight: 600,
                      color: anyBusy || !summary.trim() || sermonAi.atLimit ? T.inkMuted : T.goldDark,
                      cursor: anyBusy || !summary.trim() || sermonAi.atLimit ? 'not-allowed' : 'pointer',
                      opacity: anyBusy || !summary.trim() || sermonAi.atLimit ? 0.55 : 1,
                    }}
                  >
                    {isSectionBusy ? (
                      <>⏳ Regenerating…</>
                    ) : sermonAi.atLimit ? (
                      <>🔒 Repopulate {activeKindMeta.label.toLowerCase()}</>
                    ) : (
                      <>↺ Repopulate {activeKindMeta.label.toLowerCase()}</>
                    )}
                  </button>
                </div>

                {/* ── Daily-verse week overview strip ───────────────────── */}
                {activeTab === 'daily_verse' && (
                  <div style={{ overflowX: 'auto', marginBottom: 14 }}>
                    <div style={{
                      display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                      gap: 6, minWidth: 420,
                    }}>
                      {DAY_LABELS.map((lbl, idx) => {
                        const dayNum = idx + 1;
                        const verse  = versesByDay[dayNum];
                        const schedTime = verse?.scheduled_at
                          ? new Date(verse.scheduled_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
                          : null;
                        return (
                          <div
                            key={dayNum}
                            style={{
                              borderRadius: 8, padding: '7px 6px', textAlign: 'center',
                              background: verse ? T.parchment : T.white,
                              border: `1px solid ${verse ? T.goldLight : T.line}`,
                              minWidth: 0,
                            }}
                          >
                            <div style={{ fontSize: 10, fontWeight: 700, color: T.goldDark, marginBottom: 2 }}>
                              {lbl}
                            </div>
                            <div style={{
                              fontSize: 9, color: verse ? T.inkSoft : T.inkMuted,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {verse?.scripture || (verse ? '✓' : '—')}
                            </div>
                            {schedTime && (
                              <div style={{ fontSize: 8.5, color: T.goldDark, marginTop: 2, fontWeight: 600 }}>
                                {schedTime}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── Content items ──────────────────────────────────────── */}
                {filteredIdxs.length === 0 ? (
                  <div style={{ marginBottom: 12 }}>
                    {activeTab === 'daily_verse' ? (
                      <div style={{
                        background: T.white, border: `1px dashed ${T.line}`, borderRadius: 14,
                        padding: '24px 20px', textAlign: 'center',
                        color: T.inkMuted, lineHeight: 1.6, marginBottom: 10,
                      }}>
                        <div style={{ fontFamily: T.serif, fontStyle: 'italic', marginBottom: 16 }}>
                          {content.length === 0
                            ? 'Paste an outline above and tap Generate the week — or fill in each day yourself.'
                            : 'No daily questions yet — generate or fill in each day yourself.'}
                        </div>
                        <button
                          onClick={() => {
                            setContent((arr) => {
                              const usedDays = new Set(
                                arr.filter((x) => x.kind === 'daily_verse' && x.day != null).map((x) => x.day)
                              );
                              const newItems = [];
                              for (let day = 1; day <= 7; day++) {
                                if (!usedDays.has(day)) {
                                  newItems.push({
                                    kind: 'daily_verse',
                                    day,
                                    body: '',
                                    scripture: '',
                                    scheduled_at: defaultScheduledAt(weekStartsOn, day),
                                    _local: true,
                                  });
                                }
                              }
                              return [...arr, ...newItems];
                            });
                          }}
                          style={{
                            background: T.parchment, border: `1px solid ${T.goldLight}`,
                            borderRadius: 999, padding: '9px 20px',
                            fontSize: 13, fontWeight: 600, color: T.goldDark,
                            cursor: 'pointer',
                          }}
                        >
                          + Set up all 7 days manually
                        </button>
                      </div>
                    ) : (
                      <div style={{
                        background: T.white, border: `1px dashed ${T.line}`, borderRadius: 14,
                        padding: '28px 20px', textAlign: 'center',
                        color: T.inkMuted, fontFamily: T.serif, fontStyle: 'italic', lineHeight: 1.6,
                      }}>
                        {content.length === 0
                          ? 'Paste an outline above and tap Generate the week — or add one manually.'
                          : `No ${activeKindMeta.label.toLowerCase()} yet — hit Repopulate or add one manually.`}
                      </div>
                    )}
                  </div>
                ) : (
                  filteredIdxs.map(({ c, i }) => (
                    <ContentItem
                      key={i}
                      item={c}
                      onChange={(updated) => setContent((arr) => arr.map((x, idx) => idx === i ? updated : x))}
                      onRemove={() => setContent((arr) => arr.filter((_, idx) => idx !== i))}
                      onRegenerate={c.kind === 'daily_verse' ? () => handleRegenerateOne(i) : undefined}
                      regenerating={regeneratingIdx === i}
                      anyBusy={anyBusy || regeneratingIdx != null}
                    />
                  ))
                )}

                <button
                  onClick={addItemOfKind}
                  style={{
                    width: '100%', background: 'transparent',
                    border: `1px dashed ${T.line}`, borderRadius: 12,
                    padding: '11px 16px', fontSize: 13, color: T.inkSoft,
                    cursor: 'pointer', marginBottom: 4,
                  }}
                >
                  {activeTab === 'daily_verse'
                    ? '+ Add a question on the fly'
                    : activeTab === 'going_deeper'
                      ? '+ Add a deeper note'
                      : activeTab === 'kid_version'
                        ? '+ Add a kids item'
                        : '+ Add item'}
                </button>
              </>
            );
          })()}

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
    <div style={{ minHeight: embedded ? 'auto' : '100vh', background: T.cream, padding: embedded ? 0 : '32px 20px 80px', overflowY: 'auto' }}>
      {uikitUi}
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {!embedded && (
          <>
            <button onClick={onBack} style={{
              background: 'none', border: 'none', color: T.goldDark, fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 14,
            }}>← Pastor dashboard</button>

            <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: T.goldDark, marginBottom: 8 }}>
              Sermons
            </div>
            <h1 style={{ fontFamily: T.serif, fontSize: 32, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em', lineHeight: 1.1, margin: '0 0 8px' }}>
              Sunday → the week
            </h1>
            <p style={{ color: T.inkSoft, fontSize: 14.5, lineHeight: 1.65, margin: '0 0 20px' }}>
              Paste a sermon, get a week of daily discussion questions, a deeper track, and a kid-friendly version. Schedule the questions to drop one per day — or trim down to whatever cadence fits.
            </p>
          </>
        )}

        {/* First-time framing — embedded mode hides the standalone-page
            header above, but a brand-new pastor reaching this surface from
            the dashboard's setup checklist still needs to know what it IS.
            We surface a tight pitch only when sermons.length === 0 so it
            disappears once they've shipped their first one. */}
        {embedded && !loading && sermons.length === 0 && (
          <div style={{
            background: T.parchment, border: `1px solid ${T.goldLight}`,
            borderRadius: 14, padding: '16px 18px', marginBottom: 14,
          }}>
            <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 6 }}>
              ✦ Sunday → the week
            </div>
            <div style={{ fontFamily: T.serif, fontSize: 14.5, color: T.ink, lineHeight: 1.6 }}>
              Paste this Sunday's outline. We turn it into 7 daily discussion
              questions (drop one per day), a deeper track, and a kid-friendly
              version — ready in about a minute. Keep them all, trim to 1 or 2
              a week, reschedule, edit, or add a question on the fly.
            </div>
          </div>
        )}

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
            Tap <span style={{ color: T.goldDark, fontStyle: 'normal', fontWeight: 600 }}>+ New sermon</span> above to begin.
          </div>
        ) : (
          <>
            {sermons.map((s) => (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'stretch',
                background: T.white, border: `1px solid ${T.line}`, borderRadius: 14,
                marginBottom: 10, overflow: 'hidden',
              }}>
                <button onClick={() => startEdit(s)} style={{
                  flex: 1, minWidth: 0, textAlign: 'left',
                  background: 'transparent', border: 'none',
                  padding: '14px 16px', cursor: 'pointer',
                }}>
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
                </button>
                {s.is_published && onOpenSermon && (
                  <button
                    onClick={() => onOpenSermon(s.id)}
                    title="Open the live sermon to read replies and comment"
                    style={{
                      flexShrink: 0,
                      background: T.parchment, border: 'none',
                      borderLeft: `1px solid ${T.line}`,
                      padding: '0 16px', cursor: 'pointer',
                      color: T.goldDark, fontSize: 12.5, fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    View live →
                  </button>
                )}
                <button
                  onClick={() => setConfirmDeleteId(s.id)}
                  title="Delete this sermon"
                  style={{
                    flexShrink: 0,
                    background: 'transparent', border: 'none',
                    borderLeft: `1px solid ${T.line}`,
                    padding: '0 14px', cursor: 'pointer',
                    color: T.inkMuted, fontSize: 16,
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  🗑
                </button>
              </div>
            ))}

            {/* ── Delete confirmation dialog ─────────────────────────── */}
            {confirmDeleteId && (
              <div
                onClick={() => !deleting && setConfirmDeleteId(null)}
                style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    background: T.white, borderRadius: 14, padding: '22px 24px',
                    maxWidth: 380, width: '100%', boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
                  }}
                >
                  <div style={{ fontFamily: T.serif, fontSize: 18, fontWeight: 700, color: T.ink, marginBottom: 8 }}>
                    Delete this sermon?
                  </div>
                  <div style={{ fontSize: 13.5, color: T.inkSoft, lineHeight: 1.6, marginBottom: 18 }}>
                    The sermon, all its content, and the feed post will be permanently removed. This can't be undone.
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      disabled={deleting}
                      style={{
                        background: 'transparent', border: `1px solid ${T.line}`, borderRadius: 999,
                        padding: '8px 16px', fontSize: 13, color: T.inkSoft, cursor: 'pointer',
                      }}
                    >Cancel</button>
                    <button
                      onClick={() => handleDeleteSermon(confirmDeleteId)}
                      disabled={deleting}
                      style={{
                        background: T.error ?? '#A53F2B', color: T.cream, border: 'none', borderRadius: 999,
                        padding: '8px 20px', fontSize: 13, fontWeight: 600,
                        cursor: deleting ? 'wait' : 'pointer', opacity: deleting ? 0.7 : 1,
                      }}
                    >{deleting ? 'Deleting…' : 'Delete'}</button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
