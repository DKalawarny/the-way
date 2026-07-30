import { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { T } from './theme.js';
import { supabase } from './supabase.js';
import { useDraft } from './useDraft.js';

const BibleReader = lazy(() => import('./BibleReader.jsx'));

// ── Helpers ───────────────────────────────────────────────────────────────────
function stripHtml(html) {
  return (html || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function makePreview(raw) {
  return stripHtml(raw)
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*-{3,}\s*$/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function toEditorHtml(raw) {
  if (!raw) return '';
  if (/<[a-z]/i.test(raw)) return raw; // already HTML (rich text)
  return raw.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
}

// ── Print a single note in a clean new window ─────────────────────────────────
function printNote(note) {
  const w = window.open('', '_blank', 'width=820,height=700');
  if (!w) return; // popup blocked / native webview — window.open can return null
  const date = new Date(note.updated_at ?? Date.now()).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const bodyHtml = toEditorHtml(note.body);
  const titleHtml = (note.title || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${note.title || 'Note'}</title><style>
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,400&family=Newsreader:ital,opsz,wght@0,6..72,400;1,6..72,400&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Newsreader','Georgia',serif;max-width:680px;margin:48px auto;padding:0 32px;color:#1A1108;line-height:1.7;font-size:17px}
    h1.title{font-family:'Fraunces','Georgia',serif;font-size:28px;font-weight:600;letter-spacing:-0.02em;margin-bottom:6px;line-height:1.2}
    h2{font-family:'Fraunces','Georgia',serif;font-size:20px;font-weight:600;margin:20px 0 6px;line-height:1.3}
    h3{font-family:'Fraunces','Georgia',serif;font-size:16px;font-weight:600;margin:16px 0 4px}
    .meta{color:#9C7B5E;font-size:12px;margin-bottom:32px;letter-spacing:0.02em}
    .body{font-size:16px;line-height:1.75}
    .body ul{padding-left:1.4em;margin:8px 0}.body li{margin-bottom:3px}
    .footer{margin-top:48px;padding-top:14px;border-top:1px solid rgba(26,17,8,0.1);color:#9C7B5E;font-size:11px;display:flex;justify-content:space-between}
    @media print{body{margin:24px auto}@page{margin:1.5cm}}
  </style></head><body>
    ${titleHtml ? `<h1 class="title">${titleHtml}</h1>` : ''}
    <div class="meta">${date}</div>
    <div class="body">${bodyHtml}</div>
    <div class="footer"><span>kinwove · kinwove.com</span><span>Printed ${new Date().toLocaleDateString()}</span></div>
  </body></html>`);
  w.document.close(); w.focus(); setTimeout(() => w.print(), 400);
}

function printAllNotes(notes) {
  const w = window.open('', '_blank', 'width=820,height=700');
  if (!w) return; // popup blocked / native webview — window.open can return null
  const blocks = notes.map(n => {
    const date = new Date(n.updated_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    const bodyHtml = toEditorHtml(n.body);
    const titleHtml = (n.title || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    return `<div class="note">${titleHtml ? `<h2>${titleHtml}</h2>` : ''}<div class="meta">${date}</div><div class="body">${bodyHtml}</div></div>`;
  }).join('');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>All Notes</title><style>
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600&family=Newsreader:opsz,wght@6..72,400&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Newsreader','Georgia',serif;max-width:680px;margin:48px auto;padding:0 32px;color:#1A1108}
    .label{font-family:'Fraunces',serif;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#9C7B5E;margin-bottom:32px}
    .note{margin-bottom:48px;padding-bottom:40px;border-bottom:1px solid rgba(26,17,8,0.1)}
    .note:last-child{border-bottom:none}
    h2{font-family:'Fraunces','Georgia',serif;font-size:21px;font-weight:600;letter-spacing:-0.01em;margin-bottom:4px}
    h3{font-family:'Fraunces','Georgia',serif;font-size:16px;font-weight:600;margin:14px 0 4px}
    .meta{color:#9C7B5E;font-size:11px;margin-bottom:16px}
    .body{font-size:15px;line-height:1.75}
    .body ul{padding-left:1.4em;margin:8px 0}.body li{margin-bottom:3px}
    .footer{margin-top:40px;padding-top:14px;border-top:1px solid rgba(26,17,8,0.1);color:#9C7B5E;font-size:11px;display:flex;justify-content:space-between}
    @media print{body{margin:24px auto}@page{margin:1.5cm}.note{page-break-inside:avoid}}
  </style></head><body>
    <div class="label">Research Notes · kinwove</div>
    ${blocks}
    <div class="footer"><span>kinwove.com</span><span>Printed ${new Date().toLocaleDateString()}</span></div>
  </body></html>`);
  w.document.close(); w.focus(); setTimeout(() => w.print(), 400);
}

// ── Notes section ─────────────────────────────────────────────────────────────
function NotesSection({ session, churchId, refreshKey = 0, onOpenSession }) {
  const userId = session?.user?.id;
  const [notes, setNotes]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formBody, setFormBody]   = useState('');
  const [creating, setCreating]   = useState(false);

  const [editingId, setEditingId]           = useState(null);
  const [editTitle, setEditTitle]           = useState('');
  const [editSeries, setEditSeries]         = useState('');
  const [editInitBody, setEditInitBody]     = useState('');
  const [saveState, setSaveState]           = useState('idle');
  const [confirmDelete, setConfirmDelete]   = useState(null);
  const [isDirty, setIsDirty]              = useState(false);
  const [showDonePrompt, setShowDonePrompt] = useState(false);
  const [formSeries, setFormSeries]         = useState('');
  const [seriesEditId, setSeriesEditId]     = useState(null);
  // Drag-to-reorder within a series group (sermon prep order ≠ creation order)
  const [dragId, setDragId]         = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  function reorderInGroup(groupNotes, fromId, toId) {
    const ids = groupNotes.map(n => n.id);
    const from = ids.indexOf(fromId), to = ids.indexOf(toId);
    if (from === -1 || to === -1 || from === to) return;
    const moved = [...groupNotes];
    const [item] = moved.splice(from, 1);
    moved.splice(to, 0, item);
    // Optimistic local order
    setNotes(prev => {
      const others = prev.filter(n => !ids.includes(n.id));
      const withOrder = moved.map((n, i) => ({ ...n, sort_order: i }));
      return [...others, ...withOrder];
    });
    // Persist — tolerant of the sort_order column not existing yet
    moved.forEach((n, i) => {
      supabase.from('church_notes').update({ sort_order: i }).eq('id', n.id).then(null, () => {});
    });
  }
  const [seriesInput, setSeriesInput]       = useState('');
  const editorRef = useRef(null);

  // Draft safety net for the notes editor — so an interrupted note isn't lost.
  // New-note form is a plain textarea (useDraft); the edit editor is a
  // contentEditable, so it stashes its HTML to a user-scoped key by hand.
  const clearNewNoteDraft = useDraft(`note-new:${churchId ?? ''}`, formBody, setFormBody, userId);
  const editDraftKey = (id) => (userId && id ? `kw:draft:${userId}:note-edit:${id}` : null);

  useEffect(() => {
    if (!churchId) return;
    supabase.from('church_notes')
      .select('*').eq('church_id', churchId).order('updated_at', { ascending: false })
      .then(({ data }) => { setNotes(data ?? []); setLoading(false); }, () => setLoading(false));
  }, [churchId, refreshKey]);

  // Populate contentEditable when entering edit mode
  useEffect(() => {
    if (!editingId || !editorRef.current) return;
    editorRef.current.innerHTML = toEditorHtml(editInitBody);
    setIsDirty(false);
    // Recover an interrupted edit: if we stashed unsaved changes for this note
    // (a reload/nav before Save), restore them over the saved version.
    try {
      const k = editDraftKey(editingId);
      const draft = k && localStorage.getItem(k);
      if (draft && draft !== editorRef.current.innerHTML) {
        editorRef.current.innerHTML = draft;
        setIsDirty(true);
      }
    } catch { /* ignore */ }
    setShowDonePrompt(false);
    editorRef.current.focus();
    // move cursor to end
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(editorRef.current);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }, [editingId]);

  async function createNote() {
    if (!formBody.trim() || !churchId || !userId) return;
    setCreating(true);
    const { data, error } = await supabase.from('church_notes').insert({
      church_id: churchId, author_id: userId,
      title: formTitle.trim(), body: formBody.trim(),
      series: formSeries.trim() || null,
    }).select().single();
    setCreating(false);
    if (error) return;
    setNotes(prev => [data, ...prev]);
    setFormTitle(''); setFormBody(''); clearNewNoteDraft(); setFormSeries(''); setShowForm(false);
  }

  function startEdit(note) {
    setEditInitBody(note.body || '');
    setEditTitle(note.title || '');
    setEditSeries(note.series || '');
    setSaveState('idle');
    setConfirmDelete(null);
    setIsDirty(false);
    setShowDonePrompt(false);
    setEditingId(note.id);
  }

  async function saveEdit(noteId) {
    if (!noteId || !editorRef.current) return;
    setSaveState('saving');
    const html = editorRef.current.innerHTML;
    const updates = { title: editTitle.trim(), body: html, series: editSeries.trim() || null, updated_at: new Date().toISOString() };
    const { error } = await supabase.from('church_notes').update(updates).eq('id', noteId);
    if (error) { setSaveState('error'); return; }
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, ...updates } : n));
    setIsDirty(false);
    try { const k = editDraftKey(noteId); if (k) localStorage.removeItem(k); } catch { /* ignore */ }
    setSaveState('saved');
    setTimeout(() => setSaveState('idle'), 2000);
  }

  async function saveAndClose(noteId) {
    await saveEdit(noteId);
    setEditingId(null);
    setShowDonePrompt(false);
  }

  async function quickSetSeries(noteId) {
    const val = seriesInput.trim() || null;
    setSeriesEditId(null);
    await supabase.from('church_notes').update({ series: val }).eq('id', noteId);
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, series: val } : n));
  }

  async function deleteNote(noteId) {
    await supabase.from('church_notes').delete().eq('id', noteId);
    setNotes(prev => prev.filter(n => n.id !== noteId));
    try { const k = editDraftKey(noteId); if (k) localStorage.removeItem(k); } catch { /* ignore */ }
    setEditingId(null); setConfirmDelete(null);
  }

  function fmt(cmd, value) {
    document.execCommand('styleWithCSS', false, true);
    document.execCommand(cmd, false, value ?? null);
    editorRef.current?.focus();
  }

  const btnBase = { border: 'none', borderRadius: 8, padding: '6px 13px', fontSize: 12, fontWeight: 600, cursor: 'pointer' };

  function TBtn({ label, title, cmd, val, style: s = {} }) {
    return (
      <button
        title={title}
        onMouseDown={e => { e.preventDefault(); fmt(cmd, val); }}
        style={{ background: 'none', border: '1px solid rgba(26,17,8,0.13)', borderRadius: 5, minWidth: 26, height: 24, fontSize: 12, cursor: 'pointer', color: T.ink, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px', ...s }}
      >{label}</button>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '0 14px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 0 10px', flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: T.inkMuted, flex: 1 }}>Notes</span>
        {notes.length > 1 && (
          <button onClick={() => printAllNotes(notes)} title="Print all notes"
            style={{ background: 'none', border: `1px solid rgba(26,17,8,0.14)`, borderRadius: 8, padding: '3px 9px', fontSize: 11, color: T.inkMuted, cursor: 'pointer' }}>
            🖨 All
          </button>
        )}
        <button
          onClick={() => { setShowForm(v => !v); setEditingId(null); }}
          style={{ background: showForm ? T.ink : 'transparent', color: showForm ? T.cream : T.inkMuted, border: `1px solid ${showForm ? T.ink : 'rgba(26,17,8,0.14)'}`, borderRadius: 999, padding: '4px 11px', fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
        >{showForm ? 'Cancel' : 'Notes'}</button>
      </div>

      {/* Quick-create form (plain text — immediately opens rich editor on create) */}
      {showForm && (
        <div style={{ background: 'linear-gradient(160deg,#FFFCF0,#FFF8E4)', border: `1px solid rgba(184,115,58,0.22)`, borderRadius: 12, padding: '12px 14px', marginBottom: 10, boxShadow: '0 2px 8px rgba(184,115,58,0.08)', flexShrink: 0 }}>
          <input
            value={formTitle} onChange={e => setFormTitle(e.target.value)}
            placeholder="Title (optional)"
            style={{ width: '100%', border: 'none', background: 'transparent', fontSize: 14, fontFamily: T.serif, fontWeight: 600, color: T.ink, outline: 'none', marginBottom: 8, boxSizing: 'border-box' }}
          />
          <textarea
            autoFocus value={formBody} onChange={e => setFormBody(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) { e.preventDefault(); createNote(); } }}
            placeholder="Start writing…" rows={4}
            style={{ width: '100%', border: 'none', background: 'transparent', fontSize: 14, fontFamily: T.display, color: T.ink, resize: 'none', outline: 'none', lineHeight: 1.65, boxSizing: 'border-box' }}
          />
          <input
            value={formSeries} onChange={e => setFormSeries(e.target.value)}
            placeholder="Series (optional — e.g. Romans, Christmas 2026)"
            list="series-list"
            style={{ width: '100%', border: 'none', borderTop: '1px solid rgba(26,17,8,0.08)', background: 'transparent', fontSize: 12, color: T.inkSoft, outline: 'none', padding: '7px 0 0', marginTop: 6, boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: 7, marginTop: 8, alignItems: 'center' }}>
            <button onClick={createNote} disabled={creating || !formBody.trim()}
              style={{ ...btnBase, background: T.ink, color: T.cream, opacity: creating || !formBody.trim() ? 0.5 : 1 }}>
              {creating ? 'Creating…' : 'Create note'}
            </button>
            <span style={{ fontSize: 11, color: T.inkMuted }}>⌘↵</span>
          </div>
        </div>
      )}

      {loading && <div style={{ fontSize: 13, color: T.inkMuted, textAlign: 'center', padding: '32px 0', fontStyle: 'italic' }}>Loading…</div>}

      {!loading && notes.length === 0 && !showForm && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: T.inkMuted, padding: '20px 0' }}>
          <div style={{ fontSize: 38, marginBottom: 14, opacity: 0.6 }}>📝</div>
          <div style={{ fontFamily: T.serif, fontSize: 16, fontWeight: 600, color: T.ink, marginBottom: 6 }}>Your sermon notes</div>
          <div style={{ fontSize: 12, lineHeight: 1.7, maxWidth: 200, color: T.inkMuted }}>
            Write here, or save AI responses directly from the research chat.
          </div>
        </div>
      )}

      {notes.length > 0 && (() => {
        // Derive sorted series list + group notes
        const allSeries = [...new Set(notes.map(n => n.series?.trim()).filter(Boolean))].sort();
        const grouped = {};
        notes.forEach(n => {
          const key = n.series?.trim() || '';
          (grouped[key] = grouped[key] ?? []).push(n);
        });
        // Within a group: pastor's drag order first (sort_order), then newest-first
        for (const k of Object.keys(grouped)) {
          grouped[k].sort((a, b) => (a.sort_order ?? 1e9) - (b.sort_order ?? 1e9));
        }
        const keys = [...allSeries, '']; // named series first, unsorted last
        const hasAnySeries = allSeries.length > 0;

        return (
        <>
          <datalist id="series-list">{allSeries.map(s => <option key={s} value={s} />)}</datalist>
          {keys.map(key => {
            const group = grouped[key];
            if (!group?.length) return null;
            return (
              <div key={key || '__unsorted'} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: key ? 18 : 0 }}>
                {(key || hasAnySeries) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: key ? 4 : 0 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: key ? T.gold : T.inkMuted, whiteSpace: 'nowrap' }}>
                      {key || 'Unsorted'}
                    </span>
                    <div style={{ flex: 1, height: 1, background: key ? `rgba(184,115,58,0.25)` : 'rgba(26,17,8,0.08)' }} />
                    {key && onOpenSession && (
                      <button
                        onClick={() => onOpenSession(key)}
                        title="Reopen this research session in the chat"
                        style={{ background: 'none', border: 'none', padding: 0, fontSize: 11, color: T.goldDark, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
                      >
                        Open session →
                      </button>
                    )}
                  </div>
                )}
                {group.map(note => {
            const isEditing = editingId === note.id;
            const dateStr = new Date(note.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            const preview = makePreview(note.body);

            if (isEditing) {
              return (
                <div key={note.id} style={{ background: '#FFFDF5', border: `1.5px solid rgba(184,115,58,0.35)`, borderRadius: 12, padding: '14px 14px 12px', boxShadow: '0 4px 20px rgba(26,17,8,0.10)' }}>
                  {/* Title */}
                  <input
                    value={editTitle} onChange={e => { setEditTitle(e.target.value); setIsDirty(true); setShowDonePrompt(false); }}
                    placeholder="Title…"
                    style={{ width: '100%', border: 'none', background: 'transparent', fontSize: 16, fontFamily: T.serif, fontWeight: 600, color: T.ink, outline: 'none', marginBottom: 6, boxSizing: 'border-box', letterSpacing: '-0.01em' }}
                  />
                  {/* Series */}
                  <input
                    value={editSeries} onChange={e => { setEditSeries(e.target.value); setIsDirty(true); setShowDonePrompt(false); }}
                    placeholder="Series…"
                    list="series-list"
                    style={{ width: '100%', border: 'none', background: 'transparent', fontSize: 12, color: T.inkSoft, outline: 'none', marginBottom: 10, boxSizing: 'border-box' }}
                  />
                  {/* Rich toolbar */}
                  <div style={{ display: 'flex', gap: 3, alignItems: 'center', paddingBottom: 8, borderBottom: '1px solid rgba(26,17,8,0.08)', marginBottom: 10, flexWrap: 'wrap' }}>
                    <TBtn label="B" title="Bold (⌘B)" cmd="bold" style={{ fontWeight: 700 }} />
                    <TBtn label="I" title="Italic (⌘I)" cmd="italic" style={{ fontStyle: 'italic' }} />
                    <TBtn label="U" title="Underline (⌘U)" cmd="underline" style={{ textDecoration: 'underline' }} />
                    <div style={{ width: 1, height: 16, background: 'rgba(26,17,8,0.15)', margin: '0 2px' }} />
                    <TBtn label="H2" title="Heading" cmd="formatBlock" val="h2" />
                    <TBtn label="¶" title="Normal paragraph" cmd="formatBlock" val="p" />
                    <div style={{ width: 1, height: 16, background: 'rgba(26,17,8,0.15)', margin: '0 2px' }} />
                    <TBtn label="•" title="Bullet list" cmd="insertUnorderedList" />
                    <div style={{ width: 1, height: 16, background: 'rgba(26,17,8,0.15)', margin: '0 2px' }} />
                    {/* Highlight swatches — same palette as Bible verse highlights */}
                    {[
                      ['Gold highlight', 'rgba(212,162,74,0.40)'],
                      ['Rose highlight', 'rgba(196,86,86,0.32)'],
                      ['Sage highlight', 'rgba(107,153,92,0.32)'],
                      ['Sky highlight',  'rgba(92,133,168,0.32)'],
                    ].map(([t, c]) => (
                      <button key={t} title={t}
                        onMouseDown={e => { e.preventDefault(); fmt('hiliteColor', c); }}
                        style={{ width: 20, height: 20, borderRadius: '50%', border: '1px solid rgba(26,17,8,0.18)', background: c, cursor: 'pointer', padding: 0, flexShrink: 0 }}
                      />
                    ))}
                    <button title="Remove highlight"
                      onMouseDown={e => { e.preventDefault(); fmt('hiliteColor', 'transparent'); }}
                      style={{ width: 20, height: 20, borderRadius: '50%', border: '1px solid rgba(26,17,8,0.22)', background: 'linear-gradient(135deg, transparent 44%, rgba(165,63,43,0.85) 46%, rgba(165,63,43,0.85) 54%, transparent 56%)', cursor: 'pointer', padding: 0, flexShrink: 0 }}
                    />
                  </div>
                  {/* contentEditable body */}
                  <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={() => {
                      setIsDirty(true); setShowDonePrompt(false);
                      try {
                        const k = editDraftKey(note.id);
                        if (k) localStorage.setItem(k, editorRef.current.innerHTML);
                      } catch { /* ignore */ }
                    }}
                    onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) { e.preventDefault(); saveEdit(note.id); } }}
                    style={{ width: '100%', minHeight: 180, fontSize: 14, fontFamily: T.display, color: T.ink, outline: 'none', lineHeight: 1.75, boxSizing: 'border-box' }}
                  />
                  {/* Action bar */}
                  <div style={{ display: showDonePrompt ? 'none' : 'flex', alignItems: 'center', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
                    <button onClick={() => saveEdit(note.id)} disabled={saveState === 'saving'}
                      style={{ ...btnBase, background: T.ink, color: T.cream, opacity: saveState === 'saving' ? 0.7 : 1 }}>
                      {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? '✓ Saved' : 'Save'}
                    </button>
                    <button
                      onClick={() => printNote({ ...note, title: editTitle, body: editorRef.current?.innerHTML ?? note.body })}
                      style={{ ...btnBase, background: 'transparent', color: T.inkMuted, border: `1px solid rgba(26,17,8,0.14)` }}>
                      🖨 Print
                    </button>
                    <button onClick={() => { if (isDirty) setShowDonePrompt(true); else setEditingId(null); }}
                      style={{ ...btnBase, background: 'transparent', color: T.inkMuted, border: `1px solid rgba(26,17,8,0.14)` }}>
                      Done
                    </button>
                    <div style={{ flex: 1 }} />
                    {confirmDelete === note.id ? (
                      <>
                        <button onClick={() => deleteNote(note.id)}
                          style={{ ...btnBase, background: 'transparent', color: '#A53F2B', border: '1px solid #A53F2B', fontSize: 11 }}>Delete</button>
                        <button onClick={() => setConfirmDelete(null)}
                          style={{ ...btnBase, background: 'transparent', color: T.inkMuted, border: `1px solid rgba(26,17,8,0.14)`, fontSize: 11 }}>Keep</button>
                      </>
                    ) : (
                      <button onClick={() => setConfirmDelete(note.id)}
                        style={{ background: 'none', border: 'none', color: T.inkMuted, fontSize: 11, cursor: 'pointer', opacity: 0.55 }}>
                        Delete
                      </button>
                    )}
                  </div>
                  {saveState === 'error' && <div style={{ fontSize: 11, color: '#A53F2B', marginTop: 6 }}>Could not save — check your connection.</div>}
                  {/* Unsaved-changes prompt */}
                  {showDonePrompt && (
                    <div style={{ background: 'rgba(184,115,58,0.08)', border: '1px solid rgba(184,115,58,0.25)', borderRadius: 10, padding: '10px 12px', marginTop: 10 }}>
                      <div style={{ fontSize: 13, fontFamily: T.serif, fontWeight: 600, color: T.ink, marginBottom: 8 }}>You have unsaved changes</div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => saveAndClose(note.id)}
                          style={{ ...btnBase, background: T.ink, color: T.cream }}>Save</button>
                        <button onClick={() => {
                            setEditTitle(note.title || '');
                            setEditSeries(note.series || '');
                            if (editorRef.current) editorRef.current.innerHTML = toEditorHtml(editInitBody);
                            setIsDirty(false);
                            setShowDonePrompt(false);
                          }}
                          style={{ ...btnBase, background: 'transparent', color: '#A53F2B', border: '1px solid rgba(165,63,43,0.4)', fontWeight: 500 }}>Discard changes</button>
                        <button onClick={() => setShowDonePrompt(false)}
                          style={{ ...btnBase, background: 'transparent', color: T.inkMuted, border: `1px solid rgba(26,17,8,0.14)`, fontWeight: 500 }}>Keep editing</button>
                      </div>
                    </div>
                  )}
                  {!showDonePrompt && <div style={{ fontSize: 11, color: T.inkMuted, marginTop: 8, opacity: 0.55 }}>⌘↵ to save</div>}
                </div>
              );
            }

            // ── View mode ──
            return (
              <div
                key={note.id}
                draggable
                onDragStart={(e) => { setDragId(note.id); e.dataTransfer.effectAllowed = 'move'; }}
                onDragOver={(e) => { e.preventDefault(); if (dragId && dragId !== note.id) setDragOverId(note.id); }}
                onDragLeave={() => setDragOverId((cur) => (cur === note.id ? null : cur))}
                onDrop={(e) => { e.preventDefault(); if (dragId && dragId !== note.id) reorderInGroup(group, dragId, note.id); setDragId(null); setDragOverId(null); }}
                onDragEnd={() => { setDragId(null); setDragOverId(null); }}
                style={{
                  background: 'linear-gradient(160deg,#FFFCF2 0%,#FFF8E8 100%)',
                  border: dragOverId === note.id ? '1px dashed rgba(184,115,58,0.7)' : `1px solid rgba(184,115,58,0.15)`,
                  borderRadius: 10, padding: '10px 13px', boxShadow: '0 1px 4px rgba(26,17,8,0.04)',
                  opacity: dragId === note.id ? 0.45 : 1,
                  cursor: 'grab',
                  transition: 'border-color 0.12s, opacity 0.12s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                  <span style={{ fontFamily: T.serif, fontSize: 13, fontWeight: 600, color: T.ink, lineHeight: 1.35, flex: 1 }}>
                    {note.title || preview.slice(0, 55) + (preview.length > 55 ? '…' : '')}
                  </span>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'center' }}>
                    <span title="Drag to reorder" aria-hidden="true" style={{ color: T.inkMuted, opacity: 0.4, fontSize: 11, letterSpacing: 1, cursor: 'grab', userSelect: 'none' }}>⋮⋮</span>
                    <button onClick={e => { e.stopPropagation(); printNote(note); }}
                      title="Print" style={{ background: 'none', border: 'none', fontSize: 12, cursor: 'pointer', color: T.inkMuted, opacity: 0.6, padding: '0 2px', lineHeight: 1 }}>🖨</button>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 4, lineHeight: 1.4 }}>
                  {preview.slice(0, 90)}{preview.length > 90 ? '…' : ''}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: T.inkMuted, opacity: 0.65 }}>
                    {dateStr}
                    {note.source && (
                      <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, letterSpacing: 0.7, textTransform: 'uppercase', color: note.source === 'bible' ? '#8E5528' : '#3a6b8a', background: note.source === 'bible' ? 'rgba(142,85,40,0.10)' : 'rgba(58,107,138,0.10)', borderRadius: 4, padding: '1px 6px', verticalAlign: 'middle' }}>
                        {note.source === 'bible' ? 'Bible' : note.source === 'research' ? 'Research' : 'Ask'}
                      </span>
                    )}
                  </span>
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                    <button onClick={() => startEdit(note)}
                      style={{ background: 'none', border: `1px solid rgba(26,17,8,0.14)`, borderRadius: 8, padding: '3px 10px', fontSize: 11, color: T.inkSoft, cursor: 'pointer', fontWeight: 500 }}>
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            );
                })}
              </div>
            );
          })}
        </>
        );
      })()}
    </div>
  );
}

