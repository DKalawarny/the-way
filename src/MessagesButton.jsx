import { useEffect, useState } from 'react';
import { supabase } from './supabase.js';
import { T } from './theme.js';

const STORAGE_KEY = 'theway:messages-last-opened';

export default function MessagesButton({ session, rightOffset = 0, isDesktop = false, onClick }) {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!session?.user?.id) return;
    const uid = session.user.id;
    const lastOpened = localStorage.getItem(STORAGE_KEY) ?? '1970-01-01T00:00:00Z';

    (async () => {
      const [{ data: dms }, { data: care }] = await Promise.all([
        supabase
          .from('dm_conversations')
          .select('id, last_message_at, participant_ids')
          .contains('participant_ids', [uid])
          .gt('last_message_at', lastOpened),
        supabase
          .from('care_conversations')
          .select('id, last_message_at')
          .eq('requester_id', uid)
          .gt('last_message_at', lastOpened),
      ]);

      // Only count DM threads where the latest message was from the other person
      let dmUnread = 0;
      if (dms?.length) {
        const { data: latestMsgs } = await supabase
          .from('dm_messages')
          .select('conversation_id, sender_id')
          .in('conversation_id', dms.map((c) => c.id))
          .order('created_at', { ascending: false });
        const seen = new Set();
        (latestMsgs ?? []).forEach((m) => {
          if (!seen.has(m.conversation_id)) {
            seen.add(m.conversation_id);
            if (m.sender_id !== uid) dmUnread++;
          }
        });
      }

      setUnread(dmUnread + (care?.length ?? 0));
    })();
  }, [session?.user?.id]);

  function handleClick() {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
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
        // Desktop: centre in the 56px global header (56-44)/2=6px
        // Mobile: clear the safe-area notch
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
