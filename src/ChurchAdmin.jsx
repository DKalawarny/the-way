import { lazy, Suspense, useEffect, useState } from 'react';
import { Download, Copy, Check, QrCode } from 'lucide-react';
import { supabase } from './supabase.js';
import { T } from './theme.js';
import Badge, { INVITABLE_ROLES, presetForRole } from './Badge.jsx';
import { useUiKit, EmptyState, TextButton } from './uikit.jsx';
import ChurchModeShell from './ChurchModeShell.jsx';
import FlagPicker from './FlagPicker.jsx';

import { usePlan, CHURCH_BASE_MEMBER_LIMIT } from './usePlan.js';
import { TrialBanner, UpgradeWall } from './PlanGate.jsx';

const PastorDashboard = lazy(() => import('./PastorDashboard.jsx'));
const SermonComposer  = lazy(() => import('./SermonComposer.jsx'));
const ChurchAiChat    = lazy(() => import('./ChurchAiChat.jsx'));
const BibleReader     = lazy(() => import('./BibleReader.jsx'));

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

function SettingsPanel({ church, churchId, session, onOpenChurchPage, onChurchUpdate, onTransferComplete, pendingAction, onActionConsumed }) {
  const { showToast, ui: uikitUi } = useUiKit();
  const publicUrl = typeof window !== 'undefined' && church?.id
    ? `${window.location.origin}/?church=${church.id}`
    : '';

  // Church photo upload
  const [avatarUploading, setAvatarUploading] = useState(false);

  async function uploadChurchPhoto(file) {
    if (!file || !churchId) return;
    if (!file.type.startsWith('image/')) { showToast('Please pick an image file.', 'error'); return; }
    if (file.size > 5 * 1024 * 1024) { showToast('Image must be under 5 MB.', 'error'); return; }
    setAvatarUploading(true);
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${churchId}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('church-avatars')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) { showToast(`Upload failed: ${upErr.message}`, 'error'); setAvatarUploading(false); return; }
    const { data: { publicUrl: url } } = supabase.storage.from('church-avatars').getPublicUrl(path);
    const busted = `${url}?t=${Date.now()}`;
    const { error: dbErr } = await supabase.from('churches').update({ avatar_url: busted }).eq('id', churchId);
    setAvatarUploading(false);
    if (dbErr) { showToast(`Couldn't save: ${dbErr.message}`, 'error'); return; }
    onChurchUpdate?.({ avatar_url: busted });
    showToast('Church photo updated.', 'success');
  }

  // Church deletion
  const [deleteOpen, setDeleteOpen]   = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteBusy, setDeleteBusy]   = useState(false);

  async function handleDeleteChurch() {
    if (!churchId || deleteConfirm.trim().toLowerCase() !== (church?.name ?? '').toLowerCase()) return;
    setDeleteBusy(true);
    try {
      await supabase.from('church_roles').delete().eq('church_id', churchId);
      await supabase.from('sermons').delete().eq('church_id', churchId);
      await supabase.from('churches').delete().eq('id', churchId);
      onTransferComplete?.();
    } catch {
      setDeleteBusy(false);
    }
  }

  // Ownership transfer
  const [transferOpen, setTransferOpen]       = useState(false);
  const [transferSearch, setTransferSearch]   = useState('');
  const [transferResults, setTransferResults] = useState([]);
  const [transferTarget, setTransferTarget]   = useState(null);
  const [transferConfirm, setTransferConfirm] = useState(false);
  const [transferBusy, setTransferBusy]       = useState(false);
  const [transferError, setTransferError]     = useState(null);

  useEffect(() => {
    if (!transferSearch.trim() || !churchId) { setTransferResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, display_name')
        .eq('church_id', churchId)
        .neq('id', session?.user?.id ?? '')
        .ilike('display_name', `%${transferSearch.trim()}%`)
        .limit(8);
      setTransferResults(data ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [transferSearch, churchId, session?.user?.id]);

  function openTransfer() {
    setTransferSearch(''); setTransferResults([]);
    setTransferTarget(null); setTransferConfirm(false);
    setTransferError(null); setTransferOpen(true);
  }

  async function executeTransfer() {
    if (!transferTarget || !churchId || !session?.user?.id) return;
    setTransferBusy(true); setTransferError(null);
    const userId = session.user.id;

    // 1. Upsert new owner row (insert or update existing staff row)
    const { error: e1 } = await supabase.from('church_roles').upsert({
      church_id: churchId, user_id: transferTarget.id,
      role_key: 'owner', role_title: 'Lead Pastor', is_owner: true,
      can_post_sermons: true, can_post_announcements: true,
      can_moderate: true, can_view_prayers: true,
      can_manage_staff: true, can_edit_church: true,
    }, { onConflict: 'church_id,user_id,role_key' });

    if (e1) { setTransferError(e1.message); setTransferBusy(false); return; }

    // 2. Demote current owner — keep them as staff, strip owner flag
    const { error: e2 } = await supabase
      .from('church_roles')
      .update({ is_owner: false, role_key: 'staff' })
      .eq('church_id', churchId)
      .eq('user_id', userId)
      .eq('is_owner', true);

    setTransferBusy(false);
    if (e2) { setTransferError(e2.message); return; }

    // 3. Update display pastor_id on the church record
    await supabase.from('churches').update({ pastor_id: transferTarget.id }).eq('id', churchId);

    setTransferOpen(false);
    onTransferComplete?.();
  }

  // Membership approval toggle
  const [openJoin, setOpenJoin]     = useState(church?.open_join ?? true);
  const [savingJoin, setSavingJoin] = useState(false);

  async function saveOpenJoin(val) {
    setSavingJoin(true);
    const { error } = await supabase.from('churches').update({ open_join: val }).eq('id', churchId);
    setSavingJoin(false);
    if (error) { showToast(`Couldn't save: ${error.message}`, 'error'); return; }
    setOpenJoin(val);
    onChurchUpdate?.({ open_join: val });
    showToast(val ? 'Open joining on — no approval needed.' : 'Approval required for new members.', 'success');
  }

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

  // Countries we serve — up to 2 ISO codes.
  const [countriesDraft, setCountriesDraft] = useState(church?.countries_open_to ?? []);
  const [savingCountries, setSavingCountries] = useState(false);
  const countriesDirty = JSON.stringify(countriesDraft) !== JSON.stringify(church?.countries_open_to ?? []);

  const [walks, setWalks] = useState([]);
  const [savingFeatured, setSavingFeatured] = useState(false);
  useEffect(() => {
    let cancelled = false;
    supabase
      .from('walks')
      .select('id, title, subtitle, cover_emoji, length_days, sort_order')
      .eq('is_published', true)
      .order('sort_order', { ascending: true })
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
    showToast(nextId ? 'Featured walk updated.' : 'Featured walk cleared.', 'success');
  }

  // Keep the drafts in sync if the parent's church state hot-swaps under us.
  useEffect(() => { setPinDraft(church?.pinned_post ?? ''); }, [church?.pinned_post]);
  useEffect(() => { setServiceDraft(church?.service_info ?? ''); }, [church?.service_info]);
  useEffect(() => { setAddressDraft(church?.street_address ?? ''); }, [church?.street_address]);
  useEffect(() => { setCountriesDraft(church?.countries_open_to ?? []); }, [church?.countries_open_to]);

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

  async function saveCountries() {
    if (!churchId) return;
    setSavingCountries(true);
    const { error } = await supabase
      .from('churches')
      .update({ countries_open_to: countriesDraft })
      .eq('id', churchId);
    setSavingCountries(false);
    if (error) { showToast(`Couldn't save: ${error.message}`, 'error'); return; }
    onChurchUpdate?.({ countries_open_to: countriesDraft });
    showToast('Countries saved.', 'success');
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

      {/* ── Church photo ── */}
      <div style={{
        background: T.white, border: `1px solid ${T.line}`, borderRadius: 14,
        padding: '16px 18px',
      }}>
        <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 8 }}>
          ⛪ Church photo
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(253,248,240,0.06)',
            border: `2px solid ${T.goldLight}`,
            overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32,
          }}>
            {church?.avatar_url
              ? <img src={church.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : '⛪'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, color: T.inkSoft, lineHeight: 1.55, marginBottom: 10 }}>
              Shows in your banner and directory listing. Square images work best. Max 5 MB.
            </div>
            <label style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: avatarUploading ? T.parchment : T.ink,
              color: avatarUploading ? T.inkMuted : T.cream,
              border: 'none', borderRadius: 999,
              padding: '8px 16px', fontSize: 13, fontWeight: 600,
              cursor: avatarUploading ? 'wait' : 'pointer',
              opacity: avatarUploading ? 0.7 : 1,
              transition: 'opacity 0.15s',
            }}>
              {avatarUploading ? 'Uploading…' : (church?.avatar_url ? 'Change photo' : 'Upload photo')}
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                disabled={avatarUploading}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadChurchPhoto(f); e.target.value = ''; }}
              />
            </label>
          </div>
        </div>
      </div>

      {/* ── Banner background ── */}
      <div style={{
        background: T.white, border: `1px solid ${T.line}`, borderRadius: 14,
        padding: '16px 18px',
      }}>
        <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 8 }}>
          🎨 Banner background
        </div>
        <div style={{ fontSize: 13.5, color: T.inkSoft, lineHeight: 1.55, marginBottom: 12 }}>
          The colour behind your church name on your public page.
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {CHURCH_BANNER_PRESETS.map((p) => {
            const active = (church?.banner_preset ?? 'ink') === p.key;
            return (
              <button
                key={p.key}
                title={p.label}
                onClick={async () => {
                  const { error } = await supabase.from('churches').update({ banner_preset: p.key }).eq('id', churchId);
                  if (!error) onChurchUpdate?.({ banner_preset: p.key });
                }}
                style={{
                  width: 40, height: 40, borderRadius: 10, cursor: 'pointer',
                  background: p.bg,
                  border: active ? `2px solid ${T.gold}` : `2px solid transparent`,
                  outline: active ? `2px solid ${T.goldLight}` : 'none',
                  outlineOffset: 1,
                  transition: 'border-color 0.12s',
                }}
              />
            );
          })}
        </div>
      </div>

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

      {/* ── Countries we serve ──────────────────────────────────── */}
      <div style={{
        background: T.white, border: `1px solid ${T.line}`, borderRadius: 14,
        padding: '16px 18px',
      }}>
        <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 8 }}>
          🌍 Countries we serve
        </div>
        <div style={{ fontFamily: T.display, fontSize: 18, fontWeight: 600, color: T.ink, marginBottom: 4 }}>
          Countries we serve (up to 2)
        </div>
        <div style={{ fontSize: 13.5, color: T.inkSoft, lineHeight: 1.55, marginBottom: 12 }}>
          Optional. Shown on your public page to help people from those countries find you.
        </div>
        <FlagPicker value={countriesDraft} onChange={setCountriesDraft} />
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 12, gap: 8 }}>
          <div style={{ flex: 1 }} />
          {countriesDirty && (
            <button onClick={() => setCountriesDraft(church?.countries_open_to ?? [])} style={{
              background: 'none', border: `1px solid ${T.line}`, borderRadius: 999,
              padding: '7px 14px', fontSize: 13, color: T.inkMuted, cursor: 'pointer',
            }}>Discard</button>
          )}
          <button
            onClick={saveCountries}
            disabled={!countriesDirty || savingCountries}
            style={{
              background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
              padding: '7px 18px', fontSize: 13, fontWeight: 600,
              cursor: (!countriesDirty || savingCountries) ? 'not-allowed' : 'pointer',
              opacity: (!countriesDirty || savingCountries) ? 0.45 : 1,
            }}
          >{savingCountries ? 'Saving…' : 'Save'}</button>
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

      {/* ── Membership approval ─────────────────────────────────────── */}
      <div style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 14, padding: '16px 18px' }}>
        <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 8 }}>
          👥 Membership
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: T.display, fontSize: 17, fontWeight: 600, color: T.ink, marginBottom: 3 }}>
              Require approval to join
            </div>
            <div style={{ fontSize: 13, color: T.inkSoft, lineHeight: 1.55 }}>
              {openJoin
                ? 'Anyone can join instantly. Turn this on to review requests before they become members.'
                : 'New members need your approval. Requests appear in People → Join requests.'}
            </div>
          </div>
          <button
            onClick={() => !savingJoin && saveOpenJoin(!openJoin)}
            disabled={savingJoin}
            style={{
              width: 44, height: 24, borderRadius: 999, flexShrink: 0,
              background: openJoin ? T.line : T.goldDark,
              border: 'none', cursor: savingJoin ? 'wait' : 'pointer',
              position: 'relative', transition: 'background 0.2s',
            }}
          >
            <div style={{
              position: 'absolute', top: 3,
              left: openJoin ? 3 : 23,
              width: 18, height: 18, borderRadius: '50%',
              background: '#fff', transition: 'left 0.2s',
            }} />
          </button>
        </div>
      </div>

      {/* ── Featured walk ── */}
      <div style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 14, padding: '16px 18px' }}>
        <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 8 }}>
          ✶ Featured walk
        </div>
        <div style={{ fontSize: 13.5, color: T.inkSoft, lineHeight: 1.55, marginBottom: 12 }}>
          Pick one walk to highlight on your church page. Members pace it privately. Change or clear anytime.
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          {walks.map((w) => {
            const active = church?.featured_walk_id === w.id;
            return (
              <button
                key={w.id}
                onClick={() => setFeaturedWalk(active ? null : w.id)}
                disabled={savingFeatured}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                  background: active ? T.parchment : T.cream,
                  border: `1px solid ${active ? T.goldDark : T.line}`,
                  borderRadius: 12, padding: '10px 12px',
                  cursor: savingFeatured ? 'wait' : 'pointer',
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: T.white, border: `1px solid ${T.line}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, color: T.goldDark, flexShrink: 0,
                }}>{w.cover_emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, lineHeight: 1.25 }}>{w.title}</div>
                  {w.subtitle && <div style={{ fontSize: 12, color: T.inkSoft, fontStyle: 'italic', lineHeight: 1.4, marginTop: 2 }}>{w.subtitle}</div>}
                  <div style={{ fontSize: 11, color: T.inkMuted, marginTop: 2 }}>{w.length_days}-day walk</div>
                </div>
                {active && (
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', background: T.goldDark, color: T.cream, borderRadius: 999, padding: '3px 9px' }}>Featured</span>
                )}
              </button>
            );
          })}
          {walks.length === 0 && <div style={{ color: T.inkMuted, fontStyle: 'italic', fontSize: 13.5 }}>No published walks yet.</div>}
        </div>
        {church?.featured_walk_id && (
          <button onClick={() => setFeaturedWalk(null)} disabled={savingFeatured} style={{
            marginTop: 10, background: 'none', border: `1px solid ${T.line}`,
            borderRadius: 999, padding: '7px 14px', fontSize: 12,
            color: T.inkMuted, cursor: savingFeatured ? 'wait' : 'pointer',
          }}>Clear featured walk</button>
        )}
      </div>

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

      {/* ── Delete church ─────────────────────────────────────────────── */}
      <div style={{
        background: T.white, border: '1px solid rgba(165,63,43,0.35)',
        borderLeft: '4px solid #a53f2b', borderRadius: 14, padding: '16px 18px', marginTop: 12,
      }}>
        <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#a53f2b', fontWeight: 700, marginBottom: 6 }}>
          Danger zone
        </div>
        <div style={{ fontFamily: T.display, fontSize: 17, fontWeight: 600, color: T.ink, marginBottom: 4 }}>
          Delete this church
        </div>
        <div style={{ fontSize: 13.5, color: T.inkSoft, lineHeight: 1.55, marginBottom: 12 }}>
          Permanently removes the church, all sermons, and all member records. This cannot be undone. Do this before closing your account.
        </div>
        <button
          onClick={() => setDeleteOpen(true)}
          style={{
            background: 'transparent', border: '1px solid rgba(165,63,43,0.5)',
            borderRadius: 999, padding: '8px 16px', fontSize: 13,
            color: '#a53f2b', fontWeight: 600, cursor: 'pointer',
          }}
        >Delete church…</button>
      </div>

      {/* Delete confirmation modal */}
      {deleteOpen && (
        <div
          onClick={() => !deleteBusy && (setDeleteOpen(false), setDeleteConfirm(''))}
          style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(44,24,16,0.70)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: T.cream, borderRadius: 18, maxWidth: 420, width: '100%', padding: '24px 22px', border: '1px solid rgba(165,63,43,0.4)' }}>
            <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#a53f2b', fontWeight: 700, marginBottom: 4 }}>
              Confirm deletion
            </div>
            <div style={{ fontFamily: T.display, fontSize: 20, fontWeight: 600, color: T.ink, marginBottom: 12 }}>
              Delete {church?.name}?
            </div>
            <div style={{ fontSize: 13.5, color: T.inkSoft, lineHeight: 1.6, marginBottom: 16 }}>
              This will permanently delete the church, all sermons, and all member records. Type the church name to confirm.
            </div>
            <input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={church?.name}
              autoFocus
              style={{
                width: '100%', boxSizing: 'border-box',
                border: `1px solid ${T.line}`, borderRadius: 10, padding: '10px 13px',
                fontFamily: 'inherit', fontSize: 14, color: T.ink,
                background: T.white, outline: 'none', marginBottom: 14,
              }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => { setDeleteOpen(false); setDeleteConfirm(''); }}
                disabled={deleteBusy}
                style={{ flex: 1, background: 'transparent', border: `1px solid ${T.line}`, borderRadius: 999, padding: '10px', fontSize: 14, color: T.inkSoft, cursor: 'pointer' }}
              >Cancel</button>
              <button
                onClick={handleDeleteChurch}
                disabled={deleteBusy || deleteConfirm.trim().toLowerCase() !== (church?.name ?? '').toLowerCase()}
                style={{
                  flex: 1, background: '#a53f2b', border: 'none', borderRadius: 999,
                  padding: '10px', fontSize: 14, fontWeight: 600, color: T.cream,
                  cursor: deleteBusy || deleteConfirm.trim().toLowerCase() !== (church?.name ?? '').toLowerCase() ? 'not-allowed' : 'pointer',
                  opacity: deleteBusy || deleteConfirm.trim().toLowerCase() !== (church?.name ?? '').toLowerCase() ? 0.5 : 1,
                }}
              >{deleteBusy ? 'Deleting…' : 'Delete permanently'}</button>
            </div>
          </div>
        </div>
      )}

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
      <div onClick={(e) => e.stopPropagation()} className="modal-sheet" style={{
        background: T.cream, borderRadius: 16, maxWidth: 480, width: '100%',
        padding: 'clamp(20px, 4vw, 26px)', border: `1px solid ${T.line}`,
      }}>
        <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 600, color: T.ink, marginBottom: 6 }}>
          Assign a role
        </div>
        <p style={{ fontSize: 14, color: T.inkSoft, lineHeight: 1.55, margin: '0 0 14px' }}>
          {member.display_name ?? 'This member'} will be assigned this role immediately.
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
          }}>{busy ? 'Assigning…' : 'Assign role'}</button>
        </div>
      </div>
    </div>
  );
}

function PeoplePanel({ session, church, churchId, churchPlan, onChurchUpdate, onShowQr }) {
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

  async function grantRole({ user_id, role_key, role_label, message: _message }) {
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
      {/* Member gate — Church Base is capped at 150 */}
      {(() => {
        const memberLimit = churchPlan === 'church_base' ? CHURCH_BASE_MEMBER_LIMIT : Infinity;
        const count = members.length;
        const atLimit = count >= memberLimit;
        const nearLimit = !atLimit && count >= memberLimit * 0.8;
        if (!atLimit && !nearLimit) return null;
        const spotsLeft = memberLimit - count;
        return (
          <div style={{
            background: atLimit
              ? 'linear-gradient(135deg, rgba(165,63,43,0.1) 0%, rgba(184,115,58,0.08) 100%)'
              : 'linear-gradient(135deg, rgba(184,115,58,0.1) 0%, rgba(184,115,58,0.05) 100%)',
            border: `1px solid ${atLimit ? 'rgba(165,63,43,0.35)' : 'rgba(184,115,58,0.3)'}`,
            borderRadius: 12, padding: '14px 16px', marginBottom: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: atLimit ? '#A53F2B' : T.goldDark, marginBottom: 3 }}>
                {atLimit ? `Member limit reached (${memberLimit})` : `${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left on Church Base`}
              </div>
              <div style={{ fontSize: 12.5, color: T.inkSoft, lineHeight: 1.5 }}>
                {atLimit
                  ? 'Upgrade to Church Pro to keep growing your congregation.'
                  : 'Your congregation is growing. Upgrade to Church Pro for unlimited members.'}
              </div>
            </div>
            <a
              href={`mailto:hello@kinwove.com?subject=${encodeURIComponent('Upgrade to Church Pro')}`}
              style={{
                background: atLimit
                  ? 'linear-gradient(135deg, #A53F2B 0%, #7d2e1e 100%)'
                  : `linear-gradient(135deg, ${T.gold} 0%, #c47020 100%)`,
                color: '#FDF8EE', borderRadius: 999,
                padding: '8px 16px', fontSize: 13, fontWeight: 600,
                textDecoration: 'none', flexShrink: 0, whiteSpace: 'nowrap',
              }}
            >
              Upgrade to Pro →
            </a>
          </div>
        );
      })()}

      {/* Invite code card */}
      <div style={{
        background: `linear-gradient(135deg, ${T.parchment} 0%, ${T.parchmentDark} 100%)`,
        border: `1px solid ${T.line}`, borderRadius: 14,
        padding: '18px 20px',
        opacity: (churchPlan === 'church_base' && members.length >= CHURCH_BASE_MEMBER_LIMIT) ? 0.45 : 1,
        pointerEvents: (churchPlan === 'church_base' && members.length >= CHURCH_BASE_MEMBER_LIMIT) ? 'none' : 'auto',
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
              No pending invites. Roles are now assigned directly — use "Assign role" on any member card.
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
                : filter === 'roles'
                ? "No one has a role yet. Use Assign role on any member card."
                : filter === 'care'
                ? "No care team members yet. Assign the Care team role to a member."
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
  const VALID_TABS = ['overview', 'people', 'ask', 'bible', 'settings'];
  const [tab, setTab] = useState(initialTab && VALID_TABS.includes(initialTab) ? initialTab : 'overview');
  const [church, setChurch] = useState(null);
  const [composerOpen, setComposerOpen] = useState(initialTab === 'sermons');
  const [composerSermonId, setComposerSermonId] = useState(null);
  const { plan, hasAccess, daysLeft, trialExpired } = usePlan(churchId);
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
      {trialExpired && (
        <UpgradeWall onBack={onBack} />
      )}
      <Suspense fallback={<div style={{ color: T.inkMuted, fontFamily: T.serif, padding: 40, textAlign: 'center' }}>Loading…</div>}>
        {!trialExpired && plan === 'trial' && daysLeft <= 14 && (
          <div style={{ padding: '16px 16px 0' }}>
            <TrialBanner daysLeft={daysLeft} />
          </div>
        )}
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
            churchPlan={plan}
            onChurchUpdate={(c) => setChurch((prev) => ({ ...prev, ...c }))}
            onShowQr={() => gotoSettings('open-qr')}
          />
        )}
        {tab === 'ask' && (
          <ChurchAiChat
            session={session}
            profile={profile}
            churchPlan={plan ?? 'church_base'}
          />
        )}
        {tab === 'bible' && (
          <BibleReader
            session={session}
            profile={profile ? { ...profile, plan: plan ?? 'church_base' } : profile}
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
            userPlan={plan ?? 'free'}
            onBack={() => { setComposerOpen(false); setComposerSermonId(null); }}
          />
        </Suspense>
      </div>
    )}
    </>
  );
}
