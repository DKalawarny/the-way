import { useEffect, useState } from 'react';
import { supabase } from './supabase.js';
import { T } from './theme.js';

// Per-conversation read timestamps (written by MessagesInbox when a conv is opened)
const convReadTime = (id) => localStorage.getItem(`kinwove:conv-read:${id}`) ?? '1970-01-01T00:00:00Z';

export default function MessagesButton({ session, rightOffset = 0, isDesktop = false, onClick }) {
  const [unread, setUnread] = useState(0);

  async function computeUnread(uid) {
    const [{ data: dms }, { data: careOut }, { data: careIn }] = await Promise.all([
      supabase
        .from('dm_conversations')
        .select('id, last_message_at, participant_ids')
        .contains('participant_ids', [uid]),
      supabase
        .from('care_conversations')
        .select('id, last_message_at')
        .eq('requester_id', uid),
      supabase
        .from('care_conversations')
        .select('id, last_message_at')
        .eq('care_member_id', uid),
    ]);

    // Merge care both directions, deduplicate
    const careMap = new Map();
    [...(careOut ?? []), ...(careIn ?? [])].forEach((c) => careMap.set(c.id, c));
    const allCare = [...careMap.values()];

    // DM unread: last_message_at > convReadTime AND latest message not from me
    let dmUnread = 0;
    const staleConvDms = (dms ?? []).filter((c) => c.last_message_at && c.last_message_at > convReadTime(c.id));
    if (staleConvDms.length) {
      const { data: latestMsgs } = await supabase
        .from('dm_messages')
        .select('conversation_id, sender_id')
        .in('conversation_id', staleConvDms.map((c) => c.id))
        .order('created_at', { ascending: false });
      const seen = new Set();
      (latestMsgs ?? []).forEach((m) => {
        if (!seen.has(m.conversation_id)) {
          seen.add(m.conversation_id);
          if (m.sender_id !== uid) dmUnread++;
        }
      });
    }

    // Care unread: last_message_at > convReadTime AND latest message not from me
    let careUnread = 0;
    const staleCare = allCare.filter((c) => c.last_message_at && c.last_message_at > convReadTime(c.id));
    if (staleCare.length) {
      const { data: latestMsgs } = await supabase
        .from('care_messages')
        .select('conversation_id, sender_id')
        .in('conversation_id', staleCare.map((c) => c.id))
        .order('created_at', { ascending: false });
      const seen = new Set();
      (latestMsgs ?? []).forEach((m) => {
        if (!seen.has(m.conversation_id)) {
          seen.add(m.conversation_id);
          if (m.sender_id !== uid) careUnread++;
        }
      });
    }

    setUnread(dmUnread + careUnread);
  }

  useEffect(() => {
    if (!session?.user?.id) return;
    const uid = session.user.id;
    computeUnread(uid);

    // Realtime: recompute when any message arrives
    const channel = supabase
      .channel(`msg-btn-rt-${uid}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'care_messages' },
        () => computeUnread(uid))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dm_messages' },
        () => computeUnread(uid))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'care_conversations' },
        () => computeUnread(uid))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'dm_conversations' },
        () => computeUnread(uid))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.user?.id]);

  function handleClick() {
    setUnread(0);
    onClick?.();
  }

  // Desktop: slot 0 (rightmost, no ⋮ FAB)   Mobile: slot 1 (right of ⋮)
  const right = isDesktop ? rightOffset + 12 : rightOffset + 12 + 44 + 8;

  return (
    <button
      onClick={handleClick}
      aria-label="Messages"
      title="Messages"
      style={{
        position: 'fixed',
        top: isDesktop ? 6 : 'calc(env(safe-area-inset-top, 0px) + 10px)',
        right,
        width: 44, height: 44, borderRadius: '50%',
        background: T.cream, border: `1px solid rgba(26,17,8,0.08)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', zIndex: 160,
        boxShadow: '0 2px 8px rgba(44,24,16,0.10)',
        color: T.inkSoft, padding: 0,
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      {unread > 0 && (
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
        }}>{unread > 99 ? '99+' : unread}</span>
      )}
    </button>
  );
}
