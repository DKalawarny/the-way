import { useEffect, useState } from 'react';
import { supabase } from './supabase.js';
import { T } from './theme.js';
import { relativeTime } from './time.js';
import { KinwoveStar } from './components/brand/KinwoveStar.jsx';

/**
 * Admin triage view for pending pastor applications.
 *
 * The actual approve/reject still happens via SQL in the Supabase editor —
 * see scripts/approve-pastor-application.sql. This component just speeds up
 * the triage:
 *   - Pre-built investigation links (registry, whois, staff page, email)
 *   - Clipboard helpers that copy approve/reject SQL with the id pre-filled
 *
 * Gated on profile.is_admin (RLS also enforces this on the read side — see
 * scripts/2026-05-01-pastor-admin-queue.sql).
 */

const REG_LOOKUPS = {
  CA: { label: 'CRA charity search',        url: 'https://apps.cra-arc.gc.ca/ebci/hacc/srch/pub/dsplyBscSrch?request_locale=en' },
  US: { label: 'IRS Tax Exempt Org search', url: 'https://apps.irs.gov/app/eos/' },
  UK: { label: 'gov.uk charity register',   url: 'https://register-of-charities.charitycommission.gov.uk/charity-search' },
  AU: { label: 'ABN lookup',                url: 'https://abr.business.gov.au/' },
  OTHER: { label: 'Generic registry search', url: 'https://www.google.com/search' },
};

function APPROVE_SQL(app) {
  return `-- Approve pastor_application ${app.id}
-- Church: "${app.church_name}" (${app.denomination ?? 'no denomination'}, ${app.country ?? 'no country'})
-- Pastor: ${app.full_name} (${app.pastor_role ?? 'no role'})
begin;

with app as (
  select * from public.pastor_applications
   where id = '${app.id}' and status = 'pending' for update
),
new_church as (
  insert into public.churches (
    name, denomination, city, country, website,
    pastor_id,
    registration_country, registration_number,
    verification_status, verification_tier, verified_at, verification_notes,
    is_public
  )
  select
    a.church_name, a.denomination, a.city, a.country, a.website,
    a.user_id,
    a.registration_country, a.registration_number,
    'verified',
    case when a.no_registration then 'reference' else 'registry' end,
    now(),
    case when a.no_registration
         then 'Verified via denominational reference: ' || coalesce(a.denominational_reference, '(none provided)')
         else 'Verified via registration number lookup'
    end,
    true
  from app a
  returning id, pastor_id
),
mark_app as (
  update public.pastor_applications
     set status = 'approved', reviewed_at = now()
   where id in (select id from app)
  returning id
),
mark_profile as (
  update public.profiles
     set is_pastor = true,
         church_id = (select id from new_church)
   where id in (select pastor_id from new_church)
  returning id
)
select
  (select id from new_church)   as church_id,
  (select id from mark_app)     as approved_application_id,
  (select id from mark_profile) as pastor_profile_id;

-- Three non-null IDs in the result row → commit. Any NULL → rollback.
commit;
-- rollback;
`;
}

