import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase.js';
import { T } from './theme.js';
import { KinwoveStar } from './components/brand/KinwoveStar';

const PostComposer  = lazy(() => import('./PostComposer.jsx'));
const WalkCreator   = lazy(() => import('./WalkCreator.jsx'));

const THEME_LABEL = {
  anxiety:   'Anxiety',
  doubt:     'Doubt',
  prayer:    'Prayer',
  marriage:  'Marriage',
  grief:     'Grief',
  forgiveness: 'Forgiveness',
  suffering: 'Suffering',
  identity:  'Identity',
  meaning:   'Meaning',
  parenting: 'Parenting',
  finances:  'Finances',
  doctrine:  'Doctrine',
  other:     'Other',
};

// First-run setup state — local to the browser, keyed per church.
// Only two flags need persistence:
//   qrPrinted: pastor tapped the "print QR" item (we can't actually verify
//              they printed it, so we trust the click — pragmatic vs. perfect)
//   dismissed: pastor saw the green "all done" celebrate and clicked Dismiss.
//              If anything later un-completes (e.g. welcome note cleared) the
//              checklist re-emerges automatically.
const SETUP_KEY = (churchId) => `kinwove:church-setup:${churchId}`;
function readSetupState(churchId) {
  if (!churchId || typeof localStorage === 'undefined') return { qrPrinted: false, dismissed: false };
  try {
    const raw = localStorage.getItem(SETUP_KEY(churchId));
    return raw ? JSON.parse(raw) : { qrPrinted: false, dismissed: false };
  } catch { return { qrPrinted: false, dismissed: false }; }
}
function writeSetupState(churchId, state) {
  if (!churchId || typeof localStorage === 'undefined') return;
  try { localStorage.setItem(SETUP_KEY(churchId), JSON.stringify(state)); } catch {}
}

