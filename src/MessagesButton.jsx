import { useCallback, useEffect, useRef, useState } from 'react';
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

const convReadTime = (id) => localStorage.getItem(`kinwove:conv-read:${id}`) ?? '1970-01-01T00:00:00Z';

export default function MessagesButton({
  session, rightOffset = 0, isDesktop = false,
  onOpenMessages,       // () => void  — navigates to full Messages page
  onOpenConversation,   // (id, kind) => void  — opens a specific conversation
}) {
  const [open, setOpen]     = useState(false);
  const [convs, setConvs]   = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const uid = session?.user?.id;

  /* ── Unread badge count (notifications table) ─────────────────── */
  const computeUnread = useCallback(async () => {
    if (!uid) return;
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', uid)
      .in('kind', ['care_message', 'dm_message'])
      .is('read_at', null);
    setUnread(count ?? 0);
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    computeUnread();
    const channel = supabase
      .channel(`msg-btn-notifs-${uid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications',
        filter: `recipient_id=eq.${uid}` }, () => computeUnread())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [uid, computeUnread]);

  /* ── Load conversations for the panel ────────────────────────────── */
  const loadConvs = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    const [{ data: careOut }, { data: careIn }, { data: dms }] = await Promise.all([
      supabase.from('care_conversations').select('*').eq('requester_id', uid)
        .order('last_message_at', { ascending: false, nullsFirst: false }).limit(15),
      supabase.from('care_conversations').select('*').eq('care_member_id', uid)
        .order('last_message_at', { ascending: false, nullsFirst: false }).limit(15),
      supabase.from('dm_conversations').select('*').contains('participant_ids', [uid])
        .order('last_message_at', { ascending: false, nullsFirst: false }).limit(15),
    ]);

    // Merge + deduplicate care convs
    const outIds = new Set((careOut ?? []).map(c => c.id));
    const mergedCare = [
      ...(careOut ?? []).map(c => ({ ...c, _kind: 'care', _side: 'out' })),
      ...(careIn  ?? []).filter(c => !outIds.has(c.id)).map(c => ({ ...c, _kind: 'care', _side: 'in' })),
    ];

    // Fetch other-party profiles for care
    const careProfileIds = [...new Set([
      ...(careOut ?? []).map(c => c.care_member_id),
      ...(careIn  ?? []).map(c => c.requester_id),
    ].filter(Boolean))];
    let careProfileMap = {};
    if (careProfileIds.length) {
      const { data: profs } = await supabase.from('profiles')
        .select('id, display_name, avatar_config, avatar_url').in('id', careProfileIds);
      (profs ?? []).forEach(p => { careProfileMap[p.id] = p; });
    }
    const careRows = mergedCare.map(c => ({
      ...c,
      _name: c._side === 'in'
        ? (c.is_anonymous ? 'Anonymous' : (careProfileMap[c.requester_id]?.display_name ?? 'Someone'))
        : (careProfileMap[c.care_member_id]?.display_name ?? 'Care team'),
      _avatarConfig: c._side === 'in'
        ? (c.is_anonymous ? null : careProfileMap[c.requester_id]?.avatar_config)
        : careProfileMap[c.care_member_id]?.avatar_config,
      _avatarUrl: c._side === 'in'
        ? (c.is_anonymous ? null : careProfileMap[c.requester_id]?.avatar_url)
        : careProfileMap[c.care_member_id]?.avatar_url,
      _subtitle: c._side === 'in' ? 'Care · From a member' : 'Care',
      _ts: c.last_message_at ?? c.created_at,
    }));

    // Fetch DM profiles
    const dmList = dms ?? [];
    const otherIds = dmList.map(c => c.participant_ids.find(id => id !== uid)).filter(Boolean);
    let profileMap = {};
    if (otherIds.length) {
      const { data: profs } = await supabase.from('profiles')
        .select('id, display_name, avatar_config, avatar_url').in('id', otherIds);
      (profs ?? []).forEach(p => { profileMap[p.id] = p; });
    }
    const dmRows = dmList.map(c => {
      const otherId = c.participant_ids.find(id => id !== uid);
      const prof = profileMap[otherId] ?? null;
      return {
        ...c, _kind: 'dm',
        _name: prof?.display_name ?? 'Someone',
        _avatarConfig: prof?.avatar_config,
        _avatarUrl: prof?.avatar_url,
        _subtitle: 'Direct message',
        _ts: c.last_message_at ?? c.created_at,
      };
    });

    // Fetch last messages
    const allConvs = [...careRows, ...dmRows]
      .sort((a, b) => new Date(b._ts) - new Date(a._ts));

    const careIds = careRows.map(c => c.id);
    const dmIds   = dmRows.map(c => c.id);
    let lastMsgMap = {};
    if (careIds.length) {
      const { data: msgs } = await supabase.from('care_messages').select('conversation_id, body, sender_id')
        .in('conversation_id', careIds).order('created_at', { ascending: false });
      (msgs ?? []).forEach(m => { if (!lastMsgMap[m.conversation_id]) lastMsgMap[m.conversation_id] = m; });
    }
    if (dmIds.length) {
      const { data: msgs } = await supabase.from('dm_messages').select('conversation_id, body, sender_id')
        .in('conversation_id', dmIds).order('created_at', { ascending: false });
      (msgs ?? []).forEach(m => { if (!lastMsgMap[m.conversation_id]) lastMsgMap[m.conversation_id] = m; });
    }

    setConvs(allConvs.map(c => ({
      ...c,
      _lastMsg: lastMsgMap[c.id] ?? null,
      _unread: !!lastMsgMap[c.id] &&
        lastMsgMap[c.id].sender_id !== uid &&
        (c._ts) > convReadTime(c.id),
    })));
    setLoading(false);
  }, [uid]);

  useEffect(() => {
    if (open) loadConvs();
  }, [open, loadConvs]);

  /* ── Keyboard / outside-click close ────────────────────────────── */
  useEffect(() => {
    if (!open) return;
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [open]);

  const right = isDesktop ? rightOffset + 12 : rightOffset + 12 + 44 + 8;

  const filtered = filter === 'unread' ? convs.filter(c => c._unread) : convs;

  return (
    <>
      {/* Icon button */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Messages"
        title="Messages"
        style={{
          position: 'fixed',
          top: isDesktop ? 6 : 'calc(env(safe-area-inset-top, 0px) + 10px)',
          right,
          width: 44, height: 44, borderRadius: '50%',
          background: open ? T.ink : T.cream,
          border: `1px solid ${open ? T.ink : 'rgba(26,17,8,0.08)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', zIndex: 200,
          boxShadow: '0 2px 8px rgba(44,24,16,0.10)',
          color: open ? T.cream : T.inkSoft, padding: 0,
          transition: 'background 0.15s, color 0.15s',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        {unread > 0 && !open && (
          <span style={{
            position: 'absolute', top: -3, right: -3,
            minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999,
            background: T.error, color: T.cream,
            fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `2px solid ${T.white}`,
            lineHeight: 1,
          }}>{unread > 99 ? '99+' : unread}</span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 199 }}>
          <div onClick={e => e.stopPropagation()} style={{
            position: 'absolute',
            top: isDesktop ? 56 : 'calc(env(safe-area-inset-top, 0px) + 56px)',
            right,
            width: 360, maxWidth: 'calc(100vw - 24px)',
            background: T.white, borderRadius: 16,
            border: `1px solid ${T.line}`,
            boxShadow: '0 8px 40px rgba(0,0,0,0.16)',
            overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
            maxHeight: 'min(72vh, 580px)',
            zIndex: 200,
          }}>
            {/* Header */}
            <div style={{ padding: '18px 18px 10px', flexShrink: 0 }}>
              <div style={{
                fontFamily: T.display, fontSize: 22, fontWeight: 700,
                color: T.ink, letterSpacing: '-0.02em', marginBottom: 12,
              }}>Messages</div>

              {/* Filter tabs */}
              <div style={{ display: 'flex', gap: 6 }}>
                {[['all', 'All'], ['unread', 'Unread']].map(([f, label]) => (
                  <button key={f} onClick={() => setFilter(f)} style={{
                    borderRadius: 999, padding: '5px 14px',
                    fontSize: 13, fontWeight: 600,
                    background: filter === f ? `rgba(184,115,58,0.12)` : 'transparent',
                    color: filter === f ? T.goldDark : T.inkMuted,
                    border: 'none', cursor: 'pointer',
                    transition: 'all 0.12s',
                  }}>{label}</button>
                ))}
              </div>
            </div>

            {/* Conversation list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px 8px' }}>
              {loading && (
                <div style={{ padding: '30px 0', textAlign: 'center', color: T.inkMuted, fontSize: 13, fontFamily: T.serif }}>
                  Loading…
                </div>
              )}
              {!loading && filtered.length === 0 && (
                <div style={{ padding: '30px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
                  <div style={{ fontSize: 13.5, color: T.inkMuted, fontFamily: T.serif }}>
                    {filter === 'unread' ? 'No unread messages' : 'No conversations yet'}
                  </div>
                </div>
              )}
              {!loading && filtered.map(c => (
                <button key={c.id} onClick={() => {
                  setOpen(false);
                  onOpenConversation?.(c.id, c._kind, c._side);
                }} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  width: '100%', textAlign: 'left',
                  background: 'transparent', border: 'none',
                  borderRadius: 12, padding: '8px 10px',
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(44,24,16,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {/* Avatar */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    {c._name ? (
                      <Avatar name={c._name} avatarConfig={c._avatarConfig} photoUrl={c._avatarUrl} size={46} />
                    ) : (
                      <div style={{
                        width: 46, height: 46, borderRadius: '50%',
                        background: T.parchment, border: `1px solid ${T.line}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}><KinwoveStar size={18} color={T.goldDark} /></div>
                    )}
                    {c._unread && (
                      <div style={{
                        position: 'absolute', bottom: 1, right: 1,
                        width: 12, height: 12, borderRadius: '50%',
                        background: T.goldDark, border: `2px solid ${T.white}`,
                      }} />
                    )}
                  </div>

                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
                      <div style={{
                        fontWeight: c._unread ? 700 : 600, fontSize: 14,
                        color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{c._name}</div>
                      <div style={{ fontSize: 11.5, color: T.inkMuted, flexShrink: 0 }}>{timeAgo(c._ts)}</div>
                    </div>
                    <div style={{
                      fontSize: 13, color: c._unread ? T.inkSoft : T.inkMuted,
                      fontWeight: c._unread ? 500 : 400,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      fontFamily: c._lastMsg ? T.serif : T.sans,
                      fontStyle: c._lastMsg ? 'italic' : 'normal',
                      marginTop: 1,
                    }}>
                      {c._lastMsg?.body ?? c._subtitle}
                    </div>
                  </div>

                  {/* Unread dot — right side */}
                  {c._unread && (
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: T.goldDark, flexShrink: 0,
                    }} />
                  )}
                </button>
              ))}
            </div>

            {/* Footer */}
            <button onClick={() => { setOpen(false); onOpenMessages?.(); }} style={{
              width: '100%', padding: '13px 18px',
              borderTop: `1px solid ${T.line}`,
              background: 'transparent', border: 'none',
              borderTop: `1px solid ${T.line}`,
              fontSize: 14, fontWeight: 600, color: T.goldDark,
              cursor: 'pointer', textAlign: 'center',
              letterSpacing: '-0.01em',
              transition: 'background 0.1s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = `rgba(184,115,58,0.05)`}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              Open Messages →
            </button>
          </div>
        </div>
      )}
    </>
  );
}
