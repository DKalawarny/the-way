import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, BookOpen, Search, X } from 'lucide-react';
import { T } from './theme.js';
import { supabase } from './supabase.js';

const BOOK_ORDER = [
  'Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth',
  '1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra',
  'Nehemiah','Esther','Job','Psalms','Proverbs','Ecclesiastes','Song of Solomon',
  'Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos',
  'Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah',
  'Malachi','Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians',
  '2 Corinthians','Galatians','Ephesians','Philippians','Colossians','1 Thessalonians',
  '2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon','Hebrews','James',
  '1 Peter','2 Peter','1 John','2 John','3 John','Jude','Revelation',
];

function bookRank(name) {
  const i = BOOK_ORDER.indexOf(name);
  return i === -1 ? 999 : i;
}

function relDate(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  const weeks = Math.floor(days / 7);
  if (mins  <  2) return 'Just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  <  2) return 'Yesterday';
  if (days  <  7) return `${days} days ago`;
  if (weeks <  5) return `${weeks}w ago`;
  const d = new Date(iso);
  return `${d.toLocaleString('default', { month: 'short' })} ${d.getDate()}, ${d.getFullYear()}`;
}

function cleanVerse(text) {
  return text?.replace(/^["""]+|["""]+$/g, '').trim() ?? '';
}

function sourceLabel(source) {
  if (source === 'ask') return 'Ask';
  if (source === 'bible') return 'Bible chat';
  if (source === 'verse') return 'Verse';
  return 'Note';
}

// ── Note highlighting ─────────────────────────────────────────────────────────
// Select any passage of a note → a Highlight chip appears → the selection is
// wrapped in ==markers== stored in the note text itself. Markers show as plain
// == while editing and render as a gold tint in view mode.
const HL_TINT = 'rgba(212,162,74,0.38)';

function renderHighlighted(text) {
  const s = String(text ?? '');
  if (!s.includes('==')) return s;
  const parts = s.split(/==([^=]+)==/g);
  if (parts.length === 1) return s;
  return parts.map((p, i) => (i % 2
    ? <span key={i} style={{ background: HL_TINT, borderRadius: 3, padding: '0 1px' }}>{p}</span>
    : p));
}

function stripHl(text) { return String(text ?? '').replace(/==([^=]+)==/g, '$1'); }

// Parse raw text into { stripped, ranges } where ranges are highlight spans
// over the stripped (marker-free) text.
function hlRanges(raw) {
  const ranges = [];
  const s = String(raw ?? '');
  const re = /==([^=]+)==/g;
  let stripped = '', m, last = 0;
  while ((m = re.exec(s))) {
    stripped += s.slice(last, m.index);
    ranges.push([stripped.length, stripped.length + m[1].length]);
    stripped += m[1];
    last = m.index + m[0].length;
  }
  stripped += s.slice(last);
  return { stripped, ranges };
}

// Toggle a highlight over [start,end) of the stripped text → new raw text.
// A selection fully inside an existing highlight removes (splits) it; anything
// else becomes highlighted, merging any overlaps.
function toggleHl(raw, start, end) {
  const { stripped, ranges } = hlRanges(raw);
  const covered = ranges.some(([a, b]) => a <= start && end <= b);
  let next = [];
  if (covered) {
    for (const [a, b] of ranges) {
      if (a <= start && end <= b) {
        if (a < start) next.push([a, start]);
        if (end < b)   next.push([end, b]);
      } else next.push([a, b]);
    }
  } else {
    next = [...ranges, [start, end]].sort((x, y) => x[0] - y[0]);
    const merged = [];
    for (const r of next) {
      const prev = merged[merged.length - 1];
      if (prev && r[0] <= prev[1]) prev[1] = Math.max(prev[1], r[1]);
      else merged.push([...r]);
    }
    next = merged;
  }
  let out = '', pos = 0;
  for (const [a, b] of next) {
    if (b <= a) continue;
    out += stripped.slice(pos, a) + '==' + stripped.slice(a, b) + '==';
    pos = b;
  }
  return out + stripped.slice(pos);
}

