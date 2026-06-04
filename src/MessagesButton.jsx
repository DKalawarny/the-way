import { useEffect, useState } from 'react';
import { supabase } from './supabase.js';
import { T } from './theme.js';

// Same source of truth as NotificationsBell — unread notifications of
// kind care_message or dm_message that haven't been read yet.
export default function MessagesButton({ session, rightOffset = 0, isDesktop = false, onClick }) {
  const [unread, setUnread] = useState(0);
  const uid = session?.user?.id;

  async function computeUnread() {
    if (!uid) return;
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', uid)
      .in('kind', ['care_message', 'dm_message'])
      .is('read_at', null);
    setUnread(count ?? 0);
  }

  useEffect(() => {
    if (!uid) return;
    computeUnread();

    // Recompute whenever notifications change for this user
    const channel = supabase
      .channel(`msg-btn-notifs-${uid}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'notifications',
        filter: `recipient_id=eq.${uid}`,
      }, () => computeUnread())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [uid]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleClick() {
    setUnread(0);
    onClick?.();
  }

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
