import { useEffect, useState } from 'react';
import { ArrowLeft, Trash2, BookOpen } from 'lucide-react';
import { T } from './theme.js';
import { supabase } from './supabase.js';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtDate(iso) {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export default function Journal({ session, onClose, onOpenBible }) {
  const [notes, setNotes]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase
      .from('bible_notes')
      .select('*')
      .eq('user_id', session.user.id)
      .order('updated_at', { ascending: false })
      .then(({ data }) => { setNotes(data ?? []); setLoading(false); });
  }, [session?.user?.id]);

  async function deleteNote(id) {
    setDeletingId(id);
    await supabase.from('bible_notes').delete().eq('id', id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
    setDeletingId(null);
  }

  return (
    <div style={{
      minHeight: '100vh', background: T.parchment,
      fontFamily: T.sans, display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: T.parchment, borderBottom: `1px solid ${T.line}`,
        padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: T.inkSoft, display: 'flex', alignItems: 'center', padding: 4,
        }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <div style={{ fontFamily: T.display, fontSize: 19, fontWeight: 600, color: T.ink, letterSpacing: '-0.01em' }}>
            My Notes
          </div>
          {!loading && notes.length > 0 && (
            <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 1 }}>
              {notes.length} {notes.length === 1 ? 'note' : 'notes'}
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: '18px 18px 40px', maxWidth: 680, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: T.inkMuted, fontFamily: T.serif, fontSize: 15 }}>
            Loading…
          </div>
        ) : notes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <BookOpen size={36} color={T.inkMuted} style={{ marginBottom: 16, opacity: 0.5 }} />
            <div style={{ fontFamily: T.serif, fontSize: 17, color: T.inkSoft, lineHeight: 1.6 }}>
              No notes yet.
            </div>
            <div style={{ fontFamily: T.serif, fontSize: 14, color: T.inkMuted, marginTop: 8, lineHeight: 1.6 }}>
              Tap any verse in the Bible reader and choose<br />✏ Note to start writing.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {notes.map((note) => (
              <div
                key={note.id}
                style={{
                  background: T.white,
                  border: `1px solid ${T.line}`,
                  borderRadius: 14,
                  padding: '16px 18px',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.15s',
                }}
                onClick={() => onOpenBible?.({ book: note.book_id, chapter: note.chapter, verse: note.verse })}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(26,17,8,0.08)')}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
              >
                {/* Verse ref */}
                <div style={{
                  fontFamily: T.display, fontSize: 12, fontWeight: 700,
                  color: T.gold, letterSpacing: 1, textTransform: 'uppercase',
                  marginBottom: 6,
                }}>
                  {note.book_name} {note.chapter}:{note.verse}
                </div>
                {/* Verse text */}
                {note.verse_text && (
                  <div style={{
                    fontFamily: T.serif, fontSize: 13.5, color: T.inkSoft,
                    fontStyle: 'italic', lineHeight: 1.55, marginBottom: 10,
                    paddingLeft: 10, borderLeft: `2px solid rgba(184,115,58,0.3)`,
                  }}>
                    "{note.verse_text}"
                  </div>
                )}
                {/* Note text */}
                <div style={{
                  fontFamily: T.display, fontSize: 15, color: T.ink,
                  lineHeight: 1.6, whiteSpace: 'pre-wrap',
                }}>
                  {note.note_text}
                </div>
                {/* Footer */}
                <div style={{
                  marginTop: 12, display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <span style={{ fontSize: 12, color: T.inkMuted }}>
                    {fmtDate(note.updated_at)}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                    disabled={deletingId === note.id}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: T.inkMuted, padding: 4, opacity: deletingId === note.id ? 0.4 : 1,
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
