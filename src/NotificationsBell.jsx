import { useEffect, useState, useCallback } from 'react';
import { UserPlus, Users, MessageCircle, CornerDownRight, Smile, Heart, BookOpen } from 'lucide-react';
import { supabase } from './supabase.js';
import { T } from './theme.js';
import { exactTime } from './time.js';
import { Avatar } from './ProfilePage.jsx';
import { KinwoveStar } from './components/brand/KinwoveStar.jsx';

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return `${Math.floor(diff / 604800)}w`;
}

const KIND_COPY = {
  friend_request_received: { verb: 'sent you a friend request', Icon: UserPlus },
  friend_request_accepted: { verb: 'accepted your friend request', Icon: Users },
  post_comment:            { verb: 'commented on your post', Icon: MessageCircle },
  post_comment_reply:      { verb: 'replied to your comment', Icon: CornerDownRight },
  post_reaction:           { verb: 'reacted to your post', Icon: Smile },
  prayer_support:            { verb: 'is praying for you', Icon: null, emoji: '🙏' },
  prayer_encouragement:      { verb: 'left an encouragement', Icon: Heart },
  sermon_comment:            { verb: 'commented on your sermon', Icon: BookOpen },
  sermon_published:          { verb: 'published a new sermon', Icon: BookOpen },
  church_daily_question:     { verb: 'shared today’s question', Icon: BookOpen },
  follow:                    { verb: 'started following you', Icon: UserPlus },
  role_assigned:             { verb: 'gave you a role', Icon: null, emoji: '🎖' },
  group_joined:              { verb: 'joined your circle', Icon: Users },
  role_invited:              { verb: 'invited you to a role', Icon: null, emoji: '🎖' },
  dm_message:                { verb: 'sent you a message', Icon: MessageCircle },
  care_message:              { verb: 'sent you a care message', Icon: MessageCircle },
  care_safety_flag:          { verb: 'a care conversation needs urgent attention', Icon: null, emoji: '⚠️' },
  care_new_request:          { verb: 'someone reached out for care', Icon: null, emoji: '💛' },
  group_invite:              { verb: 'invited you to a group', Icon: null, emoji: '📖' },
  group_post:                { verb: 'posted in', Icon: null, emoji: '◯' },
  group_reply:               { verb: 'replied to your post in', Icon: null, emoji: '↩' },
};

