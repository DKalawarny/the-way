import { useEffect, useState, lazy, Suspense } from 'react';
import { ArrowLeft, Share2, Check, ExternalLink, MapPin, Clock, Users, Globe, BookOpen } from 'lucide-react';
import { supabase } from './supabase.js';
import { T, SHADOW, RADIUS, SEMANTIC, SPACE } from './theme.js';
import { KinwoveStar } from './components/brand/KinwoveStar.jsx';
import { presetForRole } from './Badge.jsx';
import { useUiKit } from './uikit.jsx';
import JoinByCode from './JoinByCode.jsx';
import { codeToFlag } from './countries.js';
import { churchBannerBg } from './ChurchAdmin.jsx';

const Feed         = lazy(() => import('./Feed.jsx'));
const PostComposer = lazy(() => import('./PostComposer.jsx'));

export default function ChurchPage({
  session, profile, churchId, pastorChurchId,
  onBack, onProfileUpdate, onViewProfile,
  onOpenSermon, onOpenAdmin, onRequestJoin,
  onOpenFeed, onOpenPrayer, onOpenTalkToSomeone, onOpenCareInbox,
  onOpenPastorDashboard, onOpenWalks, onFindChurches,
  onNewSermon,
  chromeless = false,
}) {
  const [church, setChurch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [joining, setJoining] = useState(false);
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const [joinRequest, setJoinRequest] = useState(null); // null | 'pending' | 'declined'
  const [codeInput, setCodeInput] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [latestSermon, setLatestSermon] = useState(null); // newest is_published=true sermon
  const [seriesList, setSeriesList] = useState([]);        // [{id,name,scripture_arc,started_on,ended_on,description,sermon_count}]
  const [openSeriesId, setOpenSeriesId] = useState(null);  // which series shelf is currently expanded
  const [seriesSermons, setSeriesSermons] = useState({});  // cache: { [seriesId]: [{id,title,scripture_ref,series_index,week_starts_on}] }
  const [reportOpen, setReportOpen] = useState(false);
  const [reportType, setReportType] = useState('inaccurate_info');
  const [reportReason, setReportReason] = useState('');
  const [reportEmail, setReportEmail] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [isCareTeam, setIsCareTeam] = useState(false);
  const [featuredWalk, setFeaturedWalk] = useState(null);
  const [churchPrayers, setChurchPrayers] = useState([]);
  const [prayedIds, setPrayedIds] = useState(() => new Set());
  const [feedRefresh, setFeedRefresh] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  // Initialise from props so the first render is never blank.
  // isMember can be computed from props alone; isPastor uses the prop OR
  // falls back to church.pastor_id so it works even when pastorChurchId
  // hasn't been loaded into App state yet (e.g. navigating directly).
  const isMember = !!churchId && profile?.church_id === churchId;
  const isPastor = (!!pastorChurchId && pastorChurchId === churchId)
    || (!!church && !!session?.user?.id && church.pastor_id === session.user.id);
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/?church=${churchId}` : '';

  const [tab, setTab] = useState(() =>
    (!!churchId && profile?.church_id === churchId) ? 'feed' : 'info'
  );
  const { showToast, ui: uikitUi } = useUiKit();

  useEffect(() => {
    if (!loading && isPastor && tab === 'info') setTab('feed');
  }, [loading, isPastor]);

  useEffect(() => {
    if (!churchId) return;
    setLoading(true);
    Promise.all([
      supabase
        .from('churches')
        .select('*')
        .eq('id', churchId)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('church_id', churchId),
      supabase
        .from('sermons')
        .select('id, title, scripture_ref, summary, week_starts_on')
        .eq('church_id', churchId)
        .eq('is_published', true)
        .order('week_starts_on', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]).then(async ([{ data: c, error: cErr }, { count }, { data: serm }]) => {
      if (cErr || !c) { setLoadError(true); setLoading(false); return; }
      let withPastor = c;
      if (c?.pastor_id) {
        const { data: pastor } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_config, avatar_url, city, country, tradition')
          .eq('id', c.pastor_id)
          .maybeSingle();
        withPastor = { ...c, pastor };
      }
      setChurch(withPastor);
      setMemberCount(count ?? 0);
      setLatestSermon(serm ?? null);
      setLoading(false);
    });

    // Series shelf — newest first. We fetch series + their sermon counts in
    // parallel so the shelf can render "X weeks" without an extra round-trip
    // when a card is expanded.
    (async () => {
      const { data: rows } = await supabase
        .from('sermon_series')
        .select('id, name, scripture_arc, started_on, ended_on, description')
        .eq('church_id', churchId)
        .eq('is_published', true)
        .order('started_on', { ascending: false });
      const list = rows ?? [];
      if (!list.length) { setSeriesList([]); return; }
      const counts = await Promise.all(list.map((s) =>
        supabase
          .from('sermons')
          .select('id', { count: 'exact', head: true })
          .eq('series_id', s.id)
          .eq('is_published', true)
          .then(({ count }) => count ?? 0)
      ));
      setSeriesList(list.map((s, i) => ({ ...s, sermon_count: counts[i] })));
    })();
  }, [churchId]);

  // Load existing join request for signed-in non-members
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || isMember || !churchId) { setJoinRequest(null); return; }
    let cancelled = false;
    supabase.from('church_join_requests')
      .select('status')
      .eq('church_id', churchId).eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setJoinRequest(data?.status ?? null);
      });
    return () => { cancelled = true; };
  }, [session?.user?.id, churchId, isMember]);

  // Follow state + follower count
  useEffect(() => {
    if (!churchId) return;
    const uid = session?.user?.id;
    Promise.all([
      uid ? supabase.from('church_follows').select('user_id').eq('church_id', churchId).eq('user_id', uid).maybeSingle() : Promise.resolve({ data: null }),
      supabase.from('church_follows').select('user_id', { count: 'exact', head: true }).eq('church_id', churchId),
    ]).then(([followRes, countRes]) => {
      setIsFollowing(!!followRes.data);
      setFollowerCount(countRes.count ?? 0);
    });
  }, [churchId, session?.user?.id]);

  async function handleFollow() {
    if (!session?.user?.id) return;
    setFollowLoading(true);
    if (isFollowing) {
      await supabase.from('church_follows').delete().eq('church_id', churchId).eq('user_id', session.user.id);
      setIsFollowing(false);
      setFollowerCount((c) => Math.max(0, c - 1));
    } else {
      await supabase.from('church_follows').insert({ church_id: churchId, user_id: session.user.id });
      setIsFollowing(true);
      setFollowerCount((c) => c + 1);
    }
    setFollowLoading(false);
  }

  // Member-only data — pending role invites, care team membership, featured walk.
  // Skipped for visitors so we don't waste round-trips on the public preview.
  useEffect(() => {
    if (!isMember) {
      setPendingInvites([]);
      setIsCareTeam(false);
      setFeaturedWalk(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const userId = session?.user?.id;
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const [invitesRes, careRes, walkRes, prayersRes] = await Promise.all([
        userId
          ? supabase.from('church_role_invites')
              .select('id, role_key, role_label, message, created_at, invited_by')
              .eq('church_id', churchId).eq('user_id', userId).eq('status', 'pending')
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: [] }),
        userId
          ? supabase.from('care_team_members').select('id')
              .eq('church_id', churchId).eq('user_id', userId).eq('is_active', true).maybeSingle()
          : Promise.resolve({ data: null }),
        church?.featured_walk_id
          ? supabase.from('walks').select('id, title, subtitle, cover_emoji, length_days')
              .eq('id', church.featured_walk_id).eq('is_published', true).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase
          .from('personal_prayers')
          .select('id, body, created_at, user_id, profiles!user_id(church_id, display_name)')
          .eq('is_public', true)
          .gte('created_at', sevenDaysAgo)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);
      if (cancelled) return;
      setPendingInvites(invitesRes.data ?? []);
      setIsCareTeam(!!careRes.data);
      setFeaturedWalk(walkRes.data ?? null);
      // Filter prayers to this church's members only
      const prayers = (prayersRes.data ?? [])
        .filter((p) => p.profiles?.church_id === churchId)
        .slice(0, 6)
        .map((p) => ({ id: p.id, body: p.body, name: p.profiles?.display_name ?? 'Someone' }));
      setChurchPrayers(prayers);
    })();
    return () => { cancelled = true; };
  }, [isMember, churchId, session?.user?.id, church?.featured_walk_id]);

  async function respondToInvite(inviteId, accept) {
    const invite = pendingInvites.find((i) => i.id === inviteId);
    const { error } = await supabase
      .from('church_role_invites')
      .update({ status: accept ? 'accepted' : 'declined' })
      .eq('id', inviteId);
    if (error) {
      showToast(`Could not respond: ${error.message}`, 'error');
      return;
    }
    setPendingInvites((prev) => prev.filter((i) => i.id !== inviteId));
    setFeedRefresh((n) => n + 1);
    if (accept && invite) {
      const label = presetForRole(invite.role_key)?.label ?? invite.role_label ?? 'role';
      showToast(`You're now part of the ${label}.`, 'success');
    }
  }

  async function toggleSeries(seriesId) {
    if (openSeriesId === seriesId) { setOpenSeriesId(null); return; }
    setOpenSeriesId(seriesId);
    if (seriesSermons[seriesId]) return; // already loaded
    const { data } = await supabase
      .from('sermons')
      .select('id, title, scripture_ref, series_index, week_starts_on')
      .eq('series_id', seriesId)
      .eq('is_published', true)
      .order('series_index', { ascending: true, nullsFirst: false })
      .order('week_starts_on', { ascending: true });
    setSeriesSermons((prev) => ({ ...prev, [seriesId]: data ?? [] }));
  }

  async function handleJoin() {
    if (!session?.user?.id) return;
    setJoining(true);

    // If the church requires approval, submit a join request instead of joining directly.
    if (church?.open_join === false) {
      const { error } = await supabase.from('church_join_requests').upsert(
        { church_id: churchId, user_id: session.user.id, status: 'pending' },
        { onConflict: 'church_id,user_id' }
      );
      setJoining(false);
      if (error) { showToast(`Couldn't send request: ${error.message}`, 'error'); return; }
      setJoinRequest('pending');
      showToast('Request sent — the pastor will review it.', 'success');
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ church_id: churchId })
      .eq('id', session.user.id);
    setJoining(false);
    if (error) {
      const msg = /block/i.test(error.message)
        ? "You can't rejoin this church. Reach out to a pastor if this is a mistake."
        : `Couldn't join: ${error.message}`;
      showToast(msg, 'error');
      return;
    }
    onProfileUpdate?.({ ...profile, church_id: churchId });
    setMemberCount((c) => c + 1);
    // Auto-follow the church so its public posts appear in the user's feed
    if (!isFollowing) {
      supabase.from('church_follows').upsert(
        { church_id: churchId, user_id: session.user.id },
        { onConflict: 'user_id,church_id' }
      ).then(() => {
        setIsFollowing(true);
        setFollowerCount((c) => c + 1);
      });
    }
    showToast("Welcome \u2014 you\u2019re now a member.", 'success');
  }

  async function handleJoinByCode(e) {
    e.preventDefault();
    const code = codeInput.trim().toUpperCase();
    if (!code || !session?.user?.id) return;
    setCodeLoading(true);
    setCodeError(null);
    const { data: ch } = await supabase
      .from('churches')
      .select('id, invite_code')
      .eq('id', churchId)
      .maybeSingle();
    if (!ch || ch.invite_code?.toUpperCase() !== code) {
      setCodeLoading(false);
      setCodeError('That code doesn\'t match. Check with your pastor.');
      return;
    }
    // Code is correct \u2014 join directly regardless of open_join setting
    const { error } = await supabase.from('profiles').update({ church_id: churchId }).eq('id', session.user.id);
    setCodeLoading(false);
    if (error) { setCodeError(`Couldn't join: ${error.message}`); return; }
    onProfileUpdate?.({ ...profile, church_id: churchId });
    setMemberCount((c) => c + 1);
    showToast('Welcome \u2014 you\'re now a member.', 'success');
  }

  async function handleLeave() {
    if (!session?.user?.id) return;
    setJoining(true);
    const { error } = await supabase
      .from('profiles')
      .update({ church_id: null })
      .eq('id', session.user.id);
    setJoining(false);
    if (error) {
      showToast(`Couldn't leave: ${error.message}`, 'error');
      return;
    }
    onProfileUpdate?.({ ...profile, church_id: null });
    setMemberCount((c) => Math.max(0, c - 1));
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  async function submitReport() {
    const reason = reportReason.trim();
    if (!reason) return;
    setReportSubmitting(true);
    const payload = {
      church_id: churchId,
      reporter_id: session?.user?.id ?? null,
      reporter_email: session ? null : (reportEmail.trim() || null),
      dispute_type: reportType,
      reason: reason.slice(0, 2000),
    };
    const { error } = await supabase.from('church_disputes').insert(payload);
    setReportSubmitting(false);
    if (error) {
      showToast(`Couldn't send report: ${error.message}`, 'error');
      return;
    }
    setReportSent(true);
    setReportReason('');
    setReportEmail('');
    setTimeout(() => {
      setReportOpen(false);
      setReportSent(false);
    }, 1800);
  }

  // No church to show — signed-in user without a church_id, no specific church
  // requested. Surface the join-by-code form + browse fallback (the same
  // empty-state pitch the old ChurchHub showed).
  if (!churchId) {
    return (
      <div className="scene" style={{ minHeight: '100vh', paddingBottom: 90 }}>
        {uikitUi}
        <div style={{ maxWidth: 560, margin: '0 auto', padding: `${SPACE[8]}px ${SPACE[5]}px` }}>
          <div className="float-in" style={{ textAlign: 'center' }}>
            <div className="halo" style={{
              width: 76, height: 76, borderRadius: '50%',
              background: T.parchment, border: `2px solid ${T.gold}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32, color: T.goldDark, margin: `0 auto ${SPACE[5]}px`,
            }}><KinwoveStar size={32} /></div>
            <div className="section-eyebrow" style={{ marginBottom: SPACE[2] }}>Belong</div>
            <h1 className="editorial-h1" style={{ fontSize: 28, marginBottom: SPACE[3] }}>
              Find a church to walk with.
            </h1>
            <p style={{ fontFamily: T.serif, fontSize: 15.5, color: T.inkSoft, lineHeight: 1.65, marginBottom: SPACE[5] }}>
              Got an invite code from your pastor or a friend? Enter it below.
              Otherwise, you can browse churches in the directory.
            </p>

            <JoinByCode
              session={session}
              profile={profile}
              onJoined={(ch) => onProfileUpdate?.({ ...profile, church_id: ch.id })}
            />

            {onFindChurches && (
              <>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: SPACE[3], margin: `${SPACE[5]}px 0`,
                }}>
                  <div style={{ flex: 1, height: 1, background: T.line }} />
                  <span style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.inkMuted, fontWeight: 600 }}>or</span>
                  <div style={{ flex: 1, height: 1, background: T.line }} />
                </div>

                <button onClick={onFindChurches} style={{
                  background: 'transparent', color: T.goldDark, border: `1px solid ${T.gold}`, borderRadius: RADIUS.pill,
                  padding: '11px 22px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                }}>
                  Browse churches →
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: T.cream, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: T.inkMuted, fontFamily: T.serif }}>Loading…</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ minHeight: '100vh', background: T.cream, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: T.serif, fontSize: 17, color: T.inkSoft, marginBottom: 14 }}>Couldn't load this church.</div>
          <button
            onClick={onBack}
            style={{ background: 'none', border: 'none', color: T.goldDark, fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}
          >← Go back</button>
        </div>
      </div>
    );
  }

  if (!church) {
    return (
      <div style={{ minHeight: '100vh', background: T.cream, padding: '40px 20px' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: T.goldDark, cursor: 'pointer', padding: 0, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 5, fontSize: 14 }}>
            <ArrowLeft size={15} strokeWidth={2} /> Back
          </button>
          <div style={{ fontFamily: T.serif, fontSize: 22, color: T.ink }}>Church not found.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="scene" style={{ minHeight: '100vh', paddingBottom: 80, paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      {uikitUi}

      {/* Visitor-view notice removed — ChurchModeShell header already shows
          "VIEWING AS LEADER · VISITOR" toggle, so the cream strip was
          redundant and broke the flow between the two dark headers. */}

      {/* Sanctuary-doorway hero — shown to visitors/non-members. In chromeless
          (pastor's own view) ChurchModeShell already provides the dark header. */}
      {!chromeless && <div style={{
        position: 'relative',
        background: churchBannerBg(church),
        borderRadius: 0,
        overflow: 'hidden',
        color: T.cream,
        zIndex: 1,
      }}>

        {/* Back + Share overlaid on the hero — no white strip */}
        {!chromeless && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            paddingTop: 13, paddingBottom: 13, paddingLeft: 16,
            paddingRight: 172,
            zIndex: 2,
          }}>
            <button onClick={onBack} style={{
              background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(253,248,240,0.15)',
              backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
              borderRadius: 999, padding: '10px 16px 10px 12px',
              color: 'rgba(253,248,240,0.85)', cursor: 'pointer', outline: 'none',
              display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontFamily: T.sans, minHeight: 44,
            }}>
              <ArrowLeft size={14} strokeWidth={2} /> Back
            </button>
            <button onClick={copyLink} style={{
              background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(253,248,240,0.15)',
              backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
              borderRadius: 999, padding: '6px 14px',
              color: 'rgba(253,248,240,0.85)', cursor: 'pointer', outline: 'none',
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontFamily: T.sans,
            }}>
              {copied
                ? <><Check size={13} strokeWidth={2.5} /> Copied</>
                : <><Share2 size={13} strokeWidth={2} /> Share</>}
            </button>
          </div>
        )}

        <div className="stagger-in" style={{ position: 'relative', maxWidth: 640, margin: '0 auto', padding: `${chromeless ? 36 : 58}px 16px 40px`, textAlign: 'center' }}>
          {/* Avatar — pastors get an edit overlay that deep-links to Settings */}
          <div style={{ position: 'relative', width: 92, margin: '0 auto 18px', cursor: isPastor ? 'pointer' : 'default' }}
            onClick={isPastor ? () => onOpenAdmin?.('settings') : undefined}
            title={isPastor ? 'Change church photo' : undefined}
          >
            <div className="halo" style={{ '--i': 0,
              width: 92, height: 92, borderRadius: '50%',
              background: 'rgba(253,248,240,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 42,
              overflow: 'hidden',
              boxShadow: '0 4px 24px rgba(26,17,8,0.22), inset 0 1px 0 rgba(253,248,240,0.08)',
            }}>
              {church.avatar_url
                ? <img src={church.avatar_url} alt={church.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : '⛪'}
            </div>
            {isPastor && (
              <div style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 26, height: 26, borderRadius: '50%',
                background: T.gold, border: `2px solid rgba(14,9,6,0.9)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </div>
            )}
          </div>
          <h1 style={{ '--i': 1, fontFamily: T.serif, fontSize: 34, fontWeight: 600, color: T.cream, margin: '0 0 4px', lineHeight: 1.08, letterSpacing: '-0.022em' }}>
            {church.name}
            {church.verification_status === 'verified' && (
              <span title="Verified church" style={{ marginLeft: 8, color: T.gold, fontSize: 19, verticalAlign: 'middle' }}>✓</span>
            )}
            {church.verified === false && church.verify_method === 'unverified' && (
              <span title="Self-reported — not yet verified" style={{ marginLeft: 8, fontSize: 12, color: 'rgba(253,248,240,0.5)', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 999, padding: '2px 8px', verticalAlign: 'middle', fontFamily: 'inherit', fontWeight: 400, letterSpacing: 0 }}>
                Self-reported
              </span>
            )}
          </h1>
          <div style={{ '--i': 2, fontSize: 13, color: 'rgba(253,248,240,0.65)', marginBottom: church.pastor ? 4 : ((church.service_info || church.street_address) ? 8 : 14) }}>
            {[church.denomination, [church.city, church.country].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
          </div>
          {(church.countries_open_to ?? []).length > 0 && (
            <div style={{ '--i': 2, fontSize: 15, color: 'rgba(253,248,240,0.65)', marginBottom: church.pastor ? 4 : ((church.service_info || church.street_address) ? 8 : 14) }}>
              {church.countries_open_to.map(codeToFlag).join(' ')}
            </div>
          )}
          {church.pastor && (
            <div style={{ '--i': 2,
              fontSize: 12.5, color: 'rgba(253,248,240,0.65)',
              marginBottom: (church.service_info || church.street_address) ? 8 : 14,
            }}>
              Led by{' '}
              <button
                onClick={() => onViewProfile?.(church.pastor.id)}
                style={{
                  background: 'transparent', border: 'none', padding: 0,
                  color: T.goldLight, fontSize: 12.5, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                  textDecoration: 'underline', textUnderlineOffset: 2,
                }}
              >
                {church.pastor.display_name}
              </button>
            </div>
          )}
          {/* Member + follower counts */}
          {(memberCount > 0 || followerCount > 0) && (
            <div style={{ '--i': 3, display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 10 }}>
              {memberCount > 0 && (
                <span style={{ fontSize: 12, color: 'rgba(253,248,240,0.55)' }}>
                  <strong style={{ color: 'rgba(253,248,240,0.85)', fontWeight: 600 }}>{memberCount}</strong> {memberCount === 1 ? 'member' : 'members'}
                </span>
              )}
              {followerCount > 0 && (
                <span style={{ fontSize: 12, color: 'rgba(253,248,240,0.55)' }}>
                  <strong style={{ color: 'rgba(253,248,240,0.85)', fontWeight: 600 }}>{followerCount}</strong> {followerCount === 1 ? 'follower' : 'followers'}
                </span>
              )}
            </div>
          )}

          {/* Visit info — first thing a QR-scanning visitor needs: when & where. */}
          {(church.service_info || church.street_address) && (
            <div style={{ '--i': 3,
              fontSize: 13, color: T.goldLight, fontStyle: 'italic',
              fontFamily: T.serif, lineHeight: 1.55, marginBottom: 14,
              maxWidth: 460, marginLeft: 'auto', marginRight: 'auto',
            }}>
              {church.service_info && <span>{church.service_info}</span>}
              {church.service_info && church.street_address && <span style={{ color: 'rgba(253,248,240,0.45)' }}>{' · '}</span>}
              {church.street_address && <span>{church.street_address}</span>}
            </div>
          )}

        </div>
      </div>}

      {/* Compact chromeless banner — pastor's own church view.
          Just the colored strip + icon; name/CTA live below on cream. */}
      {chromeless && (
        <>
          <div style={{
            height: 240,
            background: churchBannerBg(church),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', position: 'relative',
          }}>
            <div style={{
              width: 160, height: 160, borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              border: '3px solid rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 70, overflow: 'hidden',
            }}>
              {church.avatar_url
                ? <img src={church.avatar_url} alt={church.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : '⛪'}
            </div>
          </div>

          <div style={{ textAlign: 'center', padding: '24px 20px 20px', background: T.cream, borderBottom: `1px solid ${T.line}` }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 6 }}>
              <h1 style={{ fontFamily: T.serif, fontSize: 30, fontWeight: 600, color: T.ink, margin: 0, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
                {church.name}
              </h1>
              {church.verification_status === 'verified' && (
                <span title="Verified" style={{ color: T.gold, fontSize: 17 }}>✓</span>
              )}
              {church.verified === false && church.verify_method === 'unverified' && (
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.inkMuted, background: 'rgba(26,17,8,0.06)', border: `1px solid ${T.line}`, borderRadius: 999, padding: '3px 8px' }}>
                  Self-reported
                </span>
              )}
            </div>
            <div style={{ fontSize: 13, color: T.inkSoft, marginBottom: church.pastor ? 4 : 20 }}>
              {[church.denomination, [church.city, church.country].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
              {(church.countries_open_to ?? []).length > 0 && (
                <span style={{ marginLeft: 4 }}>{church.countries_open_to.map(codeToFlag).join(' ')}</span>
              )}
            </div>
            {church.pastor && (
              <div style={{ fontSize: 13, fontStyle: 'italic', color: T.inkSoft, marginBottom: 20 }}>
                Led by{' '}
                <button onClick={() => onViewProfile?.(church.pastor.id)} style={{
                  background: 'none', border: 'none', padding: 0,
                  color: T.goldDark, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit', fontStyle: 'normal',
                }}>
                  {church.pastor.display_name}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <div style={{
        position: 'sticky', top: 'var(--global-header-h, 0px)', zIndex: 4,
        background: T.cream,
        borderBottom: `1px solid ${T.line}`,
        display: 'flex',
      }}>
        {[
          { id: 'feed',    label: 'Feed' },
          { id: 'sermons', label: 'Sermons' },
          { id: 'info',    label: 'Info' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1, padding: '14px 0',
              background: 'transparent', border: 'none',
              borderBottom: tab === t.id ? `2px solid ${T.goldDark}` : '2px solid transparent',
              fontSize: 14, fontWeight: tab === t.id ? 700 : 500, fontFamily: T.serif,
              color: tab === t.id ? T.goldDark : T.inkMuted,
              cursor: 'pointer', letterSpacing: tab === t.id ? 0.1 : 0,
              transition: 'color 0.15s, border-color 0.15s',
            }}
          >{t.label}</button>
        ))}
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 16px' }}>

        {/* ── Feed tab ── */}
        {tab === 'feed' && (
          <>
            {/* Non-members see a join prompt instead of the feed */}
            {!isMember && !isPastor && (
              <div style={{
                textAlign: 'center', padding: '48px 20px',
                background: T.white, border: `1px dashed ${T.line}`,
                borderRadius: RADIUS.lg,
              }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
                <div style={{ fontFamily: T.display, fontSize: 20, fontWeight: 600, color: T.ink, marginBottom: 8 }}>
                  Members only
                </div>
                <div style={{ fontSize: 14, color: T.inkSoft, lineHeight: 1.6, marginBottom: 20, maxWidth: 300, margin: '0 auto 20px' }}>
                  Join {church?.name ?? 'this church'} to see posts, join conversations, and connect with your congregation.
                </div>
                <button
                  onClick={() => setTab('info')}
                  style={{
                    background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
                    padding: '10px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Join this church →
                </button>
              </div>
            )}

            {/* ── Pending role invites (member side) ────────── */}
            {isMember && pendingInvites.map((inv) => {
              const preset = presetForRole(inv.role_key);
              const label = inv.role_label ?? preset?.label ?? inv.role_key;
              return (
                <div key={inv.id} className="float-in" style={{
                  background: T.parchment, border: `1px solid ${T.goldLight}`, borderRadius: RADIUS.lg,
                  padding: `${SPACE[4]}px ${SPACE[5]}px`, marginBottom: SPACE[4],
                }}>
                  <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center' }}>
                    <KinwoveStar size={12} style={{ verticalAlign: 'middle', marginRight: 5, flexShrink: 0 }} /> Invitation from your pastor
                  </div>
                  <div style={{ fontFamily: T.display, fontSize: 18, fontWeight: 600, color: T.ink, lineHeight: 1.25, marginBottom: 4 }}>
                    Take on the {label.toLowerCase()} role?
                  </div>
                  {inv.message && (
                    <div style={{
                      fontFamily: T.serif, fontSize: 14, color: T.inkSoft, lineHeight: 1.55,
                      fontStyle: 'italic', marginBottom: 10,
                      borderLeft: `3px solid ${T.goldLight}`, paddingLeft: 10,
                    }}>
                      "{inv.message}"
                    </div>
                  )}
                  {preset?.blurb && !inv.message && (
                    <div style={{ fontSize: 13.5, color: T.inkSoft, lineHeight: 1.55, marginBottom: 10 }}>
                      {preset.blurb}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={() => respondToInvite(inv.id, true)} style={{
                      background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
                      padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}>Accept</button>
                    <button onClick={() => respondToInvite(inv.id, false)} style={{
                      background: 'transparent', border: `1px solid ${T.line}`, borderRadius: 999,
                      padding: '8px 16px', fontSize: 13, color: T.inkSoft, cursor: 'pointer',
                    }}>Not now</button>
                  </div>
                </div>
              );
            })}

            {/* ── Featured walk for the whole church (pastor-curated) ── */}
            {isMember && !isPastor && featuredWalk && onOpenWalks && (
              <button
                onClick={onOpenWalks}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left',
                  background: `linear-gradient(135deg, rgba(184,115,58,0.10) 0%, rgba(184,115,58,0.05) 100%)`,
                  border: `1px solid ${T.goldLight}`,
                  borderLeft: `3px solid ${T.gold}`,
                  borderRadius: 14, padding: '16px 18px', marginBottom: 16, cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: 30, flexShrink: 0, lineHeight: 1 }}>{featuredWalk.cover_emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 3 }}>
                    Walking together
                  </div>
                  <div style={{ fontFamily: T.display, fontSize: 18, fontWeight: 600, color: T.ink, letterSpacing: '-0.015em', lineHeight: 1.2 }}>
                    {featuredWalk.title}
                  </div>
                  {featuredWalk.subtitle && (
                    <div style={{ fontSize: 13, color: T.inkSoft, lineHeight: 1.4, marginTop: 3 }}>
                      {featuredWalk.subtitle}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 20, color: T.goldDark, flexShrink: 0 }}>→</div>
              </button>
            )}

            {/* ── Quick action chips — only shown in non-chromeless view;
                chromeless shows these above the tabs in the info card. ── */}
            {!chromeless && (isMember || isPastor) && (
              <div style={{ marginBottom: 28 }}>
                {/* Primary action */}
                {onOpenTalkToSomeone && (
                  <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <button
                      onClick={onOpenTalkToSomeone}
                      style={{
                        background: T.gold, color: T.cream, border: 'none', borderRadius: 999,
                        padding: '15px 44px', fontSize: 15, fontWeight: 600, cursor: 'pointer',
                        boxShadow: '0 4px 16px rgba(168,85,48,0.28)',
                        letterSpacing: '-0.01em',
                      }}
                    >Talk to someone</button>
                  </div>
                )}
                {/* Secondary actions */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {onOpenPrayer && (
                    <button onClick={onOpenPrayer} style={{
                      background: 'none', border: `1px solid rgba(168,85,48,0.30)`, borderRadius: 999,
                      color: T.inkSoft, fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: '8px 18px',
                    }}>🙏 Pray together</button>
                  )}
                  {onOpenWalks && (
                    <button onClick={onOpenWalks} style={{
                      background: 'none', border: `1px solid rgba(168,85,48,0.30)`, borderRadius: 999,
                      color: T.inkSoft, fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: '8px 18px',
                    }}>Pick a walk</button>
                  )}
                </div>
              </div>
            )}

            {/* ── Congregation prayers ─────────────────────────── */}
            {isMember && churchPrayers.length > 0 && (
              <div style={{
                background: T.white, border: `1px solid ${T.line}`,
                borderRadius: 14, padding: '16px 18px', marginBottom: 20,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700 }}>
                    🙏 Praying together
                  </div>
                  {onOpenPrayer && (
                    <button onClick={onOpenPrayer} style={{
                      background: 'none', border: 'none', color: T.goldDark,
                      fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0,
                    }}>
                      + Add yours
                    </button>
                  )}
                </div>
                {churchPrayers.map((p, i) => (
                  <div key={p.id} style={{
                    paddingTop: i > 0 ? 10 : 0,
                    marginTop: i > 0 ? 10 : 0,
                    borderTop: i > 0 ? `1px solid ${T.line}` : 'none',
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: T.goldDark, marginBottom: 2 }}>{p.name}</div>
                      <div style={{ fontSize: 13.5, color: T.ink, lineHeight: 1.5, fontFamily: T.serif,
                        overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      }}>{p.body}</div>
                    </div>
                    <button
                      onClick={async () => {
                        if (prayedIds.has(p.id) || !session?.user?.id) return;
                        await supabase.from('personal_prayer_support').insert({ prayer_id: p.id, user_id: session.user.id }).then(null, () => {});
                        setPrayedIds((s) => new Set([...s, p.id]));
                      }}
                      style={{
                        flexShrink: 0, border: `1px solid ${prayedIds.has(p.id) ? T.goldDark : T.line}`,
                        background: prayedIds.has(p.id) ? 'rgba(184,115,58,0.08)' : 'transparent',
                        borderRadius: 999, padding: '5px 12px', fontSize: 12, fontWeight: 600,
                        color: prayedIds.has(p.id) ? T.goldDark : T.inkSoft,
                        cursor: prayedIds.has(p.id) ? 'default' : 'pointer',
                      }}
                    >
                      {prayedIds.has(p.id) ? '🙏 Prayed' : '🙏 Pray'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* ── Composer + church feed (members + pastors) ─── */}
            {(isMember || isPastor) && (
              <>
                <div style={{ marginBottom: SPACE[3], display: 'flex', alignItems: 'center', gap: SPACE[3] }}>
                  <div className="section-eyebrow">Latest</div>
                  <div className="rule-gold" style={{ flex: 1 }} />
                </div>

                {/* ── Sermon status card — only when a sermon exists ─────── */}
                {isPastor && latestSermon && (
                  <div style={{
                    background: T.parchment, border: `1px solid ${T.goldLight}`,
                    borderRadius: 12, padding: '10px 14px', marginBottom: 14,
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10.5, letterSpacing: 1.4, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 3 }}>
                        📖 Latest sermon
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {latestSermon.title}
                      </div>
                    </div>
                    <button
                      onClick={() => onOpenSermon?.(latestSermon.id)}
                      style={{
                        background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
                        padding: '7px 14px', fontSize: 12.5, fontWeight: 600,
                        cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
                      }}
                    >
                      View →
                    </button>
                  </div>
                )}

                <Suspense fallback={<div style={{ color: T.inkMuted, fontFamily: T.serif, textAlign: 'center', padding: 40 }}>Loading…</div>}>
                  <PostComposer
                    session={session}
                    profile={profile}
                    scope="church"
                    scopeId={churchId}
                    isPastor={isPastor}
                    placeholder={isPastor
                      ? 'Post to your congregation\u2026'
                      : `Share with ${church?.name ?? 'your church'}\u2026`}
                    onPosted={() => setFeedRefresh((n) => n + 1)}
                  />
                  <Feed
                    source={`church:${churchId}`}
                    sessionUserId={session?.user?.id}
                    refreshKey={feedRefresh}
                    onOpenSermon={onOpenSermon}
                    onViewProfile={onViewProfile}
                    onPickWalk={() => onOpenWalks?.()}
                    userPlan={profile?.plan ?? 'free'}
                    isPastor={isPastor}
                    emptyMessage={isPastor
                      ? 'Nothing posted yet. Share this Sunday\u2019s sermon or write a note to your congregation.'
                      : 'Nothing posted yet — start a conversation or wait for your church to share.'}
                  />
                </Suspense>
              </>
            )}

            {/* ── Care team shortcut ─────────────────────────── */}
            {isMember && isCareTeam && !isPastor && onOpenCareInbox && (
              <div style={{
                background: T.white, border: `1px solid ${T.line}`, borderRadius: RADIUS.lg,
                padding: `${SPACE[4]}px ${SPACE[5]}px`, marginBottom: SPACE[5],
                display: 'flex', alignItems: 'center', gap: SPACE[3], flexWrap: 'wrap',
              }}>
                <div className="section-eyebrow" style={{ color: T.goldDark }}>For you</div>
                <button onClick={onOpenCareInbox} style={{
                  background: SEMANTIC.care.rail, color: T.cream, border: 'none', borderRadius: RADIUS.pill,
                  padding: '7px 14px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                }}>Care inbox →</button>
              </div>
            )}
          </>
        )}

        {/* ── Sermons tab ── */}
        {tab === 'sermons' && (
          <>
            <div id="church-info-anchor" />

            {/* Non-members: teaser only — title + join prompt, no summary or full read */}
            {!isMember && !isPastor && (
              <div style={{
                background: T.parchment, border: `1px solid ${T.goldLight}`,
                borderRadius: 14, padding: '20px', marginBottom: 16,
              }}>
                <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center' }}>
                  <KinwoveStar size={12} style={{ verticalAlign: 'middle', marginRight: 5, flexShrink: 0 }} /> This week's sermon
                </div>
                {latestSermon ? (
                  <>
                    <div style={{ fontFamily: T.display, fontSize: 22, fontWeight: 600, color: T.ink, lineHeight: 1.2, letterSpacing: '-0.015em', marginBottom: latestSermon.scripture_ref ? 6 : 14 }}>
                      {latestSermon.title}
                    </div>
                    {latestSermon.scripture_ref && (
                      <div style={{ fontSize: 13, color: T.goldDark, fontStyle: 'italic', marginBottom: 14 }}>
                        {latestSermon.scripture_ref}
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ fontFamily: T.serif, fontSize: 14.5, color: T.inkSoft, fontStyle: 'italic', marginBottom: 14 }}>
                    No sermons posted yet.
                  </div>
                )}
                <div style={{ fontSize: 13.5, color: T.inkSoft, lineHeight: 1.6, marginBottom: 14 }}>
                  Join {church?.name ?? 'this church'} to read the full sermon, daily discussion posts, and small-group questions.
                </div>
                <button
                  onClick={() => setTab('info')}
                  style={{
                    background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
                    padding: '9px 18px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Join to read →
                </button>
              </div>
            )}

            {/* Members + pastor: full sermon content */}
            {(isMember || isPastor) && latestSermon && (
              <div style={{
                background: T.parchment, border: `1px solid ${T.goldLight}`,
                borderRadius: 14, padding: '18px 20px', marginBottom: 16,
                boxShadow: '0 2px 8px rgba(184,115,58,0.10)',
              }}>
                <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center' }}>
                  <KinwoveStar size={12} style={{ verticalAlign: 'middle', marginRight: 5, flexShrink: 0 }} /> This week's sermon
                </div>
                <div style={{ fontFamily: T.display, fontSize: 22, fontWeight: 600, color: T.ink, lineHeight: 1.2, letterSpacing: '-0.015em', marginBottom: 6 }}>
                  {latestSermon.title}
                </div>
                {latestSermon.scripture_ref && (
                  <div style={{ fontSize: 13, color: T.goldDark, fontStyle: 'italic', marginBottom: 8 }}>
                    {latestSermon.scripture_ref}
                  </div>
                )}
                {latestSermon.summary && (
                  <div style={{ fontFamily: T.serif, fontSize: 14.5, color: T.inkSoft, lineHeight: 1.65, marginBottom: 12, whiteSpace: 'pre-wrap' }}>
                    {latestSermon.summary}
                  </div>
                )}
                {onOpenSermon && (
                  <button onClick={() => onOpenSermon(latestSermon.id)} style={{
                    background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
                    padding: '9px 18px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                  }}>
                    Read this sermon →
                  </button>
                )}
              </div>
            )}

            {/* ── Featured walk companion — members + pastor, Sermons tab ── */}
            {(isMember || isPastor) && featuredWalk && onOpenWalks && (
              <button
                onClick={onOpenWalks}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left',
                  background: `linear-gradient(135deg, rgba(184,115,58,0.10) 0%, rgba(184,115,58,0.05) 100%)`,
                  border: `1px solid ${T.goldLight}`,
                  borderLeft: `3px solid ${T.gold}`,
                  borderRadius: 14, padding: '16px 18px', marginBottom: 16, cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: 28, flexShrink: 0, lineHeight: 1 }}>{featuredWalk.cover_emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 3 }}>
                    Walking together
                  </div>
                  <div style={{ fontFamily: T.display, fontSize: 17, fontWeight: 600, color: T.ink, letterSpacing: '-0.015em', lineHeight: 1.2 }}>
                    {featuredWalk.title}
                  </div>
                  {featuredWalk.subtitle && (
                    <div style={{ fontSize: 12.5, color: T.inkSoft, lineHeight: 1.4, marginTop: 3 }}>
                      {featuredWalk.subtitle}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 18, color: T.goldDark, flexShrink: 0 }}>→</div>
              </button>
            )}

            {/* Sermon series + empty states — members and pastor only */}
            {/* Empty-state — no published sermon and no series */}
            {(isMember || isPastor) && !latestSermon && seriesList.length === 0 && (
              <div style={{
                background: T.white, border: `1px dashed ${T.goldLight}`,
                borderRadius: 14, padding: '28px 22px', textAlign: 'center', marginBottom: 16,
              }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>📖</div>
                <div style={{ fontFamily: T.display, fontSize: 19, fontWeight: 600, color: T.ink, marginBottom: 6 }}>
                  {isPastor ? 'No sermons yet' : 'No sermons posted yet'}
                </div>
                <div style={{ fontSize: 13.5, color: T.inkSoft, lineHeight: 1.6, marginBottom: isPastor ? 20 : 0 }}>
                  {isPastor
                    ? 'Post your first sermon so your congregation can follow along between Sundays.'
                    : 'Check back after Sunday — sermons will appear here.'}
                </div>
                {isPastor && (
                  <button
                    onClick={() => onNewSermon ? onNewSermon() : onOpenAdmin?.('sermons')}
                    style={{
                      background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
                      padding: '11px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Post your first sermon →
                  </button>
                )}
              </div>
            )}

            {(isMember || isPastor) && seriesList.length > 0 && (
              <div style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 14, padding: '14px 18px 6px', marginBottom: 16 }}>
                <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.inkMuted, fontWeight: 700, marginBottom: 12 }}>
                  Sermon series
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {seriesList.map((s, i) => {
                    const isOpen = openSeriesId === s.id;
                    const sermons = seriesSermons[s.id];
                    const startedYear = s.started_on ? new Date(s.started_on).getFullYear() : null;
                    return (
                      <div key={s.id} style={{ borderTop: i === 0 ? 'none' : `1px solid ${T.line}`, padding: '12px 0' }}>
                        <button
                          onClick={() => toggleSeries(s.id)}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            width: '100%', background: 'transparent', border: 'none', padding: 0,
                            cursor: 'pointer', textAlign: 'left',
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: T.display, fontSize: 16, fontWeight: 600, color: T.ink, lineHeight: 1.3, marginBottom: 2 }}>
                              {s.name}
                            </div>
                            <div style={{ fontSize: 12.5, color: T.inkMuted, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {s.scripture_arc && <span style={{ fontStyle: 'italic', color: T.goldDark }}>{s.scripture_arc}</span>}
                              {s.scripture_arc && <span>·</span>}
                              <span>{s.sermon_count} week{s.sermon_count === 1 ? '' : 's'}</span>
                              {startedYear && <><span>·</span><span>{startedYear}</span></>}
                            </div>
                          </div>
                          <span style={{ color: T.goldDark, fontSize: 16, marginLeft: 12, transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>›</span>
                        </button>
                        {isOpen && (
                          <div style={{ marginTop: 10, marginLeft: 2, display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {sermons === undefined && (
                              <div style={{ fontSize: 13, color: T.inkMuted, padding: '6px 0' }}>Loading…</div>
                            )}
                            {sermons !== undefined && sermons.length === 0 && (
                              <div style={{ fontSize: 13, color: T.inkMuted, padding: '6px 0' }}>No sermons in this series yet.</div>
                            )}
                            {sermons?.map((sm) => (
                              <button
                                key={sm.id}
                                onClick={() => onOpenSermon?.(sm.id)}
                                disabled={!onOpenSermon}
                                style={{
                                  display: 'flex', alignItems: 'baseline', gap: 10,
                                  background: 'transparent', border: 'none', padding: '6px 0',
                                  cursor: onOpenSermon ? 'pointer' : 'default', textAlign: 'left',
                                  borderRadius: 6,
                                }}
                              >
                                <span style={{ fontSize: 12, color: T.goldDark, fontWeight: 600, minWidth: 38, fontVariantNumeric: 'tabular-nums' }}>
                                  {sm.series_index ? `Wk ${sm.series_index}` : '—'}
                                </span>
                                <span style={{ fontFamily: T.serif, fontSize: 14.5, color: T.ink, lineHeight: 1.4 }}>
                                  {sm.title}
                                  {sm.scripture_ref && (
                                    <span style={{ color: T.inkMuted, fontStyle: 'italic', marginLeft: 6 }}>· {sm.scripture_ref}</span>
                                  )}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Info tab ── */}
        {tab === 'info' && (
          <>
            {/* What's inside — sells the value of joining at the conversion moment.
                Shows for anyone who isn't already a member or the pastor (covers
                both signed-out QR-scanners and signed-in browsers). The Join /
                Sign-up CTAs that follow now have context — without this card, a
                signed-in non-member only saw a bare "Join this church" button
                with no preview of what membership actually unlocks. */}
            {!isMember && !isPastor && (
              <div style={{
                background: T.white,
                border: `1px solid ${T.line}`,
                borderRadius: 14,
                padding: '18px 20px',
                marginBottom: 16,
              }}>
                <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.inkMuted, fontWeight: 700, marginBottom: 12 }}>
                  What's inside
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    {
                      title: 'Sunday’s sermon, all week',
                      body: 'Daily questions, discussion, and notes tied to what your pastor preached.',
                    },
                    {
                      title: 'Prayer together',
                      body: 'Pray with your church between Sundays. Anonymous when you need it to be.',
                    },
                    {
                      title: 'A quiet space',
                      body: 'No algorithms, no ads, no strangers. Just your church.',
                    },
                  ].map((row) => (
                    <div key={row.title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: T.gold, flexShrink: 0, marginTop: 8 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: T.serif, fontSize: 15, fontWeight: 600, color: T.ink, lineHeight: 1.3 }}>{row.title}</div>
                        <div style={{ fontSize: 13.5, color: T.inkSoft, lineHeight: 1.55, marginTop: 3 }}>{row.body}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending verification notice (pastor's own church only) */}
            {isPastor && church.verification_status === 'pending' && (
              <div style={{
                background: T.parchment, border: `1px solid ${T.goldLight}`,
                borderLeft: `4px solid ${T.gold}`, borderRadius: 12,
                padding: '14px 18px', marginBottom: 18,
              }}>
                <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 6 }}>
                  ⏱ Pending verification
                </div>
                <div style={{ fontSize: 13.5, color: T.inkSoft, lineHeight: 1.6 }}>
                  Your church is hidden from the directory and the QR code until we confirm your registration on the public registry. Usually 2 business days.
                </div>
              </div>
            )}

            {/* Join / Leave button */}
            {session && !isPastor && (
              <>
                {isMember ? (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{
                      width: '100%', textAlign: 'center',
                      background: 'transparent', border: `1px solid ${T.line}`,
                      borderRadius: 999, padding: '13px 20px',
                      fontSize: 15, fontWeight: 600, color: T.inkMuted,
                      boxSizing: 'border-box',
                    }}>
                      ✓ You&rsquo;re a member
                    </div>
                    {!leaveConfirm ? (
                      <button
                        onClick={() => setLeaveConfirm(true)}
                        style={{
                          display: 'block', margin: '10px auto 0',
                          background: 'none', border: 'none',
                          color: T.inkMuted, fontSize: 13, cursor: 'pointer',
                          textDecoration: 'underline', textDecorationColor: 'rgba(0,0,0,0.2)',
                        }}
                      >
                        Leave this church
                      </button>
                    ) : (
                      <div style={{
                        marginTop: 12, padding: '14px 16px',
                        background: 'rgba(200,60,60,0.05)',
                        border: '1px solid rgba(200,60,60,0.18)',
                        borderRadius: 12, textAlign: 'center',
                      }}>
                        <div style={{ fontSize: 14, color: T.ink, marginBottom: 12, lineHeight: 1.5 }}>
                          Leave <strong>{church?.name}</strong>? You can always rejoin or find another.
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => setLeaveConfirm(false)}
                            style={{
                              flex: 1, background: 'transparent', border: `1px solid ${T.line}`,
                              borderRadius: 999, padding: '10px 0', fontSize: 14,
                              color: T.inkMuted, cursor: 'pointer', fontWeight: 600,
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={async () => { setLeaveConfirm(false); await handleLeave(); onFindChurches?.(); }}
                            disabled={joining}
                            style={{
                              flex: 1, background: 'rgba(200,60,60,0.85)', border: 'none',
                              borderRadius: 999, padding: '10px 0', fontSize: 14,
                              color: '#fff', cursor: joining ? 'not-allowed' : 'pointer', fontWeight: 600,
                              opacity: joining ? 0.6 : 1,
                            }}
                          >
                            {joining ? '…' : 'Leave & find a new church'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={joinRequest === 'pending' ? undefined : handleJoin}
                    disabled={joining || joinRequest === 'pending'}
                    style={{
                      width: '100%',
                      background: joinRequest === 'pending' ? T.parchment : T.ink,
                      color: joinRequest === 'pending' ? T.inkSoft : T.cream,
                      border: joinRequest === 'pending' ? `1px solid ${T.line}` : 'none',
                      borderRadius: 999, padding: '13px 20px',
                      fontSize: 15, fontWeight: 600,
                      cursor: (joining || joinRequest === 'pending') ? 'not-allowed' : 'pointer',
                      opacity: joining ? 0.6 : 1, marginBottom: 8,
                    }}
                  >
                    {joining ? '…'
                      : joinRequest === 'pending' ? '✉ Request sent — awaiting approval'
                      : church?.open_join === false ? 'Request to join'
                      : 'Join this church'}
                  </button>
                )}

                {/* Code entry for approval-required churches */}
                {session && !isMember && joinRequest !== 'pending' && church?.open_join === false && (
                  <form onSubmit={handleJoinByCode} style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 6, textAlign: 'center' }}>
                      Have an invite code? Enter it to join directly.
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        value={codeInput}
                        onChange={(e) => { setCodeInput(e.target.value.toUpperCase()); setCodeError(null); }}
                        placeholder="Invite code…"
                        maxLength={16}
                        style={{
                          flex: 1, boxSizing: 'border-box',
                          border: `1px solid ${codeError ? '#a53f2b' : T.line}`,
                          borderRadius: 10, padding: '9px 14px', fontSize: 13,
                          background: T.white, color: T.ink, outline: 'none',
                          fontFamily: 'ui-monospace, monospace', letterSpacing: 2, fontWeight: 600,
                        }}
                      />
                      <button type="submit" disabled={!codeInput.trim() || codeLoading} style={{
                        background: T.ink, color: T.cream, border: 'none', borderRadius: 10,
                        padding: '9px 16px', fontSize: 13, fontWeight: 600,
                        cursor: codeInput.trim() ? 'pointer' : 'not-allowed',
                        opacity: codeInput.trim() ? 1 : 0.4, flexShrink: 0,
                      }}>
                        {codeLoading ? '…' : 'Join →'}
                      </button>
                    </div>
                    {codeError && <div style={{ fontSize: 12, color: '#a53f2b', marginTop: 5 }}>{codeError}</div>}
                  </form>
                )}

                {/* Follow button — non-members only */}
                {!isMember && joinRequest !== 'pending' && (
                  <button
                    onClick={handleFollow}
                    disabled={followLoading}
                    style={{
                      width: '100%', marginTop: 8, marginBottom: 24,
                      background: isFollowing ? 'transparent' : 'rgba(184,115,58,0.08)',
                      color: isFollowing ? T.inkMuted : T.gold,
                      border: `1px solid ${isFollowing ? T.line : 'rgba(184,115,58,0.30)'}`,
                      borderRadius: 999, padding: '11px 20px',
                      fontSize: 14, fontWeight: 600, cursor: followLoading ? 'default' : 'pointer',
                      opacity: followLoading ? 0.6 : 1,
                    }}
                  >
                    {isFollowing ? '✓ Following' : '+ Follow'}
                  </button>
                )}
                {(isMember || joinRequest === 'pending') && <div style={{ marginBottom: 24 }} />}

                {joinRequest === 'declined' && (
                  <div style={{ fontSize: 13, color: T.inkMuted, textAlign: 'center', marginBottom: 8 }}>
                    Your request was declined.{' '}
                    <button onClick={handleJoin} style={{ background: 'none', border: 'none', color: T.goldDark, fontWeight: 600, cursor: 'pointer', fontSize: 13, padding: 0 }}>
                      Request again
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Signed-out visitor — the QR-scanner from Sunday's bulletin.
                Without this CTA they see a read-only page with no path forward.
                Click stashes the church id in App-level pending state, sends
                them through auth, and once their profile is set we auto-attach
                them as a member and land them on the congregation hub. */}
            {!session && onRequestJoin && (
              <div style={{
                background: T.parchment, border: `1px solid ${T.goldLight}`,
                borderRadius: 14, padding: '18px 20px', marginBottom: 18,
              }}>
                {/* Lighter framing — the value pitch already lives in What's
                    inside above. This card just makes the action effortless. */}
                <div style={{ fontFamily: T.serif, fontSize: 14.5, color: T.inkSoft, lineHeight: 1.65, marginBottom: 14 }}>
                  Sign up to join {church.name} — takes about a minute.
                </div>
                <button
                  onClick={onRequestJoin}
                  style={{
                    width: '100%',
                    background: T.ink, color: T.cream, border: 'none',
                    borderRadius: 999, padding: '13px 20px',
                    fontSize: 15, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Sign up &amp; join this church →
                </button>
              </div>
            )}

            {/* ── Church details card ── */}
            {(() => {
              const rows = [
                church.denomination && {
                  Icon: BookOpen,
                  label: 'Denomination',
                  value: church.denomination,
                },
                (church.street_address || church.city || church.country) && {
                  Icon: MapPin,
                  label: 'Location',
                  value: [church.street_address, church.city, church.country].filter(Boolean).join(', '),
                },
                church.service_info && {
                  Icon: Clock,
                  label: 'Services',
                  value: church.service_info,
                },
                memberCount > 0 && {
                  Icon: Users,
                  label: 'Members',
                  value: `${memberCount} ${memberCount === 1 ? 'member' : 'members'}`,
                },
                church.website && {
                  Icon: Globe,
                  label: 'Website',
                  value: church.website,
                  href: church.website.startsWith('http') ? church.website : `https://${church.website}`,
                },
              ].filter(Boolean);

              if (!rows.length) return null;
              return (
                <div style={{
                  background: T.parchment,
                  border: `1px solid rgba(184,115,58,0.18)`,
                  borderRadius: 16, padding: '6px 0', marginBottom: 16,
                }}>
                  {rows.map((row, i) => (
                    <div key={row.label} style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '12px 18px',
                      borderBottom: i < rows.length - 1 ? `1px solid rgba(184,115,58,0.12)` : 'none',
                    }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 10,
                        background: T.white,
                        boxShadow: '0 1px 3px rgba(44,24,16,0.08)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, color: T.goldDark,
                      }}>
                        <row.Icon size={15} strokeWidth={1.8} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, color: T.inkMuted, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 1 }}>
                          {row.label}
                        </div>
                        {row.href ? (
                          <a href={row.href} target="_blank" rel="noreferrer" style={{ fontSize: 14, color: T.goldDark, textDecoration: 'none', fontWeight: 500 }}>
                            {row.value} ↗
                          </a>
                        ) : (
                          <div style={{ fontSize: 14.5, color: T.ink, fontWeight: 500 }}>{row.value}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* About */}
            {church.about && (
              <div style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 14, padding: '18px 20px', marginBottom: 16 }}>
                <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.inkMuted, fontWeight: 700, marginBottom: 8 }}>
                  About
                </div>
                <div style={{ fontFamily: T.serif, fontSize: 15, color: T.ink, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {church.about}
                </div>
              </div>
            )}

            {/* Pinned post — visitor-facing only. Pastor edits this in Pastor settings. */}
            {church.pinned_post && (
              <div style={{
                background: T.parchment,
                border: `1px solid rgba(184,115,58,0.18)`,
                borderRadius: 16, padding: '20px 22px', marginBottom: 16,
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: T.goldDark, fontWeight: 700, marginBottom: 14,
                }}>
                  <KinwoveStar size={11} />
                  A note from the pastor
                </div>
                <div style={{
                  fontFamily: T.serif, fontSize: 15.5, color: T.ink,
                  lineHeight: 1.75, whiteSpace: 'pre-wrap',
                  fontStyle: 'italic',
                }}>
                  {church.pinned_post}
                </div>
                {church.pastor?.display_name && (
                  <div style={{
                    marginTop: 14,
                    fontSize: 13, color: T.inkSoft, fontWeight: 600,
                    paddingTop: 12, borderTop: `1px solid rgba(184,115,58,0.14)`,
                  }}>
                    — {church.pastor.display_name}
                  </div>
                )}
              </div>
            )}


            {/* Report listing — quiet footer link, not a CTA. Only useful for
                non-pastors; the pastor edits their own listing in admin. */}
            {!isPastor && (
              <div style={{ textAlign: 'center', padding: '24px 0 8px' }}>
                <button
                  onClick={() => setReportOpen(true)}
                  style={{
                    background: 'none', border: 'none', padding: 0,
                    fontSize: 12, color: T.inkMuted, cursor: 'pointer',
                    textDecoration: 'underline', textUnderlineOffset: 3,
                    fontFamily: 'inherit',
                  }}
                >
                  This listing isn't right
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Report listing sheet */}
      {reportOpen && (
        <div
          onClick={() => !reportSubmitting && setReportOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 400,
            background: 'rgba(44,24,16,0.55)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: T.white, borderRadius: 18,
              padding: '22px 22px 18px', width: '100%', maxWidth: 480,
              boxShadow: '0 -8px 28px rgba(0,0,0,0.18)',
            }}
          >
            {reportSent ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontFamily: T.display, fontSize: 20, color: T.ink, fontWeight: 600, marginBottom: 6 }}>
                  Thanks — we'll take a look.
                </div>
                <div style={{ fontSize: 13, color: T.inkMuted, lineHeight: 1.55 }}>
                  Your report goes to the kinwove admin team for review.
                </div>
              </div>
            ) : (
              <>
                <div style={{ fontFamily: T.display, fontSize: 19, color: T.ink, fontWeight: 600, marginBottom: 4, letterSpacing: '-0.012em' }}>
                  Report this listing
                </div>
                <div style={{ fontSize: 12.5, color: T.inkMuted, lineHeight: 1.55, marginBottom: 14 }}>
                  Spotted something wrong with <strong>{church.name}</strong>? Let us know — we re-review reported listings.
                </div>

                <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: T.inkMuted, fontWeight: 700, marginBottom: 6 }}>
                  What's wrong?
                </div>
                <div style={{ display: 'grid', gap: 6, marginBottom: 14 }}>
                  {[
                    { value: 'inaccurate_info', label: 'Info is inaccurate (name, denomination, etc.)' },
                    { value: 'wrong_location', label: 'Wrong address or location' },
                    { value: 'closed', label: 'This church has closed' },
                    { value: 'not_real', label: 'Not a real church' },
                    { value: 'impersonation', label: "Someone is impersonating this church\u2019s pastor" },
                    { value: 'other', label: 'Something else' },
                  ].map((opt) => (
                    <label key={opt.value} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 8,
                      padding: '8px 10px',
                      background: reportType === opt.value ? 'rgba(184,115,58,0.08)' : T.parchment,
                      border: `1px solid ${reportType === opt.value ? T.gold : T.line}`,
                      borderRadius: 10, cursor: 'pointer',
                      fontSize: 13, color: T.ink, lineHeight: 1.4,
                    }}>
                      <input
                        type="radio"
                        name="dispute_type"
                        value={opt.value}
                        checked={reportType === opt.value}
                        onChange={() => setReportType(opt.value)}
                        style={{ marginTop: 2, accentColor: T.gold }}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>

                <textarea
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value.slice(0, 2000))}
                  placeholder="Tell us what's wrong (so we know what to look at)…"
                  rows={3}
                  style={{
                    width: '100%', boxSizing: 'border-box', resize: 'vertical',
                    background: T.parchment, border: `1px solid ${T.line}`,
                    borderRadius: 10, padding: '10px 12px', fontSize: 14,
                    color: T.ink, fontFamily: T.serif, outline: 'none', lineHeight: 1.55,
                    marginBottom: 8,
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = T.gold)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = T.line)}
                />

                {!session && (
                  <input
                    type="email"
                    value={reportEmail}
                    onChange={(e) => setReportEmail(e.target.value.slice(0, 200))}
                    placeholder="Your email (optional — if you'd like a follow-up)"
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      background: T.parchment, border: `1px solid ${T.line}`,
                      borderRadius: 10, padding: '10px 12px', fontSize: 13,
                      color: T.ink, outline: 'none', marginBottom: 10,
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = T.gold)}
                    onBlur={(e) => (e.currentTarget.style.borderColor = T.line)}
                  />
                )}

                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button
                    onClick={() => setReportOpen(false)}
                    disabled={reportSubmitting}
                    style={{
                      background: 'transparent', border: `1px solid ${T.line}`,
                      borderRadius: 999, padding: '10px 18px', fontSize: 13,
                      color: T.inkMuted, cursor: reportSubmitting ? 'default' : 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitReport}
                    disabled={reportSubmitting || !reportReason.trim()}
                    style={{
                      flex: 1, background: T.ink, color: T.cream, border: 'none',
                      borderRadius: 999, padding: '10px 18px', fontSize: 13, fontWeight: 600,
                      cursor: reportSubmitting || !reportReason.trim() ? 'default' : 'pointer',
                      opacity: reportSubmitting || !reportReason.trim() ? 0.5 : 1,
                    }}
                  >
                    {reportSubmitting ? 'Sending…' : 'Send report'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ActionChip({ emoji, label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap', flexShrink: 0,
        background: T.parchment, border: `1px solid ${T.goldLight}`, borderRadius: 999,
        padding: '9px 16px', fontSize: 13.5, fontWeight: 600, color: T.inkSoft,
        cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.gold; e.currentTarget.style.background = `rgba(184,115,58,0.12)`; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.goldLight; e.currentTarget.style.background = T.parchment; }}
    >
      <span style={{ fontSize: 15 }}>{emoji}</span>
      {label}
    </button>
  );
}
