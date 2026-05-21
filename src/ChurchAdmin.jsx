import { lazy, Suspense, useEffect, useState } from 'react';
import { Download, Copy, Check, QrCode } from 'lucide-react';
import { supabase } from './supabase.js';
import { T } from './theme.js';
import Badge, { INVITABLE_ROLES, presetForRole } from './Badge.jsx';
import { useUiKit, EmptyState, TextButton } from './uikit.jsx';
import ChurchModeShell from './ChurchModeShell.jsx';
import FlagPicker from './FlagPicker.jsx';

const PastorDashboard = lazy(() => import('./PastorDashboard.jsx'));
const SermonComposer  = lazy(() => import('./SermonComposer.jsx'));

function qrUrl(url) {
  return `https://quickchart.io/qr?text=${encodeURIComponent(url)}&size=320&margin=2&dark=2C1810&light=FDF8F0`;
}

const CHURCH_BANNER_PRESETS = [
  { key: 'ink',    label: 'Ink',      bg: '#1e1208' },
  { key: 'forest', label: 'Sage',     bg: '#2e3e28' },
  { key: 'night',  label: 'Midnight', bg: '#1c2a38' },
  { key: 'clay',   label: 'Cedar',    bg: '#4a2a14' },
  { key: 'plum',   label: 'Plum',     bg: '#32183a' },
  { key: 'sea',    label: 'Teal',     bg: '#163430' },
  { key: 'slate',  label: 'Stone',    bg: '#2e2a22' },
  { key: 'rose',   label: 'Burgundy', bg: '#3a1618' },
];
export function churchBannerBg(church) {
  const preset = CHURCH_BANNER_PRESETS.find((p) => p.key === (church?.banner_preset ?? 'ink'));
  return preset?.bg ?? CHURCH_BANNER_PRESETS[0].bg;
}

// Templated announcement copy — paste-ready for group text / pulpit slide.
// Hoisted so PeoplePanel (invite card) and SettingsPanel (QR modal) stay in
// sync. Tone: warm and grounded, not salesy. Uses the church's own name as
// the proper noun; avoids "app" / "platform" framing.
function buildAnnouncementText(churchName, link) {
  const name = (churchName ?? '').trim() || 'our church';
  return [
    `Hey ${name} family — we're trying something new.`,
    '',
    'kinwove is a quiet space between Sundays — for questions, prayer, and going deeper with what we hear on Sunday. No noise, no algorithms. Just our church.',
    '',
    `Join here: ${link}`,
  ].join('\n');
}

