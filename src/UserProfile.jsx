import { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { supabase } from './supabase.js';
import { T } from './theme.js';
import { PERSON_TYPES } from './constants.js';
import { Avatar, bannerBackground } from './ProfilePage.jsx';
// Shared with MePanel — same constants, same helpers, same church card.
// If you find yourself adding a profile primitive, put it there, not here.
import { TYPE_COLORS, timeAgo, loadChurchContext, ChurchAttendsCard } from './profileShared.jsx';

const Feed          = lazy(() => import('./Feed.jsx'));
const PostComposer  = lazy(() => import('./PostComposer.jsx'));

export default function UserProfile({ userId, session, onClose, onStartChat, onStartDM, onViewProfile, onOpenChurch, onOpenSermon }) {
  const [profile, setProfile] = useState(null);
  const [followingList, setFollowingList] = useState([]);
  const [stats, setStats] = useState({ posts: 0, following: 0, followers: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  // friendStatus: 'none' | 'pending-sent' | 'pending-received' | 'friends'
  const [friendStatus, setFriendStatus] = useState('none');
  const [friendRequestId, setFriendRequestId] = useState(null);
  const [tab, setTab] = useState('posts');
  const [feedRefresh, setFeedRefresh] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);
  const [blockedByThem, setBlockedByThem] = useState(false);
  const [publicPrayers, setPublicPrayers] = useState([]);
  const [prayedFor, setPrayedFor] = useState(new Set());
  const [prayingFor, setPrayingFor] = useState(false); // "Pray for [name]" button state
  // Their home church + this week's sermon — fetched via the shared
  // loadChurchContext helper so MePanel and UserProfile use the same query
  // shape. ChurchAttendsCard renders this object directly.
  const [churchCtx, setChurchCtx] = useState({ church: null, sermon: null, memberCount: 0 });
  const person = PERSON_TYPES.find((p) => p.id === profile?.person_type);
  const typeColors = TYPE_COLORS[profile?.person_type] ?? TYPE_COLORS.curious;

  useEffect(() => {
    if (!userId) return;
    supabase.from('profiles').select('*').eq('id', userId).single().then(async ({ data }) => {
      setProfile(data ?? null);
      setChurchCtx(await loadChurchContext(data?.church_id));
    });
    Promise.all([
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('author_id', userId),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
    ]).then(([{ count: p }, { count: ing }, { count: ers }]) => {
      setStats({ posts: p ?? 0, following: ing ?? 0, followers: ers ?? 0 });
    });
    if (session?.user?.id) {
      supabase.from('follows').select('id').eq('follower_id', session.user.id).eq('following_id', userId)
        .then(({ data }) => setIsFollowing((data?.length ?? 0) > 0));
      loadFriendStatus(session.user.id);
      supabase.from('blocked_users').select('id').eq('blocker_id', session.user.id).eq('blocked_id', userId)
        .then(({ data }) => setIsBlocked((data?.length ?? 0) > 0));
      supabase.from('blocked_users').select('id').eq('blocker_id', userId).eq('blocked_id', session.user.id)
        .then(({ data }) => setBlockedByThem((data?.length ?? 0) > 0));
    }
    supabase.from('follows').select('following_id').eq('follower_id', userId)
      .then(async ({ data }) => {
        if (!data?.length) return;
        const { data: profiles } = await supabase
          .from('profiles').select('id, display_name, avatar_config, avatar_url, person_type, tradition')
          .in('id', data.map((f) => f.following_id));
        setFollowingList(profiles ?? []);
      });
  }, [userId, session]);

  async function loadFriendStatus(myId) {
    const { data } = await supabase
      .from('friend_requests')
      .select('id, sender_id, status')
      .or(`and(sender_id.eq.${myId},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${myId})`);
    if (!data?.length) { setFriendStatus('none'); return; }
    const req = data[0];
    setFriendRequestId(req.id);
    if (req.status === 'accepted') { setFriendStatus('friends'); return; }
    if (req.status === 'pending') {
      setFriendStatus(req.sender_id === myId ? 'pending-sent' : 'pending-received');
    }
  }

  async function sendFriendRequest() {
    if (!session) return;
    const { data } = await supabase.from('friend_requests').insert({
      sender_id: session.user.id, receiver_id: userId,
    }).select().single();
    if (data) { setFriendRequestId(data.id); setFriendStatus('pending-sent'); }
  }

  async function cancelFriendRequest() {
    if (!friendRequestId) return;
    await supabase.from('friend_requests').delete().eq('id', friendRequestId);
    setFriendStatus('none'); setFriendRequestId(null);
  }

  async function respondToRequest(accept) {
    if (!friendRequestId) return;
    if (accept) {
      await supabase.from('friend_requests').update({ status: 'accepted' }).eq('id', friendRequestId);
      setFriendStatus('friends');
    } else {
      await supabase.from('friend_requests').update({ status: 'declined' }).eq('id', friendRequestId);
      setFriendStatus('none'); setFriendRequestId(null);
    }
  }

  async function handleFollow() {
    if (!session) return;
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', session.user.id).eq('following_id', userId);
      setIsFollowing(false);
      setStats((s) => ({ ...s, followers: Math.max(0, s.followers - 1) }));
    } else {
      await supabase.from('follows').insert({ follower_id: session.user.id, following_id: userId });
      setIsFollowing(true);
      setStats((s) => ({ ...s, followers: s.followers + 1 }));
    }
  }

  async function loadPublicPrayers() {
    const { data } = await supabase.from('prayers')
      .select('*')
      .eq('author_id', userId)
      .eq('is_public', true)
      .order('created_at', { ascending: false });
    setPublicPrayers(data ?? []);
    if (session?.user?.id) {
      const ids = (data ?? []).map((p) => p.id);
      if (ids.length) {
        const { data: responses } = await supabase.from('prayer_responses')
          .select('prayer_id').eq('author_id', session.user.id).in('prayer_id', ids);
        setPrayedFor(new Set(responses?.map((r) => r.prayer_id) ?? []));
      }
    }
  }

  async function reactToPrayer(prayerId) {
    if (!session || prayedFor.has(prayerId)) return;
    await supabase.from('prayer_responses').insert({ prayer_id: prayerId, author_id: session.user.id });
    setPrayedFor((prev) => new Set([...prev, prayerId]));
  }

  async function addToPrayerList() {
    if (!session || prayingFor) return;
    const name = profile?.display_name ?? 'this person';
    await supabase.from('personal_prayers').insert({
      user_id: session.user.id,
      body: `Praying for ${name}`,
    });
    setPrayingFor(true);
  }

  async function toggleBlock() {
    if (!session || blockBusy) return;
    setBlockBusy(true);
    if (isBlocked) {
      await supabase.from('blocked_users').delete().eq('blocker_id', session.user.id).eq('blocked_id', userId);
      setIsBlocked(false);
    } else {
      await supabase.from('blocked_users').insert({ blocker_id: session.user.id, blocked_id: userId });
      setIsBlocked(true);
    }
    setBlockBusy(false);
  }

  const firstName = profile?.display_name?.split(' ')[0] ?? 'them';
  const canSendFriendReq = profile?.allow_friend_requests !== false;

  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const actionMenuRef = useRef(null);
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 1024);
  useEffect(() => {
    const handle = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);
  // Close action menu on outside click
  useEffect(() => {
    if (!actionMenuOpen) return;
    const handler = (e) => { if (!actionMenuRef.current?.contains(e.target)) setActionMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [actionMenuOpen]);

  return (
    <div className="scene" style={{
      position: 'fixed',
      top: isDesktop ? 56 : 0,
      left: isDesktop ? 240 : 0,
      right: 0,
      bottom: 0,
      zIndex: 150,
      overflowY: 'auto',
      paddingBottom: 80,
      background: T.cream,
    }}>

      {/* Sticky header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: T.white, borderBottom: `1px solid ${T.line}`,
      }}>
        <div style={{
          maxWidth: 760, margin: '0 auto', height: 52,
          padding: '0 16px',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: T.goldDark,
            fontSize: 18, cursor: 'pointer', width: 36, height: 36, borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s',
          }}
            onMouseEnter={(e) => (e.currentTarget.style.background = T.parchment)}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            aria-label="Back"
          >←</button>
          <div style={{
            flex: 1, textAlign: 'center', fontFamily: T.display,
            fontSize: 17, fontWeight: 600, color: T.ink, letterSpacing: '-0.012em',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {profile?.display_name ?? ''}
          </div>
          {friendStatus === 'friends' ? (
            <span style={{ fontSize: 11, color: T.goldDark, background: 'rgba(184,115,58,0.1)', borderRadius: 999, padding: '4px 10px', fontWeight: 600 }}>👥 Friends</span>
          ) : (
            <div style={{ width: 36 }} />
          )}
        </div>
      </div>

      {/* Centered column for the whole profile body */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '14px 16px 0' }}>

      {/* Hero card — warm parchment-to-gold banner with avatar + identity */}
      <div style={{
        background: T.white, marginBottom: 12,
        borderRadius: 16, border: `1px solid ${T.line}`, overflow: 'hidden',
      }}>
        <div style={{
          height: 108,
          background: bannerBackground(profile),
          position: 'relative', overflow: 'hidden',
        }}>
        </div>

        <div style={{ padding: '0 20px 22px' }}>
          {/* Avatar + action buttons row */}
          {/* position: relative + zIndex: 2 keeps the avatar painting above the
              banner texture and above the gold ring's drop-shadow — without
              it the dotted radial mask on the banner can visually swallow the
              top half of the avatar on certain browsers / scroll positions. */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: -50, marginBottom: 16, position: 'relative', zIndex: 2 }}>
            <div style={{
              borderRadius: '50%', padding: 4,
              background: `linear-gradient(135deg, ${T.gold}, #e8a050, ${T.gold})`,
              display: 'inline-block',
              boxShadow: '0 4px 20px rgba(184,115,58,0.35)',
            }}>
              <Avatar
                name={profile?.display_name}
                avatarConfig={profile?.avatar_config}
                photoUrl={profile?.avatar_url}
                size={84}
                style={{ border: `3px solid ${T.white}`, display: 'block' }}
              />
            </div>

            {session && session.user.id !== userId && (
              <div style={{ display: 'flex', gap: 8, paddingBottom: 4, alignItems: 'center' }}>

                {/* ── Friend request ── primary pill */}
                {canSendFriendReq && friendStatus === 'none' && (
                  <button onClick={sendFriendRequest} style={{
                    background: T.gold, color: T.cream, border: 'none',
                    borderRadius: 999, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(184,115,58,0.30)',
                  }}>+ Friend</button>
                )}
                {friendStatus === 'pending-sent' && (
                  <button onClick={cancelFriendRequest} style={{
                    background: T.white, color: T.inkMuted,
                    border: `1.5px solid ${T.line}`, borderRadius: 999,
                    padding: '8px 14px', fontSize: 13, cursor: 'pointer',
                  }}>Requested ×</button>
                )}
                {friendStatus === 'pending-received' && (
                  <>
                    <button onClick={() => respondToRequest(true)} style={{
                      background: T.gold, color: T.cream, border: 'none',
                      borderRadius: 999, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}>Accept</button>
                    <button onClick={() => respondToRequest(false)} style={{
                      background: T.white, color: T.inkMuted, border: `1.5px solid ${T.line}`,
                      borderRadius: 999, padding: '8px 12px', fontSize: 13, cursor: 'pointer',
                    }}>✕</button>
                  </>
                )}

                {/* ── Follow ── secondary outline */}
                {profile?.allow_follows !== false && friendStatus !== 'pending-received' && (
                  <button onClick={handleFollow} style={{
                    background: isFollowing ? T.white : 'transparent',
                    color: isFollowing ? T.inkMuted : T.ink,
                    border: `1.5px solid ${isFollowing ? T.line : T.ink}`,
                    borderRadius: 999, padding: '8px 14px',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}>
                    {isFollowing ? '✓ Following' : 'Follow'}
                  </button>
                )}

                {/* ── ⋯ overflow: Pray + Block ── */}
                <div ref={actionMenuRef} style={{ position: 'relative' }}>
                  <button
                    onClick={() => setActionMenuOpen((v) => !v)}
                    style={{
                      background: actionMenuOpen ? T.parchment : 'transparent',
                      border: `1.5px solid ${T.line}`,
                      borderRadius: '50%', width: 36, height: 36,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 17, cursor: 'pointer', color: T.inkMuted,
                      transition: 'all 0.15s', flexShrink: 0,
                    }}
                    aria-label="More actions"
                  >⋯</button>
                  {actionMenuOpen && (
                    <div style={{
                      position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                      background: T.white, border: `1px solid ${T.line}`, borderRadius: 12,
                      boxShadow: '0 8px 28px rgba(0,0,0,0.13)', minWidth: 210,
                      zIndex: 200, overflow: 'hidden',
                    }}>
                      {/* Pray */}
                      <button
                        onClick={() => { addToPrayerList(); setActionMenuOpen(false); }}
                        disabled={prayingFor}
                        style={{
                          width: '100%', textAlign: 'left', background: 'none', border: 'none',
                          borderBottom: `1px solid ${T.line}`,
                          padding: '13px 16px', fontSize: 13.5,
                          color: prayingFor ? T.inkMuted : T.ink,
                          cursor: prayingFor ? 'default' : 'pointer',
                          display: 'flex', alignItems: 'center', gap: 10,
                        }}
                      >
                        <span style={{ fontSize: 16 }}>🙏</span>
                        {prayingFor ? 'Added to prayer list' : `Pray for ${firstName}`}
                      </button>
                      {/* Block */}
                      <button
                        onClick={() => { toggleBlock(); setActionMenuOpen(false); }}
                        disabled={blockBusy}
                        style={{
                          width: '100%', textAlign: 'left', background: 'none', border: 'none',
                          padding: '13px 16px', fontSize: 13.5,
                          color: isBlocked ? T.inkMuted : (T.error ?? '#A53F2B'),
                          cursor: blockBusy ? 'wait' : 'pointer',
                          display: 'flex', alignItems: 'center', gap: 10,
                          opacity: blockBusy ? 0.6 : 1,
                        }}
                      >
                        <span style={{ fontSize: 16 }}>🚫</span>
                        {isBlocked ? `Unblock ${firstName}` : `Block ${firstName}`}
                      </button>
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>

          {/* Name + badge */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontFamily: T.display, fontSize: 28, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 8 }}>
              {profile?.display_name ?? ''}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
              {person && (
                <span style={{
                  background: typeColors.bg, border: `1px solid ${typeColors.border}`,
                  color: typeColors.text, borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 600,
                }}>
                  {person.emoji} {person.label}
                </span>
              )}
              {profile?.tradition && <span style={{ fontSize: 13, color: T.inkMuted }}>· {profile.tradition}</span>}
              {(profile?.city || profile?.country) && (
                <span style={{ fontSize: 13, color: T.inkMuted }}>· 📍 {[profile.city, profile.country].filter(Boolean).join(', ')}</span>
              )}
            </div>
          </div>

          {/* Bio */}
          {profile?.what_brought && (
            <div style={{
              fontFamily: T.serif, fontSize: 15, color: T.inkSoft,
              fontStyle: 'italic', lineHeight: 1.65, marginBottom: 16,
              padding: '12px 14px',
              background: 'rgba(184,115,58,0.05)',
              borderLeft: `3px solid ${T.gold}`,
              borderRadius: '0 10px 10px 0',
            }}>
              "{profile.what_brought}"
            </div>
          )}

          {/* Stats — hidden when this person has no posts, no follows, no
              followers. A row of zeros tells visitors "nothing's here" before
              they've even read the bio; better to show no stats at all than
              three sad zeros. */}
          {(stats.posts > 0 || stats.following > 0 || stats.followers > 0) && (
            <div style={{ display: 'flex', gap: 24, paddingTop: 14, borderTop: `1px solid ${T.line}` }}>
              {[
                { value: stats.posts, label: 'Posts' },
                { value: stats.following, label: 'Following' },
                { value: stats.followers, label: 'Followers' },
              ].map((s) => (
                <div key={s.label}>
                  <span style={{ fontFamily: T.display, fontSize: 21, fontWeight: 600, color: T.ink, letterSpacing: '-0.015em' }}>{s.value}</span>
                  <span style={{ fontSize: 12, color: T.inkMuted, marginLeft: 5 }}>{s.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Direct message — primary action, right under the header */}
      {onStartDM && session?.user?.id !== userId && (
        <button
          onClick={() => onStartDM(userId)}
          style={{
            width: '100%', marginBottom: 16,
            background: T.ink, color: T.cream,
            border: 'none', borderRadius: 12,
            padding: '13px 18px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 10,
            fontFamily: 'inherit', fontSize: 15, fontWeight: 600,
          }}
        >
          <span style={{ fontSize: 17 }}>✉</span>
          <span>Message {profile?.display_name?.split(' ')[0] ?? 'them'}</span>
          <span style={{ marginLeft: 'auto', fontSize: 15 }}>→</span>
        </button>
      )}

      {/* Their church + this week's sermon */}
      {session?.user?.id !== userId && (
        <ChurchAttendsCard
          firstName={firstName}
          isSelf={false}
          church={churchCtx.church}
          sermon={churchCtx.sermon}
          memberCount={churchCtx.memberCount}
          onOpenChurch={onOpenChurch}
          onOpenSermon={onOpenSermon}
        />
      )}


      {/* Blocked overlay — replaces tabs + content when user is blocked or has blocked you */}
      {(isBlocked || blockedByThem) && (
        <div style={{ textAlign: 'center', padding: '48px 24px', background: T.white, borderRadius: 14, border: `1px solid ${T.line}`, marginBottom: 12 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🚫</div>
          <div style={{ fontFamily: T.display, fontSize: 17, fontWeight: 600, color: T.ink, marginBottom: 8 }}>
            {isBlocked ? 'You\'ve blocked this person' : 'Content not available'}
          </div>
          <div style={{ fontSize: 13.5, color: T.inkSoft, lineHeight: 1.6, marginBottom: 20 }}>
            {isBlocked
              ? 'Their posts and activity are hidden from you.'
              : 'This content isn\'t available right now.'}
          </div>
          {isBlocked && (
            <button
              onClick={toggleBlock}
              disabled={blockBusy}
              style={{
                background: T.white, border: `1.5px solid ${T.line}`,
                borderRadius: 999, padding: '9px 20px',
                fontSize: 13, color: T.inkSoft, cursor: blockBusy ? 'wait' : 'pointer',
                opacity: blockBusy ? 0.6 : 1,
              }}
            >Unblock</button>
          )}
        </div>
      )}

      {/* Tabs — sit inside the card column, not full-bleed */}
      {!isBlocked && !blockedByThem && (<>
      <div style={{
        background: T.white, display: 'flex',
        border: `1px solid ${T.line}`, borderRadius: 12,
        marginBottom: 12, overflow: 'hidden',
      }}>
        {[
          { id: 'posts',     label: `Posts (${stats.posts})` },
          { id: 'prayers',   label: 'Prayers' },
          { id: 'following', label: `Following (${stats.following})` },
        ].map((t) => (
          <button key={t.id} onClick={() => { setTab(t.id); if (t.id === 'prayers') loadPublicPrayers(); }} style={{
            flex: 1, padding: '13px 4px',
            background: 'none', border: 'none',
            borderBottom: tab === t.id ? `3px solid ${T.ink}` : '3px solid transparent',
            fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
            color: tab === t.id ? T.ink : T.inkMuted,
            cursor: 'pointer',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Posts tab — unified feed (your own profile shows the composer) */}
      {tab === 'posts' && (
        <div>
          <Suspense fallback={<div style={{ textAlign: 'center', padding: 40, color: T.inkMuted, fontFamily: T.serif }}>Loading…</div>}>
            {session?.user?.id === userId && (
              <PostComposer
                session={session}
                profile={profile}
                scope="me"
                placeholder="Share something on your page…"
                onPosted={() => setFeedRefresh((n) => n + 1)}
              />
            )}
            <Feed
              source={`me:${userId}`}
              sessionUserId={session?.user?.id}
              refreshKey={feedRefresh}
              emptyMessage={
                // Three flavors:
                //   - own profile: gentle nudge to post
                //   - viewing someone with a church: hints at the privacy gate so a
                //     non-member doesn't read empty as "they haven't posted" when really
                //     they aren't in the same church. RLS will still filter posts the
                //     viewer can't see, so this copy is the honest read of the situation.
                //   - viewing someone with no church: plain empty
                session?.user?.id === userId
                  ? 'Nothing shared yet — say hello to your page.'
                  : churchCtx.church
                    ? `Posts here are visible to ${churchCtx.church.name} family.`
                    : 'Nothing shared yet.'
              }
            />
          </Suspense>
        </div>
      )}

      {/* Prayers tab */}
      {tab === 'prayers' && (
        <div>
          {publicPrayers.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 20px', background: T.white, borderRadius: 14, border: `1px solid ${T.line}` }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>🕯️</div>
              <div style={{ fontFamily: T.display, fontSize: 22, fontWeight: 600, color: T.ink, letterSpacing: '-0.015em', lineHeight: 1.15, marginBottom: 6 }}>No public prayers yet.</div>
              <div style={{ fontSize: 13, color: T.inkMuted }}>{profile?.display_name?.split(' ')[0] ?? 'They'} hasn't shared any prayer requests.</div>
            </div>
          )}
          {publicPrayers.map((p) => {
            const hasPrayed = prayedFor.has(p.id);
            return (
              <div key={p.id} style={{
                background: T.white, border: `1px solid ${T.line}`,
                borderRadius: 14, padding: '16px 18px', marginBottom: 12,
              }}>
                <div style={{ fontSize: 11, color: T.inkMuted, marginBottom: 10, letterSpacing: '0.04em' }}>
                  {timeAgo(p.created_at)}
                </div>
                <div style={{ fontFamily: T.serif, fontSize: 16, color: T.ink, lineHeight: 1.72, marginBottom: 14, whiteSpace: 'pre-wrap' }}>
                  {p.body}
                </div>
                {session && (
                  <button
                    onClick={() => reactToPrayer(p.id)}
                    disabled={hasPrayed}
                    style={{
                      background: hasPrayed ? 'rgba(184,115,58,0.08)' : 'transparent',
                      border: `1px solid ${hasPrayed ? T.goldLight : T.line}`,
                      borderRadius: 999, padding: '6px 16px', fontSize: 13,
                      color: hasPrayed ? T.goldDark : T.inkMuted,
                      cursor: hasPrayed ? 'default' : 'pointer',
                      fontWeight: hasPrayed ? 600 : 400,
                      transition: 'all 0.15s',
                    }}
                  >
                    🙏 {hasPrayed ? 'Prayed' : 'Pray for this'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Following tab */}
      {tab === 'following' && (
        <div>
          {followingList.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontFamily: T.display, fontSize: 22, fontWeight: 600, color: T.ink, letterSpacing: '-0.015em', lineHeight: 1.15 }}>Not following anyone yet.</div>
            </div>
          )}
          {followingList.map((f) => {
            const fp = PERSON_TYPES.find((p) => p.id === f.person_type);
            const fc = TYPE_COLORS[f.person_type] ?? TYPE_COLORS.curious;
            return (
              <button
                key={f.id}
                onClick={() => onViewProfile?.(f.id)}
                style={{
                  width: '100%', textAlign: 'left',
                  background: T.white, border: `1px solid ${T.line}`,
                  borderRadius: 14, padding: '14px 16px', marginBottom: 10,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14,
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.gold; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.line; }}
              >
                <Avatar name={f.display_name} avatarConfig={f.avatar_config} photoUrl={f.avatar_url} size={48} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: T.ink, marginBottom: 4 }}>{f.display_name}</div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {fp && (
                      <span style={{
                        background: fc.bg, border: `1px solid ${fc.border}`,
                        color: fc.text, borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 600,
                      }}>
                        {fp.emoji} {fp.label}
                      </span>
                    )}
                    {f.tradition && <span style={{ fontSize: 12, color: T.inkMuted }}>{f.tradition}</span>}
                  </div>
                </div>
                <span style={{ color: T.goldDark, fontSize: 16 }}>→</span>
              </button>
            );
          })}
        </div>
      )}

      </>)}
      </div>{/* /centered column */}
    </div>
  );
}
