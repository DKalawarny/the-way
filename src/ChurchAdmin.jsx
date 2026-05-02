import { lazy, Suspense, useEffect, useState } from 'react';
import { supabase } from './supabase.js';
import { T, SHADOW } from './theme.js';
import Badge, { INVITABLE_ROLES, presetForRole } from './Badge.jsx';
import { useUiKit, EmptyState, TextButton } from './uikit.jsx';

const PastorDashboard = lazy(() => import('./PastorDashboard.jsx'));
const SermonComposer  = lazy(() => import('./SermonComposer.jsx'));

const TABS = [
  { id: 'overview', label: 'Overview', emoji: '✦' },
  { id: 'sermons',  label: 'Sermons',  emoji: '📖' },
  { id: 'people',   label: 'People',   emoji: '👥' },
  { id: 'settings', label: 'Settings', emoji: '⚙' },
];

function TabButton({ tab, active, onClick }) {
  // The ChurchAdmin sticky header is dark, so this button is tuned for cream-on-dark.
  // Active: solid cream pill with ink text — pops like a lit lantern.
  // Inactive: transparent with cream-translucent text — recedes into the doorway.
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? T.cream : 'transparent',
        color: active ? T.ink : 'rgba(253,248,240,0.65)',
        border: active ? 'none' : '1px solid rgba(253,248,240,0.18)',
        borderRadius: 999,
        padding: '8px 14px',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <span style={{ fontSize: 13 }}>{tab.emoji}</span>
      {tab.label}
    </button>
  );
}

function qrUrl(url) {
  return `https://quickchart.io/qr?text=${encodeURIComponent(url)}&size=320&margin=2&dark=2C1810&light=FDF8F0`;
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
    'The Way is a quiet space between Sundays — for questions, prayer, and going deeper with what we hear on Sunday. No noise, no algorithms. Just our church.',
    '',
    `Join here: ${link}`,
  ].join('\n');
}