function REJECT_SQL(app, notes) {
  // Single-quote escape for SQL safety in copy/paste.
  const safe = (notes || '').replace(/'/g, "''");
  return `-- Reject pastor_application ${app.id}
-- Church: "${app.church_name}" — Pastor: ${app.full_name}
update public.pastor_applications
   set status = 'rejected',
       reviewed_at = now(),
       notes = '${safe}'
 where id = '${app.id}'
   and status = 'pending';
`;
}

// Pull the bare hostname out of a website string for whois / staff-page links.
function hostnameOf(website) {
  if (!website) return null;
  try {
    const url = new URL(website.match(/^https?:\/\//) ? website : `https://${website}`);
    return url.hostname.replace(/^www\./, '');
  } catch { return null; }
}

const EDITABLE_FIELDS = [
  { key: 'name',                 label: 'Church name' },
  { key: 'denomination',         label: 'Denomination' },
  { key: 'city',                 label: 'City' },
  { key: 'country',              label: 'Country' },
  { key: 'website',              label: 'Website' },
  { key: 'verification_status',  label: 'Verification status' },
  { key: 'verification_notes',   label: 'Verification notes' },
];

export default function PastorAdminQueue({ session, profile, onClose }) {
  const [rows, setRows]       = useState([]);
  const [profMap, setProfMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('pending');
  const [toast, setToast]     = useState(null);

  useEffect(() => {
    if (!profile?.is_admin) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      let q = supabase
        .from('pastor_applications')
        .select('*')
        .order('created_at', { ascending: false });
      if (filter !== 'all') q = q.eq('status', filter);
      const { data: apps } = await q;
      if (cancelled) return;
      const list = apps ?? [];
      setRows(list);

      const ids = [...new Set(list.map((a) => a.user_id).filter(Boolean))];
      if (ids.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_config, avatar_url')
          .in('id', ids);
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

  async function copy(text, label) {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} copied — paste into Supabase SQL editor`);
    } catch {
      showToast('Copy failed — your browser blocked clipboard access');
    }
  }

  if (!profile?.is_admin) {
    return (
      <div className="scene" style={{ minHeight: '100vh', padding: '40px 20px 80px' }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: T.goldDark, fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 18,
          }}>← Back</button>
          <div style={{ fontFamily: T.serif, fontSize: 16, color: T.inkMuted, lineHeight: 1.6 }}>
            Admin only. If you're meant to be here, ask Daniel to run:
            <pre style={{ background: T.cream, padding: 12, borderRadius: 8, fontSize: 13, marginTop: 10, overflowX: 'auto' }}>
              {`update public.profiles set is_admin = true where id = '${session?.user?.id ?? '<your-uuid>'}';`}
            </pre>
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
            Pastor applications
          </h1>
          <div style={{ display: 'inline-flex', gap: 4, background: T.cream, padding: 3, borderRadius: 999, border: `1px solid ${T.line}` }}>
            {['pending', 'approved', 'rejected', 'all'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  background: filter === f ? T.ink : 'transparent',
                  color: filter === f ? T.cream : T.inkSoft,
                  border: 'none', borderRadius: 999, padding: '6px 14px',
                  fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >{f}</button>
            ))}
          </div>
        </div>
        <p style={{ color: T.inkMuted, fontSize: 13.5, lineHeight: 1.6, marginTop: 0, marginBottom: 24 }}>
          Investigation links pre-filled. Approve / reject still happens via SQL — click the button to copy
          the right statement with the application ID baked in, then paste into the Supabase SQL editor.
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
            {rows.map((app) => (
              <ApplicationCard
                key={app.id}
                app={app}
                applicantProfile={profMap[app.user_id]}
                session={session}
                onCopyApprove={() => copy(APPROVE_SQL(app), 'Approve SQL')}
                onCopyReject={(notes) => copy(REJECT_SQL(app, notes), 'Reject SQL')}
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

function ApplicationCard({ app, applicantProfile, session, onCopyApprove, onCopyReject }) {
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectNotes, setRejectNotes]         = useState('');
  const [showEdit, setShowEdit]               = useState(false);
  const [church, setChurch]                   = useState(null);
  const [editForm, setEditForm]               = useState({});
  const [saving, setSaving]                   = useState(false);
  const [editMsg, setEditMsg]                 = useState(null);

  async function openEdit() {
    setShowEdit(true);
    if (church) return;
    try {
      const r = await fetch(`/api/admin/church?pastor_id=${app.user_id}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!r.ok) { setEditMsg('Could not load church record.'); return; }
      const data = await r.json();
      setChurch(data);
      const form = {};
      EDITABLE_FIELDS.forEach(({ key }) => { form[key] = data[key] ?? ''; });
      setEditForm(form);
    } catch { setEditMsg('Error loading church.'); }
  }

  async function saveEdit() {
    setSaving(true);
    setEditMsg(null);
    try {
      const r = await fetch(`/api/admin/church/${church.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify(editForm),
      });
      if (!r.ok) { setEditMsg('Save failed.'); setSaving(false); return; }
      setChurch({ ...church, ...editForm });
      setEditMsg('Saved.');
      setTimeout(() => setEditMsg(null), 2000);
    } catch { setEditMsg('Save failed.'); }
    setSaving(false);
  }

  const host = hostnameOf(app.website);
  const reg  = REG_LOOKUPS[app.registration_country] ?? REG_LOOKUPS.OTHER;

  const statusTone = {
    pending:  { bg: 'rgba(184,115,58,0.10)', fg: T.goldDark, label: 'PENDING' },
    approved: { bg: T.resolvedBg,  fg: T.resolvedText,  label: 'APPROVED' },
    rejected: { bg: 'rgba(180,60,60,0.10)',  fg: '#9A3A3A',  label: 'REJECTED' },
  }[app.status] ?? { bg: T.cream, fg: T.inkSoft, label: app.status?.toUpperCase() };

  return (
    <article style={{
      background: T.white, border: `1px solid ${T.line}`, borderRadius: 14,
      padding: 20, boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: 1.2,
          color: statusTone.fg, background: statusTone.bg,
          padding: '4px 10px', borderRadius: 999,
        }}>{statusTone.label}</span>
        <span style={{ fontSize: 12.5, color: T.inkMuted }}>{relativeTime(app.created_at)}</span>
        {app.verification_method && app.verification_method !== 'manual' && (
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: 1,
            color: T.resolvedText, background: T.resolvedBg,
            padding: '3px 9px', borderRadius: 999,
          }}>
            <KinwoveStar size={11} style={{ verticalAlign: 'middle', marginRight: 4, flexShrink: 0 }} /> AUTO ({app.verification_method})
          </span>
        )}
        {app.no_registration && (
          <span style={{
            fontSize: 11, fontWeight: 600, letterSpacing: 1,
            color: T.inkSoft, background: T.cream,
            padding: '3px 9px', borderRadius: 999,
          }}>NO REGISTRATION</span>
        )}
      </div>

      {/* Church + applicant */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontFamily: T.display, fontSize: 21, fontWeight: 600, color: T.ink, letterSpacing: '-0.012em', marginBottom: 2, lineHeight: 1.25 }}>
          {app.church_name}
        </div>
        <div style={{ fontSize: 13, color: T.inkSoft }}>
          {app.denomination ?? '—'} · {[app.city, app.country].filter(Boolean).join(', ') || '—'}
        </div>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12,
        marginBottom: 14, fontSize: 13,
      }}>
        <Datum label="Applicant" value={`${app.full_name}${applicantProfile?.display_name && applicantProfile.display_name !== app.full_name ? ` (${applicantProfile.display_name})` : ''}`} />
        <Datum label="Role" value={app.pastor_role || '—'} />
        <Datum
          label={`Registration${app.registration_country ? ` (${app.registration_country})` : ''}`}
          value={app.registration_number || '—'}
        />
        {app.no_registration && (
          <Datum label="Denominational reference" value={app.denominational_reference || '—'} fullWidth />
        )}
      </div>

      {app.reason && (
        <div style={{
          background: T.cream, border: `1px solid ${T.line}`, borderRadius: 10,
          padding: '10px 12px', marginBottom: 14,
        }}>
          <div style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: T.inkMuted, fontWeight: 600, marginBottom: 4 }}>
            Their note
          </div>
          <div style={{ fontFamily: T.serif, fontSize: 13.5, color: T.ink, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {app.reason}
          </div>
        </div>
      )}

      {/* Investigation links — only useful while vetting */}
      {app.status === 'pending' && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          {app.website && (
            <LinkBtn href={app.website.match(/^https?:\/\//) ? app.website : `https://${app.website}`}>
              🌐 Visit website
            </LinkBtn>
          )}
          {host && (
            <LinkBtn href={`https://${host}/staff`}>👤 /staff page</LinkBtn>
          )}
          {host && (
            <LinkBtn href={`https://${host}/about`}>ℹ /about page</LinkBtn>
          )}
          {host && (
            <LinkBtn href={`https://www.whois.com/whois/${host}`}>🔎 Whois</LinkBtn>
          )}
          <LinkBtn href={reg.url}>📋 {reg.label}</LinkBtn>
          <LinkBtn href={`mailto:?subject=Your%20application%20for%20${encodeURIComponent(app.church_name)}&body=Hi%20${encodeURIComponent(app.full_name.split(' ')[0])}%2C%0A%0A`}>
            ✉ Email pastor
          </LinkBtn>
        </div>
      )}

      {/* Action row — only on pending */}
      {app.status === 'pending' && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', borderTop: `1px solid ${T.line}`, paddingTop: 14 }}>
          <button
            onClick={onCopyApprove}
            style={{
              background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
              padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            ⌘ Copy approve SQL
          </button>
          {!showRejectInput ? (
            <button
              onClick={() => setShowRejectInput(true)}
              style={{
                background: 'transparent', color: '#9A3A3A', border: `1px solid #9A3A3A`,
                borderRadius: 999, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              ✕ Reject…
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 8, flex: 1, minWidth: 280 }}>
              <input
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder="Why? (shown to applicant)"
                autoFocus
                style={{
                  flex: 1, border: `1px solid ${T.line}`, borderRadius: 8,
                  padding: '8px 12px', fontSize: 13.5, fontFamily: T.serif,
                  background: T.cream, color: T.ink, outline: 'none',
                }}
              />
              <button
                onClick={() => { onCopyReject(rejectNotes); setShowRejectInput(false); setRejectNotes(''); }}
                disabled={!rejectNotes.trim()}
                style={{
                  background: '#9A3A3A', color: T.cream, border: 'none', borderRadius: 8,
                  padding: '8px 14px', fontSize: 13, fontWeight: 600,
                  cursor: rejectNotes.trim() ? 'pointer' : 'not-allowed',
                  opacity: rejectNotes.trim() ? 1 : 0.5,
                }}
              >Copy</button>
              <button
                onClick={() => { setShowRejectInput(false); setRejectNotes(''); }}
                style={{
                  background: 'transparent', color: T.inkMuted, border: 'none',
                  fontSize: 13, cursor: 'pointer', padding: '0 6px',
                }}
              >cancel</button>
            </div>
          )}
        </div>
      )}

      {/* Already-handled rows show the previous decision inline */}
      {app.status === 'rejected' && app.notes && (
        <div style={{ borderTop: `1px solid ${T.line}`, paddingTop: 12, marginTop: 4, fontSize: 13, color: T.inkSoft }}>
          <span style={{ color: T.inkMuted, fontWeight: 600 }}>Sent to applicant:</span>{' '}
          <span style={{ fontFamily: T.serif, fontStyle: 'italic' }}>{app.notes}</span>
        </div>
      )}
      {app.status === 'approved' && (
        <div style={{ borderTop: `1px solid ${T.line}`, paddingTop: 12, marginTop: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 13, color: T.inkSoft }}>
              <span style={{ color: T.inkMuted, fontWeight: 600 }}>
                {app.auto_approved_at ? 'Auto-approved' : 'Approved'}:
              </span>{' '}
              <span style={{ fontFamily: T.serif }}>
                {relativeTime(app.auto_approved_at ?? app.reviewed_at ?? app.created_at)}
                {app.auto_approved_at && app.verification_method ? ` via ${app.verification_method}` : ''}
              </span>
              {' — church is live on kinwove'}
            </span>
            <button
              onClick={showEdit ? () => setShowEdit(false) : openEdit}
              style={{
                background: 'transparent', border: `1px solid ${T.line}`,
                borderRadius: 999, padding: '5px 14px', fontSize: 12.5,
                color: T.inkSoft, cursor: 'pointer',
              }}
            >
              {showEdit ? 'Close' : '✏ Edit church'}
            </button>
          </div>

          {showEdit && (
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {church === null && !editMsg && (
                <div style={{ fontSize: 13, color: T.inkMuted, fontStyle: 'italic' }}>Loading…</div>
              )}
              {editMsg && !church && (
                <div style={{ fontSize: 13, color: '#9A3A3A' }}>{editMsg}</div>
              )}
              {church && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                    {EDITABLE_FIELDS.map(({ key, label }) => (
                      <div key={key}>
                        <div style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: T.inkMuted, fontWeight: 600, marginBottom: 4 }}>
                          {label}
                        </div>
                        <input
                          value={editForm[key] ?? ''}
                          onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                          style={{
                            width: '100%', border: `1px solid ${T.line}`, borderRadius: 8,
                            padding: '8px 10px', fontSize: 13.5, fontFamily: T.serif,
                            background: T.cream, color: T.ink, outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                    <button
                      onClick={saveEdit}
                      disabled={saving}
                      style={{
                        background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
                        padding: '9px 20px', fontSize: 13, fontWeight: 600,
                        cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
                      }}
                    >
                      {saving ? 'Saving…' : 'Save changes'}
                    </button>
                    {editMsg && <span style={{ fontSize: 13, color: editMsg === 'Saved.' ? T.goldDark : '#9A3A3A' }}>{editMsg}</span>}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function Datum({ label, value, fullWidth }) {
  return (
    <div style={fullWidth ? { gridColumn: '1 / -1' } : undefined}>
      <div style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: T.inkMuted, fontWeight: 600, marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ color: T.ink, fontSize: 13.5, lineHeight: 1.5, wordBreak: 'break-word' }}>
        {value}
      </div>
    </div>
  );
}

function LinkBtn({ href, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: T.cream, border: `1px solid ${T.line}`, borderRadius: 999,
        padding: '7px 14px', fontSize: 12.5, color: T.inkSoft,
        textDecoration: 'none', cursor: 'pointer',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.gold; e.currentTarget.style.color = T.ink; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.line; e.currentTarget.style.color = T.inkSoft; }}
    >
      {children}
    </a>
  );
}
