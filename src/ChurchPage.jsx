import { useEffect, useState, lazy, Suspense } from 'react';
import { ArrowLeft, Share2, Check, ExternalLink } from 'lucide-react';
import { supabase } from './supabase.js';
import { T, SHADOW, RADIUS, SEMANTIC, SPACE } from './theme.js';
import { presetForRole } from './Badge.jsx';
import { useUiKit } from './uikit.jsx';
import JoinByCode from './JoinByCode.jsx';
import { codeToFlag } from './countries.js';

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
  const [memberCount, setMemberCount] = useState(0);
  const [joining, setJoining] = useState(false);
  const [joinRequest, setJoinRequest] = useState(null); // null | 'pending' | 'declined'
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
  const [feedRefresh, setFeedRefresh] = useState(0);
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
      if (cErr) console.error('[ChurchPage] church load error:', cErr);
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
      const [invitesRes, careRes, walkRes] = await Promise.all([
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
      ]);
      if (cancelled) return;
      setPendingInvites(invitesRes.data ?? []);
      setIsCareTeam(!!careRes.data);
      setFeaturedWalk(walkRes.data ?? null);
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
    showToast("Welcome \u2014 you\u2019re now a member.", 'success');
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
            }}>✦</div>
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

      {/* Visitor-view banner — when an owner/member lands on their own church
          page wrapped in ChurchModeShell, the admin chrome above doesn't make
          it obvious that the body is the *public* view. This thin parchment
          strip names the frame so they don't read it as their dashboard. */}
      {chromeless && (isPastor || isMember) && (
        <div style={{
          background: T.parchment,
          borderBottom: `1px solid ${T.goldLight}`,
          padding: '8px 16px',
        }}>
          <div style={{
            maxWidth: 640, margin: '0 auto',
            fontSize: 12, color: T.goldDark,
          }}>
            <span style={{ fontStyle: 'italic' }}>
              Visitor view — this is what people see.
            </span>
          </div>
        </div>
      )}

      {/* Sanctuary-doorway hero — flows directly from the global dark header.
          Back + Share are overlaid at top so there's no white strip break. */}
      <div style={{
        position: 'relative',
        background: `linear-gradient(135deg, ${T.ink} 0%, #1A0F08 55%, #3A2516 100%)`,
        borderBottom: '1px solid rgba(184,115,58,0.35)',
        boxShadow: SHADOW.candle,
        overflow: 'hidden',
        color: T.cream,
      }}>
        {/* Candlelight gold-grain — same texture as ChurchHub, glows on dark */}
        <div className="texture-bg" style={{
          position: 'absolute', inset: 0,
          opacity: 0.55,
          maskImage: 'radial-gradient(ellipse 70% 80% at 50% 30%, #000 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 80% at 50% 30%, #000 30%, transparent 75%)',
          pointerEvents: 'none',
        }} />

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

        <div className="stagger-in" style={{ position: 'relative', maxWidth: 640, margin: '0 auto', padding: `${chromeless ? 36 : 58}px 16px 28px`, textAlign: 'center' }}>
          {/* Avatar — pastors get an edit overlay that deep-links to Settings */}
          <div style={{ position: 'relative', width: 92, margin: '0 auto 18px', cursor: isPastor ? 'pointer' : 'default' }}
            onClick={isPastor ? () => onOpenAdmin?.('settings') : undefined}
            title={isPastor ? 'Change church photo' : undefined}
          >
            <div className="halo" style={{ '--i': 0,
              width: 92, height: 92, borderRadius: '50%',
              background: 'rgba(253,248,240,0.06)',
              border: `2px solid ${T.gold}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 42,
              overflow: 'hidden',
              boxShadow: '0 0 32px rgba(184,115,58,0.35), inset 0 1px 0 rgba(253,248,240,0.10)',
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
          <h1 style={{ '--i': 1, fontFamily: T.display, fontSize: 34, fontWeight: 600, color: T.cream, margin: '0 0 4px', lineHeight: 1.08, letterSpacing: '-0.022em' }}>
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
      </div>

      <div style={{
        position: 'sticky', top: 'var(--global-header-h, 0px)', zIndex: 5,
        background: T.white,
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
              flex: 1, padding: '11px 4px',
              background: 'transparent', border: 'none',
              borderBottom: tab === t.id ? '2px solid #6b2438' : '2px solid transparent',
              fontSize: 13.5, fontWeight: tab === t.id ? 700 : 500,
              color: tab === t.id ? '#6b2438' : T.inkMuted,
              cursor: 'pointer',
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
                  <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 4 }}>
                    ✦ Invitation from your pastor
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
                  background: T.parchment, border: `1px solid ${T.goldLight}`,
                  borderRadius: 14, padding: '14px 16px', marginBottom: SPACE[3], cursor: 'pointer',
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: T.white, border: `1px solid ${T.line}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, color: T.goldDark, flexShrink: 0,
                }}>{featuredWalk.cover_emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10.5, letterSpacing: 1.5, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 2 }}>
                    ✶ Walking together
                  </div>
                  <div style={{ fontFamily: T.display, fontSize: 17, fontWeight: 600, color: T.ink, letterSpacing: '-0.012em', lineHeight: 1.2 }}>
                    {featuredWalk.title}
                  </div>
                  {featuredWalk.subtitle && (
                    <div style={{ fontSize: 12.5, color: T.inkSoft, fontStyle: 'italic', lineHeight: 1.4, marginTop: 2 }}>
                      {featuredWalk.subtitle}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 13, color: T.goldDark, fontWeight: 600, flexShrink: 0 }}>Start →</div>
              </button>
            )}

            {/* ── Quick action chips ── */}
            {(isMember || isPastor) && (
              <div style={{ display: 'flex', gap: SPACE[2], marginBottom: SPACE[5], flexWrap: 'wrap', justifyContent: 'center' }}>
                {onOpenTalkToSomeone && <ActionChip emoji="☎" label="Talk to someone" onClick={onOpenTalkToSomeone} />}
                {onOpenPrayer && <ActionChip emoji="🙏" label="Pray together"   onClick={onOpenPrayer} />}
                {onOpenWalks && <ActionChip emoji="✶" label="Pick a walk"      onClick={onOpenWalks} />}
              </div>
            )}

            {/* ── Composer + church feed (members + pastors) ─── */}
            {(isMember || isPastor) && (
              <>
                <div style={{ marginBottom: SPACE[3], display: 'flex', alignItems: 'center', gap: SPACE[3] }}>
                  <div className="section-eyebrow">Latest</div>
                  <div className="rule-gold" style={{ flex: 1 }} />
                </div>

                {/* ── Pastor-only sermon status card ─────────────────────── */}
                {isPastor && (
                  <div style={{
                    background: T.parchment, border: `1px solid ${T.goldLight}`,
                    borderRadius: 12, padding: '10px 14px', marginBottom: 14,
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10.5, letterSpacing: 1.4, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 3 }}>
                        📖 Latest sermon
                      </div>
                      {latestSermon ? (
                        <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {latestSermon.title}
                        </div>
                      ) : (
                        <div style={{ fontSize: 13, color: T.inkSoft, fontStyle: 'italic' }}>
                          No sermons posted yet
                        </div>
                      )}
                    </div>
                    <button
                      onClick={latestSermon
                        ? () => onOpenSermon?.(latestSermon.id)
                        : () => onNewSermon ? onNewSermon() : onOpenAdmin?.('sermons')}
                      style={{
                        background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
                        padding: '7px 14px', fontSize: 12.5, fontWeight: 600,
                        cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
                      }}
                    >
                      {latestSermon ? 'View →' : 'Post first →'}
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
                    userPlan={profile?.plan ?? 'free'}
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
                <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 8 }}>
                  ✦ This week's sermon
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
                <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 8 }}>
                  ✦ This week's sermon
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
                <div style={{ display: 'grid', gap: 12 }}>
                  {[
                    {
                      icon: '🙏',
                      title: 'Prayer wall',
                      body: 'Pray with your church between Sundays. Anonymous when you need it to be.',
                    },
                    {
                      icon: '✦',
                      title: 'Sunday\u2019s sermon, all week',
                      body: 'Go deeper with what your pastor preached — questions, discussion, and notes.',
                    },
                    {
                      icon: '·',
                      title: 'Quiet space',
                      body: 'No algorithms, no ads, no strangers. Just our church.',
                    },
                  ].map((row) => (
                    <div key={row.title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                        background: 'rgba(184,115,58,0.10)', border: `1px solid ${T.goldLight}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16, color: T.goldDark,
                      }}>{row.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: T.serif, fontSize: 14.5, fontWeight: 700, color: T.ink, lineHeight: 1.35 }}>
                          {row.title}
                        </div>
                        <div style={{ fontSize: 13, color: T.inkSoft, lineHeight: 1.55, marginTop: 2 }}>
                          {row.body}
                        </div>
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
                <button
                  onClick={isMember ? handleLeave : joinRequest === 'pending' ? undefined : handleJoin}
                  disabled={joining || joinRequest === 'pending'}
                  style={{
                    width: '100%',
                    background: isMember ? 'transparent' : joinRequest === 'pending' ? T.parchment : T.ink,
                    color: isMember ? T.inkMuted : joinRequest === 'pending' ? T.inkSoft : T.cream,
                    border: (isMember || joinRequest === 'pending') ? `1px solid ${T.line}` : 'none',
                    borderRadius: 999, padding: '13px 20px',
                    fontSize: 15, fontWeight: 600,
                    cursor: (joining || joinRequest === 'pending') ? 'not-allowed' : 'pointer',
                    opacity: joining ? 0.6 : 1, marginBottom: joinRequest === 'declined' ? 8 : 24,
                  }}
                >
                  {joining ? '…'
                    : isMember ? '✓ You\u2019re a member'
                    : joinRequest === 'pending' ? '✉ Request sent — awaiting approval'
                    : church?.open_join === false ? 'Request to join'
                    : 'Join this church'}
                </button>
                {joinRequest === 'declined' && (
                  <div style={{ fontSize: 13, color: T.inkMuted, textAlign: 'center', marginBottom: 24 }}>
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
                background: 'rgba(184,115,58,0.06)', border: `1px solid ${T.goldLight}`,
                borderLeft: `4px solid ${T.gold}`, borderRadius: 12, padding: '16px 18px', marginBottom: 16,
              }}>
                <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 8 }}>
                  ✦ From the pastor
                </div>
                <div style={{ fontFamily: T.serif, fontSize: 15, color: T.ink, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {church.pinned_post}
                </div>
              </div>
            )}

            {/* Website */}
            {church.website && (
              <a href={church.website.startsWith('http') ? church.website : `https://${church.website}`} target="_blank" rel="noreferrer" style={{
                display: 'block', background: T.white, border: `1px solid ${T.line}`, borderRadius: 14,
                padding: '14px 16px', marginBottom: 16, color: T.goldDark, fontSize: 14, textDecoration: 'none',
              }}>
                <ExternalLink size={14} strokeWidth={2} style={{ marginRight: 6, verticalAlign: 'middle' }} />Visit church website
              </a>
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
      className="lift"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: T.white, border: `1px solid ${T.line}`, borderRadius: 999,
        padding: '8px 14px', fontSize: 13, fontWeight: 600, color: T.inkSoft,
        cursor: 'pointer',
      }}
    >
      <span style={{ fontSize: 14 }}>{emoji}</span>
      {label}
    </button>
  );
}