function EngageCards({ church, churchId, session, onChurchUpdate }) {
  const { showToast } = useUiKit();

  // Question of the Day
  const [qotdDraft, setQotdDraft]   = useState(church?.question_of_day ?? '');
  const [savingQotd, setSavingQotd] = useState(false);
  useEffect(() => { setQotdDraft(church?.question_of_day ?? ''); }, [church?.question_of_day]);

  async function saveQotd() {
    if (!churchId || !qotdDraft.trim()) return;
    setSavingQotd(true);
    const question = qotdDraft.trim();
    const { error } = await supabase.from('churches').update({
      question_of_day: question,
      question_of_day_set_at: new Date().toISOString(),
      question_of_day_set_by: session?.user?.id,
    }).eq('id', churchId);
    if (error) { showToast(`Couldn't save: ${error.message}`, 'error'); setSavingQotd(false); return; }
    const { data: members } = await supabase.from('profiles').select('id').eq('church_id', churchId).neq('id', session?.user?.id ?? '');
    if (members?.length) {
      await supabase.from('notifications').insert(members.map(m => ({
        recipient_id: m.id, actor_id: session?.user?.id,
        kind: 'church_question_of_day', data: { church_id: churchId, question },
      })));
    }
    onChurchUpdate?.({ question_of_day: question, question_of_day_set_at: new Date().toISOString() });
    setSavingQotd(false);
    showToast('Question set \u2014 your church has been notified.', 'success');
  }

  async function clearQotd() {
    if (!churchId) return;
    const { error } = await supabase.from('churches').update({ question_of_day: null, question_of_day_set_at: null, question_of_day_set_by: null }).eq('id', churchId);
    if (error) { showToast(`Couldn't clear: ${error.message}`, 'error'); return; }
    setQotdDraft('');
    onChurchUpdate?.({ question_of_day: null, question_of_day_set_at: null });
    showToast('Question cleared.', 'success');
  }

  // Featured Walk
  const [walks, setWalks] = useState([]);
  const [savingFeatured, setSavingFeatured] = useState(false);
  useEffect(() => {
    let cancelled = false;
    supabase.from('walks').select('id, title, subtitle, cover_emoji, length_days, sort_order').eq('is_published', true).order('sort_order', { ascending: true })
      .then(({ data }) => { if (!cancelled) setWalks(data ?? []); });
    return () => { cancelled = true; };
  }, []);

  async function setFeaturedWalk(nextId) {
    if (!churchId) return;
    setSavingFeatured(true);
    const { error } = await supabase.from('churches').update({ featured_walk_id: nextId }).eq('id', churchId);
    setSavingFeatured(false);
    if (error) { showToast(`Couldn't save: ${error.message}`, 'error'); return; }
    onChurchUpdate?.({ featured_walk_id: nextId });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 20px 80px', maxWidth: 640, margin: '0 auto' }}>


      {/* ── Danger zone — ownership transfer ───────────────────────── */}
      <div style={{
        background: T.white, border: '1px solid rgba(165,63,43,0.35)',
        borderLeft: '4px solid #a53f2b', borderRadius: 14, padding: '16px 18px',
      }}>
        <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#a53f2b', fontWeight: 700, marginBottom: 6 }}>
          Danger zone
        </div>
        <div style={{ fontFamily: T.display, fontSize: 17, fontWeight: 600, color: T.ink, marginBottom: 4 }}>
          Transfer church ownership
        </div>
        <div style={{ fontSize: 13.5, color: T.inkSoft, lineHeight: 1.55, marginBottom: 12 }}>
          Hand this church account to another member. They become the lead admin. You keep a staff role but lose owner access immediately.
        </div>
        <button
          onClick={openTransfer}
          style={{
            background: 'transparent', border: '1px solid rgba(165,63,43,0.5)',
            borderRadius: 999, padding: '8px 16px', fontSize: 13,
            color: '#a53f2b', fontWeight: 600, cursor: 'pointer',
          }}
        >Transfer ownership…</button>
      </div>

      {/* Transfer modal */}
      {transferOpen && (
        <div
          onClick={() => !transferBusy && setTransferOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(44,24,16,0.70)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="modal-sheet"
            style={{
              background: T.cream, borderRadius: 18, maxWidth: 440, width: '100%',
              maxHeight: '90vh', overflowY: 'auto',
              padding: '24px 22px', border: '1px solid rgba(165,63,43,0.4)',
            }}
          >
            <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#a53f2b', fontWeight: 700, marginBottom: 4 }}>
              Transfer ownership
            </div>
            <div style={{ fontFamily: T.display, fontSize: 21, fontWeight: 600, color: T.ink, letterSpacing: '-0.018em', marginBottom: 16 }}>
              Who takes over {church?.name}?
            </div>

            {!transferConfirm ? (
              <>
                <div style={{ marginBottom: 14, position: 'relative' }}>
                  <label style={{ display: 'block', fontSize: 12, color: T.inkSoft, fontWeight: 600, marginBottom: 4 }}>
                    Search church members
                  </label>
                  {transferTarget ? (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: T.parchment, border: `1px solid ${T.goldLight}`,
                      borderRadius: 10, padding: '9px 12px',
                    }}>
                      <span style={{ flex: 1, fontSize: 14, color: T.ink, fontWeight: 600 }}>{transferTarget.display_name}</span>
                      <button
                        onClick={() => { setTransferTarget(null); setTransferSearch(''); setTransferResults([]); }}
                        style={{ background: 'none', border: 'none', color: T.inkMuted, cursor: 'pointer', fontSize: 16, padding: 0 }}
                      >×</button>
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={transferSearch}
                        onChange={(e) => setTransferSearch(e.target.value)}
                        placeholder="Type a name…"
                        autoFocus
                        style={{
                          width: '100%', boxSizing: 'border-box',
                          border: `1px solid ${T.line}`, borderRadius: 10, padding: '9px 12px',
                          fontFamily: 'inherit', fontSize: 14, color: T.ink,
                          background: T.white, outline: 'none',
                        }}
                      />
                      {transferResults.length > 0 && (
                        <div style={{
                          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                          background: T.white, border: `1px solid ${T.line}`, borderRadius: 10,
                          boxShadow: '0 4px 16px rgba(0,0,0,0.12)', marginTop: 4, overflow: 'hidden',
                        }}>
                          {transferResults.map(r => (
                            <button
                              key={r.id}
                              onClick={() => { setTransferTarget(r); setTransferSearch(''); setTransferResults([]); }}
                              style={{
                                display: 'block', width: '100%', textAlign: 'left',
                                background: 'none', border: 'none', padding: '10px 14px',
                                fontSize: 14, color: T.ink, cursor: 'pointer', fontFamily: 'inherit',
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = T.parchment; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                            >{r.display_name}</button>
                          ))}
                        </div>
                      )}
                      {transferSearch.trim().length > 1 && transferResults.length === 0 && (
                        <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 6, fontStyle: 'italic' }}>
                          No members found — they need to join this church first.
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button onClick={() => setTransferOpen(false)} style={{
                    flex: '0 0 auto', background: 'transparent', border: `1px solid ${T.line}`,
                    borderRadius: 999, padding: '10px 18px', fontSize: 13, color: T.inkMuted, cursor: 'pointer',
                  }}>Cancel</button>
                  <button
                    onClick={() => setTransferConfirm(true)}
                    disabled={!transferTarget}
                    style={{
                      flex: 1, background: transferTarget ? '#a53f2b' : T.parchment,
                      color: transferTarget ? T.cream : T.inkMuted,
                      border: 'none', borderRadius: 999, padding: '10px 18px',
                      fontSize: 13.5, fontWeight: 600,
                      cursor: transferTarget ? 'pointer' : 'not-allowed',
                      opacity: transferTarget ? 1 : 0.6,
                    }}
                  >Continue →</button>
                </div>
              </>
            ) : (
              <>
                <div style={{
                  background: 'rgba(165,63,43,0.06)', border: '1px solid rgba(165,63,43,0.25)',
                  borderRadius: 12, padding: '14px 16px', marginBottom: 16,
                }}>
                  <div style={{ fontSize: 13.5, color: T.ink, lineHeight: 1.6 }}>
                    <strong>{transferTarget.display_name}</strong> will become the owner of <strong>{church?.name}</strong>.<br />
                    You will lose admin access immediately and cannot undo this yourself.
                  </div>
                </div>

                {transferError && (
                  <div style={{ fontSize: 12.5, color: T.error, marginBottom: 10 }}>{transferError}</div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setTransferConfirm(false)}
                    disabled={transferBusy}
                    style={{
                      flex: '0 0 auto', background: 'transparent', border: `1px solid ${T.line}`,
                      borderRadius: 999, padding: '10px 18px', fontSize: 13, color: T.inkMuted,
                      cursor: transferBusy ? 'wait' : 'pointer',
                    }}
                  >← Back</button>
                  <button
                    onClick={executeTransfer}
                    disabled={transferBusy}
                    style={{
                      flex: 1, background: '#a53f2b', color: T.cream,
                      border: 'none', borderRadius: 999, padding: '10px 18px',
                      fontSize: 13.5, fontWeight: 600,
                      cursor: transferBusy ? 'wait' : 'pointer',
                      opacity: transferBusy ? 0.6 : 1,
                    }}
                  >{transferBusy ? 'Transferring…' : `Transfer to ${transferTarget.display_name}`}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* QR modal (pastor-only context — print-for-bulletin language) */}
      {showQr && publicUrl && (
        <div
          onClick={() => setShowQr(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(44,24,16,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="modal-sheet"
            style={{
              background: T.cream, borderRadius: 18, maxWidth: 400, width: '100%',
              padding: '28px 24px', textAlign: 'center', border: `1px solid ${T.line}`,
            }}
          >
            <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 8 }}>
              Scan to join
            </div>
            <div style={{ fontFamily: T.serif, fontSize: 24, fontWeight: 600, color: T.ink, letterSpacing: '-0.018em', lineHeight: 1.12, marginBottom: 16 }}>
              {church?.name}
            </div>
            <div style={{
              background: T.white, borderRadius: 14, padding: 16, display: 'inline-block',
              border: `1px solid ${T.line}`, marginBottom: 16,
            }}>
              <img src={qrUrl(publicUrl)} alt="QR code" width={260} height={260} style={{ display: 'block' }} />
            </div>
            <div style={{ fontSize: 13, color: T.inkSoft, lineHeight: 1.55, marginBottom: 18, padding: '0 8px' }}>
              Print this for the bulletin, project it on Sunday, or send the link below.
            </div>
            <div style={{
              background: T.parchment, borderRadius: 10, padding: '10px 12px',
              fontSize: 12, color: T.inkSoft, fontFamily: 'monospace', wordBreak: 'break-all', marginBottom: 16,
            }}>
              {publicUrl}
            </div>
            {/* Sharing actions, ranked: print/download (most physical),
                copy a ready-to-paste announcement, copy raw link, close.
                Two-row layout keeps the touch targets ≥44px on phones. */}
            <div style={{ display: 'grid', gap: 8 }}>
              <button
                onClick={downloadQr}
                disabled={downloadingQr}
                style={{
                  background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
                  padding: '11px 16px', fontSize: 14, fontWeight: 600,
                  cursor: downloadingQr ? 'wait' : 'pointer',
                  opacity: downloadingQr ? 0.7 : 1,
                }}
              >
                {downloadingQr ? 'Preparing…' : <><Download size={14} strokeWidth={2} style={{ marginRight: 6 }} />Download QR (PNG)</>}
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={copyAnnouncement} style={{
                  flex: 1, background: 'transparent', border: `1px solid ${T.goldDark}`,
                  color: T.goldDark, borderRadius: 999,
                  padding: '11px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}>
                  {announceCopied ? <><Check size={13} strokeWidth={2.5} /> Copied — paste anywhere</> : <><Copy size={13} strokeWidth={2} /> Copy announcement</>}
                </button>
                <button onClick={copyLink} style={{
                  background: 'transparent', border: `1px solid ${T.line}`, borderRadius: 999,
                  padding: '11px 16px', fontSize: 14, color: T.inkSoft, cursor: 'pointer',
                  whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6,
                }}>
                  {copied ? <><Check size={13} strokeWidth={2.5} /> Link</> : 'Copy link'}
                </button>
              </div>
              <div style={{ fontSize: 12, color: T.inkMuted, lineHeight: 1.5, marginTop: 2, padding: '0 4px' }}>
                The announcement is a warm, ready-to-paste note for your group text or pulpit slide.
              </div>
              <button onClick={() => setShowQr(false)} style={{
                background: 'transparent', border: 'none',
                padding: '8px 16px', fontSize: 13, color: T.inkMuted, cursor: 'pointer',
                marginTop: 4,
              }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const FILTERS = [
  { id: 'all',      label: 'All' },
  { id: 'requests', label: 'Join requests' },
  { id: 'roles',    label: 'With roles' },
  { id: 'care',    label: 'Care team' },
  { id: 'pending', label: 'Pending invites' },
  { id: 'blocked', label: 'Blocked' },
];

function InviteModal({ member, existingRoles, onClose, onSubmit }) {
  const [roleKey, setRoleKey] = useState(INVITABLE_ROLES[0].key);
  const [customLabel, setCustomLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const isCustom = roleKey === '__custom__';
  const preset = presetForRole(roleKey);
  const alreadyHas = (existingRoles ?? []).some((r) => r.role_key === roleKey);

  async function submit() {
    setErr(null);
    if (isCustom && !customLabel.trim()) {
      setErr('Give the role a short name.');
      return;
    }
    setBusy(true);
    const payload = isCustom
      ? { role_key: customLabel.trim().toLowerCase().replace(/\s+/g, '_').slice(0, 32),
          role_label: customLabel.trim().slice(0, 40) }
      : { role_key: roleKey, role_label: null };
    const r = await onSubmit(payload);
    setBusy(false);
    if (r?.error) setErr(r.error);
  }

  return (
    <div onClick={() => !busy && onClose()} style={{
      position: 'fixed', inset: 0, background: 'rgba(44,24,16,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} className="modal-sheet" style={{
        background: T.cream, borderRadius: 16, maxWidth: 480, width: '100%',
        padding: 'clamp(20px, 4vw, 26px)', border: `1px solid ${T.line}`,
      }}>
        <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 600, color: T.ink, marginBottom: 6 }}>
          Assign a role
        </div>
        <p style={{ fontSize: 14, color: T.inkSoft, lineHeight: 1.55, margin: '0 0 14px' }}>
          <strong>{member.display_name ?? 'This member'}</strong> will be assigned this role immediately.
          A badge appears next to their name in your church.
        </p>

        <div style={{ fontSize: 11.5, letterSpacing: 1.4, textTransform: 'uppercase', color: T.inkMuted, fontWeight: 700, marginBottom: 8 }}>
          Role
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {INVITABLE_ROLES.map((r) => {
            const active = roleKey === r.key;
            return (
              <button key={r.key} onClick={() => setRoleKey(r.key)} style={{
                background: active ? T.ink : 'transparent',
                color:      active ? T.cream : T.inkSoft,
                border:     active ? 'none' : `1px solid ${T.line}`,
                borderRadius: 999, padding: '7px 13px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
              }}>
                <span style={{ marginRight: 5 }}>{r.emoji}</span>{r.label}
              </button>
            );
          })}
          <button onClick={() => setRoleKey('__custom__')} style={{
            background: isCustom ? T.ink : 'transparent',
            color:      isCustom ? T.cream : T.inkSoft,
            border:     isCustom ? 'none' : `1px dashed ${T.line}`,
            borderRadius: 999, padding: '7px 13px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
          }}>
            + Custom
          </button>
        </div>

        {isCustom && (
          <input
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder="e.g. Greeter, Treasurer"
            maxLength={40}
            style={{
              width: '100%', boxSizing: 'border-box',
              border: `1px solid ${T.line}`, borderRadius: 10, padding: '10px 12px',
              fontSize: 14, fontFamily: 'inherit', background: T.white, color: T.ink, outline: 'none',
              marginBottom: 12,
            }}
          />
        )}

        {!isCustom && preset?.blurb && (
          <p style={{ fontSize: 12.5, color: T.inkMuted, fontStyle: 'italic', margin: '0 0 12px', lineHeight: 1.5 }}>
            {preset.blurb}
          </p>
        )}

        {alreadyHas && (
          <div style={{
            fontSize: 13, color: T.goldDark, padding: '8px 10px', background: T.parchment,
            borderRadius: 8, marginBottom: 12,
          }}>
            They already have this role. You can revoke it from their card if you want to start fresh.
          </div>
        )}

        {err && (
          <div style={{
            fontSize: 13, color: T.error, padding: '8px 10px', background: 'rgba(165,63,43,0.08)',
            borderRadius: 8, marginBottom: 12,
          }}>
            {err}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} disabled={busy} style={{
            background: 'transparent', border: `1px solid ${T.line}`, borderRadius: 999,
            padding: '9px 16px', fontSize: 13, color: T.inkSoft, cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={submit} disabled={busy || alreadyHas} style={{
            background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
            padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            opacity: (busy || alreadyHas) ? 0.5 : 1,
          }}>{busy ? 'Assigning…' : 'Assign role'}</button>
        </div>
      </div>
    </div>
  );
}

function PeoplePanel({ session, church, churchId, onChurchUpdate, onShowQr }) {
  const [members, setMembers]   = useState([]);
  const [rolesByUser, setRolesByUser] = useState({});  // { user_id: [role rows] }
  const [pendingInvites, setPendingInvites] = useState([]);  // [{...invite, user_profile}]
  const [joinRequests, setJoinRequests] = useState([]);  // pending join requests
  const [blocked, setBlocked]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('all');
  const [reviewBusy, setReviewBusy] = useState(null); // request id being actioned

  const [copied, setCopied]       = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [announceCopied, setAnnounceCopied] = useState(false);
  const [rotating, setRotating]   = useState(false);
  const [confirmRotate, setConfirmRotate] = useState(false);

  const [removingId, setRemovingId] = useState(null);
  const [scrubPosts, setScrubPosts] = useState(false);
  const [removeBusy, setRemoveBusy] = useState(false);

  const [invitingMember, setInvitingMember] = useState(null);  // member object or null

  const { showToast, askConfirm, ui: uikitUi } = useUiKit();

  const code = church?.invite_code ?? '';
  const joinUrl = (typeof window !== 'undefined' && code)
    ? `${window.location.origin}/?join=${code}`
    : '';

  async function loadAll() {
    if (!churchId) return;
    setLoading(true);

    const [
      { data: memberRows },
      { data: roleRows },
      { data: inviteRows },
      { data: blockRows },
      { data: joinReqRows },
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, display_name, city, country')
        .eq('church_id', churchId)
        .order('display_name', { ascending: true }),
      supabase
        .from('church_roles')
        .select('id, user_id, role_key, role_label, role_title, is_owner, granted_at')
        .eq('church_id', churchId),
      supabase
        .from('church_role_invites')
        .select('id, user_id, role_key, role_label, message, status, created_at')
        .eq('church_id', churchId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
      supabase
        .from('church_blocks')
        .select('user_id, blocked_at')
        .eq('church_id', churchId),
      supabase
        .from('church_join_requests')
        .select('id, user_id, created_at, profiles(display_name, city, country)')
        .eq('church_id', churchId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true }),
    ]);

    const m = memberRows ?? [];
    setMembers(m);
    setJoinRequests((joinReqRows ?? []).map(r => ({
      ...r, display_name: r.profiles?.display_name ?? 'Member',
      city: r.profiles?.city, country: r.profiles?.country,
    })));

    const rolesMap = {};
    (roleRows ?? []).forEach((r) => {
      (rolesMap[r.user_id] ||= []).push(r);
    });
    setRolesByUser(rolesMap);

    // Hydrate invitee + blocked profiles in a SINGLE .in() — they're typically
    // disjoint (you don't invite blocked users) so the round-trip + RLS
    // overhead of two queries was pure waste.
    const invitedIds = [...new Set((inviteRows ?? []).map((i) => i.user_id))];
    const blockedIds = [...new Set((blockRows  ?? []).map((b) => b.user_id))];
    const lookupIds  = [...new Set([...invitedIds, ...blockedIds])];

    let lookup = {};
    if (lookupIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', lookupIds);
      (profs ?? []).forEach((p) => { lookup[p.id] = p; });
    }

    setPendingInvites((inviteRows ?? []).map((i) => ({
      ...i,
      user_profile: lookup[i.user_id] ?? null,
    })));
    setBlocked((blockRows ?? []).map((b) => ({
      ...b,
      user_profile: lookup[b.user_id] ?? null,
    })));

    setLoading(false);
  }

  useEffect(() => { loadAll(); }, [churchId]);

  async function copy(text, which) {
    try { await navigator.clipboard.writeText(text); } catch { return; }
    if (which === 'code') { setCopied(true); setTimeout(() => setCopied(false), 1400); }
    else { setLinkCopied(true); setTimeout(() => setLinkCopied(false), 1400); }
  }

  // Pre-written announcement matching the QR modal's copy. The People-tab
  // pastor shouldn't have to navigate to Settings to reach this affordance —
  // they're already in "share" mindset here. Same template, same tone.
  async function copyAnnouncement() {
    if (!joinUrl) return;
    try {
      await navigator.clipboard.writeText(buildAnnouncementText(church?.name, joinUrl));
      setAnnounceCopied(true);
      setTimeout(() => setAnnounceCopied(false), 2200);
    } catch (_) {
      showToast("Couldn't copy — long-press to copy manually.", 'error');
    }
  }

  async function reviewRequest(requestId, userId, approve) {
    setReviewBusy(requestId);
    if (approve) {
      const { error } = await supabase.from('profiles')
        .update({ church_id: churchId })
        .eq('id', userId);
      if (error) { showToast(`Couldn't approve: ${error.message}`, 'error'); setReviewBusy(null); return; }
    }
    await supabase.from('church_join_requests')
      .update({ status: approve ? 'approved' : 'declined', reviewed_by: session?.user?.id, reviewed_at: new Date().toISOString() })
      .eq('id', requestId);
    setJoinRequests(prev => prev.filter(r => r.id !== requestId));
    if (approve) await loadAll(); // refresh member list
    showToast(approve ? 'Member approved and added.' : 'Request declined.', approve ? 'success' : 'info');
    setReviewBusy(null);
  }

  async function rotateCode() {
    setRotating(true);
    setConfirmRotate(false);
    const { data: gen } = await supabase.rpc('gen_church_invite_code');
    const newCode = gen ?? null;
    if (!newCode) { setRotating(false); return; }
    const { data, error } = await supabase
      .from('churches')
      .update({ invite_code: newCode, invite_code_rotated_at: new Date().toISOString() })
      .eq('id', churchId)
      .select('invite_code, invite_code_rotated_at')
      .single();
    setRotating(false);
    if (error) { showToast(`Couldn't rotate code: ${error.message}`, 'error'); return; }
    onChurchUpdate?.(data);
    showToast('New invite code generated.', 'success');
  }

  const removingMember = members.find((m) => m.id === removingId) ?? null;

  async function confirmRemove() {
    if (!removingId) return;
    setRemoveBusy(true);
    // 1. Insert into church_blocks (prevents rejoin via code + insert via RLS)
    const { error: blockErr } = await supabase
      .from('church_blocks')
      .upsert({
        church_id: churchId,
        user_id: removingId,
        blocked_by: session?.user?.id ?? null,
      }, { onConflict: 'church_id,user_id' });
    if (blockErr) {
      setRemoveBusy(false);
      showToast(`Couldn't remove member: ${blockErr.message}`, 'error');
      return;
    }
    // 2. Detach them from the church (trigger cleans up roles + invites)
    await supabase.from('profiles').update({ church_id: null }).eq('id', removingId);
    // 3. Optionally scrub their posts
    if (scrubPosts) {
      await supabase.from('posts').delete()
        .eq('author_id', removingId).eq('scope', 'church').eq('scope_id', churchId);
    }
    setRemoveBusy(false);
    setRemovingId(null);
    setScrubPosts(false);
    loadAll();
    showToast('Member removed.', 'success');
  }

  async function unblock(userId) {
    const { error } = await supabase
      .from('church_blocks')
      .delete()
      .eq('church_id', churchId)
      .eq('user_id', userId);
    if (error) { showToast(`Couldn't unblock: ${error.message}`, 'error'); return; }
    loadAll();
    showToast('Member unblocked.', 'success');
  }

  async function cancelInvite(inviteId) {
    const { error } = await supabase
      .from('church_role_invites')
      .update({ status: 'cancelled' })
      .eq('id', inviteId);
    if (error) { showToast(`Couldn't cancel invite: ${error.message}`, 'error'); return; }
    loadAll();
  }

  async function revokeRole(role, displayName) {
    const presetLabel = presetForRole(role.role_key)?.label ?? role.role_label ?? role.role_key;
    const ok = await askConfirm({
      title: `Revoke ${presetLabel}?`,
      body: `${displayName} will lose this role and its responsibilities. They'll stay in the church.`,
      confirmLabel: 'Revoke',
      danger: true,
    });
    if (!ok) return;
    const { error } = await supabase
      .from('church_roles')
      .delete()
      .eq('id', role.id);
    if (error) { showToast(`Couldn't revoke role: ${error.message}`, 'error'); return; }
    loadAll();
    showToast(`${presetLabel} revoked.`, 'success');
  }

  async function grantRole({ user_id, role_key, role_label }) {
    const { error } = await supabase
      .from('church_roles')
      .upsert({
        church_id:  churchId,
        user_id,
        role_key,
        role_label: role_label ?? null,
        granted_by: session?.user?.id ?? null,
      }, { onConflict: 'church_id,user_id,role_key' });
    if (error) return { error: error.message };
    loadAll();
    return { error: null };
  }

  // Filter the visible member list based on the active filter chip
  const filteredMembers = members.filter((m) => {
    if (filter === 'all' || filter === 'pending' || filter === 'blocked') return true;
    const roles = rolesByUser[m.id] ?? [];
    if (filter === 'roles') return roles.length > 0;
    return roles.some((r) => r.role_key === filter);
  });

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {uikitUi}
      {/* Invite code card */}
      <div style={{
        background: `linear-gradient(135deg, ${T.parchment} 0%, ${T.parchmentDark} 100%)`,
        border: `1px solid ${T.line}`, borderRadius: 14,
        padding: '18px 20px',
      }}>
        <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 8 }}>
          ✦ Church invite code
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{
            fontFamily: 'ui-monospace, SFMono-Regular, monospace',
            fontSize: 28, fontWeight: 700, letterSpacing: 4, color: T.ink,
            background: T.white, border: `1px solid ${T.line}`, borderRadius: 10,
            padding: '8px 16px',
          }}>
            {code || '—'}
          </div>
          <button onClick={() => copy(code, 'code')} disabled={!code} style={{
            background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
            padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: code ? 'pointer' : 'not-allowed', opacity: code ? 1 : 0.5,
          }}>{copied ? 'Copied ✓' : 'Copy code'}</button>
          {joinUrl && (
            <button onClick={() => copy(joinUrl, 'link')} style={{
              background: 'transparent', border: `1px solid ${T.line}`, borderRadius: 999,
              padding: '8px 14px', fontSize: 13, color: T.inkSoft, cursor: 'pointer',
            }}>{linkCopied ? 'Copied ✓' : 'Copy join link'}</button>
          )}
        </div>
        <p style={{ fontFamily: T.serif, fontSize: 13.5, color: T.inkSoft, lineHeight: 1.6, margin: '12px 0 0' }}>
          Anyone with a profile in kinwove can join your church by entering this code.
          Share it during a service, in a group chat, or by sending the link.
        </p>
        {/* Secondary share affordances — pre-written announcement (matches the
            QR modal) + a path back to the QR for printing. Without these the
            People-tab pastor was a tab-switch away from the polish we built
            in Settings, and the empty-state nudge said "share the code"
            without giving them a graceful way to actually do it. */}
        {joinUrl && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
            <button onClick={copyAnnouncement} style={{
              background: 'transparent', border: `1px solid ${T.goldDark}`,
              color: T.goldDark, borderRadius: 999,
              padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              {announceCopied ? <><Check size={13} strokeWidth={2.5} /> Copied — paste anywhere</> : <><Copy size={13} strokeWidth={2} /> Copy announcement</>}
            </button>
            {onShowQr && (
              <button onClick={onShowQr} style={{
                background: 'transparent', border: `1px solid ${T.line}`,
                color: T.inkSoft, borderRadius: 999,
                padding: '8px 14px', fontSize: 13, cursor: 'pointer',
              }}>
                <QrCode size={14} strokeWidth={2} style={{ marginRight: 6 }} />Show QR code
              </button>
            )}
          </div>
        )}
        <button onClick={() => setConfirmRotate(true)} style={{
          background: 'transparent', border: 'none', color: T.goldDark, fontSize: 12.5,
          padding: 0, marginTop: 12, cursor: 'pointer', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3,
        }}>
          Reset code…
        </button>
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', overflowX: 'auto' }}>
        {FILTERS.map((f) => {
          const count =
            f.id === 'requests' ? joinRequests.length :
            f.id === 'pending'  ? pendingInvites.length :
            f.id === 'blocked'  ? blocked.length :
            f.id === 'all'      ? members.length :
            f.id === 'roles'    ? Object.values(rolesByUser).filter((rs) => rs.length > 0).length :
            members.filter((m) => (rolesByUser[m.id] ?? []).some((r) => r.role_key === f.id)).length;
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                background: active ? T.ink : 'transparent',
                color:      active ? T.cream : T.inkSoft,
                border:     active ? 'none' : `1px solid ${T.line}`,
                borderRadius: 999, padding: '6px 12px',
                fontSize: 12.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {f.label} <span style={{ opacity: 0.7 }}>· {count}</span>
            </button>
          );
        })}
      </div>

      {/* Join requests pane */}
      {filter === 'requests' && (
        <div style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 14, padding: '14px 18px' }}>
          <div style={{ fontFamily: T.display, fontSize: 18, fontWeight: 600, color: T.ink, marginBottom: 4 }}>
            Join requests
          </div>
          <div style={{ fontSize: 13, color: T.inkSoft, marginBottom: 14 }}>
            People who asked to join {church?.name}. Approve to add them as members.
          </div>
          {joinRequests.length === 0 ? (
            <div style={{ color: T.inkMuted, fontStyle: 'italic', padding: 12, lineHeight: 1.6 }}>
              No pending requests. {!church?.open_join && 'Approval mode is on — new requests will appear here.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {joinRequests.map(r => (
                <div key={r.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: T.parchment, borderRadius: 12, padding: '12px 14px',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{r.display_name}</div>
                    {(r.city || r.country) && (
                      <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 2 }}>
                        {[r.city, r.country].filter(Boolean).join(', ')}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => reviewRequest(r.id, r.user_id, false)}
                    disabled={reviewBusy === r.id}
                    style={{
                      background: 'none', border: `1px solid ${T.line}`, borderRadius: 999,
                      padding: '6px 14px', fontSize: 12.5, color: T.inkMuted,
                      cursor: reviewBusy === r.id ? 'wait' : 'pointer',
                    }}
                  >Decline</button>
                  <button
                    onClick={() => reviewRequest(r.id, r.user_id, true)}
                    disabled={reviewBusy === r.id}
                    style={{
                      background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
                      padding: '6px 14px', fontSize: 12.5, fontWeight: 600,
                      cursor: reviewBusy === r.id ? 'wait' : 'pointer',
                      opacity: reviewBusy === r.id ? 0.5 : 1,
                    }}
                  >{reviewBusy === r.id ? '…' : 'Approve'}</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pending invites pane */}
      {filter === 'pending' && (
        <div style={{
          background: T.white, border: `1px solid ${T.line}`, borderRadius: 14,
          padding: '14px 18px',
        }}>
          <div style={{ fontFamily: T.display, fontSize: 18, fontWeight: 600, color: T.ink, marginBottom: 10 }}>
            Pending invites
          </div>
          {pendingInvites.length === 0 ? (
            <div style={{ color: T.inkMuted, fontStyle: 'italic', padding: 12, lineHeight: 1.6 }}>
              No pending invites. Open All members and tap "Invite to role" on someone.
            </div>
          ) : pendingInvites.map((inv) => {
            const preset = presetForRole(inv.role_key);
            return (
              <div key={inv.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 0', borderBottom: `1px solid ${T.line}`,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600, color: T.ink }}>
                    {inv.user_profile?.display_name ?? 'Member'}
                  </div>
                  <div style={{ fontSize: 12.5, color: T.inkMuted, marginTop: 2 }}>
                    Invited to {inv.role_label ?? preset?.label ?? inv.role_key} · {new Date(inv.created_at).toLocaleDateString()}
                  </div>
                </div>
                <Badge role={inv} />
                <button onClick={() => cancelInvite(inv.id)} style={{
                  background: 'transparent', border: `1px solid ${T.line}`, borderRadius: 999,
                  padding: '6px 12px', fontSize: 12, color: T.inkSoft, cursor: 'pointer',
                }}>Cancel</button>
              </div>
            );
          })}
        </div>
      )}

      {/* Blocked pane */}
      {filter === 'blocked' && (
        <div style={{
          background: T.white, border: `1px solid ${T.line}`, borderRadius: 14,
          padding: '14px 18px',
        }}>
          <div style={{ fontFamily: T.display, fontSize: 18, fontWeight: 600, color: T.ink, marginBottom: 10 }}>
            Blocked
          </div>
          {blocked.length === 0 ? (
            <div style={{ color: T.inkMuted, fontStyle: 'italic', padding: 12, lineHeight: 1.6 }}>
              No one's blocked. Members you remove from the church land here.
            </div>
          ) : blocked.map((b) => (
            <div key={b.user_id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 0', borderBottom: `1px solid ${T.line}`,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600, color: T.ink }}>
                  {b.user_profile?.display_name ?? 'Former member'}
                </div>
                <div style={{ fontSize: 12.5, color: T.inkMuted, marginTop: 2 }}>
                  Blocked {new Date(b.blocked_at).toLocaleDateString()}
                </div>
              </div>
              <button onClick={() => unblock(b.user_id)} style={{
                background: 'transparent', border: `1px solid ${T.line}`, borderRadius: 999,
                padding: '6px 12px', fontSize: 12, color: T.inkSoft, cursor: 'pointer',
              }}>Unblock</button>
            </div>
          ))}
        </div>
      )}

      {/* Member list */}
      {filter !== 'pending' && filter !== 'blocked' && (
        <div style={{
          background: T.white, border: `1px solid ${T.line}`, borderRadius: 14,
          padding: '14px 18px',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontFamily: T.display, fontSize: 18, fontWeight: 600, color: T.ink }}>
              {filter === 'all' ? 'Members' : filter === 'roles' ? 'Members with roles' : `${presetForRole(filter)?.label ?? filter} team`}
            </div>
            <div style={{ fontSize: 13, color: T.inkMuted }}>
              {loading ? '…' : `${filteredMembers.length} ${filteredMembers.length === 1 ? 'person' : 'people'}`}
            </div>
          </div>
          {loading ? (
            <div style={{ color: T.inkMuted, fontStyle: 'italic', padding: 16 }}>Loading…</div>
          ) : filteredMembers.length === 0 ? (
            <div style={{ color: T.inkMuted, fontStyle: 'italic', padding: 16, lineHeight: 1.6 }}>
              {filter === 'all'
                ? "No one's joined yet. Share the code above to bring people in."
                : filter === 'roles' || filter === 'care'
                ? <span>No one assigned yet. Go to <button onClick={() => {}} style={{ background: 'none', border: 'none', color: T.goldDark, cursor: 'pointer', fontWeight: 600, fontSize: 'inherit', padding: 0, textDecoration: 'underline' }} onClick={() => setFilter('all')}>All members</button> and tap &ldquo;Assign role&rdquo; on someone.</span>
                : 'Nobody fits this filter yet.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {filteredMembers.map((m) => {
                const memberRoles = rolesByUser[m.id] ?? [];
                const memberPending = pendingInvites.filter((i) => i.user_id === m.id);
                return (
                  <div key={m.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 0', borderBottom: `1px solid ${T.line}`,
                    flexWrap: 'wrap',
                  }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%',
                      background: T.parchment, border: `1px solid ${T.line}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 600, color: T.goldDark,
                    }}>
                      {(m.display_name ?? '?').slice(0, 1).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 600, color: T.ink, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        {m.display_name ?? 'Member'}
                        {(rolesByUser[m.id] ?? []).some(r => r.is_owner) && <Badge role={{ role_key: 'pastor' }} />}
                        {memberRoles.map((r) => (
                          <Badge key={r.id} role={r} />
                        ))}
                        {memberPending.map((inv) => (
                          <span key={inv.id} style={{
                            fontSize: 10.5, color: T.inkMuted, fontStyle: 'italic',
                          }}>
                            invited: {presetForRole(inv.role_key)?.label ?? inv.role_label ?? inv.role_key}
                          </span>
                        ))}
                      </div>
                      {(m.city || m.country) && (
                        <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 2 }}>
                          {[m.city, m.country].filter(Boolean).join(', ')}
                        </div>
                      )}
                      {memberRoles.length > 0 && (
                        <div style={{ marginTop: 2, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {memberRoles.map((r) => (
                            <TextButton
                              key={`revoke-${r.id}`}
                              onClick={() => revokeRole(r, m.display_name)}
                              danger
                            >
                              revoke {presetForRole(r.role_key)?.label?.toLowerCase() ?? r.role_label ?? r.role_key}
                            </TextButton>
                          ))}
                        </div>
                      )}
                    </div>
                    {m.id !== session?.user?.id && !(rolesByUser[m.id] ?? []).some(r => r.is_owner) && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button onClick={() => setInvitingMember(m)} style={{
                          background: T.parchment, border: `1px solid ${T.goldLight}`, borderRadius: 999,
                          padding: '6px 12px', fontSize: 12, color: T.goldDark, cursor: 'pointer', fontWeight: 600,
                        }}>
                          Assign role
                        </button>
                        <button onClick={() => setRemovingId(m.id)} style={{
                          background: 'transparent', border: `1px solid ${T.line}`, borderRadius: 999,
                          padding: '6px 12px', fontSize: 12, color: T.inkSoft, cursor: 'pointer',
                        }}>
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Invite modal */}
      {invitingMember && (
        <InviteModal
          member={invitingMember}
          existingRoles={rolesByUser[invitingMember.id] ?? []}
          onClose={() => setInvitingMember(null)}
          onSubmit={async (payload) => {
            const r = await grantRole({ user_id: invitingMember.id, ...payload });
            if (!r.error) setInvitingMember(null);
            return r;
          }}
        />
      )}

      {/* Rotate confirm modal */}
      {confirmRotate && (
        <div onClick={() => setConfirmRotate(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(44,24,16,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 20,
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: T.cream, borderRadius: 16, maxWidth: 420, width: '100%',
            padding: 26, border: `1px solid ${T.line}`,
          }}>
            <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 600, color: T.ink, marginBottom: 8 }}>
              Reset invite code?
            </div>
            <p style={{ fontSize: 14.5, color: T.inkSoft, lineHeight: 1.6, margin: '0 0 18px' }}>
              The current code <strong style={{ color: T.ink, fontFamily: 'ui-monospace, monospace' }}>{code}</strong> will stop working. Anyone you've already shared it with won't be able to join until you give them the new one.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmRotate(false)} style={{
                background: 'transparent', border: `1px solid ${T.line}`, borderRadius: 999,
                padding: '9px 16px', fontSize: 13, color: T.inkSoft, cursor: 'pointer',
              }}>Cancel</button>
              <button onClick={rotateCode} disabled={rotating} style={{
                background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
                padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: rotating ? 0.5 : 1,
              }}>{rotating ? 'Resetting…' : 'Reset code'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Remove member modal */}
      {removingMember && (
        <div onClick={() => !removeBusy && setRemovingId(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(44,24,16,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 20,
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: T.cream, borderRadius: 16, maxWidth: 440, width: '100%',
            padding: 26, border: `1px solid ${T.line}`,
          }}>
            <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 600, color: T.ink, marginBottom: 8 }}>
              Remove {removingMember.display_name ?? 'this member'}?
            </div>
            <p style={{ fontSize: 14.5, color: T.inkSoft, lineHeight: 1.6, margin: '0 0 14px' }}>
              They'll lose access to your church feed and won't be able to rejoin with the current code. You can undo by removing them from the block list later.
            </p>
            <label style={{
              display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
              background: T.white, border: `1px solid ${T.line}`, borderRadius: 10,
              fontSize: 13.5, color: T.inkSoft, cursor: 'pointer', marginBottom: 18, lineHeight: 1.5,
            }}>
              <input
                type="checkbox"
                checked={scrubPosts}
                onChange={(e) => setScrubPosts(e.target.checked)}
                style={{ marginTop: 3, accentColor: T.gold }}
              />
              <span>
                Also delete their posts in this church.
                <br />
                <span style={{ color: T.inkMuted, fontSize: 12.5 }}>
                  Their public prayers and personal posts elsewhere are kept.
                </span>
              </span>
            </label>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setRemovingId(null)} disabled={removeBusy} style={{
                background: 'transparent', border: `1px solid ${T.line}`, borderRadius: 999,
                padding: '9px 16px', fontSize: 13, color: T.inkSoft, cursor: 'pointer',
              }}>Cancel</button>
              <button onClick={confirmRemove} disabled={removeBusy} style={{
                background: T.error, color: T.cream, border: 'none', borderRadius: 999,
                padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: removeBusy ? 0.5 : 1,
              }}>{removeBusy ? 'Removing…' : 'Remove'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChurchAdmin({ session, profile, churchId, onBack, onOpenChurchPage, onOpenChurchHub, onOpenSermon, initialTab }) {
  // Allow deep-links into a specific tab (e.g. ChurchPage's "Edit in Pastor
  // settings" lands on Settings, not Overview). Falls back to overview.
  const VALID_TABS = ['overview', 'people', 'engage', 'settings'];
  const [tab, setTab] = useState(initialTab && VALID_TABS.includes(initialTab) ? initialTab : 'overview');
  const [church, setChurch] = useState(null);
  const [composerOpen, setComposerOpen] = useState(initialTab === 'sermons');
  const [composerSermonId, setComposerSermonId] = useState(null);
  // One-shot action that the next mounted panel should execute (e.g. when the
  // setup checklist's "Print your QR code" item fires, we route to Settings
  // *and* signal the panel to open the QR modal — saves a second click at the
  // highest-stakes moment, sharing with the congregation Sunday morning).
  // The consuming panel calls clearPendingAction() after firing it.
  const [pendingAction, setPendingAction] = useState(null);
  function gotoSettings(action) {
    if (action) setPendingAction(action);
    setTab('settings');
  }

  useEffect(() => {
    if (!churchId) return;
    let active = true;
    supabase
      .from('churches')
      .select('id, name, city, region, invite_code, invite_code_rotated_at, countries_open_to')
      .eq('id', churchId)
      .single()
      .then(({ data }) => { if (active) setChurch(data); });
    return () => { active = false; };
  }, [churchId]);

  function openSermonInComposer(sermonId) {
    setComposerSermonId(sermonId ?? null);
    setComposerOpen(true);
  }

  return (
    <>
    <ChurchModeShell
      church={church}
      tab={tab}
      onTabChange={setTab}
      onBack={onBack}
      onOpenChurchPage={onOpenChurchPage}
      onOpenChurchHub={onOpenChurchHub}
      currentSubpage={null}
    >
      <Suspense fallback={<div style={{ color: T.inkMuted, fontFamily: T.serif, padding: 40, textAlign: 'center' }}>Loading…</div>}>
        {tab === 'overview' && (
          <PastorDashboard
            embedded
            session={session}
            profile={profile}
            churchId={churchId}
            onOpenComposer={openSermonInComposer}
            onOpenCareAdmin={() => setTab('people')}
            onOpenChurchPage={onOpenChurchPage}
            onOpenSettings={gotoSettings}
            onOpenPeople={() => setTab('people')}
          />
        )}
        {tab === 'people' && (
          <PeoplePanel
            session={session}
            church={church}
            churchId={churchId}
            onChurchUpdate={(c) => setChurch((prev) => ({ ...prev, ...c }))}
            onShowQr={() => gotoSettings('open-qr')}
          />
        )}
        {tab === 'engage' && (
          <EngageCards
            church={church}
            churchId={churchId}
            session={session}
            onChurchUpdate={(c) => setChurch((prev) => ({ ...prev, ...c }))}
          />
        )}
        {tab === 'settings' && (
          <SettingsPanel
            church={church}
            churchId={churchId}
            session={session}
            onOpenChurchPage={onOpenChurchPage}
            onChurchUpdate={(c) => setChurch((prev) => ({ ...prev, ...c }))}
            onTransferComplete={onBack}
            pendingAction={pendingAction}
            onActionConsumed={() => setPendingAction(null)}
          />
        )}
      </Suspense>
    </ChurchModeShell>

    {/* Sermon composer — full-screen overlay, opened from the Overview hub */}
    {composerOpen && (
      <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: T.cream, overflowY: 'auto' }}>
        <Suspense fallback={<div style={{ textAlign: 'center', padding: 60, color: T.inkMuted }}>Loading…</div>}>
          <SermonComposer
            session={session}
            churchId={churchId}
            initialSermonId={composerSermonId}
            onOpenSermon={onOpenSermon}
            onBack={() => { setComposerOpen(false); setComposerSermonId(null); }}
          />
        </Suspense>
      </div>
    )}
    </>
  );
}
