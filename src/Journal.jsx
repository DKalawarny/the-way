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

function UserNoteCard({ note, onDelete, onSave }) {
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
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
            color: T.goldDark,
          }}>
            {sourceLabel(note.source)} · {relDate(note.created_at)}
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
          <>
            {note.title && (
              <div style={{ fontFamily: T.serif, fontSize: 14, fontWeight: 600, color: T.ink, marginBottom: 6 }}>
                {note.title}
              </div>
            )}
            <div style={{
              fontFamily: T.display, fontSize: 14, color: T.inkSoft,
              lineHeight: 1.6, whiteSpace: 'pre-wrap',
              display: '-webkit-box', WebkitLineClamp: 6, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {note.body}
            </div>
          </>
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
      {/* Verse ref — tappable → jump to Bible */}
      <button
        onClick={() => onOpenBible?.({ book: note.book_id, chapter: note.chapter, verse: note.verse })}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '14px 16px 0',
          fontFamily: T.display, fontSize: 11, fontWeight: 700,
          color: T.gold, letterSpacing: 1, textTransform: 'uppercase',
        }}
      >
        {note.book_name} {note.chapter}:{note.verse}
        <span style={{ fontSize: 10, color: T.inkMuted, fontWeight: 400, letterSpacing: 0 }}>↗</span>
      </button>

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
          <div style={{ fontFamily: T.serif, fontSize: 14, color: T.ink, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
            {note.note_text}
          </div>
        )}

        {/* Action row */}
        {!editing && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: T.inkMuted }}>{relDate(note.updated_at ?? note.created_at)}</span>
            <span style={{ fontSize: 11, color: T.line }}>·</span>
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

export default function Journal({ session, onClose, onOpenBible, onAskVerse }) {
  const [verseNotes, setVerseNotes] = useState([]);
  const [userNotes,  setUserNotes]  = useState([]);
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
    ]).then(([{ data: bn }, { data: un }]) => {
      setVerseNotes(bn ?? []);
      setUserNotes(un ?? []);
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
  const filteredUser = userNotes.filter((n) =>
    !q || n.title?.toLowerCase().includes(q) || n.body?.toLowerCase().includes(q)
  );
  const filteredVerse = verseNotes.filter((n) =>
    !q ||
    n.book_name?.toLowerCase().includes(q) ||
    n.note_text?.toLowerCase().includes(q) ||
    n.verse_text?.toLowerCase().includes(q)
  );

  // Group verse notes by book
  const grouped = [];
  const bookMap = {};
  for (const note of filteredVerse) {
    const key = note.book_name ?? 'Unknown';
    if (!bookMap[key]) { bookMap[key] = []; grouped.push(key); }
    bookMap[key].push(note);
  }
  grouped.sort((a, b) => bookRank(a) - bookRank(b));
  for (const key of grouped) {
    bookMap[key].sort((a, b) => a.chapter - b.chapter || a.verse - b.verse);
  }

  const totalCount = verseNotes.length + userNotes.length;

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
        ) : filteredUser.length === 0 && filteredVerse.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: T.inkMuted, fontFamily: T.serif, fontSize: 15 }}>No results for "{query}"</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Saved + manual notes */}
            {filteredUser.length > 0 && (
              <div>
                <div style={{
                  fontFamily: T.serif, fontSize: 12, fontWeight: 700,
                  color: T.goldDark, letterSpacing: 1.5, textTransform: 'uppercase',
                  marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid rgba(184,115,58,0.2)`,
                }}>
                  Saved notes
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {filteredUser.map((note) => (
                    <UserNoteCard
                      key={note.id}
                      note={note}
                      onDelete={(id) => setUserNotes((prev) => prev.filter((n) => n.id !== id))}
                      onSave={(id, body, title) => setUserNotes((prev) => prev.map((n) => n.id === id ? { ...n, body, title, updated_at: new Date().toISOString() } : n))}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Verse notes grouped by book */}
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
                  {bookMap[bookName].map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onOpenBible={onOpenBible}
                      onAskVerse={onAskVerse}
                      onSave={(id, text) => setVerseNotes((prev) => prev.map((n) => n.id === id ? { ...n, note_text: text, updated_at: new Date().toISOString() } : n))}
                      onDelete={(id) => setVerseNotes((prev) => prev.filter((n) => n.id !== id))}
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
