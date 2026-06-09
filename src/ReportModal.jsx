import { useState } from 'react';
import { T } from './theme.js';
import { authedFetch } from './supabase.js';

const CATEGORIES = [
  { value: 'bug',        label: 'Something is broken' },
  { value: 'ai',         label: 'AI gave a wrong answer' },
  { value: 'complaint',  label: 'Complaint' },
  { value: 'suggestion', label: 'Suggestion / idea' },
  { value: 'other',      label: 'Other' },
];

export default function ReportModal({ onClose }) {
  const [category, setCategory] = useState('bug');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit() {
    if (!subject.trim() || !body.trim()) return;
    setSending(true);
    setError(null);
    try {
      const r = await authedFetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, subject, body }),
      });
      if (!r.ok) throw new Error('Failed to send');
      setDone(true);
      setTimeout(onClose, 2000);
    } catch {
      setError('Something went wrong — please try again.');
    } finally {
      setSending(false);
    }
  }

  const inputStyle = {
    width: '100%', border: `1px solid ${T.line}`, borderRadius: 10,
    padding: '10px 12px', fontSize: 14, background: T.white, color: T.ink,
    fontFamily: T.sans, boxSizing: 'border-box', outline: 'none',
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(44,24,16,0.52)', zIndex: 500, display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '100%', maxHeight: '90vh', overflowY: 'auto',
        background: T.cream, borderRadius: '20px 20px 0 0',
        padding: '24px 20px 48px', boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <div style={{ fontFamily: T.display, fontSize: 18, fontWeight: 600, color: T.ink }}>Report an issue</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.inkSoft, fontSize: 22, lineHeight: 1, padding: 4 }}>×</button>
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: T.goldDark, fontFamily: T.serif, fontSize: 17 }}>
            ✓ Thanks — we'll look into it.
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: T.inkSoft, marginBottom: 6 }}>Type</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {CATEGORIES.map((c) => (
                  <button key={c.value} onClick={() => setCategory(c.value)} style={{
                    border: `1px solid ${category === c.value ? T.goldDark : T.line}`,
                    background: category === c.value ? T.parchment : T.white,
                    color: category === c.value ? T.goldDark : T.inkSoft,
                    borderRadius: 999, padding: '6px 14px', fontSize: 13,
                    fontWeight: category === c.value ? 600 : 400, cursor: 'pointer',
                  }}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: T.inkSoft, marginBottom: 6 }}>Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Short summary…"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: T.inkSoft, marginBottom: 6 }}>Details</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="What happened? What were you doing when it broke?"
                rows={4}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            {error && (
              <div style={{ background: 'rgba(165,63,43,0.08)', border: '1px solid rgba(165,63,43,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: T.error, marginBottom: 14 }}>{error}</div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!subject.trim() || !body.trim() || sending}
              style={{
                width: '100%', background: T.ink, color: T.cream, border: 'none',
                borderRadius: 999, padding: '14px 20px', fontSize: 15, fontWeight: 600,
                cursor: subject.trim() && body.trim() && !sending ? 'pointer' : 'not-allowed',
                opacity: subject.trim() && body.trim() && !sending ? 1 : 0.45,
              }}
            >
              {sending ? 'Sending…' : 'Send report'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