// ── DeskPanel ─────────────────────────────────────────────────────────────────
// BibleReader's formula: height = calc(100vh - (62 + topOffset)).
// The home view uses minHeight:100vh and ignores topOffset — we wrap it in a
// scrollable div so BibleReader can expand freely while DeskPanel clips it.
// For the reading view, topOffset=126 makes height = calc(100vh-188px) which
// matches DeskPanel content area: calc(100vh-130px) minus ~58px tab bar.
const BIBLE_TOP_OFFSET = 126;

export default function DeskPanel({ session, profile, churchId, onClose, isMobile, initialTab, width = 480, refreshKey = 0, onOpenSession }) {
  const [activeTab, setActiveTab] = useState(initialTab ?? 'bible');

  // Plan-enriched profile for BibleReader
  const bibleProfile = profile ? { ...profile } : profile;

  return (
    <div style={{
      width: isMobile ? '100%' : width,
      flexShrink: 0,
      height: '100%',
      background: `linear-gradient(180deg, #FAF6EA 0%, ${T.parchment} 100%)`,
      borderLeft: isMobile ? 'none' : `1px solid rgba(184,115,58,0.20)`,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      borderRadius: isMobile ? '20px 20px 0 0' : 0,
      position: 'relative',
    }}>
      {/* Locked tab bar — sticky so it never scrolls away */}
      <div style={{ flexShrink: 0, position: 'sticky', top: 0, zIndex: 10, background: '#FAF6EA' }}>
        {isMobile && (
          <div style={{ width: 36, height: 4, background: 'rgba(26,17,8,0.14)', borderRadius: 99, margin: '8px auto 0' }} />
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '10px 16px 0' : '12px 16px 0' }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {[{ id: 'bible', emoji: '📖' }, { id: 'notes', emoji: '📝' }].map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                title={t.id === 'bible' ? 'Bible' : 'Notes'}
                style={{
                  background: activeTab === t.id ? T.ink : 'transparent',
                  color: activeTab === t.id ? T.cream : T.inkMuted,
                  border: `1px solid ${activeTab === t.id ? T.ink : 'rgba(26,17,8,0.14)'}`,
                  borderRadius: 999, width: 36, height: 32,
                  fontSize: 15, cursor: 'pointer',
                  transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >{t.emoji}</button>
            ))}
          </div>
          {onClose && (
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: T.inkMuted, cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}>×</button>
          )}
        </div>
        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(184,115,58,0.30), transparent)', margin: '10px 0 0' }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {activeTab === 'bible' && (
          <Suspense fallback={
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.inkMuted, fontSize: 13, fontStyle: 'italic' }}>
              Loading Bible…
            </div>
          }>
            {/* Scrollable wrapper: BibleReader home view uses minHeight:100vh so it
                needs a scroll container here instead of clipping the page. Reading
                view sets its own fixed height so the wrapper stays put. */}
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
              <BibleReader
                session={session}
                profile={bibleProfile}
                topOffset={BIBLE_TOP_OFFSET}
                churchNoteContext={churchId}
              />
            </div>
          </Suspense>
        )}
        {activeTab === 'notes' && <NotesSection session={session} churchId={churchId} refreshKey={refreshKey} onOpenSession={onOpenSession} />}
      </div>
    </div>
  );
}
