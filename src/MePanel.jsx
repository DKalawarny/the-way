import { useEffect, useState } from 'react';
import { supabase } from './supabase.js';
import { T, SEMANTIC } from './theme.js';
import { PERSON_TYPES } from './constants.js';
import { Avatar } from './ProfilePage.jsx';
import AvatarPicker from './AvatarPicker.jsx';
// Shared with UserProfile — same constants, same helpers, same church card.
// PRAYER_REACTIONS stays local because it's only used here (the prayer tab).
import { REACTIONS, TYPE_COLORS, timeAgo, loadChurchContext, ChurchAttendsCard } from './profileShared.jsx';

const PRAYER_REACTIONS = [
  { kind: 'praying',  emoji: '🙏', label: 'Praying',  semantic: 'prayer'     },
  { kind: 'love',     emoji: '❤️', label: 'Love'     },
  { kind: 'amen',     emoji: '🔥', label: 'Amen'     },
  { kind: 'hope',     emoji: '✨', label: 'Hope'     },
  { kind: 'strength', emoji: '💪', label: 'Strength' },
];

function ProfilePost({ post, session, profile, onReact, churchCtx }) {
  const [expanded,     setExpanded]     = useState(false);
  const [sheetOpen,    setSheetOpen]    = useState(false);
  const [replies,      setReplies]      = useState(null);
  const [replyInput,   setReplyInput]   = useState('');
  const [replyLoading, setReplyLoading] = useState(false);

  const replyCount = replies ? replies.length : (post.reply_count ?? 0);

  async function openSheet() {
    setSheetOpen(true);
    if (replies === null) {
      setReplyLoading(true);
      // post_comments is the privacy-gated canonical table (see
      // scripts/2026-05-01-private-comments.sql). RLS limits reads to the
      // post's church family, so callers outside that boundary see [].
      const { data } = await supabase
        .from('post_comments')
        .select('*, profiles(display_name, avatar_config)')
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });
      setReplies(data ?? []);
      setReplyLoading(false);
    }
  }

  async function submitReply() {
    if (!replyInput.trim() || !session?.user?.id) return;
    const { data } = await supabase
      .from('post_comments')
      .insert({ post_id: post.id, author_id: session.user.id, body: replyInput.trim() })
      .select('*, profiles(display_name, avatar_config)')
      .single();
    if (data) { setReplies(prev => [...(prev ?? []), data]); setReplyInput(''); }
  }

  return (
    <>
      <div style={{ background: T.white, borderRadius: 16, border: `1px solid ${T.line}`, marginBottom: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px' }}>
          <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 10 }}>{timeAgo(post.created_at)}</div>
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
          <button onClick={openSheet} style={{
            marginLeft: 'auto', background: 'none', border: 'none',
            fontSize: 12, color: T.inkMuted, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            💬 {replyCount > 0 ? replyCount : ''}
          </button>
        </div>
      </div>

      {/* Facebook-style centered post dialog */}
      {sheetOpen && (
        <div
          onClick={() => setSheetOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: T.white, borderRadius: 10,
              width: 'min(660px, 96vw)', height: '85vh',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 8px 48px rgba(0,0,0,0.3)',
              animation: 'fadeIn 0.18s ease',
            }}
          >
            {/* Header */}
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0 }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: T.ink }}>
                {profile?.display_name ? `${profile.display_name}'s Post` : 'Your Post'}
              </span>
              <button onClick={() => setSheetOpen(false)} style={{
                position: 'absolute', right: 14,
                width: 34, height: 34, borderRadius: '50%', background: T.parchment,
                border: 'none', cursor: 'pointer', fontSize: 20, color: T.inkMuted,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>×</button>
            </div>

            {/* Scrollable post + comments */}
            <div className="scroll" style={{ flex: 1, overflowY: 'auto' }}>
              {/* Post author + full body */}
              <div style={{ padding: '16px 18px' }}>
                <div style={{ display: 'flex', gap: 11, alignItems: 'center', marginBottom: 12 }}>
                  <Avatar name={profile?.display_name} avatarConfig={profile?.avatar_config} size={42} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: T.ink }}>{profile?.display_name ?? 'You'}</div>
                    <div style={{ fontSize: 12, color: T.inkMuted }}>{timeAgo(post.created_at)}</div>
                  </div>
                </div>
                <div style={{ fontFamily: T.serif, fontSize: 16, color: T.ink, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
                  {post.body}
                </div>
              </div>

              {/* Reaction counts */}
              {replyCount > 0 && (
                <div style={{ padding: '8px 18px', borderTop: `1px solid ${T.line}`, borderBottom: `1px solid ${T.line}`, fontSize: 13, color: T.inkMuted }}>
                  {replyCount} comment{replyCount !== 1 ? 's' : ''}
                </div>
              )}

              {/* Action bar */}
              <div style={{ display: 'flex', borderBottom: `1px solid ${T.line}` }}>
                {REACTIONS.map((r, i) => {
                  const active = post.my_reaction === r.kind;
                  return (
                    <button key={r.kind} onClick={() => session && onReact(post.id, r.kind, active)} style={{
                      flex: 1, padding: '10px 4px', background: 'none',
                      border: 'none', borderRight: i < REACTIONS.length - 1 ? `1px solid ${T.line}` : 'none',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      fontSize: 14, fontWeight: 600, color: active ? T.goldDark : T.inkSoft,
                    }}>
                      {r.emoji} {r.label}
                    </button>
                  );
                })}
              </div>

              {/* Comments */}
              <div style={{ padding: '14px 18px' }}>
                {replyLoading ? (
                  <div style={{ color: T.inkMuted, fontSize: 14, textAlign: 'center', padding: '20px 0' }}>Loading…</div>
                ) : (replies ?? []).length === 0 ? (
                  <div style={{ color: T.inkMuted, fontStyle: 'italic', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>
                    No comments yet — be the first.
                  </div>
                ) : (
                  (replies ?? []).map(reply => (
                    <div key={reply.id} style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'flex-start' }}>
                      <Avatar name={reply.profiles?.display_name} avatarConfig={reply.profiles?.avatar_config} size={34} style={{ flexShrink: 0 }} />
                      <div>
                        <div style={{ background: T.parchment, borderRadius: 16, padding: '9px 13px' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 2 }}>{reply.profiles?.display_name ?? 'Someone'}</div>
                          <div style={{ fontFamily: T.serif, fontSize: 14, color: T.inkSoft, lineHeight: 1.55 }}>{reply.body}</div>
                        </div>
                        <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 4, paddingLeft: 10 }}>{reply.created_at ? timeAgo(reply.created_at) : ''}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Pinned comment input */}
            <div style={{ borderTop: `1px solid ${T.line}`, padding: '12px 18px 16px', flexShrink: 0, background: T.white }}>
              {/* Privacy hint — matches the composer's tone (search MePanel
                  for "Visible to" near submitPost). Reads from RLS context:
                  comments are post_comments rows, and the table's RLS only
                  permits inserts/reads inside the parent post's church
                  family — see scripts/2026-05-01-private-comments.sql. */}
              <div style={{ fontSize: 11, color: T.inkMuted, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                {churchCtx?.church
                  ? <>👥 Visible to {churchCtx.church.name} family</>
                  : <>🔒 Visible only to you (join a church to share)</>}
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <Avatar name={profile?.display_name} avatarConfig={profile?.avatar_config} size={36} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, background: T.parchment, borderRadius: 22, border: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', padding: '10px 16px', gap: 8 }}>
                  <input
                    value={replyInput}
                    onChange={(e) => setReplyInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitReply(); } }}
                    placeholder="Write a comment…"
                    autoFocus
                    style={{ flex: 1, border: 'none', outline: 'none', fontFamily: T.serif, fontSize: 14, color: T.ink, background: 'transparent' }}
                  />
                  {replyInput.trim() && (
                    <button onClick={submitReply} style={{
                      background: T.gold, border: 'none', borderRadius: '50%',
                      width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: T.cream, fontSize: 14, cursor: 'pointer', flexShrink: 0,
                    }}>↑</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function MePanel({ session, profile, onClose, onEditProfile, onSignOut, onDeleteAccount, onOpenBoard, onOpenHistory, onProfileUpdate, onOpenChat, onViewProfile, onFindPeople, onInviteFriends, onFindChurches, onApplyAsPastor, onOpenPastorAdminQueue, onOpenChurch, onOpenSermon, onOpenWalks, onOpenTalkToSomeone, onOpenCareInbox, onOpenPastorDashboard, hasCareTeamRole, hasPastoredChurch }) {
  const [posts, setPosts] = useState([]);
  const [stats, setStats] = useState({ posts: 0, following: 0, followers: 0 });
  const [followingList, setFollowingList] = useState([]);
  const [friendsList, setFriendsList] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]); // incoming pending
  const [tab, setTab] = useState('posts');
  const [loading, setLoading] = useState(true);
  const [pickingAvatar, setPickingAvatar] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [composeActive, setComposeActive] = useState(false);
  const [composeBody, setComposeBody] = useState('');
  const [composeSubmitting, setComposeSubmitting] = useState(false);
  const [prayers, setPrayers] = useState([]);
  const [prayerText, setPrayerText] = useState('');
  const [prayerSubmitting, setPrayerSubmitting] = useState(false);
  const [prayersLoaded, setPrayersLoaded] = useState(false);
  const [newPrayerIsPublic, setNewPrayerIsPublic] = useState(true);
  const [praiseTarget,      setPraiseTarget]      = useState(null);
  const [praiseText,        setPraiseText]        = useState('');
  const [supportMap,        setSupportMap]        = useState({});   // { prayerId: count }
  const [expandedEnc,       setExpandedEnc]       = useState(new Set());
  const [encMap,            setEncMap]            = useState({});
  const [encInputMap,       setEncInputMap]       = useState({});   // { prayerId: draftText }
  const [encCountMap,       setEncCountMap]       = useState({});   // { prayerId: count }
  const [reactionMap,       setReactionMap]       = useState({});   // { prayerId: { kind: count } }
  const [myReactionMap,     setMyReactionMap]     = useState({});   // { prayerId: kind | null }
  const [menuPrayerId,      setMenuPrayerId]      = useState(null); // which card's ⋯ menu is open
  const [settingsOpen,      setSettingsOpen]      = useState(false);
  // Your church + this week's sermon, for the ChurchAttendsCard above the
  // tabs. Same shape as UserProfile — see profileShared.jsx#loadChurchContext.
  const [churchCtx, setChurchCtx] = useState({ church: null, sermon: null, memberCount: 0 });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ctx = await loadChurchContext(profile?.church_id);
      if (!cancelled) setChurchCtx(ctx);
    })();
    return () => { cancelled = true; };
  }, [profile?.church_id]);

  async function submitPost() {
    if (!composeBody.trim() || !session || composeSubmitting) return;
    setComposeSubmitting(true);
    // scope='me' + kind='text' are required by the posts table NOT NULL
    // constraints (added in the unified-feed migration). Privacy is enforced
    // by the RLS policy "Same-church members read me-scope posts".
    const { data, error } = await supabase.from('posts').insert({
      author_id: session.user.id,
      scope: 'me',
      kind: 'text',
      body: composeBody.trim(),
      person_type: profile?.person_type ?? null,
    }).select('*, profiles(display_name, city, country, tradition, person_type, avatar_config), post_comments(id)').single();
    setComposeSubmitting(false);
    if (error) { console.error('Post failed:', error.message); return; }
    if (data) {
      setPosts((prev) => [{ ...data, reaction_counts: {}, my_reaction: null, reply_count: 0 }, ...prev]);
      setComposeBody('');
      setComposeActive(false);
    }
  }
  async function loadPrayers() {
    if (prayersLoaded || !session?.user?.id) return;
    const { data } = await supabase.from('personal_prayers')
      .select('*').eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    setPrayers(data ?? []);
    setPrayersLoaded(true);
    const ids = (data ?? []).map(p => p.id);
    if (!ids.length) return;

    // Community "praying" support counts (for public prayers)
    const pubIds = (data ?? []).filter(p => p.is_public).map(p => p.id);
    if (pubIds.length > 0) {
      const { data: sd } = await supabase.from('personal_prayer_support')
        .select('prayer_id').in('prayer_id', pubIds);
      const counts = {};
      for (const r of sd ?? []) counts[r.prayer_id] = (counts[r.prayer_id] ?? 0) + 1;
      setSupportMap(counts);
    }

    // Reaction counts + my reactions
    const { data: rd } = await supabase.from('personal_prayer_reactions')
      .select('prayer_id, kind, user_id').in('prayer_id', ids);
    const rMap = {}, myRMap = {};
    for (const r of rd ?? []) {
      if (!rMap[r.prayer_id]) rMap[r.prayer_id] = {};
      rMap[r.prayer_id][r.kind] = (rMap[r.prayer_id][r.kind] ?? 0) + 1;
      if (r.user_id === session.user.id) myRMap[r.prayer_id] = r.kind;
    }
    setReactionMap(rMap);
    setMyReactionMap(myRMap);

    // Encouragement counts
    const { data: ed } = await supabase.from('personal_prayer_encouragements')
      .select('prayer_id').in('prayer_id', ids);
    const eCounts = {};
    for (const r of ed ?? []) eCounts[r.prayer_id] = (eCounts[r.prayer_id] ?? 0) + 1;
    setEncCountMap(eCounts);
  }

  async function toggleMePanelEnc(prayerId) {
    if (expandedEnc.has(prayerId)) {
      setExpandedEnc(prev => { const s = new Set(prev); s.delete(prayerId); return s; });
      return;
    }
    const { data } = await supabase
      .from('personal_prayer_encouragements')
      .select('*, profiles(display_name)')
      .eq('prayer_id', prayerId)
      .order('created_at', { ascending: true });
    setEncMap(prev => ({ ...prev, [prayerId]: data ?? [] }));
    setExpandedEnc(prev => new Set([...prev, prayerId]));
  }

  async function handlePrayerReact(prayerId, kind, isActive) {
    if (!session?.user?.id) return;
    if (isActive) {
      await supabase.from('personal_prayer_reactions')
        .delete().eq('prayer_id', prayerId).eq('user_id', session.user.id);
      setMyReactionMap(prev => ({ ...prev, [prayerId]: null }));
      setReactionMap(prev => {
        const updated = { ...(prev[prayerId] ?? {}) };
        updated[kind] = Math.max(0, (updated[kind] ?? 1) - 1);
        return { ...prev, [prayerId]: updated };
      });
    } else {
      const prevKind = myReactionMap[prayerId];
      await supabase.from('personal_prayer_reactions')
        .upsert({ prayer_id: prayerId, user_id: session.user.id, kind }, { onConflict: 'prayer_id,user_id' });
      setMyReactionMap(prev => ({ ...prev, [prayerId]: kind }));
      setReactionMap(prev => {
        const updated = { ...(prev[prayerId] ?? {}) };
        if (prevKind) updated[prevKind] = Math.max(0, (updated[prevKind] ?? 1) - 1);
        updated[kind] = (updated[kind] ?? 0) + 1;
        return { ...prev, [prayerId]: updated };
      });
    }
  }

  async function submitMePanelEnc(prayerId) {
    const text = (encInputMap[prayerId] ?? '').trim();
    if (!text || !session?.user?.id) return;
    const { data } = await supabase
      .from('personal_prayer_encouragements')
      .insert({ prayer_id: prayerId, user_id: session.user.id, body: text })
      .select('*, profiles(display_name)')
      .single();
    if (data) {
      setEncMap(prev => ({ ...prev, [prayerId]: [...(prev[prayerId] ?? []), data] }));
      setEncCountMap(prev => ({ ...prev, [prayerId]: (prev[prayerId] ?? 0) + 1 }));
      setEncInputMap(prev => ({ ...prev, [prayerId]: '' }));
    }
  }

  async function addPrayer(e) {
    e.preventDefault();
    if (!prayerText.trim() || prayerSubmitting) return;
    setPrayerSubmitting(true);
    const { data } = await supabase.from('personal_prayers').insert({
      user_id: session.user.id, body: prayerText.trim(), is_public: newPrayerIsPublic,
    }).select().single();
    setPrayerSubmitting(false);
    if (data) { setPrayers((prev) => [data, ...prev]); setPrayerText(''); setNewPrayerIsPublic(true); }
  }

  async function togglePrayerPublic(p) {
    const is_public = !p.is_public;
    await supabase.from('personal_prayers').update({ is_public }).eq('id', p.id);
    setPrayers((prev) => prev.map((x) => x.id === p.id ? { ...x, is_public } : x));
  }

  function handlePrayerAnswerButton(p) {
    if (p.is_answered) {
      applyPrayerAnswered(p, false, null);
    } else {
      setPraiseTarget(p);
      setPraiseText('');
    }
  }

  async function applyPrayerAnswered(p, answered, report) {
    const updates = {
      is_answered: answered,
      answered_at: answered ? new Date().toISOString() : null,
      praise_report: answered ? (report?.trim() || null) : null,
    };
    await supabase.from('personal_prayers').update(updates).eq('id', p.id);
    setPrayers((prev) => prev.map((x) => x.id === p.id ? { ...x, ...updates } : x));
    setPraiseTarget(null);
    setPraiseText('');
  }

  async function removePrayer(id) {
    await supabase.from('personal_prayers').delete().eq('id', id);
    setPrayers((prev) => prev.filter((x) => x.id !== id));
  }

  const person = PERSON_TYPES.find((p) => p.id === profile?.person_type);
  const typeColors = TYPE_COLORS[profile?.person_type] ?? TYPE_COLORS.curious;

  useEffect(() => {
    if (!session?.user?.id) return;
    const uid = session.user.id;
    Promise.all([
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('author_id', uid),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', uid),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', uid),
    ]).then(([{ count: p }, { count: ing }, { count: ers }]) => {
      setStats({ posts: p ?? 0, following: ing ?? 0, followers: ers ?? 0 });
    });
    supabase.from('follows').select('following_id').eq('follower_id', uid)
      .then(async ({ data }) => {
        if (!data?.length) return;
        const { data: profiles } = await supabase
          .from('profiles').select('id, display_name, avatar_config, person_type, tradition')
          .in('id', data.map((f) => f.following_id));
        setFollowingList(profiles ?? []);
      });
    loadFriends(uid);
    loadPosts(uid);
  }, [session]);

  async function loadFriends(uid) {
    const { data } = await supabase
      .from('friend_requests')
      .select('id, sender_id, receiver_id, status')
      .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`);
    if (!data?.length) return;

    const accepted = data.filter((r) => r.status === 'accepted');
    const pending = data.filter((r) => r.status === 'pending' && r.receiver_id === uid);

    const friendIds = accepted.map((r) => r.sender_id === uid ? r.receiver_id : r.sender_id);
    const pendingIds = pending.map((r) => ({ reqId: r.id, senderId: r.sender_id }));

    if (friendIds.length) {
      const { data: fp } = await supabase.from('profiles')
        .select('id, display_name, avatar_config, person_type, tradition')
        .in('id', friendIds);
      setFriendsList(fp ?? []);
    }
    if (pendingIds.length) {
      const { data: pp } = await supabase.from('profiles')
        .select('id, display_name, avatar_config, person_type, tradition')
        .in('id', pendingIds.map((p) => p.senderId));
      setPendingRequests((pp ?? []).map((p) => ({
        ...p, reqId: pendingIds.find((r) => r.senderId === p.id)?.reqId,
      })));
    }
  }

  async function acceptFriend(reqId, senderId) {
    await supabase.from('friend_requests').update({ status: 'accepted' }).eq('id', reqId);
    const { data } = await supabase.from('profiles').select('id, display_name, avatar_config, person_type, tradition').eq('id', senderId).single();
    if (data) setFriendsList((prev) => [...prev, data]);
    setPendingRequests((prev) => prev.filter((r) => r.reqId !== reqId));
  }

  async function declineFriend(reqId) {
    await supabase.from('friend_requests').update({ status: 'declined' }).eq('id', reqId);
    setPendingRequests((prev) => prev.filter((r) => r.reqId !== reqId));
  }

  async function unfriend(friendId) {
    const uid = session.user.id;
    await supabase.from('friend_requests')
      .delete()
      .or(`and(sender_id.eq.${uid},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${uid})`);
    setFriendsList((prev) => prev.filter((f) => f.id !== friendId));
  }

  async function loadPosts(uid) {
    setLoading(true);
    const { data } = await supabase.from('posts').select('*, post_comments(id)').eq('author_id', uid).order('created_at', { ascending: false });
    if (!data) { setLoading(false); return; }
    const { data: reactions } = await supabase.from('reactions').select('post_id, kind, author_id').in('post_id', data.map((p) => p.id));
    setPosts(data.map((p) => {
      const pr = reactions?.filter((r) => r.post_id === p.id) ?? [];
      const counts = {};
      pr.forEach((r) => { counts[r.kind] = (counts[r.kind] ?? 0) + 1; });
      return { ...p, reaction_counts: counts, my_reaction: pr.find((r) => r.author_id === session.user.id)?.kind ?? null, reply_count: p.post_comments?.length ?? 0 };
    }));
    setLoading(false);
  }

  async function handleReact(postId, kind, isActive) {
    if (!session) return;
    if (isActive) { await supabase.from('reactions').delete().eq('post_id', postId).eq('author_id', session.user.id); }
    else { await supabase.from('reactions').upsert({ post_id: postId, author_id: session.user.id, kind }, { onConflict: 'post_id,author_id' }); }
    loadPosts(session.user.id);
  }

  async function saveAvatar(config) {
    const { error } = await supabase.from('profiles').update({ avatar_config: config }).eq('id', session.user.id);
    if (!error) { setPickingAvatar(false); onProfileUpdate?.({ ...profile, avatar_config: config }); }
  }

  return (
    <>
      {pickingAvatar && <AvatarPicker current={profile?.avatar_config} onSave={saveAvatar} onCancel={() => setPickingAvatar(false)} />}

      {settingsOpen && (
        <div
          onClick={() => setSettingsOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(44,24,16,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 305, padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: T.cream, borderRadius: 18, maxWidth: 420, width: '100%',
              border: `1px solid ${T.line}`, overflow: 'hidden',
            }}
          >
            <div style={{ padding: '20px 24px 12px', borderBottom: `1px solid ${T.line}` }}>
              <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: T.goldDark, marginBottom: 4 }}>
                Account
              </div>
              <div style={{ fontFamily: T.display, fontSize: 22, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em' }}>
                Settings
              </div>
            </div>
            {[
              { label: '◎  Edit profile',  onClick: () => { setSettingsOpen(false); onEditProfile(); } },
              { label: 'Sign out',          onClick: () => { setSettingsOpen(false); onSignOut(); }, danger: true },
              ...(onDeleteAccount ? [{ label: 'Delete account', onClick: () => { setSettingsOpen(false); onDeleteAccount(); }, danger: true }] : []),
            ].map((item, i, arr) => (
              <button
                key={item.label}
                onClick={item.onClick}
                style={{
                  width: '100%', textAlign: 'left', background: 'none', border: 'none',
                  padding: '16px 24px', fontSize: 15,
                  color: item.danger ? '#c0392b' : T.ink, cursor: 'pointer',
                  borderBottom: i < arr.length - 1 ? `1px solid ${T.line}` : 'none',
                  fontFamily: 'inherit',
                }}
              >
                {item.label}
              </button>
            ))}
            <button
              onClick={() => setSettingsOpen(false)}
              style={{
                width: '100%', textAlign: 'center', background: T.parchment, border: 'none',
                padding: '14px 24px', fontSize: 14, color: T.inkMuted, cursor: 'pointer',
                borderTop: `1px solid ${T.line}`, fontFamily: 'inherit',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}


      {menuOpen && (
        <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 299 }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            position: 'absolute', top: 56, right: 12,
            background: T.white, borderRadius: 14, border: `1px solid ${T.line}`,
            boxShadow: '0 8px 32px rgba(0,0,0,0.14)', overflow: 'hidden', minWidth: 200, zIndex: 300,
          }}>
            {[
              { label: '⊞  Your board',        onClick: () => { setMenuOpen(false); onOpenBoard(); } },
              { label: '◷  Chat history',       onClick: () => { setMenuOpen(false); onOpenHistory(); } },
              ...(onOpenWalks ? [{ label: '✶  Journeys',  onClick: () => { setMenuOpen(false); onOpenWalks(); } }] : []),
              ...(onInviteFriends ? [{ label: '↗  Invite friends',  onClick: () => { setMenuOpen(false); onInviteFriends(); } }] : []),
              ...(profile?.church_id && onOpenChurch ? [{ label: '⛪  My church',     onClick: () => { setMenuOpen(false); onOpenChurch(profile.church_id); } }] : []),
              ...(profile?.church_id && onOpenTalkToSomeone ? [{ label: '☎  Ask someone',  onClick: () => { setMenuOpen(false); onOpenTalkToSomeone(); } }] : []),
              ...(hasCareTeamRole && onOpenCareInbox ? [{ label: '✉  Conversations',  onClick: () => { setMenuOpen(false); onOpenCareInbox(); } }] : []),
              ...(hasPastoredChurch && onOpenPastorDashboard ? [{ label: '⛪  Manage your church',  onClick: () => { setMenuOpen(false); onOpenPastorDashboard(); } }] : []),
              ...(onFindChurches ? [{ label: '🔍  Find a church',     onClick: () => { setMenuOpen(false); onFindChurches(); } }] : []),
              ...(onApplyAsPastor && !profile?.is_pastor ? [{ label: '✦  Apply as a pastor', onClick: () => { setMenuOpen(false); onApplyAsPastor(); } }] : []),
              ...(onOpenPastorAdminQueue ? [{ label: '🛡  Pastor applications (admin)', onClick: () => { setMenuOpen(false); onOpenPastorAdminQueue(); } }] : []),
              { label: '⚙  Settings',           onClick: () => { setMenuOpen(false); setSettingsOpen(true); } },
            ].map((item, i, arr) => (
              <button key={item.label} onClick={item.onClick} style={{
                width: '100%', textAlign: 'left', background: 'none', border: 'none',
                padding: '13px 18px', fontSize: 14,
                color: item.danger ? '#c0392b' : T.ink, cursor: 'pointer',
                borderBottom: i < arr.length - 1 ? `1px solid ${T.line}` : 'none',
              }}>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="scene" style={{ minHeight: '100vh', paddingBottom: 80 }}>

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
          <div className="editorial-h2" style={{
            flex: 1, textAlign: 'center',
            fontSize: 16,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {profile?.display_name ?? 'Profile'}
          </div>
          <button onClick={() => setMenuOpen((v) => !v)} style={{
            background: 'none', border: 'none', color: T.inkMuted,
            fontSize: 22, cursor: 'pointer', width: 36, height: 36, borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1, transition: 'background 0.15s',
          }}
            onMouseEnter={(e) => (e.currentTarget.style.background = T.parchment)}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            aria-label="Menu"
          >⋮</button>
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
            {/* Avatar row */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: -50, marginBottom: 16 }}>
              <div style={{ position: 'relative' }}>
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
                <button onClick={() => setPickingAvatar(true)} style={{
                  position: 'absolute', bottom: 4, right: 4,
                  width: 26, height: 26, borderRadius: '50%',
                  background: T.ink, color: T.cream, border: `2px solid ${T.white}`,
                  fontSize: 10, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }} title="Change photo">✏</button>
              </div>

              <div style={{ display: 'flex', gap: 8, paddingBottom: 4 }}>
                <button onClick={onEditProfile} style={{
                  background: T.white, color: T.ink,
                  border: `1.5px solid ${T.ink}`,
                  borderRadius: 999, padding: '8px 18px',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>Edit profile</button>
              </div>
            </div>

            {/* Name + person type badge */}
            <div style={{ marginBottom: 10 }}>
              <div className="editorial-h1" style={{ fontSize: 28, marginBottom: 8 }}>
                {profile?.display_name ?? 'You'}
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
                {profile?.tradition && (
                  <span style={{ fontSize: 13, color: T.inkMuted }}>· {profile.tradition}</span>
                )}
                {(profile?.city || profile?.country) && (
                  <span style={{ fontSize: 13, color: T.inkMuted }}>· 📍 {[profile.city, profile.country].filter(Boolean).join(', ')}</span>
                )}
              </div>
            </div>

            {/* Bio / description */}
            {profile?.what_brought ? (
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
            ) : (
              <button onClick={onEditProfile} style={{
                background: 'none', border: `1px dashed ${T.line}`,
                borderRadius: 10, padding: '10px 14px', width: '100%', textAlign: 'left',
                color: T.inkMuted, fontSize: 14, cursor: 'pointer', marginBottom: 16,
              }}>
                + Add a bio
              </button>
            )}

            {/* Stats */}
            <div style={{ display: 'flex', gap: 24, paddingTop: 14, borderTop: `1px solid ${T.line}` }}>
              {[
                { value: stats.posts, label: 'Posts' },
                { value: stats.following, label: 'Following' },
                { value: stats.followers, label: 'Followers' },
              ].map((s) => (
                <div key={s.label} style={{ cursor: 'default' }}>
                  <span className="editorial-h2" style={{ fontSize: 20, marginRight: 5 }}>{s.value}</span>
                  <span style={{ fontSize: 11, color: T.inkMuted, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase' }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Chat CTA — slim pill */}
        {onOpenChat && (
          <div style={{ padding: '0 14px 12px' }}>
            <button
              onClick={() => onOpenChat('Take me deeper into what I\'ve been exploring. What do you think my next step should be?')}
              className="lift"
              style={{
                width: '100%', background: T.white,
                color: T.ink, border: `1px solid ${T.line}`, borderRadius: 999,
                padding: '8px 14px 8px 8px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 10,
                textAlign: 'left',
              }}
            >
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: `linear-gradient(135deg, ${T.gold}, #e8a050)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, color: T.cream, flexShrink: 0,
              }}>✦</div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: T.ink }}>Continue with AI</div>
              <div style={{ marginLeft: 'auto', fontSize: 14, color: T.goldDark }}>→</div>
            </button>
          </div>
        )}

        {/* Your church — same component UserProfile uses on others' pages.
            Renders nothing if you haven't joined a church yet. Self-mode shows
            "Your church" instead of "Danny attends" and points the top row at
            your existing onOpenChurch handler. */}
        <div style={{ padding: '0 14px' }}>
          <ChurchAttendsCard
            isSelf={true}
            church={churchCtx.church}
            sermon={churchCtx.sermon}
            memberCount={churchCtx.memberCount}
            onOpenChurch={onOpenChurch}
            onOpenSermon={onOpenSermon}
          />
        </div>

        {/* Tabs */}
        <div style={{ background: T.white, display: 'flex', borderBottom: `1px solid ${T.line}`, marginBottom: 12 }}>
          {[
            { id: 'posts',     label: `Posts (${stats.posts})` },
            { id: 'prayers',   label: 'Prayers' },
            { id: 'friends',   label: `Friends${pendingRequests.length ? ` · ${pendingRequests.length} 🔴` : ` (${friendsList.length})`}` },
            { id: 'following', label: `Following (${stats.following})` },
            { id: 'about',     label: 'About' },
          ].map((t) => (
            <button key={t.id} onClick={() => { setTab(t.id); if (t.id === 'prayers') loadPrayers(); }} style={{
              flex: 1, padding: '13px 4px',
              background: 'none', border: 'none',
              borderBottom: tab === t.id ? `3px solid ${T.ink}` : '3px solid transparent',
              fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
              color: tab === t.id ? T.ink : T.inkMuted,
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Posts tab */}
        {tab === 'posts' && (
          <div style={{ padding: '0 14px' }}>
            {/* Inline composer */}
            <div style={{
              background: T.white, border: `1px solid ${composeActive ? T.gold : T.line}`,
              borderRadius: 16, padding: '14px 16px', marginBottom: 16,
              transition: 'border-color 0.15s, box-shadow 0.15s',
              boxShadow: composeActive ? '0 2px 16px rgba(196,129,58,0.12)' : 'none',
            }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <Avatar name={profile?.display_name} avatarConfig={profile?.avatar_config} size={36} />
                <div style={{ flex: 1 }}>
                  <textarea
                    value={composeBody}
                    onChange={(e) => setComposeBody(e.target.value)}
                    onFocus={() => setComposeActive(true)}
                    placeholder="A thought, a doubt, a question…"
                    rows={composeActive ? 4 : 1}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      border: 'none', outline: 'none', resize: 'none',
                      fontFamily: T.serif, fontSize: 15, lineHeight: 1.65,
                      color: T.ink, background: 'transparent',
                      transition: 'all 0.2s',
                      overflow: composeActive ? 'auto' : 'hidden',
                    }}
                  />
                  {composeActive && (
                    <div style={{ marginTop: 10, borderTop: `1px solid ${T.line}`, paddingTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      {/* Audience hint — privacy is set by RLS, not by the
                          author. Posts here are scope='me' and visible to
                          same-church members. The old 3-option picker was
                          driving a column that doesn't exist. */}
                      <div style={{
                        fontSize: 11, color: T.inkMuted, fontStyle: 'italic',
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                      }}>
                        {churchCtx.church
                          ? <>👥 Visible to {churchCtx.church.name} family</>
                          : <>🔒 Visible only to you (join a church to share)</>}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => { setComposeActive(false); setComposeBody(''); }}
                          style={{ background: 'none', border: 'none', color: T.inkMuted, fontSize: 13, cursor: 'pointer', padding: '6px 10px' }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={submitPost}
                          disabled={!composeBody.trim() || composeSubmitting}
                          style={{
                            background: composeBody.trim() ? `linear-gradient(135deg, ${T.gold} 0%, #c47020 100%)` : T.line,
                            color: T.cream, border: 'none', borderRadius: 999,
                            padding: '8px 22px', fontSize: 13, fontWeight: 600,
                            cursor: composeBody.trim() ? 'pointer' : 'not-allowed',
                            transition: 'all 0.15s',
                            boxShadow: composeBody.trim() ? '0 3px 12px rgba(196,129,58,0.3)' : 'none',
                          }}
                        >
                          {composeSubmitting ? 'Posting…' : 'Post'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {loading && <div style={{ textAlign: 'center', padding: 40, color: T.inkMuted, fontFamily: T.serif }}>Loading…</div>}
            {!loading && posts.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontFamily: T.serif, fontSize: 20, color: T.ink, marginBottom: 10 }}>Nothing shared yet.</div>
                <div style={{ fontSize: 14, color: T.inkMuted, lineHeight: 1.6 }}>Thoughts, verses, questions — post anything.</div>
              </div>
            )}
            {posts.map((p) => <ProfilePost key={p.id} post={p} session={session} profile={profile} onReact={handleReact} churchCtx={churchCtx} />)}
          </div>
        )}

        {/* Prayers tab */}
        {tab === 'prayers' && (
          <div style={{ padding: '0 14px' }}>

            {/* Compose box — FB "What's on your mind?" style */}
            <form onSubmit={addPrayer} style={{ marginBottom: 14 }}>
              <div style={{
                background: T.white, borderRadius: 14, overflow: 'hidden',
                border: `1px solid ${T.line}`, boxShadow: '0 1px 3px rgba(44,24,16,0.06)',
                transition: 'border-color 0.15s',
              }}>
                <div style={{ display: 'flex', gap: 10, padding: '12px 14px 10px', alignItems: 'flex-start' }}>
                  <Avatar name={profile?.display_name} avatarConfig={profile?.avatar_config} size={38} style={{ flexShrink: 0 }} />
                  <textarea
                    value={prayerText}
                    onChange={(e) => setPrayerText(e.target.value)}
                    placeholder="What are you bringing to God today?"
                    rows={prayerText ? 3 : 2}
                    style={{
                      flex: 1, border: 'none', outline: 'none', resize: 'none',
                      fontFamily: T.serif, fontSize: 15, lineHeight: 1.65,
                      color: T.ink, background: 'transparent', paddingTop: 6,
                    }}
                    onFocus={(e) => (e.currentTarget.parentElement.parentElement.style.borderColor = T.gold)}
                    onBlur={(e) => (e.currentTarget.parentElement.parentElement.style.borderColor = T.line)}
                  />
                </div>
                <div style={{ borderTop: `1px solid ${T.line}`, padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ display: 'flex', background: T.parchment, borderRadius: 999, padding: 3, gap: 2 }}>
                    <button type="button" onClick={() => setNewPrayerIsPublic(false)} style={{
                      background: !newPrayerIsPublic ? T.white : 'transparent',
                      border: 'none', borderRadius: 999, padding: '4px 11px', fontSize: 11,
                      color: !newPrayerIsPublic ? T.ink : T.inkMuted,
                      cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontWeight: !newPrayerIsPublic ? 600 : 400,
                      boxShadow: !newPrayerIsPublic ? '0 1px 3px rgba(44,24,16,0.12)' : 'none',
                      transition: 'all 0.15s',
                    }}>🔒 Private</button>
                    <button type="button" onClick={() => setNewPrayerIsPublic(true)} style={{
                      background: newPrayerIsPublic ? 'rgba(196,129,58,0.18)' : 'transparent',
                      border: 'none', borderRadius: 999, padding: '4px 11px', fontSize: 11,
                      color: newPrayerIsPublic ? T.goldDark : T.inkMuted,
                      cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontWeight: newPrayerIsPublic ? 600 : 400,
                      transition: 'all 0.15s',
                    }}>🌐 Public</button>
                  </div>
                  <button type="submit" disabled={!prayerText.trim() || prayerSubmitting} style={{
                    background: prayerText.trim() ? `linear-gradient(135deg, ${T.gold} 0%, #c47020 100%)` : T.line,
                    color: T.cream, border: 'none', borderRadius: 999,
                    padding: '8px 22px', fontSize: 13, fontWeight: 600,
                    cursor: prayerText.trim() ? 'pointer' : 'not-allowed',
                    transition: 'all 0.15s',
                  }}>
                    {prayerSubmitting ? 'Adding…' : 'Pray'}
                  </button>
                </div>
              </div>
            </form>

            {prayers.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: T.inkMuted, fontFamily: T.serif, fontSize: 16 }}>
                Your prayer list is empty.
                <div style={{ fontSize: 13, marginTop: 6 }}>Add your first prayer above.</div>
              </div>
            )}

            {prayers.map((p) => (
              <div key={p.id} style={{
                background: T.white,
                border: `1px solid ${p.is_answered ? T.goldLight : T.line}`,
                borderRadius: 16, marginBottom: 12, overflow: 'hidden',
              }}>

                {/* ── Header: timestamp · privacy · answered pill · ⋯ menu ── */}
                <div style={{ padding: '14px 18px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {p.is_answered && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(196,129,58,0.12)', borderRadius: 999, padding: '2px 8px' }}>
                        <svg width="11" height="11" viewBox="0 0 34 34">
                          <circle cx="17" cy="17" r="10" fill={T.gold}/>
                          <polyline points="11,17 15,21 23,12" fill="none" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span style={{ fontSize: 11, fontWeight: 700, color: T.goldDark }}>Answered</span>
                      </div>
                    )}
                    <span style={{ fontSize: 12, color: T.inkMuted }}>{timeAgo(p.created_at)}</span>
                    <span style={{ fontSize: 11, color: T.inkMuted }}>·</span>
                    <span style={{ fontSize: 12, color: T.inkMuted }}>{p.is_public ? '🌐 Public' : '🔒 Only me'}</span>
                    {p.is_public && (supportMap[p.id] ?? 0) > 0 && (
                      <>
                        <span style={{ fontSize: 11, color: T.inkMuted }}>·</span>
                        <span style={{ fontSize: 12, color: T.inkMuted }}>🙏 {supportMap[p.id]} praying</span>
                      </>
                    )}
                  </div>
                  {/* ⋯ options menu */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <button
                      onClick={() => setMenuPrayerId(menuPrayerId === p.id ? null : p.id)}
                      style={{ background: 'none', border: 'none', color: T.inkMuted, fontSize: 20, cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}
                    >⋯</button>
                    {menuPrayerId === p.id && (
                      <>
                        <div onClick={() => setMenuPrayerId(null)} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
                        <div style={{
                          position: 'absolute', top: '110%', right: 0, zIndex: 50,
                          background: T.white, border: `1px solid ${T.line}`,
                          borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                          overflow: 'hidden', minWidth: 195,
                        }}>
                          {[
                            { label: p.is_answered ? '○  Mark unanswered' : '✦  Mark answered', onClick: () => { setMenuPrayerId(null); handlePrayerAnswerButton(p); } },
                            { label: p.is_public   ? '🔒  Make private'   : '🌐  Make public',  onClick: () => { setMenuPrayerId(null); togglePrayerPublic(p); } },
                            { label: 'Remove prayer', danger: true, onClick: () => { setMenuPrayerId(null); removePrayer(p.id); } },
                          ].map((item, i, arr) => (
                            <button key={item.label} onClick={item.onClick} style={{
                              width: '100%', textAlign: 'left', background: 'none', border: 'none',
                              padding: '11px 16px', fontSize: 13,
                              color: item.danger ? '#c0392b' : T.ink, cursor: 'pointer',
                              borderBottom: i < arr.length - 1 ? `1px solid ${T.line}` : 'none',
                            }}>{item.label}</button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* ── Body ── */}
                <div style={{ padding: '10px 18px 14px', fontFamily: T.serif, fontSize: 16, color: T.ink, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
                  {p.body}
                </div>

                {/* ── Praise report ── */}
                {p.is_answered && p.praise_report && (
                  <div style={{ margin: '0 18px 14px', background: 'rgba(196,129,58,0.07)', borderRadius: 10, padding: '10px 13px', borderLeft: `3px solid ${T.gold}` }}>
                    <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 4 }}>Praise Report ✦</div>
                    <div style={{ fontFamily: T.serif, fontStyle: 'italic', fontSize: 13, color: T.inkSoft, lineHeight: 1.6 }}>"{p.praise_report}"</div>
                  </div>
                )}

                {/* ── Reactions bar — matches ProfilePost exactly ── */}
                <div style={{ padding: '8px 18px', borderTop: `1px solid ${T.line}`, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  {PRAYER_REACTIONS.map(r => {
                    const count = (reactionMap[p.id] ?? {})[r.kind] ?? 0;
                    const active = myReactionMap[p.id] === r.kind;
                    const sem = r.semantic ? SEMANTIC[r.semantic] : null;
                    const activeBg     = sem ? sem.bgActive    : 'rgba(196,129,58,0.12)';
                    const activeBorder = sem ? sem.line        : T.gold;
                    const activeText   = sem ? sem.text        : T.goldDark;
                    return (
                      <button key={r.kind} onClick={() => handlePrayerReact(p.id, r.kind, active)} style={{
                        background: active ? activeBg : 'transparent',
                        border: `1px solid ${active ? activeBorder : T.line}`,
                        borderRadius: 999, padding: '5px 11px', fontSize: 12,
                        color: active ? activeText : T.inkMuted,
                        fontWeight: active ? 600 : 400,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                        transition: 'all 0.15s',
                      }}>
                        {r.emoji} <span>{r.label}</span>
                        {count > 0 && <span style={{ fontWeight: 700, marginLeft: 2 }}>{count}</span>}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => toggleMePanelEnc(p.id)}
                    style={{
                      marginLeft: 'auto', background: 'none', border: 'none',
                      fontSize: 12, color: expandedEnc.has(p.id) ? T.goldDark : T.inkMuted,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    💬 {(encCountMap[p.id] ?? 0) > 0 ? encCountMap[p.id] : ''}
                  </button>
                </div>

                {/* ── Encouragements thread ── */}
                {expandedEnc.has(p.id) && (
                  <div style={{ borderTop: `1px solid ${T.line}`, background: T.parchment, padding: '10px 18px' }}>
                    {(encMap[p.id] ?? []).length === 0 ? (
                      <div style={{ fontSize: 12, color: T.inkMuted, fontStyle: 'italic', textAlign: 'center', padding: '4px 0 8px' }}>
                        No encouragements yet — be the first.
                      </div>
                    ) : (
                      (encMap[p.id] ?? []).map(enc => (
                        <div key={enc.id} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: '50%',
                            background: `linear-gradient(135deg, ${T.gold}, #c47020)`,
                            flexShrink: 0, display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: 12, color: T.cream, fontWeight: 700,
                          }}>
                            {(enc.profiles?.display_name ?? '?')[0].toUpperCase()}
                          </div>
                          <div style={{ background: T.white, borderRadius: 12, padding: '7px 11px', flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: T.ink, marginBottom: 2 }}>{enc.profiles?.display_name ?? 'Someone'}</div>
                            <div style={{ fontFamily: T.serif, fontSize: 13, color: T.inkSoft, lineHeight: 1.5 }}>{enc.body}</div>
                            <div style={{ fontSize: 10, color: T.inkMuted, marginTop: 3 }}>{enc.created_at ? timeAgo(enc.created_at) : ''}</div>
                          </div>
                        </div>
                      ))
                    )}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                      <Avatar name={profile?.display_name} avatarConfig={profile?.avatar_config} size={28} style={{ flexShrink: 0 }} />
                      <div style={{ flex: 1, background: T.white, borderRadius: 20, border: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', padding: '6px 12px', gap: 8 }}>
                        <input
                          value={encInputMap[p.id] ?? ''}
                          onChange={(e) => setEncInputMap(prev => ({ ...prev, [p.id]: e.target.value.slice(0, 120) }))}
                          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitMePanelEnc(p.id); } }}
                          placeholder="Write an encouragement…"
                          style={{ flex: 1, border: 'none', outline: 'none', fontFamily: T.serif, fontSize: 13, color: T.ink, background: 'transparent' }}
                        />
                        {(encInputMap[p.id] ?? '').trim() && (
                          <button onClick={() => submitMePanelEnc(p.id)} style={{ background: 'none', border: 'none', color: T.goldDark, fontSize: 18, cursor: 'pointer', padding: 0, lineHeight: 1 }}>↑</button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            ))}

            {/* Praise report sheet */}
            {praiseTarget && (
              <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(44,24,16,0.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 20 }}
                onClick={() => setPraiseTarget(null)}
              >
                <div onClick={e => e.stopPropagation()} style={{
                  background: T.ink, border: '1px solid rgba(196,129,58,0.3)', borderRadius: 20,
                  padding: '28px 24px', width: '100%', maxWidth: 420, marginBottom: 20,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <svg width="30" height="30" viewBox="0 0 34 34" style={{ flexShrink: 0, animation: 'badgePop 0.55s cubic-bezier(0.34,1.56,0.64,1) both' }}>
                      <line x1="17" y1="1"  x2="17" y2="6"  stroke={T.gold} strokeWidth="2"   strokeLinecap="round"/>
                      <line x1="17" y1="28" x2="17" y2="33" stroke={T.gold} strokeWidth="2"   strokeLinecap="round"/>
                      <line x1="1"  y1="17" x2="6"  y2="17" stroke={T.gold} strokeWidth="2"   strokeLinecap="round"/>
                      <line x1="28" y1="17" x2="33" y2="17" stroke={T.gold} strokeWidth="2"   strokeLinecap="round"/>
                      <line x1="5.5"  y1="5.5"  x2="8.8"  y2="8.8"  stroke={T.gold} strokeWidth="1.5" strokeLinecap="round"/>
                      <line x1="25.2" y1="25.2" x2="28.5" y2="28.5" stroke={T.gold} strokeWidth="1.5" strokeLinecap="round"/>
                      <line x1="28.5" y1="5.5"  x2="25.2" y2="8.8"  stroke={T.gold} strokeWidth="1.5" strokeLinecap="round"/>
                      <line x1="8.8"  y1="25.2" x2="5.5"  y2="28.5" stroke={T.gold} strokeWidth="1.5" strokeLinecap="round"/>
                      <circle cx="17" cy="17" r="10" fill={T.gold}/>
                      <ellipse cx="15" cy="13.5" rx="4" ry="2" fill="rgba(255,255,255,0.22)"/>
                      <polyline points="11,17 15,21 23,12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <div style={{ fontFamily: T.display, fontSize: 19, color: T.cream, fontWeight: 600, letterSpacing: '-0.012em' }}>Prayer Answered!</div>
                  </div>
                  <div style={{ fontFamily: T.serif, fontStyle: 'italic', fontSize: 13, color: 'rgba(253,248,240,0.4)', marginBottom: 18, lineHeight: 1.6 }}>
                    "{praiseTarget.body}"
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(253,248,240,0.55)', marginBottom: 10 }}>
                    Want to share what happened? <span style={{ color: 'rgba(253,248,240,0.3)' }}>(optional)</span>
                  </div>
                  <textarea
                    value={praiseText} onChange={e => setPraiseText(e.target.value.slice(0, 200))}
                    placeholder="Share your testimony…" rows={3} autoFocus
                    style={{
                      width: '100%', boxSizing: 'border-box', resize: 'none',
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(196,129,58,0.2)',
                      borderRadius: 10, padding: '11px 14px', fontSize: 14, color: T.cream,
                      fontFamily: T.serif, outline: 'none', lineHeight: 1.6, marginBottom: 4,
                    }}
                    onFocus={e => (e.currentTarget.style.borderColor = T.gold)}
                    onBlur={e => (e.currentTarget.style.borderColor = 'rgba(196,129,58,0.2)')}
                  />
                  <div style={{ fontSize: 10, color: 'rgba(253,248,240,0.28)', textAlign: 'right', marginBottom: 16 }}>{praiseText.length}/200</div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => applyPrayerAnswered(praiseTarget, true, praiseText)} style={{
                      background: T.gold, color: T.cream, border: 'none', borderRadius: 999,
                      padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', flex: 1,
                    }}>
                      {praiseText.trim() ? 'Save testimony' : 'Mark answered'}
                    </button>
                    <button onClick={() => setPraiseTarget(null)} style={{ background: 'none', border: 'none', color: 'rgba(253,248,240,0.35)', fontSize: 13, cursor: 'pointer' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Friends tab */}
        {tab === 'friends' && (
          <div style={{ padding: '0 14px' }}>
            {/* Find people button */}
            <button
              onClick={() => onFindPeople?.()}
              style={{
                width: '100%', background: T.parchment,
                border: `1.5px dashed ${T.goldLight}`, borderRadius: 12,
                padding: '12px 16px', marginBottom: 18, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontSize: 14, color: T.goldDark, fontWeight: 600,
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(196,129,58,0.08)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = T.parchment)}
            >
              🔍 Find people
            </button>
            {/* Pending requests */}
            {pendingRequests.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, letterSpacing: '0.07em', textTransform: 'uppercase', color: T.inkMuted, fontWeight: 600, marginBottom: 10 }}>
                  Friend requests
                </div>
                {pendingRequests.map((req) => {
                  const fp = PERSON_TYPES.find((p) => p.id === req.person_type);
                  const fc = TYPE_COLORS[req.person_type] ?? TYPE_COLORS.curious;
                  return (
                    <div key={req.id} style={{
                      background: T.white, border: `1.5px solid ${T.goldLight}`,
                      borderRadius: 14, padding: '14px 16px', marginBottom: 10,
                      display: 'flex', alignItems: 'center', gap: 14,
                    }}>
                      <button onClick={() => onViewProfile?.(req.id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                        <Avatar name={req.display_name} avatarConfig={req.avatar_config} size={46} />
                      </button>
                      <div style={{ flex: 1 }}>
                        <button onClick={() => onViewProfile?.(req.id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
                          <div style={{ fontWeight: 600, fontSize: 15, color: T.ink }}>{req.display_name}</div>
                        </button>
                        {fp && (
                          <span style={{ background: fc.bg, border: `1px solid ${fc.border}`, color: fc.text, borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                            {fp.emoji} {fp.label}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => acceptFriend(req.reqId, req.id)} style={{
                          background: T.gold, color: T.cream, border: 'none',
                          borderRadius: 999, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        }}>Accept</button>
                        <button onClick={() => declineFriend(req.reqId)} style={{
                          background: T.white, color: T.inkMuted, border: `1px solid ${T.line}`,
                          borderRadius: 999, padding: '7px 12px', fontSize: 13, cursor: 'pointer',
                        }}>✕</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Friends list */}
            {friendsList.length === 0 && pendingRequests.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>👥</div>
                <div style={{ fontFamily: T.serif, fontSize: 20, color: T.ink, marginBottom: 8 }}>No friends yet.</div>
                <div style={{ fontSize: 14, color: T.inkMuted, marginBottom: 20, lineHeight: 1.6 }}>Search for people by name and send them a friend request.</div>
                <button
                  onClick={() => onFindPeople?.()}
                  style={{ background: T.gold, color: T.cream, border: 'none', borderRadius: 999, padding: '11px 28px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                >
                  Find people →
                </button>
              </div>
            )}
            {friendsList.length > 0 && (
              <>
                {pendingRequests.length > 0 && (
                  <div style={{ fontSize: 11, letterSpacing: '0.07em', textTransform: 'uppercase', color: T.inkMuted, fontWeight: 600, marginBottom: 10 }}>
                    Your friends
                  </div>
                )}
                {friendsList.map((f) => {
                  const fp = PERSON_TYPES.find((p) => p.id === f.person_type);
                  const fc = TYPE_COLORS[f.person_type] ?? TYPE_COLORS.curious;
                  return (
                    <div key={f.id} style={{
                      background: T.white, border: `1px solid ${T.line}`,
                      borderRadius: 14, padding: '14px 16px', marginBottom: 10,
                      display: 'flex', alignItems: 'center', gap: 14,
                    }}>
                      <button onClick={() => onViewProfile?.(f.id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, flex: 1, textAlign: 'left' }}>
                        <Avatar name={f.display_name} avatarConfig={f.avatar_config} size={46} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 15, color: T.ink, marginBottom: 4 }}>{f.display_name}</div>
                          {fp && (
                            <span style={{ background: fc.bg, border: `1px solid ${fc.border}`, color: fc.text, borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                              {fp.emoji} {fp.label}
                            </span>
                          )}
                        </div>
                        <span style={{ color: T.goldDark, fontSize: 16 }}>→</span>
                      </button>
                      <button onClick={() => unfriend(f.id)} style={{
                        background: 'none', border: 'none', color: T.inkMuted,
                        fontSize: 11, cursor: 'pointer', padding: '4px 8px',
                        marginLeft: 4,
                      }}>Unfriend</button>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* Following tab */}
        {tab === 'following' && (
          <div style={{ padding: '0 14px' }}>
            {followingList.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontFamily: T.serif, fontSize: 20, color: T.ink, marginBottom: 10 }}>Not following anyone yet.</div>
                <div style={{ fontSize: 14, color: T.inkMuted }}>Follow people from the community feed.</div>
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

        {/* About tab */}
        {tab === 'about' && (
          <div style={{ padding: '0 14px' }}>
            {[
              profile?.tradition       && { label: 'Tradition',         value: profile.tradition },
              profile?.background      && { label: 'Background',        value: profile.background },
              profile?.age_range       && { label: 'Age range',         value: profile.age_range },
              profile?.exploring_since && { label: 'Exploring since',   value: profile.exploring_since },
              profile?.what_brought    && { label: 'What brought me here', value: `"${profile.what_brought}"`, serif: true },
            ].filter(Boolean).map((item) => (
              <div key={item.label} style={{ background: T.white, borderRadius: 14, border: `1px solid ${T.line}`, padding: '15px 18px', marginBottom: 10 }}>
                <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: T.inkMuted, marginBottom: 6 }}>{item.label}</div>
                <div style={{ fontFamily: item.serif ? T.serif : 'inherit', fontSize: 14, color: T.inkSoft, lineHeight: 1.65, fontStyle: item.serif ? 'italic' : 'normal' }}>{item.value}</div>
              </div>
            ))}
            {profile?.looking_for?.length > 0 && (
              <div style={{ background: T.white, borderRadius: 14, border: `1px solid ${T.line}`, padding: '15px 18px', marginBottom: 10 }}>
                <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: T.inkMuted, marginBottom: 10 }}>Looking for</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {profile.looking_for.map((item) => (
                    <span key={item} style={{ background: T.parchment, border: `1px solid ${T.line}`, borderRadius: 999, padding: '5px 12px', fontSize: 13, color: T.inkSoft }}>
                      {item.replace(/-/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {!profile?.tradition && !profile?.background && !profile?.what_brought && (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontFamily: T.serif, fontSize: 18, color: T.ink, marginBottom: 16 }}>Nothing filled in yet.</div>
                <button onClick={onEditProfile} style={{ background: T.ink, color: T.cream, border: 'none', borderRadius: 999, padding: '10px 24px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Fill in your profile
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
