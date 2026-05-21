import { useEffect, useState } from 'react';
import { supabase } from './supabase.js';
import { T } from './theme.js';
import { relativeTime } from './time.js';

/**
 * Admin triage view for church listing disputes.
 *
 * Reads/writes are gated by RLS via is_current_user_admin() — see
 * scripts/2026-05-03-church-disputes.sql. Status updates happen directly
 * (no copy-SQL dance) since the admin policy allows UPDATE.
 */

const TYPE_LABEL = {
  inaccurate_info: 'Info inaccurate',
  wrong_location: 'Wrong location',
  not_real:       'Not a real church',
  closed:         'Has closed',
  impersonation:  'Impersonation',
  other:          'Other',
};

const STATUS_TONE = {
  pending:   { bg: 'rgba(184,115,58,0.10)', fg: T.goldDark, label: 'PENDING' },
  reviewed:  { bg: T.resolvedBg, fg: T.resolvedText, label: 'REVIEWED' },
  resolved:  { bg: T.resolvedBg, fg: T.resolvedText, label: 'RESOLVED' },
  dismissed: { bg: 'rgba(180,60,60,0.10)',  fg: '#9A3A3A',  label: 'DISMISSED' },
};

export default function ChurchDisputesQueue({ session, profile, onClose, onOpenChurch }) {
  const [rows, setRows]         = useState([]);
  const [churchMap, setChurchMap] = useState({});
  const [profMap, setProfMap]   = useState({});
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('pending');
  const [toast, setToast]       = useState(null);
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    if (!profile?.is_admin) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      let q = supabase
        .from('church_disputes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (filter !== 'all') q = q.eq('status', filter);
      const { data: disputes, error } = await q;
      if (cancelled) return;
      if (error) {
        console.error('[ChurchDisputesQueue] load error:', error);
        setLoading(false);
        return;
      }
      const list = disputes ?? [];
      setRows(list);

      const churchIds = [...new Set(list.map((d) => d.church_id).filter(Boolean))];
      const reporterIds = [...new Set(list.map((d) => d.reporter_id).filter(Boolean))];

      if (churchIds.length) {
        const { data: ch } = await supabase
          .from('churches')
          .select('id, name, denomination, city, country, verification_status, is_public, pastor_id')
          .in('id', churchIds);
        if (cancelled) return;
        const cm = {};
        (ch ?? []).forEach((c) => { cm[c.id] = c; });
        setChurchMap(cm);
      } else {
        setChurchMap({});
      }

      if (reporterIds.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', reporterIds);
        if (cancelled) return;
        const pm = {};
        (profs ?? []).forEach((p) => { pm[p.id] = p; });
        setProfMap(pm);
      } else {
        setProfMap({});
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [profile?.is_admin, filter]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  }

  async function setStatus(dispute, status, note) {
    setSavingId(dispute.id);
    const { error } = await supabase
      .from('church_disputes')
      .update({
        status,
        resolved_by: session.user.id,
        resolved_at: new Date().toISOString(),
        resolution_note: (note || '').slice(0, 1000) || null,
      })
      .eq('id', dispute.id);
    setSavingId(null);
    if (error) {
      console.error('[ChurchDisputesQueue] update error:', error);
      showToast(`Couldn't update: ${error.message}`);
      return;
    }
    showToast(`Marked ${status}.`);
    // Optimistically remove from list when filter is "pending"; otherwise update inline.
    setRows((prev) => filter === 'pending'
      ? prev.filter((r) => r.id !== dispute.id)
      : prev.map((r) => r.id === dispute.id
          ? { ...r, status, resolved_at: new Date().toISOString(), resolved_by: session.user.id, resolution_note: note ?? r.resolution_note }
          : r));
  }

  if (!profile?.is_admin) {
    return (
      <div className="scene" style={{ minHeight: '100vh', padding: '40px 20px 80px' }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: T.goldDark, fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 18,
          }}>← Back</button>
          <div style={{ fontFamily: T.serif, fontSize: 16, color: T.inkMuted, lineHeight: 1.6 }}>
            Admin only.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="scene" style={{ minHeight: '100vh', padding: '32px 20px 90px' }}>
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: T.goldDark, fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 18,
        }}>← Back</button>

        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 12 }}>
          <h1 style={{ fontFamily: T.serif, fontSize: 30, fontWeight: 600, color: T.ink, letterSpacing: '-0.022em', lineHeight: 1.1, margin: 0 }}>
            Listing disputes
          </h1>
          <div style={{ display: 'inline-flex', gap: 4, background: T.cream, padding: 3, borderRadius: 999, border: `1px solid ${T.line}` }}>
            {['pending', 'reviewed', 'resolved', 'dismissed', 'all'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  background: filter === f ? T.ink : 'transparent',
                  color: filter === f ? T.cream : T.inkSoft,
                  border: 'none', borderRadius: 999, padding: '6px 12px',
                  fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >{f}</button>
            ))}
          </div>
        </div>
        <p style={{ color: T.inkMuted, fontSize: 13.5, lineHeight: 1.6, marginTop: 0, marginBottom: 24 }}>
          Reports submitted from public church pages. Resolve = action was taken (edited or removed). Dismiss = no action needed.
        </p>

        {loading ? (
          <div style={{ color: T.inkMuted, fontFamily: T.serif, fontStyle: 'italic', padding: 20 }}>
            Loading queue…
          </div>
        ) : rows.length === 0 ? (
          <div style={{
            background: T.white, border: `1px dashed ${T.line}`, borderRadius: 14,
            padding: '40px 20px', textAlign: 'center',
            fontFamily: T.serif, fontStyle: 'italic', color: T.inkMuted, fontSize: 14.5,
          }}>
            Nothing in the {filter} bucket.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {rows.map((d) => (
              <DisputeCard
                key={d.id}
                dispute={d}
                church={churchMap[d.church_id]}
                reporter={d.reporter_id ? profMap[d.reporter_id] : null}
                saving={savingId === d.id}
                onOpenChurch={() => onOpenChurch?.(d.church_id)}
                onSetStatus={(status, note) => setStatus(d, status, note)}
              />
            ))}
          </div>
        )}
      </div>

      {toast && (
        <div style={{
          position: 'fixed', bottom: 30, left: '50%', transform: 'translateX(-50%)',
          background: T.ink, color: T.cream, padding: '12px 20px', borderRadius: 999,
          fontSize: 13.5, fontWeight: 500, boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
          zIndex: 100,
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}

function DisputeCard({ dispute, church, reporter, saving, onOpenChurch, onSetStatus }) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState(dispute.resolution_note ?? '');
  const tone = STATUS_TONE[dispute.status] ?? { bg: T.cream, fg: T.inkSoft, label: dispute.status?.toUpperCase() };

  return (
    <article style={{
      background: T.white, border: `1px solid ${T.line}`, borderRadius: 14,
      padding: 20, boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: 1.2,
          color: tone.fg, background: tone.bg,
          padding: '4px 10px', borderRadius: 999,
        }}>{tone.label}</span>
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: 1.2,
          color: T.inkSoft, background: T.cream, border: `1px solid ${T.line}`,
          padding: '3px 9px', borderRadius: 999,
        }}>
          {TYPE_LABEL[dispute.dispute_type] ?? dispute.dispute_type}
        </span>
        <span style={{ fontSize: 12.5, color: T.inkMuted }}>{relativeTime(dispute.created_at)}</span>
      </div>

      {/* Church */}
      <div style={{ marginBottom: 14 }}>
        <button
          onClick={onOpenChurch}
          style={{
            background: 'none', border: 'none', padding: 0, textAlign: 'left',
            fontFamily: T.display, fontSize: 21, fontWeight: 600, color: T.ink,
            letterSpacing: '-0.012em', lineHeight: 1.25, marginBottom: 2,
            cursor: onOpenChurch ? 'pointer' : 'default',
            textDecoration: onOpenChurch ? 'underline' : 'none', textUnderlineOffset: 3,
          }}
        >
          {church?.name ?? '(church not found)'}
        </button>
        <div style={{ fontSize: 13, color: T.inkSoft }}>
          {church?.denomination ?? '—'} · {[church?.city, church?.country].filter(Boolean).join(', ') || '—'}
          {church && (
            <>
              {' · '}
              <span style={{ color: church.verification_status === 'verified' ? T.resolvedText : T.goldDark }}>
                {church.verification_status}
              </span>
              {' · '}
              <span style={{ color: church.is_public ? T.inkSoft : T.inkMuted }}>
                {church.is_public ? 'public' : 'hidden'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Reason */}
      <div style={{
        background: T.cream, border: `1px solid ${T.line}`, borderRadius: 10,
        padding: '10px 12px', marginBottom: 14,
      }}>
        <div style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: T.inkMuted, fontWeight: 600, marginBottom: 4 }}>
          Reporter’s reason
        </div>
        <div style={{ fontFamily: T.serif, fontSize: 13.5, color: T.ink, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
          {dispute.reason}
        </div>
      </div>

      {/* Reporter */}
      <div style={{ fontSize: 12.5, color: T.inkMuted, marginBottom: 14 }}>
        {reporter
          ? <>Reporter: <span style={{ color: T.inkSoft, fontWeight: 600 }}>{reporter.display_name ?? '(no name)'}</span></>
          : dispute.reporter_email
            ? <>Anon: <span style={{ color: T.inkSoft }}>{dispute.reporter_email}</span></>
            : <>Anon (no email).</>}
      </div>

      {/* Resolution display when not pending */}
      {dispute.status !== 'pending' && dispute.resolution_note && (
        <div style={{ borderTop: `1px solid ${T.line}`, paddingTop: 12, marginBottom: 14, fontSize: 13, color: T.inkSoft }}>
          <span style={{ color: T.inkMuted, fontWeight: 600 }}>Note:</span>{' '}
          <span style={{ fontFamily: T.serif, fontStyle: 'italic' }}>{dispute.resolution_note}</span>
        </div>
      )}

      {/* Action row — pending only */}
      {dispute.status === 'pending' && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', borderTop: `1px solid ${T.line}`, paddingTop: 14 }}>
          {!noteOpen ? (
            <>
              <button
                onClick={() => onSetStatus('resolved', '')}
                disabled={saving}
                style={{
                  background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
                  padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: saving ? 'default' : 'pointer',
                  opacity: saving ? 0.6 : 1,
                }}
              >
                ✓ Resolved
              </button>
              <button
                onClick={() => onSetStatus('dismissed', '')}
                disabled={saving}
                style={{
                  background: 'transparent', color: '#9A3A3A', border: `1px solid #9A3A3A`,
                  borderRadius: 999, padding: '10px 18px', fontSize: 13, fontWeight: 600,
                  cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1,
                }}
              >
                ✕ Dismiss
              </button>
              <button
                onClick={() => setNoteOpen(true)}
                disabled={saving}
                style={{
                  background: 'none', color: T.inkMuted, border: 'none',
                  fontSize: 12.5, cursor: 'pointer', padding: '0 4px',
                }}
              >
                + add a note
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', gap: 8, flex: 1, minWidth: 280, flexWrap: 'wrap' }}>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 1000))}
                placeholder="Internal note (optional)"
                autoFocus
                style={{
                  flex: 1, minWidth: 200,
                  border: `1px solid ${T.line}`, borderRadius: 8,
                  padding: '8px 12px', fontSize: 13.5, fontFamily: T.serif,
                  background: T.cream, color: T.ink, outline: 'none',
                }}
              />
              <button
                onClick={() => { onSetStatus('resolved', note); setNoteOpen(false); }}
                disabled={saving}
                style={{
                  background: T.ink, color: T.cream, border: 'none', borderRadius: 8,
                  padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  opacity: saving ? 0.6 : 1,
                }}
              >Resolve</button>
              <button
                onClick={() => { onSetStatus('dismissed', note); setNoteOpen(false); }}
                disabled={saving}
                style={{
                  background: '#9A3A3A', color: T.cream, border: 'none', borderRadius: 8,
                  padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  opacity: saving ? 0.6 : 1,
                }}
              >Dismiss</button>
              <button
                onClick={() => { setNoteOpen(false); setNote(dispute.resolution_note ?? ''); }}
                style={{
                  background: 'transparent', color: T.inkMuted, border: 'none',
                  fontSize: 13, cursor: 'pointer', padding: '0 6px',
                }}
              >cancel</button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