// Current selection inside this rendered container, in stripped-text offsets.
function selectionIn(el) {
  const sel = window.getSelection();
  if (!el || !sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
  const range = sel.getRangeAt(0);
  if (!el.contains(range.startContainer) || !el.contains(range.endContainer)) return null;
  const pre = range.cloneRange();
  pre.selectNodeContents(el);
  pre.setEnd(range.startContainer, range.startOffset);
  const start = pre.toString().length;
  const len = range.toString().length;
  if (!len) return null;
  return { start, end: start + len, rect: range.getBoundingClientRect() };
}

// Note body that renders highlights and offers a chip while text is selected.
function HighlightableBody({ text, onChange, style }) {
  const ref = useRef(null);
  const [chip, setChip] = useState(null);

  function showChip() {
    setTimeout(() => {
      const info = selectionIn(ref.current);
      if (!info || !ref.current) { setChip(null); return; }
      const { ranges } = hlRanges(text);
      const covered = ranges.some(([a, b]) => a <= info.start && info.end <= b);
      const host = ref.current.getBoundingClientRect();
      setChip({
        start: info.start, end: info.end, covered,
        x: Math.min(Math.max(info.rect.left - host.left + info.rect.width / 2, 56), Math.max(host.width - 56, 56)),
        y: info.rect.top - host.top,
      });
    }, 0);
  }

  return (
    <div style={{ position: 'relative' }}>
      <div ref={ref} onMouseUp={showChip} onTouchEnd={showChip} style={style}>
        {renderHighlighted(text)}
      </div>
      {chip && (
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.stopPropagation();
            onChange(toggleHl(text, chip.start, chip.end));
            setChip(null);
            try { window.getSelection()?.removeAllRanges(); } catch { /* ignore */ }
          }}
          style={{
            position: 'absolute', top: chip.y - 36, left: chip.x, transform: 'translateX(-50%)',
            background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
            padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 2px 10px rgba(26,17,8,0.25)', zIndex: 5, whiteSpace: 'nowrap',
          }}
        >
          {chip.covered ? 'Remove highlight' : '🖍 Highlight'}
        </button>
      )}
    </div>
  );
}

