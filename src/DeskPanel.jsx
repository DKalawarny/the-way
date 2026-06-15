import { lazy, Suspense, useState, useEffect } from 'react';
import { T } from './theme.js';
import { supabase } from './supabase.js';

const BibleReader = lazy(() => import('./BibleReader.jsx'));

// ── Notes section ─────────────────────────────────────────────────────────────
function NotesSection({ session, churchId }) {
  const userId = session?.user?.id;
  const [notes, setNotes]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formBody, setFormBody] = useState('');
  const [saving, setSaving]     = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (!churchId) return;
    supabase.from('church_notes')
      .select('*').eq('church_id', churchId).order('updated_at', { ascending: false })
      .then(({ data }) => { setNotes(data ?? []); setLoading(false); }, () => setLoading(false));
  }, [churchId]);

  async function createNote() {
    if (!formBody.trim() || !churchId || !userId) return;
    setSaving(true);
    const { data, error } = await supabase.from('church_notes').insert({
      church_id: churchId, author_id: userId,
      title: formTitle.trim(), body: formBody.trim(),
    }).select().single();
    setSaving(false);
    if (error) return;
    setNotes(prev => [data, ...prev]);
    setFormTitle(''); setFormBody(''); setShowForm(false);
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '0 16px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0 10px', flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: T.inkMuted }}>Your Notes</span>
        <button
          onClick={() => setShowForm(v => !v)}
          style={{ background: showForm ? T.ink : 'transparent', color: showForm ? T.cream : T.inkMuted, border: `1px solid ${showForm ? T.ink : 'rgba(26,17,8,0.14)'}`, borderRadius: 999, padding: '4px 11px', fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
        >
          {showForm ? 'Cancel' : '+ New'}
        </button>
      </div>

      {/* New note form */}
      {showForm && (
        <div style={{ background: 'linear-gradient(160deg,#FFFCF0,#FFF8E4)', border: `1px solid rgba(184,115,58,0.22)`, borderRadius: 12, padding: '12px 14px', marginBottom: 10, boxShadow: '0 2px 8px rgba(184,115,58,0.08)', flexShrink: 0 }}>
          <input
            value={formTitle} onChange={e => setFormTitle(e.target.value)}
            placeholder="Title (optional)"
            style={{ width: '100%', border: 'none', background: 'transparent', fontSize: 13, fontFamily: T.serif, fontWeight: 600, color: T.ink, outline: 'none', marginBottom: 6, boxSizing: 'border-box' }}
          />
          <textarea
            autoFocus value={formBody} onChange={e => setFormBody(e.target.value)}
            placeholder="Write your note…" rows={4}
            style={{ width: '100%', border: 'none', background: 'transparent', fontSize: 13, fontFamily: T.display, color: T.ink, resize: 'none', outline: 'none', lineHeight: 1.6, boxSizing: 'border-box' }}
          />
          <button
            onClick={createNote} disabled={saving || !formBody.trim()}
            style={{ background: T.ink, color: T.cream, border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: saving || !formBody.trim() ? 'default' : 'pointer', opacity: saving || !formBody.trim() ? 0.5 : 1, marginTop: 6 }}
          >
            {saving ? 'Saving…' : 'Save note'}
          </button>
        </div>
      )}

      {loading && (
        <div style={{ fontSize: 13, color: T.inkMuted, textAlign: 'center', padding: '32px 0', fontStyle: 'italic' }}>Loading…</div>
      )}

      {!loading && notes.length === 0 && !showForm && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: T.inkMuted, padding: '20px 0' }}>
          <div style={{ fontSize: 38, marginBottom: 14, opacity: 0.6 }}>📝</div>
          <div style={{ fontFamily: T.serif, fontSize: 16, fontWeight: 600, color: T.ink, marginBottom: 6 }}>Your research notes</div>
          <div style={{ fontSize: 12, lineHeight: 1.7, maxWidth: 200, color: T.inkMuted }}>
            Jot ideas here, or save responses directly from the research chat.
          </div>
        </div>
      )}

      {notes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {notes.map(note => {
            const isOpen = expandedId === note.id;
            const dateStr = new Date(note.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            const badge = note.source === 'research' ? '📚' : note.source === 'ask' ? '💬' : null;
            return (
              <div
                key={note.id}
                onClick={() => setExpandedId(isOpen ? null : note.id)}
                style={{
                  background: 'linear-gradient(160deg,#FFFCF2 0%,#FFF8E8 100%)',
                  border: `1px solid rgba(184,115,58,0.15)`,
                  borderRadius: 10, padding: '10px 13px',
                  cursor: 'pointer',
                  boxShadow: isOpen ? '0 3px 14px rgba(26,17,8,0.08)' : '0 1px 4px rgba(26,17,8,0.04)',
                  transition: 'box-shadow 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                  <span style={{ fontFamily: T.serif, fontSize: 13, fontWeight: 600, color: T.ink, lineHeight: 1.35 }}>
                    {note.title || note.body.slice(0, 50) + (note.body.length > 50 ? '…' : '')}
                  </span>
                  {badge && <span style={{ fontSize: 12, flexShrink: 0, opacity: 0.65 }}>{badge}</span>}
                </div>
                {!isOpen && note.title && (
                  <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 3, lineHeight: 1.4 }}>
                    {note.body.slice(0, 75)}{note.body.length > 75 ? '…' : ''}
                  </div>
                )}
                {isOpen && (
                  <div style={{ fontSize: 13, color: T.inkSoft, marginTop: 7, lineHeight: 1.65, fontFamily: T.display, whiteSpace: 'pre-wrap' }}>
                    {note.body}
                  </div>
                )}
                <div style={{ fontSize: 11, color: T.inkMuted, marginTop: 6, opacity: 0.7 }}>{dateStr}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── DeskPanel ─────────────────────────────────────────────────────────────────
// topOffset accounts for ChurchModeShell shell header (145px) + DeskPanel tab bar (~58px).
// BibleReader's formula: height = calc(100vh - (62 + topOffset)). The 62 is its own
// internal constant. We inject 203 so BibleReader fills the panel content area.
const BIBLE_TOP_OFFSET = 203;

export default function DeskPanel({ session, profile, churchId, onClose, isMobile, initialTab }) {
  const [activeTab, setActiveTab] = useState(initialTab ?? 'bible');

  // Plan-enriched profile for BibleReader
  const bibleProfile = profile ? { ...profile } : profile;

  return (
    <div style={{
      width: isMobile ? '100%' : 360,
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
      {/* Tab bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 0', flexShrink: 0, position: 'relative', zIndex: 1 }}>
        {isMobile && (
          <div style={{ width: 36, height: 4, background: 'rgba(26,17,8,0.14)', borderRadius: 99, position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)' }} />
        )}
        <div style={{ display: 'flex', gap: 5, marginTop: isMobile ? 14 : 0 }}>
          {[{ id: 'bible', label: '📖 Bible' }, { id: 'notes', label: '📝 Notes' }].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                background: activeTab === t.id ? T.ink : 'transparent',
                color: activeTab === t.id ? T.cream : T.inkMuted,
                border: `1px solid ${activeTab === t.id ? T.ink : 'rgba(26,17,8,0.14)'}`,
                borderRadius: 999, padding: '5px 14px',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >{t.label}</button>
          ))}
        </div>
        {onClose && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: T.inkMuted, cursor: 'pointer', padding: '0 2px', lineHeight: 1, marginTop: isMobile ? 14 : 0 }}>×</button>
        )}
      </div>

      {/* Gold hairline */}
      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(184,115,58,0.30), transparent)', margin: '10px 0 0', flexShrink: 0, position: 'relative', zIndex: 1 }} />

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        {activeTab === 'bible' && (
          <Suspense fallback={
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.inkMuted, fontSize: 13, fontStyle: 'italic' }}>
              Loading Bible…
            </div>
          }>
            <BibleReader
              session={session}
              profile={bibleProfile}
              topOffset={BIBLE_TOP_OFFSET}
              compact
            />
          </Suspense>
        )}
        {activeTab === 'notes' && <NotesSection session={session} churchId={churchId} />}
      </div>
    </div>
  );
}