function SettingsPanel({ church, churchId, onOpenChurchPage, onChurchUpdate, pendingAction, onActionConsumed }) {
  const { showToast, ui: uikitUi } = useUiKit();
  const publicUrl = typeof window !== 'undefined' && church?.id
    ? `${window.location.origin}/?church=${church.id}`
    : '';

  // Welcome-note editor — moved here from ChurchPage so the public page is
  // truly visitor-only. Pastor edits live in admin; the public page just shows.
  const [pinDraft, setPinDraft]   = useState(church?.pinned_post ?? '');
  const [savingPin, setSavingPin] = useState(false);
  const [showQr, setShowQr]       = useState(false);
  const [copied, setCopied]       = useState(false);
  const [announceCopied, setAnnounceCopied] = useState(false);
  const [downloadingQr, setDownloadingQr]   = useState(false);

  // Setup checklist deep-link: "Print your QR code" routes here AND asks us
  // to open the QR modal directly. Without this, the pastor lands on Settings
  // and has to click QR again — friction at the moment that matters most
  // (sharing with their congregation Sunday morning).
  useEffect(() => {
    if (pendingAction === 'open-qr') {
      setShowQr(true);
      onActionConsumed?.();
    }
  }, [pendingAction, onActionConsumed]);

  // Visit-info editor (service times + street address). Optional; both null
  // by default. Renders as a single row on the public page when present.
  const [serviceDraft, setServiceDraft] = useState(church?.service_info ?? '');
  const [addressDraft, setAddressDraft] = useState(church?.street_address ?? '');
  const [savingVisit, setSavingVisit]   = useState(false);

  // Keep the drafts in sync if the parent's church state hot-swaps under us.
  useEffect(() => { setPinDraft(church?.pinned_post ?? ''); }, [church?.pinned_post]);
  useEffect(() => { setServiceDraft(church?.service_info ?? ''); }, [church?.service_info]);
  useEffect(() => { setAddressDraft(church?.street_address ?? ''); }, [church?.street_address]);

  const dirty      = (pinDraft.trim() || '') !== (church?.pinned_post ?? '');
  const visitDirty = (serviceDraft.trim() || '') !== (church?.service_info ?? '')
                  || (addressDraft.trim() || '') !== (church?.street_address ?? '');

  async function savePin() {
    if (!churchId) return;
    setSavingPin(true);
    const next = pinDraft.trim() || null;
    const { error } = await supabase
      .from('churches')
      .update({ pinned_post: next })
      .eq('id', churchId);
    setSavingPin(false);
    if (error) { showToast(`Couldn't save: ${error.message}`, 'error'); return; }
    onChurchUpdate?.({ pinned_post: next });
    showToast('Welcome note saved.', 'success');
  }

  async function saveVisit() {
    if (!churchId) return;
    setSavingVisit(true);
    const nextService = serviceDraft.trim() || null;
    const nextAddress = addressDraft.trim() || null;
    const { error } = await supabase
      .from('churches')
      .update({ service_info: nextService, street_address: nextAddress })
      .eq('id', churchId);
    setSavingVisit(false);
    if (error) { showToast(`Couldn't save: ${error.message}`, 'error'); return; }
    onChurchUpdate?.({ service_info: nextService, street_address: nextAddress });
    showToast('Visit info saved.', 'success');
  }

  async function copyLink() {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (_) { /* ignore */ }
  }

  async function copyAnnouncement() {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(buildAnnouncementText(church?.name, publicUrl));
      setAnnounceCopied(true);
      setTimeout(() => setAnnounceCopied(false), 2200);
    } catch (_) {
      showToast("Couldn't copy — long-press to copy manually.", 'error');
    }
  }

  // Download the QR as a PNG file. We fetch the quickchart.io image as a
  // blob (vs. just linking it with a download attribute) so the file lands
  // in Downloads with a sensible name instead of a random hash. Filename
  // uses the church's slug so the bulletin folder stays tidy.
  async function downloadQr() {
    if (!publicUrl) return;
    setDownloadingQr(true);
    try {
      const res = await fetch(qrUrl(publicUrl));
      if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const slug = (church?.name || 'church')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'church';
      a.href = objectUrl;
      a.download = `${slug}-qr.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Revoke the object URL on the next tick so the browser has time to
      // start the download. (Some browsers cancel the download if revoked
      // synchronously.)
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (e) {
      showToast(`Couldn't download — ${e?.message || 'try again'}`, 'error');
    } finally {
      setDownloadingQr(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {uikitUi}

      {/* ── Welcome note (formerly inline-edited on the public page) ── */}
      <div style={{
        background: T.white, border: `1px solid ${T.line}`, borderRadius: 14,
        padding: '16px 18px',
      }}>
        <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 8 }}>
          ✦ Welcome note
        </div>
        <div style={{ fontSize: 13.5, color: T.inkSoft, lineHeight: 1.55, marginBottom: 10 }}>
          A short greeting for visitors and members — appears at the top of your public page. A sentence or two is plenty.
        </div>
        <textarea
          value={pinDraft}
          onChange={(e) => setPinDraft(e.target.value.slice(0, 500))}
          placeholder="A welcome note, this week's focus, an invitation…"
          rows={4}
          style={{
            width: '100%', boxSizing: 'border-box',
            border: `1px solid ${T.line}`, borderRadius: 10, padding: '10px 12px',
            fontFamily: T.serif, fontSize: 14, color: T.ink, lineHeight: 1.6,
            background: T.cream, outline: 'none', resize: 'vertical',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 10, gap: 8 }}>
          <span style={{ fontSize: 11.5, color: T.inkMuted }}>
            {pinDraft.length}/500
          </span>
          <div style={{ flex: 1 }} />
          {dirty && (
            <button onClick={() => setPinDraft(church?.pinned_post ?? '')} style={{
              background: 'none', border: `1px solid ${T.line}`, borderRadius: 999,
              padding: '7px 14px', fontSize: 13, color: T.inkMuted, cursor: 'pointer',
            }}>Discard</button>
          )}
          <button
            onClick={savePin}
            disabled={!dirty || savingPin}
            style={{
              background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
              padding: '7px 18px', fontSize: 13, fontWeight: 600,
              cursor: (!dirty || savingPin) ? 'not-allowed' : 'pointer',
              opacity: (!dirty || savingPin) ? 0.45 : 1,
            }}
          >{savingPin ? 'Saving…' : 'Save'}</button>
        </div>
      </div>

      {/* ── Visit info — service times + street address ────────────
          Both optional. When set, a single line appears on the public page
          telling first-time visitors when to come and where to drive. */}
      <div style={{
        background: T.white, border: `1px solid ${T.line}`, borderRadius: 14,
        padding: '16px 18px',
      }}>
        <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 8 }}>
          📍 For visitors
        </div>
        <div style={{ fontFamily: T.display, fontSize: 18, fontWeight: 600, color: T.ink, marginBottom: 4 }}>
          Service times &amp; location
        </div>
        <div style={{ fontSize: 13.5, color: T.inkSoft, lineHeight: 1.55, marginBottom: 12 }}>
          Optional. Anyone scanning your QR sees this so they know when and where to show up.
        </div>

        <label style={{ display: 'block', fontSize: 12, color: T.inkSoft, fontWeight: 600, marginBottom: 4 }}>
          When you meet
        </label>
        <input
          type="text"
          value={serviceDraft}
          onChange={(e) => setServiceDraft(e.target.value.slice(0, 120))}
          placeholder="e.g. Sundays · 9am &amp; 11am"
          style={{
            width: '100%', boxSizing: 'border-box',
            border: `1px solid ${T.line}`, borderRadius: 10, padding: '10px 12px',
            fontFamily: T.serif, fontSize: 14, color: T.ink,
            background: T.cream, outline: 'none', marginBottom: 10,
          }}
        />

        <label style={{ display: 'block', fontSize: 12, color: T.inkSoft, fontWeight: 600, marginBottom: 4 }}>
          Where you meet
        </label>
        <input
          type="text"
          value={addressDraft}
          onChange={(e) => setAddressDraft(e.target.value.slice(0, 200))}
          placeholder="Street address — leave blank if you'd rather not list it"
          style={{
            width: '100%', boxSizing: 'border-box',
            border: `1px solid ${T.line}`, borderRadius: 10, padding: '10px 12px',
            fontFamily: T.serif, fontSize: 14, color: T.ink,
            background: T.cream, outline: 'none',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', marginTop: 12, gap: 8 }}>
          <div style={{ flex: 1 }} />
          {visitDirty && (
            <button onClick={() => {
              setServiceDraft(church?.service_info ?? '');
              setAddressDraft(church?.street_address ?? '');
            }} style={{
              background: 'none', border: `1px solid ${T.line}`, borderRadius: 999,
              padding: '7px 14px', fontSize: 13, color: T.inkMuted, cursor: 'pointer',
            }}>Discard</button>
          )}
          <button
            onClick={saveVisit}
            disabled={!visitDirty || savingVisit}
            style={{
              background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
              padding: '7px 18px', fontSize: 13, fontWeight: 600,
              cursor: (!visitDirty || savingVisit) ? 'not-allowed' : 'pointer',
              opacity: (!visitDirty || savingVisit) ? 0.45 : 1,
            }}
          >{savingVisit ? 'Saving…' : 'Save'}</button>
        </div>
      </div>

      {/* ── Public page + share + QR ─────────────────────────────── */}
      <div style={{
        background: T.white, border: `1px solid ${T.line}`, borderRadius: 14,
        padding: '16px 18px',
      }}>
        <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.inkMuted, fontWeight: 700, marginBottom: 8 }}>
          Public church page
        </div>
        <div style={{ fontFamily: T.display, fontSize: 18, fontWeight: 600, color: T.ink, marginBottom: 4 }}>
          {church?.name ?? 'Your church'}
        </div>
        <div style={{ fontSize: 13.5, color: T.inkSoft, lineHeight: 1.55, marginBottom: 10 }}>
          What visitors see when they scan a QR or open a shared link. Preview it, share it, or print a QR for your bulletin.
        </div>
        {publicUrl && (
          <div style={{
            fontSize: 12, color: T.inkSoft, fontFamily: 'ui-monospace, monospace',
            background: T.parchment, border: `1px solid ${T.line}`, borderRadius: 8,
            padding: '8px 10px', marginTop: 8, wordBreak: 'break-all',
          }}>
            {publicUrl}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <button onClick={onOpenChurchPage} style={{
            background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
            padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>Preview public page →</button>
          {publicUrl && (
            <button onClick={copyLink} style={{
              background: 'transparent', border: `1px solid ${T.line}`, borderRadius: 999,
              padding: '9px 16px', fontSize: 13, color: T.inkSoft, cursor: 'pointer',
            }}>{copied ? '✓ Copied' : 'Copy link'}</button>
          )}
          {publicUrl && (
            <button onClick={() => setShowQr(true)} style={{
              background: 'transparent', border: `1px solid ${T.line}`, borderRadius: 999,
              padding: '9px 16px', fontSize: 13, color: T.goldDark, fontWeight: 600, cursor: 'pointer',
            }}>⌘ QR code</button>
          )}
        </div>
      </div>

      {/* QR modal (pastor-only context — print-for-bulletin language) */}
      {showQr && publicUrl && (
        <div
          onClick={() => setShowQr(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(44,24,16,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: T.cream, borderRadius: 18, maxWidth: 400, width: '100%',
              padding: '28px 24px', textAlign: 'center', border: `1px solid ${T.line}`,
            }}
          >
            <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 8 }}>
              Scan to join
            </div>
            <div style={{ fontFamily: T.display, fontSize: 24, fontWeight: 600, color: T.ink, letterSpacing: '-0.018em', lineHeight: 1.12, marginBottom: 16 }}>
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
                {downloadingQr ? 'Preparing…' : '📥 Download QR (PNG)'}
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={copyAnnouncement} style={{
                  flex: 1, background: 'transparent', border: `1px solid ${T.goldDark}`,
                  color: T.goldDark, borderRadius: 999,
                  padding: '11px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}>
                  {announceCopied ? '✓ Copied — paste anywhere' : '📋 Copy announcement'}
                </button>
                <button onClick={copyLink} style={{
                  background: 'transparent', border: `1px solid ${T.line}`, borderRadius: 999,
                  padding: '11px 16px', fontSize: 14, color: T.inkSoft, cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}>
                  {copied ? '✓ Link' : 'Copy link'}
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
  { id: 'all',     label: 'All' },
  { id: 'roles',   label: 'With roles' },
  { id: 'care',    label: 'Care team' },
  { id: 'pending', label: 'Pending invites' },
  { id: 'blocked', label: 'Blocked' },
];

function InviteModal({ member, existingRoles, onClose, onSubmit }) {
  const [roleKey, setRoleKey] = useState(INVITABLE_ROLES[0].key);
  const [customLabel, setCustomLabel] = useState('');
  const [message, setMessage] = useState('');
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
          role_label: customLabel.trim().slice(0, 40),
          message: message.trim() || null }
      : { role_key: roleKey, role_label: null, message: message.trim() || null };
    const r = await onSubmit(payload);
    setBusy(false);
    if (r?.error) setErr(r.error);
  }

  return (
    <div onClick={() => !busy && onClose()} style={{
      position: 'fixed', inset: 0, background: 'rgba(44,24,16,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: T.cream, borderRadius: 16, maxWidth: 480, width: '100%',
        padding: 26, border: `1px solid ${T.line}`,
      }}>
        <div style={{ fontFamily: T.display, fontSize: 22, fontWeight: 600, color: T.ink, marginBottom: 6 }}>
          Invite to a role
        </div>
        <p style={{ fontSize: 14, color: T.inkSoft, lineHeight: 1.55, margin: '0 0 14px' }}>
          {member.display_name ?? 'This member'} will see a banner and can accept or decline.
          A badge appears next to their name everywhere they show up in the church.
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

        <div style={{ fontSize: 11.5, letterSpacing: 1.4, textTransform: 'uppercase', color: T.inkMuted, fontWeight: 700, marginBottom: 8 }}>
          Optional note
        </div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="Why you'd like them to take this on…"
          style={{
            width: '100%', boxSizing: 'border-box',
            border: `1px solid ${T.line}`, borderRadius: 10, padding: '10px 12px',
            fontSize: 14, fontFamily: T.serif, background: T.white, color: T.ink, outline: 'none',
            lineHeight: 1.55, resize: 'vertical',
            marginBottom: 12,
          }}
        />

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
          }}>{busy ? 'Sending…' : 'Send invite'}</button>
        </div>
      </div>
    </div>
  );
}

function PeoplePanel({ session, church, churchId, onChurchUpdate, onShowQr }) {
  const [members, setMembers]   = useState([]);
  const [rolesByUser, setRolesByUser] = useState({});  // { user_id: [role rows] }
  const [pendingInvites, setPendingInvites] = useState([]);  // [{...invite, user_profile}]
  const [blocked, setBlocked]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('all');

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
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, display_name, city, country, is_pastor')
        .eq('church_id', churchId)
        .order('display_name', { ascending: true }),
      supabase
        .from('church_roles')
        .select('id, user_id, role_key, role_label, granted_at')
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
    ]);

    const m = memberRows ?? [];
    setMembers(m);

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

  async function sendInvite({ user_id, role_key, role_label, message }) {
    const { error } = await supabase
      .from('church_role_invites')
      .insert({
        church_id:  churchId,
        user_id,
        role_key,
        role_label: role_label ?? null,
        message:    message ?? null,
        invited_by: session?.user?.id ?? null,
      });
    if (error) {
      // Most likely cause: pending invite already exists for this role
      if ((error.message || '').includes('church_role_invites_one_pending')) {
        return { error: 'There is already a pending invite for this role.' };
      }
      return { error: error.message };
    }
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
          Anyone with a profile in The Way can join your church by entering this code.
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
              {announceCopied ? '✓ Copied — paste anywhere' : '📋 Copy announcement'}
            </button>
            {onShowQr && (
              <button onClick={onShowQr} style={{
                background: 'transparent', border: `1px solid ${T.line}`,
                color: T.inkSoft, borderRadius: 999,
                padding: '8px 14px', fontSize: 13, cursor: 'pointer',
              }}>
                ⌘ Show QR code
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
            f.id === 'pending' ? pendingInvites.length :
            f.id === 'blocked' ? blocked.length :
            f.id === 'all'     ? members.length :
            f.id === 'roles'   ? Object.values(rolesByUser).filter((rs) => rs.length > 0).length :
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
                        {m.is_pastor && <Badge role={{ role_key: 'pastor' }} />}
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
                    {m.id !== session?.user?.id && !m.is_pastor && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button onClick={() => setInvitingMember(m)} style={{
                          background: T.parchment, border: `1px solid ${T.goldLight}`, borderRadius: 999,
                          padding: '6px 12px', fontSize: 12, color: T.goldDark, cursor: 'pointer', fontWeight: 600,
                        }}>
                          Invite to role
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
            const r = await sendInvite({ user_id: invitingMember.id, ...payload });
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
            <div style={{ fontFamily: T.display, fontSize: 22, fontWeight: 600, color: T.ink, marginBottom: 8 }}>
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
            <div style={{ fontFamily: T.display, fontSize: 22, fontWeight: 600, color: T.ink, marginBottom: 8 }}>
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
                background: '#c0392b', color: T.cream, border: 'none', borderRadius: 999,
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
  const [tab, setTab] = useState(initialTab && TABS.some((t) => t.id === initialTab) ? initialTab : 'overview');
  const [church, setChurch] = useState(null);
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
      .select('id, name, city, region, invite_code, invite_code_rotated_at')
      .eq('id', churchId)
      .single()
      .then(({ data }) => { if (active) setChurch(data); });
    return () => { active = false; };
  }, [churchId]);

  function openSermonInComposer(sermonId) {
    setComposerSermonId(sermonId ?? null);
    setTab('sermons');
  }

  return (
    <div style={{ minHeight: '100vh', background: T.cream, overflowY: 'auto' }}>
      {/* Sticky header — sanctuary-doorway dark, matching ChurchHub & ChurchPage.
          The whole church section now wears one signature: cross the threshold,
          the screen darkens. Body below stays cream for long-form reading. */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: `linear-gradient(135deg, ${T.ink} 0%, #1A0F08 55%, #3A2516 100%)`,
        borderBottom: '1px solid rgba(196,129,58,0.35)',
        boxShadow: SHADOW.candle,
        padding: '14px 20px 0',
        color: T.cream,
      }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
            <button onClick={onBack} style={{
              background: 'none', border: 'none', color: T.goldLight, fontSize: 14, cursor: 'pointer', padding: 0,
            }}>← My page</button>
            <div style={{ flex: 1 }} />
            {onOpenChurchHub && (
              <button onClick={onOpenChurchHub} style={{
                background: 'rgba(253,248,240,0.10)', border: '1px solid rgba(253,248,240,0.25)', borderRadius: 999,
                padding: '5px 12px', fontSize: 12, color: T.cream, fontWeight: 600, cursor: 'pointer',
              }}>Congregation feed →</button>
            )}
            {onOpenChurchPage && (
              <button onClick={onOpenChurchPage} style={{
                background: 'rgba(253,248,240,0.10)', border: '1px solid rgba(253,248,240,0.25)', borderRadius: 999,
                padding: '5px 12px', fontSize: 12, color: T.cream, fontWeight: 600, cursor: 'pointer',
              }}>Public page →</button>
            )}
            <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.goldLight, fontWeight: 700 }}>
              Church mode
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
            <h1 style={{ fontFamily: T.display, fontSize: 26, fontWeight: 600, color: T.cream, letterSpacing: '-0.02em', lineHeight: 1.1, margin: 0 }}>
              {church?.name ?? 'Your church'}
            </h1>
            {church?.city && (
              <span style={{ fontSize: 13, color: 'rgba(253,248,240,0.65)' }}>{church.city}{church.region ? `, ${church.region}` : ''}</span>
            )}
          </div>

          {/* Tab strip */}
          <div style={{
            display: 'flex', gap: 6, overflowX: 'auto',
            paddingBottom: 10,
          }}>
            {TABS.map((t) => (
              <TabButton key={t.id} tab={t} active={tab === t.id} onClick={() => setTab(t.id)} />
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '20px 20px 80px' }}>
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
          {tab === 'sermons' && (
            <SermonComposer
              embedded
              session={session}
              churchId={churchId}
              initialSermonId={composerSermonId}
              onOpenSermon={onOpenSermon}
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
          {tab === 'settings' && (
            <SettingsPanel
              church={church}
              churchId={churchId}
              onOpenChurchPage={onOpenChurchPage}
              onChurchUpdate={(c) => setChurch((prev) => ({ ...prev, ...c }))}
              pendingAction={pendingAction}
              onActionConsumed={() => setPendingAction(null)}
            />
          )}
        </Suspense>
      </div>
    </div>
  );
}
