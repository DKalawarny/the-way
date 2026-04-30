import { useEffect, useState } from 'react';
import { supabase } from './supabase.js';
import { T, SEMANTIC } from './theme.js';
import { PERSON_TYPES } from './constants.js';
import { Avatar } from './ProfilePage.jsx';

const REACTIONS = [
  { kind: 'resonates', label: 'Love',      emoji: '❤️' },
  { kind: 'amen',      label: 'Amen',       emoji: '🙏' },
  { kind: 'thinking',  label: 'Insightful', emoji: '💡' },
];

const TYPE_COLORS = {
  curious:    { bg: 'rgba(196,129,58,0.12)', border: 'rgba(196,129,58,0.4)', text: '#8a5a1a' },
  seeking:    { bg: 'rgba(74,123,157,0.12)', border: 'rgba(74,123,157,0.4)', text: '#2e6a8e' },
  skeptic:    { bg: 'rgba(100,100,100,0.1)', border: 'rgba(100,100,100,0.3)', text: '#555' },
  'new-faith':{ bg: 'rgba(74,139,90,0.12)', border: 'rgba(74,139,90,0.4)',  text: '#2e7a48' },
};

const AUDIENCE_ICONS = { public: '🌐', friends: '👥', private: '🔒' };

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function ProfilePost({ post, session, onReact }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ background: T.white, borderRadius: 16, border: `1px solid ${T.line}`, marginBottom: 12, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 12, color: T.inkMuted }}>{timeAgo(post.created_at)}</span>
          {post.audience && post.audience !== 'public' && (
            <span style={{ fontSize: 11, color: T.inkMuted }}>{AUDIENCE_ICONS[post.audience]}</span>
          )}
        </div>
        <div style={{ fontFamily: T.serif, fontSize: 16, color: T.ink, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
          {expanded ? post.body : post.body.slice(0, 300) + (post.body.length > 300 ? '…' : '')}
        </div>
        {post.body.length > 300 && (
          <button onClick={() => setExpanded((v) => !v)} style={{ background: 'none', border: 'none', color: T.goldDark, fontSize: 13, cursor: 'pointer', padding: '6px 0 0', display: 'block' }}>
            {expanded ? 'Show less' : 'Read more'}
          </button>
        )}
      </div>
      <div style={{ padding: '8px 18px', borderTop: `1px solid ${T.line}`, display: 'flex', gap: 6, alignItems: 'center' }}>
        {REACTIONS.map((r) => {
          const count = post.reaction_counts?.[r.kind] ?? 0;
          const active = post.my_reaction === r.kind;
          return (
            <button key={r.kind} onClick={() => session && onReact(post.id, r.kind, active)} style={{
              background: active ? 'rgba(196,129,58,0.12)' : 'transparent',
              border: `1px solid ${active ? T.gold : T.line}`,
              borderRadius: 999, padding: '5px 11px', fontSize: 12,
              color: active ? T.goldDark : T.inkMuted, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.15s',
            }}>
              {r.emoji} <span>{r.label}</span>{count > 0 && <span style={{ fontWeight: 700, marginLeft: 2 }}>{count}</span>}
            </button>
          );
        })}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: T.inkMuted }}>💬 {post.reply_count ?? 0}</span>
      </div>
    </div>
  );
}

