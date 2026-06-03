import { lazy, useEffect, useRef, useState, Suspense } from 'react';
import { supabase } from './supabase.js';
import { T } from './theme.js';
import { Avatar } from './ProfilePage.jsx';
import CareConversation from './CareConversation.jsx';
import { KinwoveStar } from './components/brand/KinwoveStar';
const DMConversation = lazy(() => import('./DMConversation.jsx'));

// Per-conversation read tracking in localStorage
function markConvRead(id) {
  if (!id) return;
  localStorage.setItem(`kinwove:conv-read:${id}`, new Date().toISOString());
}
function convReadTime(id) {
  return localStorage.getItem(`kinwove:conv-read:${id}`) ?? '1970-01-01T00:00:00Z';
}

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

const CARE_STATUS_LABEL = { open: 'Waiting for reply', claimed: 'In conversation', closed: 'Closed' };
const CARE_STATUS_COLOR = { open: T.goldDark, claimed: T.ink, closed: T.inkMuted };

function DeleteConfirmModal({ name, onConfirm, onCancel }) {
  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: T.white, borderRadius: 20, padding: '28px 24px',
          maxWidth: 320, width: '100%', textAlign: 'center',
          boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
        }}
      >
        <div style={{ fontFamily: T.display, fontSize: 19, fontWeight: 600, color: T.ink, marginBottom: 8 }}>
          Delete conversation?
        </div>
        <div style={{ fontFamily: T.serif, fontSize: 14, color: T.inkMuted, lineHeight: 1.65, marginBottom: 24 }}>
          Your conversation with <strong style={{ color: T.ink }}>{name}</strong> will be permanently removed.
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{
            flex: 1, background: T.parchment, border: `1px solid ${T.line}`,
            color: T.inkSoft, borderRadius: 999, padding: '11px 0',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={onConfirm} style={{
            flex: 1, background: '#c0392b', border: 'none',
            color: '#fff', borderRadius: 999, padding: '11px 0',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

function ThreadRow({ name, avatarConfig, photoUrl, subtitle, subtitleColor, lastBody, ts, onOpen, accent, active, onDelete, onMarkUnread, unread }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{ position: 'relative', marginBottom: 6 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        onClick={onOpen}
        style={{
          display: 'block', width: '100%', textAlign: 'left',
          background: active ? `rgba(184,115,58,0.10)` : unread ? `rgba(184,115,58,0.05)` : accent ? T.parchment : T.white,
          border: 'none',
          borderLeft: unread ? `3px solid ${T.goldDark}` : active ? `3px solid ${T.gold}` : '3px solid transparent',
          borderRadius: 12,
          padding: '11px 14px 11px 13px',
          cursor: 'pointer',
          outline: 'none',
          transition: 'background 0.12s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {name ? (
              <Avatar name={name} avatarConfig={avatarConfig} photoUrl={photoUrl} size={38} />
            ) : (
              <div style={{
                width: 38, height: 38, borderRadius: '50%', background: T.parchment,
                border: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}><KinwoveStar size={16} color={T.goldDark} /></div>
            )}
            {/* Unread dot anchored to avatar */}
            {unread && (
              <div style={{
                position: 'absolute', bottom: 0, right: -1,
                width: 10, height: 10, borderRadius: '50%',
                background: T.goldDark, border: `2px solid ${T.white}`,
              }} />
            )}
          </div>

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6, marginBottom: 2 }}>
              <div style={{ fontWeight: unread ? 700 : 600, fontSize: 13.5, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {name ?? 'Someone from your church'}
              </div>
              {ts && <div style={{ fontSize: 11, color: T.inkMuted, flexShrink: 0, whiteSpace: 'nowrap' }}>{timeAgo(ts)}</div>}
            </div>
            <div style={{ fontSize: 11.5, color: subtitleColor ?? T.inkMuted, marginBottom: lastBody ? 3 : 0 }}>
              {subtitle}
            </div>
            {lastBody && (
              <div style={{
                fontSize: 12.5, color: unread ? T.inkSoft : T.inkMuted,
                fontWeight: unread ? 500 : 400,
                lineHeight: 1.4, fontFamily: T.serif, fontStyle: 'italic',
                overflow: 'hidden', textOverflow: 'ellipsis',
                display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
              }}>{lastBody}</div>
            )}
          </div>

          {/* Chevron — always present, just dimmer when read */}
          <svg width="7" height="12" viewBox="0 0 7 12" fill="none" style={{ flexShrink: 0, opacity: active ? 0.7 : 0.3 }}>
            <path d="M1 1l5 5-5 5" stroke={T.ink} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </button>

      {/* Hover actions: mark-unread + delete — slide in from right */}
      {(onMarkUnread || onDelete) && (
        <div style={{
          position: 'absolute', top: '50%', right: 8,
          transform: 'translateY(-50%)',
          display: 'flex', alignItems: 'center', gap: 2,
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.15s',
          pointerEvents: hovered ? 'auto' : 'none',
        }}>
          {onMarkUnread && !unread && (
            <button
              onClick={(e) => { e.stopPropagation(); onMarkUnread(); }}
              title="Mark as unread"
              style={{
                width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer',
                background: `rgba(184,115,58,0.12)`, color: T.goldDark,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="11" height="11" viewBox="0 0 11 11" fill={T.goldDark}>
                <circle cx="5.5" cy="5.5" r="5.5" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              title="Delete"
              style={{
                width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer',
                background: 'rgba(192,57,43,0.10)', color: '#c0392b',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, lineHeight: 1,
              }}
            >×</button>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyPane() {
  return (
    <div style={{
      flex: 1, height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 10,
      background: T.cream,
    }}>
      <KinwoveStar size={28} color={T.gold} style={{ opacity: 0.35 }} />
      <div style={{ fontFamily: T.serif, fontSize: 15, fontStyle: 'italic', color: T.inkMuted }}>
        Select a conversation
      </div>
    </div>
  );
}

export default function MessagesInbox({ session, profile, onBack, pendingShareUrl, onShareSent, onOpenPost, initialCareId, onInitialCareConsumed }) {
  const [careConvs, setCareConvs] = useState([]);
  const [dmConvs, setDmConvs] = useState([]);
  const [careLastMsgs, setCareLastMsgs] = useState({});
  const [dmLastMsgs, setDmLastMsgs] = useState({});
  const [loading, setLoading] = useState(true);
  const [openCare, setOpenCare] = useState(null);
  const [openDm, setOpenDm] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const initialCareIdRef = useRef(initialCareId);
  const [readVersion, setReadVersion] = useState(0); // bumped to re-render unread state without full reload

  function markUnread(id) {
    localStorage.removeItem(`kinwove:conv-read:${id}`);
    setReadVersion((v) => v + 1);
  }
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

  // Realtime: refresh inbox when care/DM conversations change
  useEffect(() => {
    if (!session?.user?.id) return;
    const uid = session.user.id;
    const channel = supabase
      .channel(`inbox-care-rt-${uid}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'care_conversations' },
        () => setRefreshKey((k) => k + 1))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'care_conversations' },
        () => setRefreshKey((k) => k + 1))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'dm_conversations' },
        () => setRefreshKey((k) => k + 1))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.user?.id]);

  // Auto-mark currently open conversation as read when new messages arrive
  useEffect(() => {
    if (openCare?.id) markConvRead(openCare.id);
  }, [openCare?.id, careLastMsgs]);
  useEffect(() => {
    if (openDm?.id) markConvRead(openDm.id);
  }, [openDm?.id, dmLastMsgs]);

  useEffect(() => {
    if (!session?.user?.id) return;
    setLoading(true);
    const uid = session.user.id;

    (async () => {
      // Fetch plain rows — no FK joins to avoid PostgREST disambiguation issues
      const [{ data: careOut }, { data: careIn }, { data: dms }] = await Promise.all([
        // Conversations the user initiated (member side)
        supabase
          .from('care_conversations')
          .select('*')
          .eq('requester_id', uid)
          .order('last_message_at', { ascending: false, nullsFirst: false }),
        // Conversations directed at the user (pastor / care team side)
        supabase
          .from('care_conversations')
          .select('*')
          .eq('care_member_id', uid)
          .order('last_message_at', { ascending: false, nullsFirst: false }),
        supabase
          .from('dm_conversations')
          .select('*')
          .contains('participant_ids', [uid])
          .order('last_message_at', { ascending: false, nullsFirst: false }),
      ]);

      // Merge both directions, deduplicate by id, tag incoming vs outgoing
      const outIds = new Set((careOut ?? []).map((c) => c.id));
      const merged = [
        ...(careOut ?? []).map((c) => ({ ...c, _side: 'out' })),
        ...(careIn ?? []).filter((c) => !outIds.has(c.id)).map((c) => ({ ...c, _side: 'in' })),
      ].sort((a, b) => new Date(b.last_message_at ?? b.created_at) - new Date(a.last_message_at ?? a.created_at));

      // Fetch profiles for all care participants separately (avoids FK join ambiguity)
      const careProfileIds = [...new Set([
        ...(careOut ?? []).map((c) => c.care_member_id),
        ...(careIn ?? []).map((c) => c.requester_id),
      ].filter(Boolean))];
      let careProfileMap = {};
      if (careProfileIds.length) {
        const { data: careProfs } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_config, avatar_url')
          .in('id', careProfileIds);
        (careProfs ?? []).forEach((p) => { careProfileMap[p.id] = p; });
      }

      setCareConvs(merged.map((c) => ({
        ...c,
        care_member: c.care_member_id ? (careProfileMap[c.care_member_id] ?? null) : null,
        requester:   c.requester_id   ? (careProfileMap[c.requester_id]   ?? null) : null,
      })));

      const dmList = dms ?? [];
      const otherIds = dmList.map((c) => c.participant_ids.find((id) => id !== uid)).filter(Boolean);
      let profileMap = {};
      if (otherIds.length) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_config, avatar_url')
          .in('id', otherIds);
        (profiles ?? []).forEach((p) => { profileMap[p.id] = p; });
      }
      setDmConvs(dmList.map((c) => ({
        ...c,
        otherProfile: profileMap[c.participant_ids.find((id) => id !== uid)] ?? null,
      })));

      const careIds = merged.map((c) => c.id);
      if (careIds.length) {
        const { data: msgs } = await supabase
          .from('care_messages').select('*')
          .in('conversation_id', careIds)
          .order('created_at', { ascending: false });
        const map = {};
        (msgs ?? []).forEach((m) => { if (!map[m.conversation_id]) map[m.conversation_id] = m; });
        setCareLastMsgs(map);
      }

      const dmIds = dmList.map((c) => c.id);
      if (dmIds.length) {
        const { data: msgs } = await supabase
          .from('dm_messages').select('*')
          .in('conversation_id', dmIds)
          .order('created_at', { ascending: false });
        const map = {};
        (msgs ?? []).forEach((m) => { if (!map[m.conversation_id]) map[m.conversation_id] = m; });
        setDmLastMsgs(map);
      }

      setLoading(false);

      // Auto-open a specific care conversation if requested (e.g., via notification tap)
      if (initialCareIdRef.current) {
        const target = merged.find((c) => c.id === initialCareIdRef.current);
        if (target) {
          markConvRead(target.id);
          setOpenCare({ id: target.id, side: target._side });
          initialCareIdRef.current = null; // only auto-open once
          onInitialCareConsumed?.();       // clear pendingCareId in App
        }
      }
    })();
  }, [session?.user?.id, refreshKey]);

  async function deleteConversation() {
    if (!deleteConfirm) return;
    const { type, id } = deleteConfirm;
    setDeleteConfirm(null);
    if (type === 'dm') {
      if (openDm?.id === id) setOpenDm(null);
      setDmConvs((prev) => prev.filter((c) => c.id !== id));
      await supabase.from('dm_conversations').delete().eq('id', id);
    } else {
      if (openCare?.id === id) setOpenCare(null);
      setCareConvs((prev) => prev.filter((c) => c.id !== id));
      await supabase.from('care_conversations').delete().eq('id', id);
    }
  }

  // Mobile: full-screen sub-views
  if (isMobile && openCare) {
    return (
      <CareConversation
        session={session}
        profile={profile}
        conversationId={openCare.id}
        viewerRole={openCare.side === 'in' ? 'care_member' : 'requester'}
        onBack={() => setOpenCare(null)}
      />
    );
  }
  if (isMobile && openDm) {
    return (
      <Suspense fallback={null}>
        <DMConversation
          session={session}
          profile={profile}
          conversationId={openDm.id}
          otherProfile={openDm.otherProfile}
          initialMessage={openDm.initialMessage}
          onBack={() => { setOpenDm(null); setRefreshKey((k) => k + 1); }}
          onOpenPost={onOpenPost}
        />
      </Suspense>
    );
  }

  // Filtered + searched lists
  const q = search.toLowerCase().trim();

  const filteredDms = filter === 'care' ? [] : [...dmConvs]
    .sort((a, b) => {
      const aS = a.otherProfile?.display_name === 'kinwove';
      const bS = b.otherProfile?.display_name === 'kinwove';
      return aS === bS ? 0 : aS ? -1 : 1;
    })
    .filter((c) => {
      if (!q) return true;
      const name = c.otherProfile?.display_name?.toLowerCase() ?? '';
      const body = dmLastMsgs[c.id]?.body?.toLowerCase() ?? '';
      return name.includes(q) || body.includes(q);
    });

  const filteredCare = filter === 'dms' ? [] : careConvs.filter((c) => {
    if (!q) return true;
    const name = c.care_member?.display_name?.toLowerCase() ?? '';
    const body = careLastMsgs[c.id]?.body?.toLowerCase() ?? '';
    return name.includes(q) || body.includes(q);
  });

  const empty = filteredDms.length === 0 && filteredCare.length === 0;

  const convList = (
    <>
      {loading ? (
        <div style={{ color: T.inkMuted, fontFamily: T.serif, textAlign: 'center', padding: 32, fontSize: 14 }}>Loading…</div>
      ) : empty ? (
        <div style={{
          border: `1px dashed ${T.line}`, borderRadius: 14,
          padding: '28px 16px', textAlign: 'center',
          color: T.inkMuted, fontFamily: T.serif, fontStyle: 'italic', lineHeight: 1.65, fontSize: 13,
        }}>
          {q ? 'No results.' : 'No conversations yet.'}
        </div>
      ) : (
        <>
          {filteredDms.map((c) => {
            const isSystem = c.otherProfile?.display_name === 'kinwove';
            return (
              <ThreadRow
                key={c.id}
                name={c.otherProfile?.display_name}
                avatarConfig={c.otherProfile?.avatar_config}
                photoUrl={c.otherProfile?.avatar_url}
                subtitle={isSystem ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>Welcome message <KinwoveStar size={10} style={{ verticalAlign: 'middle', flexShrink: 0 }} /></span> : 'Direct message'}
                subtitleColor={isSystem ? T.goldDark : undefined}
                ts={c.last_message_at ?? c.created_at}
                lastBody={dmLastMsgs[c.id]?.body}
                unread={
                  !!dmLastMsgs[c.id] &&
                  dmLastMsgs[c.id].sender_id !== session?.user?.id &&
                  (c.last_message_at ?? c.created_at) > convReadTime(c.id)
                }
                onOpen={() => { markConvRead(c.id); setOpenCare(null); setOpenDm({ id: c.id, otherProfile: c.otherProfile, initialMessage: pendingShareUrl ?? undefined }); if (pendingShareUrl) onShareSent?.(); }}
                accent={isSystem}
                active={!isMobile && openDm?.id === c.id}
                onDelete={() => setDeleteConfirm({ type: 'dm', id: c.id, name: c.otherProfile?.display_name ?? 'this person' })}
                onMarkUnread={() => markUnread(c.id)}
              />
            );
          })}
          {filteredCare.map((c) => {
            // Incoming (pastor/care team receiving): show requester or "Someone"
            const isIncoming = c._side === 'in';
            const displayName = isIncoming
              ? (c.is_anonymous ? 'Someone from your church' : (c.requester?.display_name ?? 'Someone'))
              : (c.care_member?.display_name ?? 'Your care contact');
            const avatarConfig = isIncoming ? (c.is_anonymous ? null : c.requester?.avatar_config) : c.care_member?.avatar_config;
            const photoUrl = isIncoming ? (c.is_anonymous ? null : c.requester?.avatar_url) : c.care_member?.avatar_url;
            return (
              <ThreadRow
                key={c.id}
                name={displayName}
                avatarConfig={avatarConfig}
                photoUrl={photoUrl}
                subtitle={isIncoming ? 'From a member' : (CARE_STATUS_LABEL[c.status] ?? c.status)}
                subtitleColor={isIncoming ? T.goldDark : CARE_STATUS_COLOR[c.status]}
                ts={c.last_message_at ?? c.created_at}
                lastBody={careLastMsgs[c.id]?.body}
                unread={
                  !!careLastMsgs[c.id] &&
                  careLastMsgs[c.id].sender_id !== session?.user?.id &&
                  (c.last_message_at ?? c.created_at) > convReadTime(c.id)
                }
                onOpen={() => { markConvRead(c.id); setOpenDm(null); setOpenCare({ id: c.id, side: c._side }); }}
                active={!isMobile && openCare?.id === c.id}
                onDelete={() => setDeleteConfirm({ type: 'care', id: c.id, name: displayName })}
                onMarkUnread={() => markUnread(c.id)}
              />
            );
          })}
        </>
      )}
    </>
  );

  const filterTabs = (
    <div style={{ display: 'flex', borderBottom: `1px solid ${T.line}`, flexShrink: 0 }}>
      {[['all', 'All'], ['dms', 'Direct'], ['care', 'Care']].map(([f, label]) => (
        <button key={f} onClick={() => setFilter(f)} style={{
          flex: 1, background: 'none', border: 'none', padding: '10px 0',
          fontSize: 12, fontWeight: filter === f ? 700 : 500,
          color: filter === f ? T.gold : T.inkMuted,
          cursor: 'pointer',
          borderBottom: filter === f ? `2px solid ${T.gold}` : '2px solid transparent',
          transition: 'all 0.15s',
        }}>{label}</button>
      ))}
    </div>
  );

  // Mobile: full-page inbox list
  if (isMobile) {
    return (
      <>
        <div style={{ minHeight: '100vh', background: T.cream, padding: '28px 16px 80px', overflowY: 'auto' }}>
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <button onClick={onBack} style={{
              background: 'none', border: 'none', color: T.goldDark,
              fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 12,
            }}>← Back</button>
            <h1 style={{ fontFamily: T.serif, fontSize: 28, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em', lineHeight: 1.1, margin: '0 0 14px' }}>
              Messages
            </h1>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations…"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: T.white, border: `1px solid ${T.line}`, borderRadius: 999,
                padding: '9px 14px', fontSize: 13.5, color: T.ink, outline: 'none', marginBottom: 14,
              }}
              onFocus={(e) => (e.target.style.borderColor = T.gold)}
              onBlur={(e) => (e.target.style.borderColor = T.line)}
            />
            <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
              {[['all', 'All'], ['dms', 'Direct'], ['care', 'Care']].map(([f, label]) => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  background: filter === f ? T.gold : T.white,
                  color: filter === f ? T.cream : T.inkMuted,
                  border: `1px solid ${filter === f ? T.gold : T.line}`,
                  borderRadius: 999, padding: '6px 14px', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer',
                }}>{label}</button>
              ))}
            </div>
            {pendingShareUrl && (
              <div style={{
                background: 'linear-gradient(135deg, #fdf3dc, #fae8c2)',
                border: `1px solid ${T.goldLight}`,
                borderRadius: 12, padding: '10px 14px', marginBottom: 14,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <KinwoveStar size={14} color={T.gold} />
                <div style={{ fontFamily: T.sans, fontSize: 13, color: T.goldDark, fontWeight: 600 }}>
                  Tap a conversation to send this post
                </div>
              </div>
            )}
            {convList}
          </div>
        </div>
        {deleteConfirm && (
          <DeleteConfirmModal
            name={deleteConfirm.name}
            onConfirm={deleteConversation}
            onCancel={() => setDeleteConfirm(null)}
          />
        )}
      </>
    );
  }

  // Desktop: two-panel layout
  return (
    <>
    <div style={{ display: 'flex', height: 'calc(100vh - var(--global-header-h, 0px))', background: T.cream, overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{
        width: 300, minWidth: 240,
        borderRight: `1px solid ${T.line}`,
        background: T.white,
        display: 'flex', flexDirection: 'column',
        flexShrink: 0,
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 14px 10px',
          paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))',
          borderBottom: `1px solid ${T.line}`,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <button onClick={onBack} style={{
              width: 30, height: 30, borderRadius: '50%',
              background: T.cream, border: `1px solid ${T.line}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0, padding: 0,
            }}>
              <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
                <path d="M6 1L1 6l5 5" stroke={T.ink} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <div style={{ fontFamily: T.display, fontSize: 18, fontWeight: 600, color: T.ink, letterSpacing: '-0.01em' }}>
              Messages
            </div>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: T.cream, border: `1px solid transparent`, borderRadius: 10,
              padding: '8px 12px', fontSize: 13, color: T.ink, outline: 'none',
            }}
            onFocus={(e) => (e.target.style.borderColor = T.gold)}
            onBlur={(e) => (e.target.style.borderColor = T.line)}
          />
        </div>
        {filterTabs}
        {/* Conversation list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px' }}>
          {pendingShareUrl && (
            <div style={{
              background: 'linear-gradient(135deg, #fdf3dc, #fae8c2)',
              border: `1px solid ${T.goldLight}`,
              borderRadius: 10, padding: '8px 12px', marginBottom: 10,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <KinwoveStar size={12} color={T.gold} />
              <div style={{ fontFamily: T.sans, fontSize: 12, color: T.goldDark, fontWeight: 600 }}>
                Tap a conversation to send this post
              </div>
            </div>
          )}
          {convList}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {openDm ? (
          <Suspense fallback={null}>
            <DMConversation
              session={session}
              profile={profile}
              conversationId={openDm.id}
              otherProfile={openDm.otherProfile}
              initialMessage={openDm.initialMessage}
              onBack={() => { setOpenDm(null); setRefreshKey((k) => k + 1); }}
              onOpenPost={onOpenPost}
            />
          </Suspense>
        ) : openCare ? (
          <CareConversation
            session={session}
            profile={profile}
            conversationId={openCare.id}
            viewerRole={openCare.side === 'in' ? 'care_member' : 'requester'}
            onBack={() => setOpenCare(null)}
          />
        ) : (
          <EmptyPane />
        )}
      </div>
    </div>
    {deleteConfirm && (
      <DeleteConfirmModal
        name={deleteConfirm.name}
        onConfirm={deleteConversation}
        onCancel={() => setDeleteConfirm(null)}
      />
    )}
    </>
  );
}
