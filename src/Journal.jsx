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
  return text?.replace(/^[""“]+|[""”]+$/g, '').trim() ?? '';
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
      // empty = delete
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
        <div style={{ padding: '8px 16px 0' }}>
          <div
            onClick={() => setExpanded((v) => !v)}
            style={{
              fontFamily: T.serif, fontSize: 13, color: T.inkSoft,
              fontStyle: 'italic', lineHeight: 1.55,
              paddingLeft: 10, borderLeft: `2px solid rgba(184,115,58,0.3)`,
              cursor: 'pointer',
              overflow: expanded ? 'visible' : 'hidden',
              display: expanded ? 'block' : '-webkit-box',
              WebkitLineClamp: expanded ? undefined : 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            "{verseClean}"
          </div>
          {!expanded && verseClean.length > 120 && (
            <button
              onClick={() => setExpanded(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: T.inkMuted, padding: '2px 0 0 10px' }}
            >
              more
            </button>
          )}
        </div>
      )}

      {/* Note text — tap to edit */}
      <div style={{ padding: '10px 16px 0' }}>
        {editing ? (
          <div>
            <textarea
              ref={taRef}
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              rows={4}
              style={{
                width: '100%', boxSizing: 'border-box',
                fontFamily: T.display, fontSize: 14, color: T.ink,
                lineHeight: 1.6, border: `1px solid ${T.gold}`,
                borderRadius: 8, padding: '8px 10px',
                background: T.parchment, resize: 'vertical', outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <button
                onClick={saveEdit}
                disabled={saving}
                style={{
                  background: T.ink, color: T.cream, border: 'none',
                  borderRadius: 999, padding: '6px 14px', fontSize: 12,
                  fontWeight: 600, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => { setEditing(false); setDraftText(note.note_text); }}
                style={{
                  background: 'none', border: `1px solid ${T.line}`, borderRadius: 999,
                  padding: '6px 14px', fontSize: 12, color: T.inkSoft, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => setEditing(true)}
            title="Tap to edit"
            style={{
              fontFamily: T.display, fontSize: 14.5, color: T.ink,
              lineHeight: 1.6, whiteSpace: 'pre-wrap', cursor: 'text',
              padding: '4px 0',
            }}
          >
            {note.note_text}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 16px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: T.inkMuted }}>{relDate(note.updated_at)}</span>
          {onAskVerse && (
            <button
              onClick={() => onAskVerse(note)}
              style={{
                background: 'rgba(184,115,58,0.08)', border: `1px solid rgba(184,115,58,0.25)`,
                borderRadius: 999, padding: '3px 10px', fontSize: 11,
                color: T.goldDark, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Ask about this
            </button>
          )}
        </div>
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
    </div>
  );
}

export default function Journal({ session, onClose, onOpenBible, onAskVerse }) {
  const [notes,   setNotes]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [query,   setQuery]   = useState('');

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase
      .from('bible_notes')
      .select('*')
      .eq('user_id', session.user.id)
      .then(({ data }) => { setNotes(data ?? []); setLoading(false); });
  }, [session?.user?.id]);

  const filtered = notes.filter((n) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      n.book_name?.toLowerCase().includes(q) ||
      n.note_text?.toLowerCase().includes(q) ||
      n.verse_text?.toLowerCase().includes(q)
    );
  });

  // Group by book in canonical order
  const grouped = [];
  const bookMap = {};
  for (const note of filtered) {
    const key = note.book_name ?? 'Unknown';
    if (!bookMap[key]) { bookMap[key] = []; grouped.push(key); }
    bookMap[key].push(note);
  }
  grouped.sort((a, b) => bookRank(a) - bookRank(b));
  for (const key of grouped) {
    bookMap[key].sort((a, b) => a.chapter - b.chapter || a.verse - b.verse);
  }

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
          <div>
            <div style={{ fontFamily: T.display, fontSize: 19, fontWeight: 600, color: T.ink, letterSpacing: '-0.01em' }}>My Notes</div>
            {!loading && notes.length > 0 && (
              <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 1 }}>{notes.length} {notes.length === 1 ? 'note' : 'notes'}</div>
            )}
          </div>
        </div>
        {/* Search */}
        {notes.length > 0 && (
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
        ) : notes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <BookOpen size={36} color={T.inkMuted} style={{ marginBottom: 16, opacity: 0.5 }} />
            <div style={{ fontFamily: T.serif, fontSize: 17, color: T.inkSoft, lineHeight: 1.6 }}>No notes yet.</div>
            <div style={{ fontFamily: T.serif, fontSize: 14, color: T.inkMuted, marginTop: 8, lineHeight: 1.6 }}>
              Tap any verse in the Bible reader and choose<br />✏ Note to start writing.
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: T.inkMuted, fontFamily: T.serif, fontSize: 15 }}>No results for "{query}"</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
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
                      onSave={(id, text) => setNotes((prev) => prev.map((n) => n.id === id ? { ...n, note_text: text, updated_at: new Date().toISOString() } : n))}
                      onDelete={(id) => setNotes((prev) => prev.filter((n) => n.id !== id))}
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