export default function UserProfile({ userId, session, onClose, onStartChat, onViewProfile }) {
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [stats, setStats] = useState({ posts: 0, following: 0, followers: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  // friendStatus: 'none' | 'pending-sent' | 'pending-received' | 'friends'
  const [friendStatus, setFriendStatus] = useState('none');
  const [friendRequestId, setFriendRequestId] = useState(null);
  const [tab, setTab] = useState('posts');
  const [loading, setLoading] = useState(true);
  const [publicPrayers, setPublicPrayers] = useState([]);
  const [prayedFor, setPrayedFor] = useState(new Set());
  const [prayingFor, setPrayingFor] = useState(false); // "Pray for [name]" button state
  const person = PERSON_TYPES.find((p) => p.id === profile?.person_type);
  const typeColors = TYPE_COLORS[profile?.person_type] ?? TYPE_COLORS.curious;

  useEffect(() => {
    if (!userId) return;
    supabase.from('profiles').select('*').eq('id', userId).single().then(({ data }) => setProfile(data ?? null));
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
    }
    supabase.from('follows').select('following_id').eq('follower_id', userId)
      .then(async ({ data }) => {
        if (!data?.length) return;
        const { data: profiles } = await supabase
          .from('profiles').select('id, display_name, avatar_config, person_type, tradition')
          .in('id', data.map((f) => f.following_id));
        setFollowingList(profiles ?? []);
      });
    loadPosts(userId);
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

  async function loadPosts(uid) {
    setLoading(true);
    const { data } = await supabase.from('posts').select('*, replies(id)').eq('author_id', uid).order('created_at', { ascending: false });
    if (!data) { setLoading(false); return; }
    const { data: reactions } = await supabase.from('reactions').select('post_id, kind, author_id').in('post_id', data.map((p) => p.id));
    setPosts(data.map((p) => {
      const pr = reactions?.filter((r) => r.post_id === p.id) ?? [];
      const counts = {};
      pr.forEach((r) => { counts[r.kind] = (counts[r.kind] ?? 0) + 1; });
      return { ...p, reaction_counts: counts, my_reaction: pr.find((r) => r.author_id === session?.user?.id)?.kind ?? null, reply_count: p.replies?.length ?? 0 };
    }));
    setLoading(false);
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

  async function handleReact(postId, kind, isActive) {
    if (!session) return;
    if (isActive) { await supabase.from('reactions').delete().eq('post_id', postId).eq('author_id', session.user.id); }
    else { await supabase.from('reactions').upsert({ post_id: postId, author_id: session.user.id, kind }, { onConflict: 'post_id,author_id' }); }
    loadPosts(userId);
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

  const firstName = profile?.display_name?.split(' ')[0] ?? 'them';
  const canSendFriendReq = profile?.allow_friend_requests !== false;

  return (
    <div className="scene" style={{ position: 'fixed', inset: 0, zIndex: 200, overflowY: 'auto', paddingBottom: 80 }}>

      {/* Sticky header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10, height: 52,
        padding: '0 12px', background: T.white, borderBottom: `1px solid ${T.line}`,
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
          <span style={{ fontSize: 11, color: T.goldDark, background: 'rgba(196,129,58,0.1)', borderRadius: 999, padding: '4px 10px', fontWeight: 600 }}>👥 Friends</span>
        ) : (
          <div style={{ width: 36 }} />
        )}
      </div>

      {/* Hero cover — warm parchment-to-gold band */}
      <div style={{ background: T.white, marginBottom: 10 }}>
        <div style={{
          height: 108,
          background: `linear-gradient(135deg, ${T.parchment} 0%, ${T.parchmentDark} 45%, rgba(216,155,82,0.55) 100%)`,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'radial-gradient(circle, rgba(196,129,58,0.18) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
            maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, #000 30%, transparent 75%)',
          }} />
        </div>

        <div style={{ padding: '0 20px 22px' }}>
          {/* Avatar + action buttons row */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: -50, marginBottom: 16 }}>
            <div style={{
              borderRadius: '50%', padding: 4,
              background: `linear-gradient(135deg, ${T.gold}, #e8a050, ${T.gold})`,
              display: 'inline-block',
              boxShadow: '0 4px 20px rgba(196,129,58,0.35)',
            }}>
              <Avatar
                name={profile?.display_name}
                avatarConfig={profile?.avatar_config}
                size={84}
                style={{ border: `3px solid ${T.white}`, display: 'block' }}
              />
            </div>

            {session && session.user.id !== userId && (
              <div style={{ display: 'flex', gap: 6, paddingBottom: 4, alignItems: 'center' }}>
                {/* Friend request — primary action */}
                {canSendFriendReq && friendStatus === 'none' && (
                  <button onClick={sendFriendRequest} style={{
                    background: T.gold, color: T.cream,
                    border: 'none', borderRadius: 999,
                    padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}>
                    + Friend
                  </button>
                )}
                {friendStatus === 'pending-sent' && (
                  <button onClick={cancelFriendRequest} style={{
                    background: T.white, color: T.inkMuted,
                    border: `1.5px solid ${T.line}`, borderRadius: 999,
                    padding: '8px 14px', fontSize: 13, cursor: 'pointer',
                  }}>
                    Requested ×
                  </button>
                )}
                {friendStatus === 'pending-received' && (
                  <>
                    <button onClick={() => respondToRequest(true)} style={{
                      background: T.gold, color: T.cream, border: 'none',
                      borderRadius: 999, padding: '8px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}>Accept</button>
                    <button onClick={() => respondToRequest(false)} style={{
                      background: T.white, color: T.inkMuted, border: `1.5px solid ${T.line}`,
                      borderRadius: 999, padding: '8px 10px', fontSize: 13, cursor: 'pointer',
                    }}>✕</button>
                  </>
                )}

                {/* Follow — secondary */}
                {profile?.allow_follows !== false && friendStatus !== 'pending-received' && (
                  <button onClick={handleFollow} style={{
                    background: isFollowing ? T.white : 'transparent',
                    color: isFollowing ? T.inkMuted : T.ink,
                    border: `1.5px solid ${isFollowing ? T.line : T.ink}`,
                    borderRadius: 999, padding: '8px 14px',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}>
                    {isFollowing ? '✓ Following' : 'Follow'}
                  </button>
                )}

                {/* Pray-for — icon-only ghost button, sage when active */}
                <button
                  onClick={addToPrayerList}
                  disabled={prayingFor}
                  title={prayingFor ? 'On your prayer list' : `Pray for ${profile?.display_name?.split(' ')[0] ?? 'them'}`}
                  style={{
                    background: prayingFor ? SEMANTIC.prayer.bgActive : 'transparent',
                    border: `1.5px solid ${prayingFor ? SEMANTIC.prayer.line : T.line}`,
                    borderRadius: '50%', width: 36, height: 36,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, cursor: prayingFor ? 'default' : 'pointer',
                    transition: 'all 0.15s', flexShrink: 0,
                  }}
                >🙏</button>
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
              background: 'rgba(196,129,58,0.05)',
              borderLeft: `3px solid ${T.gold}`,
              borderRadius: '0 10px 10px 0',
            }}>
              "{profile.what_brought}"
            </div>
          )}

          {/* Stats */}
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
        </div>
      </div>

      {/* AI Chat CTA */}
      {onStartChat && (
        <div style={{ padding: '0 14px 14px' }}>
          <button
            onClick={() => onStartChat(`I've been reading ${profile?.display_name ?? 'someone'}'s posts about their faith journey. Help me understand their perspective — what questions should I ask or explore?`)}
            style={{
              width: '100%',
              background: `linear-gradient(135deg, ${T.gold} 0%, #c47020 100%)`,
              color: T.cream, border: 'none', borderRadius: 14,
              padding: '16px 20px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 14,
              boxShadow: '0 4px 20px rgba(196,129,58,0.4)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(196,129,58,0.55)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(196,129,58,0.4)'; }}
          >
            <div style={{
              width: 42, height: 42, borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, flexShrink: 0,
            }}>✦</div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>Discuss {firstName}'s journey</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.4 }}>Ask AI to help you explore their perspective</div>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: 18, opacity: 0.7 }}>→</div>
          </button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ background: T.white, display: 'flex', borderBottom: `1px solid ${T.line}`, marginBottom: 12 }}>
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

      {/* Posts tab */}
      {tab === 'posts' && (
        <div style={{ padding: '0 14px' }}>
          {loading && <div style={{ textAlign: 'center', padding: 40, color: T.inkMuted, fontFamily: T.serif }}>Loading…</div>}
          {!loading && posts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', background: T.white, borderRadius: 16, border: `1px solid ${T.line}` }}>
              <div style={{ fontFamily: T.display, fontSize: 22, fontWeight: 600, color: T.ink, letterSpacing: '-0.015em', lineHeight: 1.15 }}>Nothing shared yet.</div>
            </div>
          )}
          {posts.map((p) => <ProfilePost key={p.id} post={p} session={session} onReact={handleReact} />)}
        </div>
      )}

      {/* Prayers tab */}
      {tab === 'prayers' && (
        <div style={{ padding: '0 14px' }}>
          {publicPrayers.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 20px', background: T.white, borderRadius: 16, border: `1px solid ${T.line}` }}>
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
                borderRadius: 16, padding: '18px 20px', marginBottom: 10,
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
                      background: hasPrayed ? 'rgba(196,129,58,0.08)' : 'transparent',
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
        <div style={{ padding: '0 14px' }}>
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
                <Avatar name={f.display_name} avatarConfig={f.avatar_config} size={48} />
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
    </div>
  );
}