function NotificationRow({ n, onClick, onFriendAction, onAvatarClick, onRoleAccepted, onMarkRead }) {
  const copy = KIND_COPY[n.kind] ?? { verb: n.kind, Icon: null, emoji: <KinwoveStar size={10} /> };
  const actor = n.actor_profile;

  // Anonymous care messages: don't reveal sender identity
  const isCareAnonymous = n.kind === 'care_message' && (n.data?.is_anonymous || !n.actor_id);
  // Role notifications: fall back to church name when pastor actor_id isn't resolved
  const isRoleNotif = n.kind === 'role_assigned' || n.kind === 'role_invited';
  const actorName = isCareAnonymous ? 'Anonymous'
    : (actor?.display_name || (isRoleNotif ? (n.data?.church_name ?? 'Your church') : 'Someone'));

  const snippet = n.kind === 'role_assigned'
    ? (n.data?.role_label ?? n.data?.role_key)
    : n.kind === 'role_invited'
    ? (n.data?.role_label ?? n.data?.role_key)
    : n.kind === 'group_invite'
    ? `${n.data?.group_name ?? 'a group'} · code: ${n.data?.invite_code ?? ''}`
    : n.kind === 'group_post' || n.kind === 'group_reply' || n.kind === 'group_joined'
    ? (n.data?.group_name ?? 'a circle')
    : n.data?.snippet;
  const unread = !n.read_at;
  const isFriendReq  = n.kind === 'friend_request_received';
  const isRoleInvite = n.kind === 'role_invited';

  const [friendState, setFriendState] = useState(null); // null | 'busy' | 'accepted' | 'declined'
  const [roleState,   setRoleState]   = useState(null); // null | 'busy' | 'accepted' | 'declined'
  const [roleError,   setRoleError]   = useState(null); // error message string

  // On mount, check if this friend request was already actioned
  useEffect(() => {
    if (!isFriendReq || !n.target_id) return;
    supabase
      .from('friend_requests')
      .select('status')
      .eq('id', n.target_id)
      .single()
      .then(({ data }) => {
        if (data?.status === 'accepted') setFriendState('accepted');
        else if (data?.status === 'declined') setFriendState('declined');
      });
  }, [n.target_id, isFriendReq]); // eslint-disable-line react-hooks/exhaustive-deps

  // On mount, check if this role invite was already actioned
  useEffect(() => {
    if (!isRoleInvite || !n.target_id) return;
    supabase
      .from('church_role_invites')
      .select('status')
      .eq('id', n.target_id)
      .single()
      .then(({ data }) => {
        if (data?.status === 'accepted') setRoleState('accepted');
        else if (data?.status === 'declined' || data?.status === 'cancelled') setRoleState('declined');
      });
  }, [n.target_id, isRoleInvite]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleFriend(e, action) {
    e.stopPropagation();
    setFriendState('busy');
    await supabase
      .from('friend_requests')
      .update({ status: action === 'accept' ? 'accepted' : 'declined' })
      .eq('id', n.target_id);
    setFriendState(action === 'accept' ? 'accepted' : 'declined');
    onMarkRead?.(n);
    // Don't call onFriendAction/loadRecent — it sets loading=true which
    // unmounts and remounts all rows, resetting friendState back to null.
    // The confirmed label stays until the user closes and reopens the panel.
  }

  async function handleRoleInvite(e, action) {
    e.stopPropagation();
    setRoleState('busy');
    const fn = action === 'accept' ? 'accept_role_invite' : 'decline_role_invite';
    const { error } = await supabase.rpc(fn, { p_invite_id: n.target_id });
    if (error) {
      console.error('[role invite]', error.message);
      setRoleState(null); // reset so they can try again
      setRoleError(error.message.includes('not a member')
        ? 'You need to be a member of this church first.'
        : 'Something went wrong — please try again.');
      return;
    }
    setRoleError(null);
    if (action === 'accept') {
      const roleLabel = n.data?.role_label ?? n.data?.role_key ?? 'your role';
      onRoleAccepted?.({
        roleLabel,
        churchName: n.data?.church_name,
        churchId:   n.data?.church_id,
        roleKey:    n.data?.role_key,
      });
    }
    setRoleState(action === 'accept' ? 'accepted' : 'declined');
    onMarkRead?.(n);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(n)}
      onKeyDown={(e) => e.key === 'Enter' && onClick(n)}
      style={{
        width: '100%', display: 'flex', gap: 13, alignItems: 'flex-start',
        background: 'transparent',
        borderRadius: 10,
        padding: '10px 12px', cursor: 'pointer', textAlign: 'left',
        transition: 'background 0.12s',
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(44,24,16,0.05)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
    >
      {/* Avatar + icon badge — click goes to actor's profile */}
      <div
        style={{ position: 'relative', flexShrink: 0, cursor: (!isCareAnonymous && n.actor_id && onAvatarClick) ? 'pointer' : 'default' }}
        onClick={(!isCareAnonymous && n.actor_id && onAvatarClick) ? (e) => { e.stopPropagation(); onAvatarClick(n.actor_id); } : undefined}
        title={(!isCareAnonymous && n.actor_id) ? `View ${actorName}'s profile` : undefined}
      >
        <Avatar
          name={actorName}
          avatarConfig={isCareAnonymous ? null : actor?.avatar_config}
          photoUrl={isCareAnonymous ? null : actor?.avatar_url}
          size={44}
        />
        <div style={{
          position: 'absolute', right: -3, bottom: -3,
          width: 22, height: 22, borderRadius: '50%',
          background: T.ink, border: `2px solid ${T.white}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, color: T.cream,
        }}>
          {copy.Icon ? <copy.Icon size={11} strokeWidth={2} /> : copy.emoji}
        </div>
      </div>

      {/* Text block */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, lineHeight: 1.5, color: T.ink, marginBottom: 2 }}>
          <span style={{ fontWeight: 700 }}>{actorName}</span>{' '}
          <span style={{ fontWeight: 400, color: T.inkSoft }}>{copy.verb}</span>
          {snippet && (
            <span style={{ fontWeight: 600, color: T.ink }}>: "{snippet}"</span>
          )}
        </div>
        <div style={{ fontSize: 12.5, color: T.goldDark, fontWeight: 600, letterSpacing: '0.01em' }}>
          <span title={exactTime(n.created_at)}>{timeAgo(n.created_at)}</span>
        </div>

        {/* Accept / Decline buttons for friend requests */}
        {isFriendReq && (
          <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: 7, marginTop: 8 }}>
            {friendState === 'accepted' && (
              <span style={{ fontSize: 12, color: T.goldDark, fontWeight: 600 }}>✓ Request accepted</span>
            )}
            {friendState === 'declined' && (
              <span style={{ fontSize: 12, color: T.inkMuted }}>Request declined</span>
            )}
            {friendState === 'busy' && (
              <span style={{ fontSize: 12, color: T.inkMuted }}>Saving…</span>
            )}
            {!friendState && (
              <>
                <button onClick={(e) => handleFriend(e, 'accept')} disabled={friendState === 'busy'} style={{
                  background: T.ink, color: T.cream, border: 'none', borderRadius: 8,
                  padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>Accept</button>
                <button onClick={(e) => handleFriend(e, 'decline')} disabled={friendState === 'busy'} style={{
                  background: 'transparent', color: T.inkSoft, border: `1px solid ${T.line}`,
                  borderRadius: 8, padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>Decline</button>
              </>
            )}
          </div>
        )}

        {/* Accept / Decline buttons for role invites */}
        {isRoleInvite && (
          <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 8 }}>
            {roleError && (
              <span style={{ fontSize: 11, color: '#b94040', lineHeight: 1.4 }}>{roleError}</span>
            )}
            <div style={{ display: 'flex', gap: 7 }}>
              {roleState === 'accepted' && (
                <span style={{ fontSize: 12, color: T.goldDark, fontWeight: 600 }}>✓ Role accepted</span>
              )}
              {roleState === 'declined' && (
                <span style={{ fontSize: 12, color: T.inkMuted }}>Role declined</span>
              )}
              {roleState === 'busy' && (
                <span style={{ fontSize: 12, color: T.inkMuted }}>Saving…</span>
              )}
              {!roleState && (
                <>
                  <button onClick={(e) => handleRoleInvite(e, 'accept')} style={{
                    background: T.ink, color: T.cream, border: 'none', borderRadius: 8,
                    padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}>Accept</button>
                  <button onClick={(e) => handleRoleInvite(e, 'decline')} style={{
                    background: 'transparent', color: T.inkSoft, border: `1px solid ${T.line}`,
                    borderRadius: 8, padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}>Decline</button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Unread dot — far right, gold */}
      <div style={{ width: 12, flexShrink: 0, display: 'flex', justifyContent: 'center', paddingTop: 4 }}>
        {unread && (
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: T.goldDark }} />
        )}
      </div>
    </div>
  );
}

export default function NotificationsBell({ session, rightOffset = 0, isDesktop = false, onNavigate, onOpen, onViewProfile, onRoleAccepted }) {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [bellFilter, setBellFilter] = useState('all'); // 'all' | 'unread'

  const userId = session?.user?.id;

  const loadUnreadCount = useCallback(async () => {
    if (!userId) return;
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .not('kind', 'in', '(care_message,dm_message)')
      .is('read_at', null);
    setUnreadCount(count ?? 0);
  }, [userId]);

  useEffect(() => { loadUnreadCount(); }, [loadUnreadCount]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifs:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `recipient_id=eq.${userId}`,
      }, () => {
        // Recount properly so message kinds don't inflate the bell badge
        loadUnreadCount();
        if (open) loadRecent();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, open]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadRecent = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', userId)
      .not('kind', 'in', '(care_message,dm_message)')
      .order('created_at', { ascending: false })
      .limit(30);
    if (!data) { setLoading(false); return; }
    const actorIds = [...new Set(data.map(n => n.actor_id).filter(Boolean))];
    let actorMap = {};
    if (actorIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_config, avatar_url')
        .in('id', actorIds);
      for (const p of profs ?? []) actorMap[p.id] = p;
    }
    setNotifs(data.map(n => ({ ...n, actor_profile: actorMap[n.actor_id] })));
    setLoading(false);
  }, [userId]);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('recipient_id', userId)
      .not('kind', 'in', '(care_message,dm_message)')
      .is('read_at', null);
    setUnreadCount(0);
    setNotifs(prev => prev.map(n => n.read_at ? n : { ...n, read_at: new Date().toISOString() }));
  }, [userId]);

  function togglePanel() {
    if (!open) {
      setOpen(true);
      loadRecent();
      onOpen?.();
    } else {
      setOpen(false);
    }
  }

  function handleAvatarClick(actorId) {
    if (!actorId) return;
    setOpen(false);
    onViewProfile?.(actorId);
  }

  async function markRead(n) {
    if (n.read_at) return;
    const now = new Date().toISOString();
    await supabase.from('notifications').update({ read_at: now }).eq('id', n.id);
    setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read_at: now } : x));
    setUnreadCount(c => Math.max(0, c - 1));
  }

  async function handleClick(n) {
    await markRead(n);
    setOpen(false);
    onNavigate?.(n);
  }

  useEffect(() => {
    if (!open) return;
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [open]);

  if (!session) return null;

  const fabBase = {
    position: 'fixed',
    // Desktop: centre in the 56px global header (56-44)/2=6px
    // Mobile: clear the safe-area notch
    top: isDesktop ? 6 : 'calc(env(safe-area-inset-top, 0px) + 10px)',
    width: 44, height: 44, borderRadius: '50%',
    background: T.cream, border: `1px solid rgba(26,17,8,0.08)`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', zIndex: 160,
    boxShadow: '0 2px 8px rgba(44,24,16,0.10)',
    color: T.inkSoft, padding: 0,
  };

  // Desktop: slot 1 (left of Messages, no ⋮)   Mobile: slot 2 (leftmost of 3)
  const bellRight = isDesktop
    ? rightOffset + 12 + 44 + 8
    : rightOffset + 12 + 44 + 8 + 44 + 8;

  return (
    <>
      <button
        data-tour-id="notifications"
        onClick={togglePanel}
        aria-label="Notifications"
        title="Notifications"
        style={{ ...fabBase, right: bellRight, position: 'fixed' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -3, right: -3,
            minWidth: 18, height: 18, padding: '0 5px',
            borderRadius: 999,
            background: T.error, color: T.cream,
            fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `2px solid ${T.white}`,
            boxShadow: '0 1px 3px rgba(192,57,43,0.4)',
            lineHeight: 1,
          }}>{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 299 }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            position: 'absolute',
            top: isDesktop ? 56 : 'calc(env(safe-area-inset-top, 0px) + 56px)',
            // Mobile: anchor to the screen edge — anchoring to the bell pushed
            // the 380px panel off the left edge of phone screens.
            right: isDesktop ? bellRight : 12,
            background: T.white, borderRadius: 16, border: `1px solid ${T.line}`,
            boxShadow: '0 8px 40px rgba(0,0,0,0.16)',
            width: 380, maxWidth: 'calc(100vw - 24px)',
            maxHeight: 'min(72vh, 600px)',
            display: 'flex', flexDirection: 'column',
            zIndex: 300,
          }}>
            {/* Header */}
            <div style={{ padding: '18px 16px 10px', flexShrink: 0 }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 12,
              }}>
                <div style={{ fontFamily: T.display, fontSize: 22, fontWeight: 700, color: T.ink, letterSpacing: '-0.02em' }}>
                  Notifications
                </div>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close notifications"
                  style={{ background: 'rgba(26,17,8,0.06)', border: 'none', borderRadius: 999, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: T.inkSoft, fontSize: 16, lineHeight: 1, marginLeft: 'auto', flexShrink: 0 }}
                >×</button>
                {notifs.some(n => !n.read_at) && (
                  <button onClick={markAllRead} style={{
                    background: 'none', border: 'none', color: T.goldDark,
                    fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: 0,
                  }}>Mark all read</button>
                )}
              </div>
              {/* Filter tabs */}
              <div style={{ display: 'flex', gap: 6 }}>
                {[['all', 'All'], ['unread', 'Unread']].map(([f, label]) => (
                  <button key={f} onClick={() => setBellFilter?.(f)} style={{
                    borderRadius: 999, padding: '5px 14px',
                    fontSize: 13, fontWeight: 600,
                    background: (bellFilter ?? 'all') === f ? `rgba(184,115,58,0.12)` : 'transparent',
                    color: (bellFilter ?? 'all') === f ? T.goldDark : T.inkMuted,
                    border: 'none', cursor: 'pointer',
                  }}>{label}</button>
                ))}
              </div>
            </div>

            {/* Notification list with New / Earlier grouping */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px 12px' }}>
              {loading && (
                <div style={{ padding: 30, textAlign: 'center', color: T.inkMuted, fontFamily: T.serif, fontSize: 14 }}>
                  Loading…
                </div>
              )}
              {!loading && notifs.length === 0 && (
                <div style={{ padding: '40px 24px', textAlign: 'center' }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>🕊</div>
                  <div style={{ fontFamily: T.display, fontSize: 16, color: T.ink, marginBottom: 6 }}>All caught up</div>
                  <div style={{ fontSize: 13, color: T.inkMuted }}>New activity from your church will appear here.</div>
                </div>
              )}
              {!loading && (() => {
                const filtered = notifs.filter(n => (bellFilter ?? 'all') === 'unread' ? !n.read_at : true);
                const newItems  = filtered.filter(n => !n.read_at);
                const oldItems  = filtered.filter(n =>  n.read_at);
                return (
                  <>
                    {newItems.length > 0 && (
                      <>
                        <div style={{ padding: '6px 4px 4px', fontSize: 13, fontWeight: 700, color: T.ink }}>New</div>
                        {newItems.map(n => <NotificationRow key={n.id} n={n} onClick={handleClick} onMarkRead={markRead} onFriendAction={loadRecent} onAvatarClick={handleAvatarClick} onRoleAccepted={(data) => { onRoleAccepted?.(data); setOpen(false); setTimeout(loadRecent, 700); }} />)}
                      </>
                    )}
                    {oldItems.length > 0 && (
                      <>
                        <div style={{ padding: newItems.length ? '14px 4px 4px' : '6px 4px 4px', fontSize: 13, fontWeight: 700, color: T.ink }}>Earlier</div>
                        {oldItems.map(n => <NotificationRow key={n.id} n={n} onClick={handleClick} onMarkRead={markRead} onFriendAction={loadRecent} onAvatarClick={handleAvatarClick} onRoleAccepted={(data) => { onRoleAccepted?.(data); setOpen(false); setTimeout(loadRecent, 700); }} />)}
                      </>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