function SetupChecklist({ items, allDone, onDismiss }) {
  const completed = items.filter((i) => i.done).length;
  const total = items.length;
  const pct = (completed / total) * 100;
  return (
    <div style={{
      background: T.parchment,
      border: `1px solid ${T.goldLight}`,
      borderLeft: `4px solid ${T.gold}`,
      borderRadius: 14,
      padding: '18px 20px',
      marginBottom: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, display: 'flex', alignItems: 'center' }}>
          <KinwoveStar size={12} style={{ verticalAlign: 'middle', marginRight: 5, flexShrink: 0 }} /> Get ready for Sunday
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 12, color: T.inkMuted, fontWeight: 600 }}>
          {completed} of {total}
        </div>
      </div>
      <div style={{ fontFamily: T.serif, fontSize: 13.5, color: T.inkSoft, lineHeight: 1.55, marginBottom: 12 }}>
        {allDone
          ? 'Everything\u2019s in place. Your QR is ready to scan, your welcome note is up, and your sermon is live.'
          : 'A few minutes to set up the basics. Each step deep-links to the right place.'}
      </div>

      {/* Progress rail */}
      <div style={{ height: 4, background: 'rgba(184,115,58,0.18)', borderRadius: 999, overflow: 'hidden', marginBottom: 14 }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: `linear-gradient(90deg, ${T.goldLight}, ${T.gold})`,
          transition: 'width 0.3s ease',
        }} />
      </div>

      {/* Item rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((item) => (
          <button
            key={item.id}
            onClick={item.onClick}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: item.done ? 'rgba(74,139,90,0.06)' : T.white,
              border: `1px solid ${item.done ? 'rgba(74,139,90,0.30)' : T.line}`,
              borderRadius: 10, padding: '10px 12px', cursor: 'pointer',
              textAlign: 'left', fontFamily: 'inherit',
              transition: 'transform 0.12s ease, border-color 0.12s ease',
            }}
            onMouseEnter={(e) => { if (!item.done) e.currentTarget.style.borderColor = T.gold; }}
            onMouseLeave={(e) => { if (!item.done) e.currentTarget.style.borderColor = T.line; }}
          >
            <div style={{
              width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
              background: item.done ? T.success : 'transparent',
              border: `1.5px solid ${item.done ? T.success : T.line}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: item.done ? T.cream : 'transparent',
              fontSize: 13, fontWeight: 700,
            }}>
              ✓
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 14, fontWeight: 600, color: T.ink, lineHeight: 1.25,
                textDecoration: item.done ? 'line-through' : 'none',
                opacity: item.done ? 0.6 : 1,
              }}>
                {item.title}
              </div>
              {item.hint && (
                <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 2, lineHeight: 1.4 }}>
                  {item.hint}
                </div>
              )}
            </div>
            <span style={{ color: T.goldDark, fontSize: 16, flexShrink: 0 }}>→</span>
          </button>
        ))}
      </div>

      {allDone && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <button onClick={onDismiss} style={{
            background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
            padding: '7px 16px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
          }}>
            ✓ Dismiss this card
          </button>
        </div>
      )}
    </div>
  );
}

function StatTile({ label, value, sublabel, accent }) {
  return (
    <div style={{
      background: T.white, border: `1px solid ${T.line}`, borderRadius: 14,
      padding: '16px 18px', flex: 1, minWidth: 0,
    }}>
      <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.inkMuted, fontWeight: 700, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{
        fontFamily: T.serif, fontSize: 34, fontWeight: 600, letterSpacing: '-0.02em',
        color: accent ?? T.ink, lineHeight: 1, marginBottom: 4,
      }}>
        {value}
      </div>
      {sublabel && <div style={{ fontSize: 12, color: T.inkMuted }}>{sublabel}</div>}
    </div>
  );
}

function ThemeBar({ theme, count, max }) {
  const pct = Math.max(8, (count / max) * 100);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: T.ink, textTransform: 'capitalize' }}>
          {THEME_LABEL[theme] ?? theme}
        </span>
        <span style={{ fontSize: 13, color: T.goldDark, fontWeight: 700 }}>{count}</span>
      </div>
      <div style={{ height: 8, background: T.parchment, borderRadius: 999, overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: `linear-gradient(90deg, ${T.goldLight}, ${T.gold})`,
          transition: 'width 0.3s',
        }} />
      </div>
    </div>
  );
}

function Section({ title, hint, children, action, actionLabel }) {
  return (
    <div style={{
      background: T.white, border: `1px solid ${T.line}`, borderRadius: 16,
      padding: '20px 22px', marginBottom: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div>
          <div style={{ fontFamily: T.display, fontSize: 20, fontWeight: 600, color: T.ink, letterSpacing: '-0.015em', lineHeight: 1.2 }}>{title}</div>
          {hint && <div style={{ fontSize: 12.5, color: T.inkMuted, marginTop: 2 }}>{hint}</div>}
        </div>
        {action && (
          <button onClick={action} style={{
            background: 'transparent', border: `1px solid ${T.line}`, borderRadius: 999,
            padding: '6px 14px', fontSize: 12, color: T.goldDark, cursor: 'pointer', fontWeight: 600,
          }}>{actionLabel}</button>
        )}
      </div>
      <div style={{ marginTop: 14 }}>
        {children}
      </div>
    </div>
  );
}

function QuickAction({ emoji, label, hint, onClick, accent }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, minWidth: 150,
        background: T.white, border: `1px solid ${T.line}`, borderRadius: 14,
        padding: '16px 14px', cursor: 'pointer', textAlign: 'left',
        transition: 'transform 0.12s ease, border-color 0.12s ease',
        fontFamily: 'inherit',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.gold; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.line; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <div style={{ fontSize: 22, marginBottom: 6 }}>{emoji}</div>
      <div style={{ fontFamily: T.display, fontSize: 15, fontWeight: 600, color: accent ?? T.ink, letterSpacing: '-0.01em', lineHeight: 1.2, marginBottom: 3 }}>
        {label}
      </div>
      {hint && <div style={{ fontSize: 12, color: T.inkMuted, lineHeight: 1.4 }}>{hint}</div>}
    </button>
  );
}

function SermonRow({ sermon, onEdit, onTogglePublish, busy }) {
  const dateLabel = new Date(sermon.week_starts_on + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const published = sermon.is_published;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: T.white, border: `1px solid ${T.line}`, borderRadius: 12,
      padding: '12px 14px', marginBottom: 8,
    }}>
      <button
        onClick={() => onEdit(sermon)}
        style={{
          flex: 1, minWidth: 0, textAlign: 'left',
          background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit',
        }}
      >
        <div style={{ fontFamily: T.display, fontSize: 16, fontWeight: 600, color: T.ink, letterSpacing: '-0.01em', lineHeight: 1.2, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {sermon.title}
        </div>
        <div style={{ fontSize: 12, color: T.inkMuted, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span>Week of {dateLabel}</span>
          {sermon.scripture_ref && <span style={{ color: T.goldDark, fontStyle: 'italic' }}>· {sermon.scripture_ref}</span>}
        </div>
      </button>
      <button
        onClick={() => onTogglePublish(sermon)}
        disabled={busy}
        title={published ? 'Click to unpublish' : 'Click to publish'}
        style={{
          background: published ? T.successBg : 'rgba(165,63,43,0.08)',
          color: published ? T.success : T.error,
          border: `1px solid ${published ? 'rgba(74,139,90,0.35)' : 'rgba(165,63,43,0.3)'}`,
          borderRadius: 999, padding: '5px 12px', fontSize: 11.5, fontWeight: 700, letterSpacing: 0.5,
          textTransform: 'uppercase', cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
          opacity: busy ? 0.6 : 1, whiteSpace: 'nowrap',
        }}
      >
        {published ? '✓ Live' : '○ Draft'}
      </button>
    </div>
  );
}

export default function PastorDashboard({ session, profile, churchId, onBack, onOpenComposer, onOpenCareAdmin, onOpenChurchPage, onOpenSettings, onOpenPeople, embedded = false }) {
  const [loading, setLoading] = useState(true);
  const [church, setChurch] = useState(null);
  const [memberCount, setMemberCount] = useState(0);
  const [themes, setThemes] = useState([]);
  const [prayerThemes, setPrayerThemes] = useState([]);
  const [prayedIds, setPrayedIds] = useState(new Set());
  const [careCount, setCareCount] = useState(0);
  const [careTeamSize, setCareTeamSize] = useState(0);
  const [sermons, setSermons] = useState([]);
  const [sermonBusy, setSermonBusy] = useState(null); // id currently toggling
  const [recentAnonCount, setRecentAnonCount] = useState(0);

  const [walks, setWalks] = useState([]);
  const [walkModalOpen, setWalkModalOpen] = useState(false);
  const [walkCreatorOpen, setWalkCreatorOpen] = useState(false);
  const [walkSelected, setWalkSelected] = useState(null);
  const [walkNote, setWalkNote] = useState('');
  const [walkBusy, setWalkBusy] = useState(false);
  const [walkError, setWalkError] = useState(null);
  const [postModalOpen, setPostModalOpen] = useState(false);

  // Team management
  const [staff, setStaff] = useState([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null); // null = new invite
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [inviteTitle, setInviteTitle] = useState('');
  const [invitePerms, setInvitePerms] = useState({
    can_post_sermons: false, can_post_announcements: false,
    can_moderate: false, can_view_prayers: false,
    can_manage_staff: false, can_edit_church: false,
  });
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState(null);

  const PERMS = [
    { key: 'can_post_sermons',       label: 'Post & edit sermons' },
    { key: 'can_post_announcements', label: 'Post announcements' },
    { key: 'can_moderate',           label: 'Moderate comments & posts' },
    { key: 'can_view_prayers',       label: 'View prayer requests' },
    { key: 'can_manage_staff',       label: 'Invite & manage team members' },
    { key: 'can_edit_church',        label: 'Edit church profile & settings' },
  ];

  function openInvite(member = null) {
    setEditingStaff(member);
    setSelectedMember(member ? { id: member.user_id, display_name: member.display_name } : null);
    setInviteTitle(member?.role_title ?? '');
    setInvitePerms({
      can_post_sermons:       member?.can_post_sermons ?? false,
      can_post_announcements: member?.can_post_announcements ?? false,
      can_moderate:           member?.can_moderate ?? false,
      can_view_prayers:       member?.can_view_prayers ?? false,
      can_manage_staff:       member?.can_manage_staff ?? false,
      can_edit_church:        member?.can_edit_church ?? false,
    });
    setMemberSearch(''); setMemberResults([]); setInviteError(null);
    setInviteOpen(true);
  }

  function closeInvite() {
    setInviteOpen(false); setEditingStaff(null); setSelectedMember(null);
    setInviteTitle(''); setMemberSearch(''); setMemberResults([]);
  }

  useEffect(() => {
    if (!memberSearch.trim() || !churchId) { setMemberResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase.from('profiles')
        .select('id, display_name')
        .eq('church_id', churchId)
        .ilike('display_name', `%${memberSearch.trim()}%`)
        .limit(8);
      setMemberResults(data ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [memberSearch, churchId]);

  async function saveStaffMember() {
    if (!selectedMember || !inviteTitle.trim() || !churchId) return;
    setInviteBusy(true); setInviteError(null);
    const payload = {
      church_id: churchId, user_id: selectedMember.id,
      role_key: 'staff', role_label: inviteTitle.trim(),
      role_title: inviteTitle.trim(),
      is_owner: false,
      ...invitePerms,
    };
    const { error } = editingStaff
      ? await supabase.from('church_roles').update(payload).eq('id', editingStaff.id)
      : await supabase.from('church_roles').upsert(payload, { onConflict: 'church_id,user_id,role_key' });
    setInviteBusy(false);
    if (error) { setInviteError(error.message); return; }
    const { data } = await supabase.from('church_roles')
      .select('*, profiles(display_name)')
      .eq('church_id', churchId).neq('user_id', profile?.id ?? '');
    setStaff((data ?? []).map(r => ({ ...r, display_name: r.profiles?.display_name ?? 'Member' })));
    closeInvite();
  }

  async function removeStaffMember(roleId) {
    await supabase.from('church_roles').delete().eq('id', roleId);
    setStaff(s => s.filter(m => m.id !== roleId));
  }
  useEffect(() => {
    if (!churchId) return;
    let cancelled = false;
    // Only show walks that belong to this church AND have actual steps —
    // the global seed library shells have no content so announcing them is broken.
    supabase
      .from('walks')
      .select('id, title, subtitle, cover_emoji, length_days, sort_order, walk_steps(id)')
      .eq('is_published', true)
      .eq('church_id', churchId)
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        if (!cancelled) setWalks((data ?? []).filter((w) => w.walk_steps?.length > 0));
      });
    return () => { cancelled = true; };
  }, [churchId]);

  function openWalkModal() {
    setWalkSelected(church?.featured_walk_id ?? null);
    setWalkNote('');
    setWalkError(null);
    setWalkModalOpen(true);
  }

  async function announceWalk() {
    if (!walkSelected || !churchId || !session?.user?.id) return;
    const w = walks.find((x) => x.id === walkSelected);
    if (!w) return;
    setWalkBusy(true); setWalkError(null);
    const body = walkNote.trim()
      || `We're walking through "${w.title}" together. Pace is yours — start when you're ready.`;
    const [{ error: postErr }, { error: chErr }] = await Promise.all([
      supabase.from('posts').insert({
        author_id: session.user.id,
        scope: 'church',
        scope_id: churchId,
        kind: 'text',
        body,
        body_data: { is_walk_announcement: true, walk_id: w.id, walk_title: w.title, walk_emoji: w.cover_emoji, walk_length_days: w.length_days },
        is_anonymous: false,
        person_type: profile?.person_type ?? null,
      }),
      supabase.from('churches').update({ featured_walk_id: w.id }).eq('id', churchId),
    ]);
    setWalkBusy(false);
    if (postErr || chErr) {
      setWalkError((postErr || chErr)?.message || 'Could not announce.');
      return;
    }
    setChurch((c) => c ? { ...c, featured_walk_id: w.id } : c);
    setWalkModalOpen(false);
  }

  // First-run setup card — localStorage-backed, keyed per church.
  // Re-read when churchId changes (covers the rare case of swapping churches
  // without a full unmount, e.g. in dev / future multi-church support).
  const [setupState, setSetupState] = useState(() => readSetupState(churchId));
  useEffect(() => { setSetupState(readSetupState(churchId)); }, [churchId]);

  useEffect(() => {
    if (!churchId) return;
    let active = true;
    setLoading(true);
    (async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

      const [
        { data: c },
        { count: members },
        { data: anonRows, count: anonCount },
        { data: prayers },
        { count: careConvCount },
        { count: careTeam },
        { data: sermonRows },
        { data: staffRows },
      ] = await Promise.all([
        supabase.from('churches').select('*').eq('id', churchId).maybeSingle(),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('church_id', churchId),
        supabase
          .from('anonymous_questions')
          .select('theme_tag, created_at', { count: 'exact' })
          .eq('church_id', churchId)
          .gte('created_at', sevenDaysAgo),
        supabase
          .from('personal_prayers')
          .select('id, body, created_at, user_id, profiles!user_id(church_id, display_name)')
          .eq('is_public', true)
          .gte('created_at', sevenDaysAgo)
          .limit(100),
        supabase
          .from('care_conversations')
          .select('id', { count: 'exact', head: true })
          .eq('church_id', churchId)
          .gte('created_at', sevenDaysAgo),
        supabase
          .from('care_team_members')
          .select('id', { count: 'exact', head: true })
          .eq('church_id', churchId)
          .eq('is_active', true),
        supabase
          .from('sermons')
          .select('*')
          .eq('church_id', churchId)
          .order('week_starts_on', { ascending: false }),
        supabase
          .from('church_roles')
          .select('*, profiles(display_name)')
          .eq('church_id', churchId)
          .eq('is_owner', false)
          .neq('user_id', session?.user?.id ?? ''),
      ]);
      if (!active) return;

      setChurch(c);
      setMemberCount(members ?? 0);
      setRecentAnonCount(anonCount ?? 0);
      setStaff((staffRows ?? []).map(r => ({ ...r, display_name: r.profiles?.display_name ?? 'Member' })));

      const themeCounts = {};
      (anonRows ?? []).forEach((r) => {
        const k = r.theme_tag ?? 'other';
        themeCounts[k] = (themeCounts[k] ?? 0) + 1;
      });
      const themeArr = Object.entries(themeCounts)
        .map(([k, v]) => ({ theme: k, count: v }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);
      setThemes(themeArr);

      // Filter to church members only, then take the 6 most recent
      const churchPrayers = (prayers ?? [])
        .filter((p) => p.profiles?.church_id === churchId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 6)
        .map((p) => ({ id: p.id, body: p.body, name: p.profiles?.display_name ?? 'Anonymous' }));
      setPrayerThemes(churchPrayers);

      setCareCount(careConvCount ?? 0);
      setCareTeamSize(careTeam ?? 0);
      setSermons(sermonRows ?? []);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [churchId]);

  const themeMax = useMemo(() => Math.max(1, ...themes.map((t) => t.count)), [themes]);
  const prayerMax = useMemo(() => Math.max(1, ...prayerThemes.map((t) => t.count)), [prayerThemes]);

  // Setup checklist — derived state. Re-runs whenever church/sermons/members
  // change, so checking off "Add service times" in Settings and coming back
  // to Overview reflects immediately (the tab remount also helps).
  const hasPublishedSermon = sermons.some((s) => s.is_published);
  const hasVisitInfo = !!(church?.service_info || church?.street_address);
  const hasWelcomeNote = !!(church?.pinned_post && String(church.pinned_post).trim());
  const setupItems = useMemo(() => ([
    {
      id: 'visit',
      title: 'Add service times & location',
      hint: 'So first-time visitors know when and where to show up.',
      done: hasVisitInfo,
      onClick: () => onOpenSettings?.(),
    },
    {
      id: 'welcome',
      title: 'Write a welcome note',
      hint: 'A sentence or two — the first thing visitors read on your page.',
      done: hasWelcomeNote,
      onClick: () => onOpenSettings?.(),
    },
    {
      id: 'sermon',
      title: 'Publish your first sermon',
      hint: 'Paste an outline — we turn Sunday into a week of devotionals.',
      done: hasPublishedSermon,
      onClick: () => onOpenComposer?.(),
    },
    {
      id: 'qr',
      title: 'Print your QR code',
      hint: 'Tape it in the bulletin so people can join in five seconds.',
      done: setupState.qrPrinted,
      onClick: () => {
        // Click counts as "printed" — we can't actually verify, so we trust
        // the tap. Pragmatic vs. perfect. Then deep-link into settings AND
        // ask the panel to pop the QR modal directly — saves a second click
        // at the moment that matters most (sharing on Sunday).
        const next = { ...setupState, qrPrinted: true };
        setSetupState(next);
        writeSetupState(churchId, next);
        onOpenSettings?.('open-qr');
      },
    },
    {
      id: 'invite',
      title: 'Invite 5 members',
      hint: memberCount >= 5
        ? '5+ joined — your church is moving.'
        : `${memberCount} of 5 so far — share the QR or your invite code.`,
      done: memberCount >= 5,
      onClick: () => onOpenPeople?.(),
    },
  ]), [hasVisitInfo, hasWelcomeNote, hasPublishedSermon, setupState, memberCount, churchId, onOpenSettings, onOpenComposer, onOpenPeople]);

  const allSetupDone = setupItems.every((i) => i.done);
  // Visibility rule: hide once dismissed AND still all-done. If anything
  // un-completes (sermon unpublished, welcome cleared) the card returns.
  const showChecklist = !(setupState.dismissed && allSetupDone);

  function dismissSetup() {
    const next = { ...setupState, dismissed: true };
    setSetupState(next);
    writeSetupState(churchId, next);
  }

  async function togglePublish(sermon) {
    setSermonBusy(sermon.id);
    const next = !sermon.is_published;
    const { error: err } = await supabase
      .from('sermons')
      .update({ is_published: next })
      .eq('id', sermon.id);
    setSermonBusy(null);
    if (err) {
      console.error('toggle publish failed', err.message);
      return;
    }
    setSermons((rows) => rows.map((s) => s.id === sermon.id ? { ...s, is_published: next } : s));
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: T.cream, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: T.inkMuted, fontFamily: T.serif }}>Loading…</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: embedded ? 'auto' : '100vh', background: T.cream, padding: embedded ? 0 : '32px 20px 80px', overflowY: 'auto' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        {/* First-run setup checklist — shows until pastor explicitly dismisses
            with all five items done. Sits at the top of Overview so a brand-
            new pastor lands on a guided punch list, not a blank dashboard. */}
        {showChecklist && (
          <SetupChecklist
            items={setupItems}
            allDone={allSetupDone}
            onDismiss={dismissSetup}
          />
        )}

        {!embedded && (
          <>
            <button onClick={onBack} style={{
              background: 'none', border: 'none', color: T.goldDark, fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 14,
            }}>← Back</button>

            <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: T.goldDark, marginBottom: 8 }}>
              Pastor dashboard
            </div>
            <h1 style={{ fontFamily: T.serif, fontSize: 34, fontWeight: 600, color: T.ink, letterSpacing: '-0.022em', lineHeight: 1.08, margin: '0 0 8px' }}>
              {church?.name ?? 'Your church'} · this week
            </h1>
            <p style={{ color: T.inkSoft, fontSize: 14.5, lineHeight: 1.65, margin: '0 0 18px' }}>
              The pulse of your congregation — themes only, no individual data. You'll never see who said what.
            </p>

            {/* Quick actions */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <QuickAction emoji={<KinwoveStar size={22} />} label="New sermon"        hint="Turn Sunday into a week"    onClick={onOpenComposer}    accent={T.goldDark} />
              <QuickAction emoji="✶" label="Announce a walk"   hint="Post & feature for everyone" onClick={openWalkModal}     accent={T.goldDark} />
              <QuickAction emoji="✎" label="Post to feed"      hint="A note for the congregation" onClick={() => setPostModalOpen(true)} />
              <QuickAction emoji="👥" label="People & roles"    hint="Invite, badge, and manage" onClick={onOpenCareAdmin} />
              <QuickAction emoji="⛪" label="Public church page" hint="See what visitors see"     onClick={onOpenChurchPage} />
            </div>
          </>
        )}

        {/* Embedded mode — full creation hub. */}
        {embedded && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <QuickAction emoji="📖" label="New sermon"      hint="Turn Sunday into a week"     onClick={() => onOpenComposer?.()}    accent={T.goldDark} />
            <QuickAction emoji="✶"  label="Announce a walk" hint="Post & feature for everyone"  onClick={openWalkModal}               accent={T.goldDark} />
            <QuickAction emoji="✎"  label="Post to feed"    hint="A note for the congregation"  onClick={() => setPostModalOpen(true)} />
          </div>
        )}

        {/* Top row stats */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <StatTile label="Members" value={memberCount} sublabel="on kinwove" />
          <StatTile label="Questions asked" value={recentAnonCount} sublabel="last 7 days" accent={T.goldDark} />
          <StatTile label="Care convos" value={careCount} sublabel="last 7 days" />
          <StatTile label="Care team" value={careTeamSize} sublabel="active" />
        </div>

        {/* Question heatmap */}
        <Section
          title="What your people are wrestling with"
          hint="Anonymous questions to kinwove, classified by theme. No identities, ever."
        >
          {themes.length === 0 ? (
            <div style={{ color: T.inkMuted, fontFamily: T.serif, fontStyle: 'italic', textAlign: 'center', padding: '20px 0', lineHeight: 1.6 }}>
              No questions yet. Share your church's anonymous-ask QR code so visitors can chat without signing up — themes (never names or words) will land here.
            </div>
          ) : (
            themes.map((t) => <ThemeBar key={t.theme} theme={t.theme} count={t.count} max={themeMax} />)
          )}
        </Section>

        {/* Prayer themes */}
        <Section
          title="Prayer pulse"
          hint="Public prayer requests from your congregation this week."
        >
          {prayerThemes.length === 0 ? (
            <div style={{ color: T.inkMuted, fontFamily: T.serif, fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
              No prayer requests this week.
            </div>
          ) : (
            prayerThemes.map((t) => {
              const prayed = prayedIds.has(t.id);
              return (
                <div key={t.id} style={{
                  padding: '10px 0', borderBottom: `1px solid ${T.line}`,
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: T.goldDark, marginBottom: 3 }}>
                      {t.name}
                    </div>
                    <div style={{ fontFamily: T.serif, fontSize: 14, color: T.inkSoft, lineHeight: 1.55 }}>
                      {t.body.length > 120 ? t.body.slice(0, 120) + '…' : t.body}
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      if (prayed) return;
                      await supabase.from('personal_prayer_support').insert({ prayer_id: t.id, user_id: session?.user?.id });
                      setPrayedIds((prev) => new Set([...prev, t.id]));
                    }}
                    style={{
                      flexShrink: 0, border: `1px solid ${prayed ? T.gold : T.line}`,
                      borderRadius: 999, padding: '5px 12px', fontSize: 12,
                      background: prayed ? 'rgba(184,115,58,0.10)' : 'transparent',
                      color: prayed ? T.goldDark : T.inkMuted,
                      cursor: prayed ? 'default' : 'pointer', fontWeight: 600,
                      transition: 'all 0.15s',
                    }}
                  >
                    {prayed ? '🙏 Prayed' : '🙏 Pray'}
                  </button>
                </div>
              );
            })
          )}
        </Section>

        {/* Sermons — always visible, this is the creation hub */}
        <Section
          title="Sermons"
          hint={sermons.length === 0
            ? 'Paste Sunday\u2019s outline. Get a week of daily content for your congregation.'
            : `${sermons.filter((s) => s.is_published).length} live · ${sermons.filter((s) => !s.is_published).length} draft`}
          action={onOpenComposer}
          actionLabel="+ New"
        >
          {sermons.length === 0 ? (
            <button onClick={onOpenComposer} style={{
              width: '100%', textAlign: 'left', cursor: 'pointer',
              background: T.parchment, border: `1px dashed ${T.goldLight}`, borderRadius: 12,
              padding: '14px 16px', color: T.inkSoft, fontSize: 14, lineHeight: 1.55, fontFamily: T.serif,
            }}>
              <strong style={{ color: T.ink }}>Nothing scheduled yet.</strong> Paste this Sunday's outline — we'll turn it into 5 days of devotionals, group questions, and a kid version. <span style={{ color: T.goldDark, fontWeight: 600 }}>Start →</span>
            </button>
          ) : (
            sermons.map((s) => (
              <SermonRow
                key={s.id}
                sermon={s}
                onEdit={(sermon) => onOpenComposer(sermon.id)}
                onTogglePublish={togglePublish}
                busy={sermonBusy === s.id}
              />
            ))
          )}
        </Section>

        {/* Care team (hidden in embedded mode — Care tab handles it) */}
        {!embedded && (
        <Section
          title="Care team"
          hint={`${careTeamSize} active member${careTeamSize === 1 ? '' : 's'}. ${careCount} conversation${careCount === 1 ? '' : 's'} this week. (Counts only — content is private.)`}
          action={onOpenCareAdmin}
          actionLabel="Manage"
        >
          {careTeamSize === 0 && (
            <button onClick={onOpenCareAdmin} style={{
              width: '100%', textAlign: 'left', cursor: 'pointer',
              background: T.parchment, border: `1px dashed ${T.goldLight}`, borderRadius: 12,
              padding: '14px 16px', color: T.inkSoft, fontSize: 14, lineHeight: 1.55, fontFamily: T.serif,
            }}>
              <strong style={{ color: T.ink }}>No care team yet.</strong> Add 3–5 trusted people — elders, lay counselors, ministry leads. Members can then reach out anonymously, by topic, or by name. <span style={{ color: T.goldDark, fontWeight: 600 }}>Add people →</span>
            </button>
          )}
          {careTeamSize > 0 && (
            <div style={{ fontSize: 13, color: T.inkSoft, lineHeight: 1.65 }}>
              Your care team is active. Members can reach out anonymously, by topic, or to a specific person.
            </div>
          )}
        </Section>
        )}

        {/* Church team */}
        {!embedded && (
        <Section
          title="Church team"
          hint="Team members access only what you allow. You control every permission."
          action={() => openInvite()}
          actionLabel="+ Add member"
        >
          {staff.length === 0 ? (
            <button onClick={() => openInvite()} style={{
              width: '100%', textAlign: 'left', cursor: 'pointer',
              background: T.parchment, border: `1px dashed ${T.goldLight}`, borderRadius: 12,
              padding: '14px 16px', color: T.inkSoft, fontSize: 14, lineHeight: 1.55, fontFamily: T.serif,
            }}>
              <strong style={{ color: T.ink }}>No team members yet.</strong> Add associate pastors, worship leaders, or elders — each with exactly the permissions they need. <span style={{ color: T.goldDark, fontWeight: 600 }}>Add someone →</span>
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {staff.map(m => (
                <div key={m.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: T.parchment, borderRadius: 12, padding: '12px 14px',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{m.display_name}</div>
                    <div style={{ fontSize: 12, color: T.goldDark, marginTop: 1 }}>{m.role_title || m.role_label}</div>
                    <div style={{ fontSize: 11, color: T.inkMuted, marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: '3px 8px' }}>
                      {PERMS.filter(p => m[p.key]).map(p => (
                        <span key={p.key}>· {p.label}</span>
                      ))}
                      {PERMS.every(p => !m[p.key]) && <span style={{ fontStyle: 'italic' }}>No permissions assigned yet</span>}
                    </div>
                  </div>
                  <button onClick={() => openInvite(m)} style={{ background: 'none', border: `1px solid ${T.line}`, borderRadius: 999, padding: '5px 12px', fontSize: 12, color: T.inkSoft, cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => removeStaffMember(m.id)} style={{ background: 'none', border: 'none', color: T.inkMuted, fontSize: 12, cursor: 'pointer', padding: '5px 6px' }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </Section>
        )}

        {/* Quick links */}
        <div style={{
          background: 'rgba(184,115,58,0.06)', border: `1px solid ${T.goldLight}`,
          borderRadius: 14, padding: '14px 18px',
          fontSize: 13, color: T.inkSoft, lineHeight: 1.65,
        }}>
          <div style={{ fontWeight: 600, color: T.ink, marginBottom: 6 }}>What pastors can and can't see</div>
          You can see who's joined, overall activity, and sermon engagement. You can't see private prayers, anonymous questions, or what individuals are reading. Your congregation's private moments stay private.
        </div>

        {!embedded && (
          <button onClick={onOpenChurchPage} style={{
            width: '100%', background: 'transparent', border: `1px solid ${T.line}`, borderRadius: 999,
            padding: '12px 20px', fontSize: 14, color: T.inkSoft, cursor: 'pointer',
            marginTop: 14,
          }}>
            View your public church page →
          </button>
        )}
      </div>

      {walkModalOpen && (
        <div
          onClick={() => !walkBusy && setWalkModalOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(44,24,16,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: T.cream, borderRadius: 18, maxWidth: 480, width: '100%',
              maxHeight: '90vh', overflowY: 'auto',
              padding: '24px 22px', border: `1px solid ${T.line}`,
            }}
          >
            <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 6 }}>
              ✶ Announce a walk
            </div>
            <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 600, color: T.ink, letterSpacing: '-0.018em', marginBottom: 6 }}>
              Pick one for the whole church
            </div>
            <div style={{ fontSize: 13, color: T.inkSoft, lineHeight: 1.55, marginBottom: 14 }}>
              Posts to your congregation's wall and features it on the ChurchHub. Members still pace it privately.
            </div>

            {/* Create custom walk CTA */}
            <button
              onClick={() => { setWalkModalOpen(false); setWalkCreatorOpen(true); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                textAlign: 'left', background: T.parchment,
                border: `1px dashed ${T.gold}`, borderRadius: 12,
                padding: '10px 14px', cursor: 'pointer', marginBottom: 14,
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: T.white, border: `1px solid ${T.goldLight}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <KinwoveStar size={18} color={T.goldDark} />
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: T.ink }}>Create your own walk with AI</div>
                <div style={{ fontSize: 12, color: T.inkSoft, marginTop: 1 }}>Write a custom devotional journey for your congregation</div>
              </div>
            </button>

            {walks.length > 0 && (
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: T.inkMuted, marginBottom: 8 }}>
                Or choose one you've created
              </div>
            )}

            <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
              {walks.map((w) => {
                const active = walkSelected === w.id;
                return (
                  <button
                    key={w.id}
                    onClick={() => setWalkSelected(w.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                      background: active ? T.parchment : T.white,
                      border: `1px solid ${active ? T.goldDark : T.line}`,
                      borderRadius: 12, padding: '10px 12px', cursor: 'pointer',
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: T.cream, border: `1px solid ${T.line}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, color: T.goldDark, flexShrink: 0,
                    }}>{w.cover_emoji}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, lineHeight: 1.25 }}>{w.title}</div>
                      {w.subtitle && (
                        <div style={{ fontSize: 12, color: T.inkSoft, fontStyle: 'italic', lineHeight: 1.4, marginTop: 2 }}>{w.subtitle}</div>
                      )}
                      <div style={{ fontSize: 11, color: T.inkMuted, marginTop: 2 }}>{w.length_days}-day walk</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <label style={{ display: 'block', fontSize: 12, color: T.inkSoft, fontWeight: 600, marginBottom: 4 }}>
              Note to your congregation (optional)
            </label>
            <textarea
              value={walkNote}
              onChange={(e) => setWalkNote(e.target.value.slice(0, 500))}
              placeholder="e.g. We're doing this together for Lent. No pressure on pace — pick it up when you can."
              rows={3}
              style={{
                width: '100%', boxSizing: 'border-box',
                border: `1px solid ${T.line}`, borderRadius: 10, padding: '10px 12px',
                fontFamily: T.serif, fontSize: 14, color: T.ink, lineHeight: 1.55,
                background: T.white, outline: 'none', resize: 'vertical', marginBottom: 10,
              }}
            />
            <div style={{ fontSize: 11.5, color: T.inkMuted, marginBottom: 14 }}>
              Leave blank for a default warm announcement.
            </div>

            {walkError && (
              <div style={{ fontSize: 12.5, color: T.error, marginBottom: 10 }}>{walkError}</div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setWalkModalOpen(false)}
                disabled={walkBusy}
                style={{
                  flex: '0 0 auto', background: 'transparent', border: `1px solid ${T.line}`, borderRadius: 999,
                  padding: '10px 18px', fontSize: 13, color: T.inkMuted,
                  cursor: walkBusy ? 'wait' : 'pointer',
                }}
              >Cancel</button>
              <button
                onClick={announceWalk}
                disabled={!walkSelected || walkBusy}
                style={{
                  flex: 1, background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
                  padding: '10px 18px', fontSize: 13.5, fontWeight: 600,
                  cursor: (!walkSelected || walkBusy) ? 'not-allowed' : 'pointer',
                  opacity: (!walkSelected || walkBusy) ? 0.5 : 1,
                }}
              >{walkBusy ? 'Posting…' : 'Post & feature'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Walk Creator full-screen overlay ── */}
      {walkCreatorOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 250, background: T.cream, overflowY: 'auto', padding: '28px 20px 80px' }}>
          <Suspense fallback={<div style={{ textAlign: 'center', padding: 60, color: T.inkMuted }}>Loading…</div>}>
            <WalkCreator
              session={session}
              churchId={churchId}
              onBack={() => setWalkCreatorOpen(false)}
              onSaved={(walk) => {
                setWalkCreatorOpen(false);
                setWalks((prev) => [...prev, walk]);
              }}
            />
          </Suspense>
        </div>
      )}

      {inviteOpen && (
        <div
          onClick={() => !inviteBusy && closeInvite()}
          style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(44,24,16,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: T.cream, borderRadius: 18, maxWidth: 460, width: '100%',
              maxHeight: '90vh', overflowY: 'auto',
              padding: '24px 22px', border: `1px solid ${T.line}`,
            }}
          >
            <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 4 }}>
              {editingStaff ? 'Edit team member' : '+ Add team member'}
            </div>
            <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 600, color: T.ink, letterSpacing: '-0.018em', marginBottom: 16 }}>
              {editingStaff ? editingStaff.display_name : 'Who are you adding?'}
            </div>

            {/* Member search — only shown for new invites */}
            {!editingStaff && (
              <div style={{ marginBottom: 14, position: 'relative' }}>
                <label style={{ display: 'block', fontSize: 12, color: T.inkSoft, fontWeight: 600, marginBottom: 4 }}>
                  Search church members
                </label>
                {selectedMember ? (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: T.parchment, border: `1px solid ${T.goldLight}`,
                    borderRadius: 10, padding: '9px 12px',
                  }}>
                    <span style={{ flex: 1, fontSize: 14, color: T.ink, fontWeight: 600 }}>{selectedMember.display_name}</span>
                    <button
                      onClick={() => { setSelectedMember(null); setMemberSearch(''); setMemberResults([]); }}
                      style={{ background: 'none', border: 'none', color: T.inkMuted, cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1 }}
                    >×</button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="Type a name…"
                      autoFocus
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        border: `1px solid ${T.line}`, borderRadius: 10, padding: '9px 12px',
                        fontFamily: 'inherit', fontSize: 14, color: T.ink,
                        background: T.white, outline: 'none',
                      }}
                    />
                    {memberResults.length > 0 && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                        background: T.white, border: `1px solid ${T.line}`, borderRadius: 10,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.12)', marginTop: 4, overflow: 'hidden',
                      }}>
                        {memberResults.map(r => (
                          <button
                            key={r.id}
                            onClick={() => { setSelectedMember(r); setMemberSearch(''); setMemberResults([]); }}
                            style={{
                              display: 'block', width: '100%', textAlign: 'left',
                              background: 'none', border: 'none', padding: '10px 14px',
                              fontSize: 14, color: T.ink, cursor: 'pointer', fontFamily: 'inherit',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = T.parchment; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                          >
                            {r.display_name}
                          </button>
                        ))}
                      </div>
                    )}
                    {memberSearch.trim().length > 1 && memberResults.length === 0 && (
                      <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 6, fontStyle: 'italic' }}>
                        No members found — they need to join your church first.
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Role title */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, color: T.inkSoft, fontWeight: 600, marginBottom: 4 }}>
                Role title
              </label>
              <input
                type="text"
                value={inviteTitle}
                onChange={(e) => setInviteTitle(e.target.value.slice(0, 60))}
                placeholder="e.g. Associate Pastor, Worship Leader, Elder…"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  border: `1px solid ${T.line}`, borderRadius: 10, padding: '9px 12px',
                  fontFamily: 'inherit', fontSize: 14, color: T.ink,
                  background: T.white, outline: 'none',
                }}
              />
            </div>

            {/* Permissions checklist */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12, color: T.inkSoft, fontWeight: 600, marginBottom: 8 }}>
                What can they do?
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {PERMS.map(p => (
                  <label
                    key={p.key}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: invitePerms[p.key] ? T.parchment : T.white,
                      border: `1px solid ${invitePerms[p.key] ? T.goldLight : T.line}`,
                      borderRadius: 10, padding: '9px 12px', cursor: 'pointer',
                      transition: 'background 0.1s, border-color 0.1s',
                    }}
                  >
                    <div style={{
                      width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                      background: invitePerms[p.key] ? T.goldDark : 'transparent',
                      border: `1.5px solid ${invitePerms[p.key] ? T.goldDark : T.line}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: T.cream, fontSize: 11, fontWeight: 700,
                    }}>
                      {invitePerms[p.key] ? '✓' : ''}
                    </div>
                    <span style={{ fontSize: 13.5, color: T.ink }}>{p.label}</span>
                    <input
                      type="checkbox"
                      checked={invitePerms[p.key]}
                      onChange={(e) => setInvitePerms(prev => ({ ...prev, [p.key]: e.target.checked }))}
                      style={{ display: 'none' }}
                    />
                  </label>
                ))}
              </div>
            </div>

            {inviteError && (
              <div style={{ fontSize: 12.5, color: T.error, marginBottom: 10 }}>{inviteError}</div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={closeInvite}
                disabled={inviteBusy}
                style={{
                  flex: '0 0 auto', background: 'transparent', border: `1px solid ${T.line}`, borderRadius: 999,
                  padding: '10px 18px', fontSize: 13, color: T.inkMuted,
                  cursor: inviteBusy ? 'wait' : 'pointer',
                }}
              >Cancel</button>
              <button
                onClick={saveStaffMember}
                disabled={inviteBusy || !selectedMember || !inviteTitle.trim()}
                style={{
                  flex: 1, background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
                  padding: '10px 18px', fontSize: 13.5, fontWeight: 600,
                  cursor: (inviteBusy || !selectedMember || !inviteTitle.trim()) ? 'not-allowed' : 'pointer',
                  opacity: (inviteBusy || !selectedMember || !inviteTitle.trim()) ? 0.5 : 1,
                }}
              >{inviteBusy ? 'Saving…' : editingStaff ? 'Save changes' : 'Add to team'}</button>
            </div>
          </div>
        </div>
      )}

      {postModalOpen && (
        <div
          onClick={() => setPostModalOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(44,24,16,0.65)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 20, overflowY: 'auto' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: T.cream, borderRadius: 18, maxWidth: 560, width: '100%',
              marginTop: 40, padding: '22px 22px 18px', border: `1px solid ${T.line}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 4 }}>
                  ✎ Post to feed
                </div>
                <div style={{ fontFamily: T.display, fontSize: 20, fontWeight: 600, color: T.ink, letterSpacing: '-0.015em' }}>
                  A note for your congregation
                </div>
              </div>
              <div style={{ flex: 1 }} />
              <button
                onClick={() => setPostModalOpen(false)}
                aria-label="Close"
                style={{
                  background: 'none', border: 'none', fontSize: 22, color: T.inkMuted,
                  cursor: 'pointer', padding: 4, lineHeight: 1,
                }}
              >×</button>
            </div>
            <Suspense fallback={<div style={{ color: T.inkMuted, fontFamily: T.serif, padding: 12 }}>Loading…</div>}>
              <PostComposer
                session={session}
                profile={profile}
                scope="church"
                scopeId={churchId}
                placeholder="Share something with your church…"
                onPosted={() => setPostModalOpen(false)}
              />
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
}
