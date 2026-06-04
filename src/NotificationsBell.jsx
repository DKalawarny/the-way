import { useEffect, useState, useCallback } from 'react';
import { UserPlus, Users, MessageCircle, CornerDownRight, Smile, Heart, BookOpen } from 'lucide-react';
import { supabase } from './supabase.js';
import { T } from './theme.js';
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
  follow:                    { verb: 'started following you', Icon: UserPlus },
  role_assigned:             { verb: 'gave you a role', Icon: null, emoji: '🎖' },
  dm_message:                { verb: 'sent you a message', Icon: MessageCircle },
  care_message:              { verb: 'sent you a care message', Icon: MessageCircle },
};

function NotificationRow({ n, onClick, onFriendAction }) {
  const copy = KIND_COPY[n.kind] ?? { verb: n.kind, Icon: null, emoji: <KinwoveStar size={10} /> };
  const actor = n.actor_profile;

  // Anonymous care messages: don't reveal sender identity
  const isCareAnonymous = n.kind === 'care_message' && (n.data?.is_anonymous || !n.actor_id);
  const actorName = isCareAnonymous ? 'Anonymous' : (actor?.display_name || 'Someone');

  const snippet = n.kind === 'role_assigned'
    ? [n.data?.role_label, n.data?.church_name].filter(Boolean).join(' at ')
    : n.data?.snippet;
  const unread = !n.read_at;
  const isFriendReq = n.kind === 'friend_request_received';

  const [friendState, setFriendState] = useState(null); // null | 'busy' | 'accepted' | 'declined'

  // On mount, check if this request was already actioned (e.g. accepted in Find Friends tab)
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

  async function handleFriend(e, action) {
    e.stopPropagation();
    setFriendState('busy');
    await supabase
      .from('friend_requests')
      .update({ status: action === 'accept' ? 'accepted' : 'declined' })
      .eq('id', n.target_id);
    setFriendState(action === 'accept' ? 'accepted' : 'declined');
    // Don't call onFriendAction/loadRecent — it sets loading=true which
    // unmounts and remounts all rows, resetting friendState back to null.
    // The confirmed label stays until the user closes and reopens the panel.
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(n)}
      onKeyDown={(e) => e.key === 'Enter' && onClick(n)}
      style={{
        width: '100%', display: 'flex', gap: 11, alignItems: 'flex-start',
        background: unread ? 'rgba(184,115,58,0.08)' : 'transparent',
        borderBottom: `1px solid ${T.line}`,
        padding: '12px 14px', cursor: 'pointer', textAlign: 'left',
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = unread ? 'rgba(184,115,58,0.14)' : 'rgba(44,24,16,0.04)'}
      onMouseLeave={(e) => e.currentTarget.style.background = unread ? 'rgba(184,115,58,0.08)' : 'transparent'}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <Avatar
          name={actorName}
          avatarConfig={isCareAnonymous ? null : actor?.avatar_config}
          photoUrl={isCareAnonymous ? null : actor?.avatar_url}
          size={36}
        />
        <div style={{
          position: 'absolute', right: -2, bottom: -2,
          width: 18, height: 18, borderRadius: '50%',
          background: T.cream, border: `1px solid ${T.line}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, color: T.goldDark,
        }}>
          {copy.Icon ? <copy.Icon size={10} strokeWidth={2} /> : copy.emoji}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, lineHeight: 1.45, color: T.ink }}>
          <span style={{ fontWeight: 600 }}>{actorName}</span>{' '}
          <span style={{ color: T.inkSoft }}>{copy.verb}</span>
        </div>
        {snippet && (
          <div style={{
            fontSize: 12.5, color: T.inkMuted, fontStyle: 'italic',
            marginTop: 2, lineHeight: 1.4,
            overflow: 'hidden', textOverflow: 'ellipsis',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>"{snippet}"</div>
        )}
        <div style={{ fontSize: 11, color: T.inkMuted, marginTop: 4 }}>
          {timeAgo(n.created_at)}
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
                <button
                  onClick={(e) => handleFriend(e, 'accept')}
                  disabled={friendState === 'busy'}
                  style={{
                    background: T.ink, color: T.cream,
                    border: 'none', borderRadius: 8,
                    padding: '5px 14px', fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', opacity: friendState === 'busy' ? 0.5 : 1,
                  }}
                >Accept</button>
                <button
                  onClick={(e) => handleFriend(e, 'decline')}
                  disabled={friendState === 'busy'}
                  style={{
                    background: 'transparent', color: T.inkSoft,
                    border: `1px solid ${T.line}`, borderRadius: 8,
                    padding: '5px 14px', fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', opacity: friendState === 'busy' ? 0.5 : 1,
                  }}
                >Decline</button>
              </>
            )}
          </div>
        )}
      </div>
      {unread && (
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: T.gold, flexShrink: 0, marginTop: 14,
          boxShadow: '0 0 6px rgba(184,115,58,0.6)',
        }} />
      )}
    </div>
  );
}

export default function NotificationsBell({ session, rightOffset = 0, isDesktop = false, onNavigate }) {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

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
    } else {
      setOpen(false);
    }
  }

  async function handleClick(n) {
    // Mark this notification read if it isn't already
    if (!n.read_at) {
      const now = new Date().toISOString();
      await supabase
        .from('notifications')
        .update({ read_at: now })
        .eq('id', n.id);
      setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read_at: now } : x));
      setUnreadCount(c => Math.max(0, c - 1));
    }
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
            right: bellRight,
            background: T.white, borderRadius: 14, border: `1px solid ${T.line}`,
            boxShadow: '0 8px 32px rgba(0,0,0,0.14)', overflow: 'hidden',
            width: 360, maxWidth: 'calc(100vw - 24px)',
            maxHeight: 'min(70vh, 560px)',
            display: 'flex', flexDirection: 'column',
            zIndex: 300,
          }}>
            <div style={{
              padding: '14px 18px', borderBottom: `1px solid ${T.line}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              fontFamily: T.display, fontSize: 17, fontWeight: 600, color: T.ink,
            }}>
              Notifications
              {notifs.some(n => !n.read_at) && (
                <button
                  onClick={markAllRead}
                  style={{
                    background: 'none', border: 'none', color: T.goldDark,
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    fontFamily: T.serif,
                  }}
                >Mark all read</button>
              )}
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {loading && (
                <div style={{ padding: 30, textAlign: 'center', color: T.inkMuted, fontFamily: T.serif, fontSize: 14 }}>
                  Loading…
                </div>
              )}
              {!loading && notifs.length === 0 && (
                <div style={{ padding: '40px 24px', textAlign: 'center' }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>🔔</div>
                  <div style={{ fontFamily: T.display, fontSize: 16, color: T.ink, marginBottom: 6 }}>You're all caught up.</div>
                  <div style={{ fontSize: 13, color: T.inkMuted }}>New activity will land here.</div>
                </div>
              )}
              {!loading && notifs.map(n => (
                <NotificationRow key={n.id} n={n} onClick={handleClick} onFriendAction={loadRecent} />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