function UserNoteCard({ note, onDelete, onSave, onContinueChat }) {
  const [expanded,  setExpanded]  = useState(false);
  const [editing,   setEditing]   = useState(false);
  const [draftBody, setDraftBody] = useState(note.body ?? '');
  const [draftTitle, setDraftTitle] = useState(note.title ?? '');
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState(false);
  const taRef = useRef(null);

  useEffect(() => {
    if (editing && taRef.current) taRef.current.focus();
  }, [editing]);

  async function saveEdit() {
    const body = draftBody.trim();
    const title = draftTitle.trim() || body.slice(0, 60);
    if (body === note.body && title === note.title) { setEditing(false); return; }
    setSaving(true);
    if (!body) {
      await supabase.from('user_notes').delete().eq('id', note.id);
      onDelete(note.id);
    } else {
      await supabase.from('user_notes').update({ body, title, updated_at: new Date().toISOString() }).eq('id', note.id);
      onSave(note.id, body, title);
    }
    setSaving(false);
    setEditing(false);
  }

  async function handleDelete(e) {
    e.stopPropagation();
    setDeleting(true);
    await supabase.from('user_notes').delete().eq('id', note.id);
    onDelete(note.id);
  }

  const isAiSave = note.source === 'ask' || note.source === 'bible';

  return (
    <div style={{
      background: T.white, border: `1px solid ${T.line}`,
      borderRadius: 14, overflow: 'hidden',
    }}>
      <div style={{ padding: '14px 16px 12px' }}>
        {/* Source label + date */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 8,
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: T.goldDark }}>
              {sourceLabel(note.source)}
            </span>
            <span style={{ fontSize: 11, color: T.inkMuted }}>
              {relDate(note.created_at)}
            </span>
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            {!isAiSave && !editing && (
              <button
                onClick={() => setEditing(true)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.inkMuted, fontSize: 12, padding: '2px 6px' }}
              >
                Edit
              </button>
            )}
            <button onClick={handleDelete} disabled={deleting} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: T.inkMuted, padding: 4, opacity: deleting ? 0.4 : 0.6, fontSize: 16, lineHeight: 1,
            }}>✕</button>
          </div>
        </div>

        {editing ? (
          <>
            <input
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              placeholder="Title (optional)"
              style={{
                width: '100%', boxSizing: 'border-box',
                border: `1px solid ${T.line}`, borderRadius: 8,
                padding: '6px 10px', fontSize: 13, fontFamily: T.serif,
                color: T.ink, outline: 'none', marginBottom: 8,
                background: T.parchment,
              }}
            />
            <textarea
              ref={taRef}
              value={draftBody}
              onChange={(e) => setDraftBody(e.target.value)}
              rows={5}
              style={{
                width: '100%', boxSizing: 'border-box', resize: 'vertical',
                border: `1px solid ${T.line}`, borderRadius: 8,
                padding: '8px 10px', fontSize: 14, fontFamily: T.serif,
                color: T.ink, lineHeight: 1.6, outline: 'none',
                background: T.parchment,
              }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={saveEdit} disabled={saving} style={{
                background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
                padding: '6px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              }}>{saving ? 'Saving…' : 'Save'}</button>
              <button onClick={() => { setEditing(false); setDraftBody(note.body ?? ''); setDraftTitle(note.title ?? ''); }} style={{
                background: 'transparent', color: T.inkMuted, border: `1px solid ${T.line}`,
                borderRadius: 999, padding: '6px 14px', fontSize: 13, cursor: 'pointer',
              }}>Cancel</button>
            </div>
          </>
        ) : (
          <div onClick={() => { if (!editing && window.getSelection()?.isCollapsed !== false) setExpanded((v) => !v); }} style={{ cursor: 'pointer' }}>
            {note.title && (
              <div style={{ fontFamily: T.serif, fontSize: 14, fontWeight: 600, color: T.ink, marginBottom: 6 }}>
                {note.title}
              </div>
            )}
            <HighlightableBody
              text={note.body}
              onChange={async (newBody) => {
                await supabase.from('user_notes').update({ body: newBody, updated_at: new Date().toISOString() }).eq('id', note.id);
                setDraftBody(newBody);
                onSave(note.id, newBody, note.title ?? '');
              }}
              style={{
                fontFamily: T.display, fontSize: 14, color: T.inkSoft,
                lineHeight: 1.6, whiteSpace: 'pre-wrap',
                ...(expanded ? {} : { display: '-webkit-box', WebkitLineClamp: 6, WebkitBoxOrient: 'vertical', overflow: 'hidden' }),
              }}
            />
            {!expanded && note.body?.length > 300 && (
              <div style={{ fontSize: 12, color: T.gold, marginTop: 4 }}>Tap to read more</div>
            )}
            {isAiSave && expanded && onContinueChat && (
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${T.line}` }}>
                <button
                  onClick={(e) => { e.stopPropagation(); onContinueChat(stripHl(note.body)); }}
                  style={{
                    background: T.ink, color: T.cream, border: 'none',
                    borderRadius: 999, padding: '7px 16px', fontSize: 13,
                    fontWeight: 500, cursor: 'pointer',
                  }}
                >
                  Continue chat →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function NoteCard({ note, onOpenBible, onAskVerse, onSave, onDelete }) {
  const [expanded,  setExpanded]  = useState(false);
  const [editing,   setEditing]   = useState(false);
  const [draftText, setDraftText] = useState(note.note_text);
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState(false);
  const taRef = useRef(null);

  useEffect(() => {
    if (editing && taRef.current) taRef.current.focus();
  }, [editing]);

  async function saveEdit() {
    const trimmed = draftText.trim();
    if (trimmed === note.note_text) { setEditing(false); return; }
    setSaving(true);
    if (!trimmed) {
      await supabase.from('bible_notes').delete().eq('id', note.id);
      onDelete(note.id);
    } else {
      await supabase.from('bible_notes').update({ note_text: trimmed, updated_at: new Date().toISOString() }).eq('id', note.id);
      onSave(note.id, trimmed);
    }
    setSaving(false);
    setEditing(false);
  }

  async function handleDelete(e) {
    e.stopPropagation();
    setDeleting(true);
    await supabase.from('bible_notes').delete().eq('id', note.id);
    onDelete(note.id);
  }

  const verseClean = cleanVerse(note.verse_text);

  return (
    <div style={{
      background: T.white, border: `1px solid ${T.line}`,
      borderRadius: 14, overflow: 'hidden',
    }}>
      {/* Verse ref + date */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 0' }}>
        <button
          onClick={() => onOpenBible?.({ book: note.book_id, chapter: note.chapter, verse: note.verse })}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontFamily: T.display, fontSize: 11, fontWeight: 700,
            color: T.gold, letterSpacing: 1, textTransform: 'uppercase',
          }}
        >
          {note.book_name} {note.chapter}:{note.verse}
          <span style={{ fontSize: 10, color: T.inkMuted, fontWeight: 400, letterSpacing: 0 }}>↗</span>
        </button>
        <span style={{ fontSize: 11, color: T.inkMuted, flexShrink: 0 }}>
          {relDate(note.updated_at ?? note.created_at)}
        </span>
      </div>

      {/* Verse text — truncated unless expanded */}
      {verseClean && (
        <div
          onClick={() => setExpanded((v) => !v)}
          style={{
            padding: '6px 16px 0',
            fontFamily: T.display, fontSize: 13,
            fontStyle: 'italic', color: T.inkSoft, lineHeight: 1.55,
            cursor: 'pointer',
            display: expanded ? 'block' : '-webkit-box',
            WebkitLineClamp: expanded ? undefined : 2,
            WebkitBoxOrient: 'vertical',
            overflow: expanded ? 'visible' : 'hidden',
          }}
        >
          "{verseClean}"
        </div>
      )}

      {/* Note body */}
      <div style={{ padding: '10px 16px 14px' }}>
        {editing ? (
          <>
            <textarea
              ref={taRef}
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              rows={4}
              style={{
                width: '100%', boxSizing: 'border-box', resize: 'vertical',
                border: `1px solid ${T.line}`, borderRadius: 8,
                padding: '8px 10px', fontSize: 14, fontFamily: T.serif,
                color: T.ink, lineHeight: 1.6, outline: 'none',
                background: T.parchment,
              }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={saveEdit} disabled={saving} style={{
                background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
                padding: '6px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              }}>{saving ? 'Saving…' : 'Save'}</button>
              <button onClick={() => { setEditing(false); setDraftText(note.note_text); }} style={{
                background: 'transparent', color: T.inkMuted, border: `1px solid ${T.line}`,
                borderRadius: 999, padding: '6px 14px', fontSize: 13, cursor: 'pointer',
              }}>Cancel</button>
            </div>
          </>
        ) : (
          <div onClick={() => { if (window.getSelection()?.isCollapsed !== false) setExpanded((v) => !v); }} style={{ cursor: 'pointer' }}>
            <HighlightableBody
              text={note.note_text}
              onChange={async (newText) => {
                await supabase.from('bible_notes').update({ note_text: newText, updated_at: new Date().toISOString() }).eq('id', note.id);
                setDraftText(newText);
                onSave(note.id, newText);
              }}
              style={{
                fontFamily: T.serif, fontSize: 14, color: T.ink, lineHeight: 1.65,
                whiteSpace: 'pre-wrap',
                ...(expanded ? {} : { display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden' }),
              }}
            />
          </div>
        )}

        {/* Action row */}
        {!editing && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 10, flexWrap: 'wrap' }}>
            <button onClick={() => setEditing(true)} style={{
              background: 'none', border: 'none', cursor: 'pointer', color: T.inkMuted, fontSize: 12, padding: 0,
            }}>Edit</button>
            {onAskVerse && (
              <>
                <span style={{ fontSize: 11, color: T.line }}>·</span>
                <button
                  onClick={() => onAskVerse(note)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.goldDark, fontSize: 12, padding: 0, fontWeight: 500 }}
                >
                  Ask about this
                </button>
              </>
            )}
            <div style={{ flex: 1 }} />
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: T.inkMuted, padding: 4, opacity: deleting ? 0.4 : 0.6,
                fontSize: 16, lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Read-only card for church Study-tab notes: they belong to the church's prep
// space, but the author sees them here so all their study lands in one place.
function PrepNoteCard({ note }) {
  const [expanded, setExpanded] = useState(false);
  const body = note.body ?? '';
  const clamped = !expanded && body.length > 280;
  return (
    <div
      onClick={() => setExpanded((v) => !v)}
      style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 14, padding: '14px 16px', cursor: body.length > 280 ? 'pointer' : 'default' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
        <div style={{ fontFamily: T.serif, fontSize: 14.5, fontWeight: 700, color: T.ink, flex: 1, minWidth: 160 }}>{note.title || 'Untitled'}</div>
        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: T.goldDark, background: 'rgba(184,115,58,0.1)', border: '1px solid rgba(184,115,58,0.22)', borderRadius: 999, padding: '2px 9px', flexShrink: 0 }}>
          Study tab{note.series ? ` · ${note.series}` : ''}
        </span>
      </div>
      <div style={{ fontFamily: T.serif, fontSize: 14, color: T.inkSoft, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
        {clamped ? `${body.slice(0, 280)}…` : body}
      </div>
      {clamped && <div style={{ fontSize: 12, color: T.goldDark, marginTop: 6 }}>Show more</div>}
      <div style={{ fontSize: 11, color: T.inkMuted, marginTop: 8 }}>
        {note.created_at ? new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''} · edit in your church Study tab
      </div>
    </div>
  );
}

export default function Journal({ session, onClose, onOpenBible, onAskVerse, onContinueChat }) {
  const [verseNotes, setVerseNotes] = useState([]);
  const [userNotes,  setUserNotes]  = useState([]);
  const [prepNotes,  setPrepNotes]  = useState([]); // church Study-tab notes I authored
  const [loading,    setLoading]    = useState(true);
  const [query,      setQuery]      = useState('');
  const [newOpen,    setNewOpen]    = useState(false);
  const [newBody,    setNewBody]    = useState('');
  const [newTitle,   setNewTitle]   = useState('');
  const [newSaving,  setNewSaving]  = useState(false);
  const newTaRef = useRef(null);

  useEffect(() => {
    if (!session?.user?.id) return;
    const uid = session.user.id;
    Promise.all([
      supabase.from('bible_notes').select('*').eq('user_id', uid),
      supabase.from('user_notes').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      // Sermon-prep notes saved in the church Study tab stay church-scoped in
      // storage, but they're still YOUR notes — surface them here so every
      // scripture insight lands in one place (Daniel, 7/19).
      supabase.from('church_notes').select('*').eq('author_id', uid).order('created_at', { ascending: false }),
    ]).then(([{ data: bn }, { data: un }, { data: cn }]) => {
      setVerseNotes(bn ?? []);
      setUserNotes(un ?? []);
      setPrepNotes(cn ?? []);
      setLoading(false);
    });
  }, [session?.user?.id]);

  useEffect(() => {
    if (newOpen && newTaRef.current) newTaRef.current.focus();
  }, [newOpen]);

  async function saveNewNote() {
    const body = newBody.trim();
    if (!body || !session?.user?.id) return;
    setNewSaving(true);
    const title = newTitle.trim() || body.slice(0, 60);
    const { data, error } = await supabase.from('user_notes')
      .insert({ user_id: session.user.id, title, body, source: 'manual' })
      .select()
      .single();
    if (!error && data) {
      setUserNotes((prev) => [data, ...prev]);
      setNewBody('');
      setNewTitle('');
      setNewOpen(false);
    }
    setNewSaving(false);
  }

  const q = query.toLowerCase();

  // Verse bookmarks (source='verse') belong in book sections, not "Saved notes"
  const verseBookmarks = userNotes.filter((n) => n.source === 'verse');
  const savedNotes     = userNotes.filter((n) => n.source !== 'verse');

  const filteredSaved = savedNotes.filter((n) =>
    !q || n.title?.toLowerCase().includes(q) || n.body?.toLowerCase().includes(q)
  );
  const filteredVerse = verseNotes.filter((n) =>
    !q ||
    n.book_name?.toLowerCase().includes(q) ||
    n.note_text?.toLowerCase().includes(q) ||
    n.verse_text?.toLowerCase().includes(q)
  );
  const filteredBookmarks = verseBookmarks.filter((n) =>
    !q || n.title?.toLowerCase().includes(q) || n.body?.toLowerCase().includes(q)
  );
  const filteredPrep = prepNotes.filter((n) =>
    !q || n.title?.toLowerCase().includes(q) || n.body?.toLowerCase().includes(q) || n.series?.toLowerCase().includes(q)
  );

  // Group bible_notes + verse bookmarks by book
  const grouped = [];
  const bookMap = {}; // bookName → { notes: bible_note[], bookmarks: user_note[] }

  for (const note of filteredVerse) {
    const key = note.book_name ?? 'Unknown';
    if (!bookMap[key]) { bookMap[key] = { notes: [], bookmarks: [] }; grouped.push(key); }
    bookMap[key].notes.push(note);
  }
  for (const bm of filteredBookmarks) {
    const bookName = BOOK_ORDER.find((b) => bm.title?.startsWith(b)) ?? 'Unknown';
    if (!bookMap[bookName]) { bookMap[bookName] = { notes: [], bookmarks: [] }; grouped.push(bookName); }
    bookMap[bookName].bookmarks.push(bm);
  }
  grouped.sort((a, b) => bookRank(a) - bookRank(b));
  const parseChVerse = (title) => { const m = title?.match(/(\d+):(\d+)$/); return m ? [parseInt(m[1]), parseInt(m[2])] : [0, 0]; };
  for (const key of grouped) {
    bookMap[key].notes.sort((a, b) => a.chapter - b.chapter || a.verse - b.verse);
    bookMap[key].bookmarks.sort((a, b) => { const [ac, av] = parseChVerse(a.title); const [bc, bv] = parseChVerse(b.title); return ac - bc || av - bv; });
  }

  const totalCount = verseNotes.length + userNotes.length + prepNotes.length;

  return (
    <div style={{ minHeight: '100vh', background: T.parchment, fontFamily: T.sans, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: T.parchment, borderBottom: `1px solid ${T.line}`,
        padding: '14px 18px 10px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.inkSoft, display: 'flex', alignItems: 'center', padding: 4 }}>
            <ArrowLeft size={20} />
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: T.display, fontSize: 19, fontWeight: 600, color: T.ink, letterSpacing: '-0.01em' }}>My Notes</div>
            {!loading && totalCount > 0 && (
              <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 1 }}>{totalCount} {totalCount === 1 ? 'note' : 'notes'}</div>
            )}
          </div>
          <button
            onClick={() => setNewOpen((v) => !v)}
            style={{
              background: newOpen ? T.ink : 'transparent',
              color: newOpen ? T.cream : T.gold,
              border: `1px solid ${newOpen ? T.ink : 'rgba(184,115,58,0.4)'}`,
              borderRadius: 999, padding: '7px 14px',
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}
          >
            {newOpen ? '✕ Cancel' : '+ New note'}
          </button>
        </div>

        {/* New note editor */}
        {newOpen && (
          <div style={{
            background: T.white, border: `1px solid ${T.line}`, borderRadius: 14,
            padding: '14px 16px', marginBottom: 10,
          }}>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Title (optional)"
              style={{
                width: '100%', boxSizing: 'border-box',
                border: `1px solid ${T.line}`, borderRadius: 8,
                padding: '6px 10px', fontSize: 13, fontFamily: T.serif,
                color: T.ink, outline: 'none', marginBottom: 8,
                background: T.parchment,
              }}
            />
            <textarea
              ref={newTaRef}
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              placeholder="Write a note…"
              rows={4}
              style={{
                width: '100%', boxSizing: 'border-box', resize: 'vertical',
                border: `1px solid ${T.line}`, borderRadius: 8,
                padding: '8px 10px', fontSize: 14, fontFamily: T.serif,
                color: T.ink, lineHeight: 1.6, outline: 'none',
                background: T.parchment,
              }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                onClick={saveNewNote}
                disabled={newSaving || !newBody.trim()}
                style={{
                  background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
                  padding: '7px 18px', fontSize: 13, fontWeight: 500,
                  cursor: newSaving || !newBody.trim() ? 'not-allowed' : 'pointer',
                  opacity: newSaving || !newBody.trim() ? 0.5 : 1,
                }}
              >
                {newSaving ? 'Saving…' : 'Save note'}
              </button>
            </div>
          </div>
        )}

        {/* Search */}
        {totalCount > 0 && (
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: T.inkMuted, pointerEvents: 'none' }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notes…"
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '8px 32px 8px 32px',
                border: `1px solid ${T.line}`, borderRadius: 999,
                background: T.white, fontSize: 13, color: T.ink,
                outline: 'none', fontFamily: T.sans,
              }}
            />
            {query && (
              <button onClick={() => setQuery('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: T.inkMuted, padding: 2 }}>
                <X size={13} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: '18px 18px 40px', maxWidth: 680, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: T.inkMuted, fontFamily: T.serif, fontSize: 15 }}>Loading…</div>
        ) : totalCount === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <BookOpen size={36} color={T.inkMuted} style={{ marginBottom: 16, opacity: 0.5 }} />
            <div style={{ fontFamily: T.serif, fontSize: 17, color: T.inkSoft, lineHeight: 1.6 }}>No notes yet.</div>
            <div style={{ fontFamily: T.serif, fontSize: 14, color: T.inkMuted, marginTop: 8, lineHeight: 1.6 }}>
              Tap "+ New note" to write one, save an AI response<br />from Ask or Bible chat, or tap ✏ Note on any verse.
            </div>
          </div>
        ) : filteredSaved.length === 0 && filteredVerse.length === 0 && filteredBookmarks.length === 0 && filteredPrep.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: T.inkMuted, fontFamily: T.serif, fontSize: 15 }}>No results for "{query}"</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Saved + manual notes (non-verse) */}
            {filteredSaved.length > 0 && (
              <div>
                <div style={{
                  fontFamily: T.serif, fontSize: 12, fontWeight: 700,
                  color: T.goldDark, letterSpacing: 1.5, textTransform: 'uppercase',
                  marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid rgba(184,115,58,0.2)`,
                }}>
                  Saved notes
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {filteredSaved.map((note) => (
                    <UserNoteCard
                      key={note.id}
                      note={note}
                      onDelete={(id) => setUserNotes((prev) => prev.filter((n) => n.id !== id))}
                      onSave={(id, body, title) => setUserNotes((prev) => prev.map((n) => n.id === id ? { ...n, body, title, updated_at: new Date().toISOString() } : n))}
                      onContinueChat={onContinueChat}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Sermon-prep notes from the church Study tab (read-only here —
                they live with the church; edit them in the Study tab) */}
            {filteredPrep.length > 0 && (
              <div>
                <div style={{
                  fontFamily: T.serif, fontSize: 12, fontWeight: 700,
                  color: T.goldDark, letterSpacing: 1.5, textTransform: 'uppercase',
                  marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid rgba(184,115,58,0.2)`,
                }}>
                  Sermon prep
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {filteredPrep.map((note) => (
                    <PrepNoteCard key={note.id} note={note} />
                  ))}
                </div>
              </div>
            )}

            {/* Verse notes + verse bookmarks grouped by book */}
            {grouped.map((bookName) => (
              <div key={bookName}>
                <div style={{
                  fontFamily: T.serif, fontSize: 12, fontWeight: 700,
                  color: T.goldDark, letterSpacing: 1.5, textTransform: 'uppercase',
                  marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid rgba(184,115,58,0.2)`,
                }}>
                  {bookName}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {bookMap[bookName].notes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onOpenBible={onOpenBible}
                      onAskVerse={onAskVerse}
                      onSave={(id, text) => setVerseNotes((prev) => prev.map((n) => n.id === id ? { ...n, note_text: text, updated_at: new Date().toISOString() } : n))}
                      onDelete={(id) => setVerseNotes((prev) => prev.filter((n) => n.id !== id))}
                    />
                  ))}
                  {bookMap[bookName].bookmarks.map((bm) => (
                    <UserNoteCard
                      key={bm.id}
                      note={bm}
                      onDelete={(id) => setUserNotes((prev) => prev.filter((n) => n.id !== id))}
                      onSave={(id, body, title) => setUserNotes((prev) => prev.map((n) => n.id === id ? { ...n, body, title, updated_at: new Date().toISOString() } : n))}
                      onContinueChat={onContinueChat}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
