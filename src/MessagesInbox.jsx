import { lazy, useEffect, useState, Suspense } from 'react';
import { supabase } from './supabase.js';
import { T } from './theme.js';
import { Avatar } from './ProfilePage.jsx';
import CareConversation from './CareConversation.jsx';
import { KinwoveStar } from './components/brand/KinwoveStar';
const DMConversation = lazy(() => import('./DMConversation.jsx'));

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

function ThreadRow({ name, avatarConfig, photoUrl, subtitle, subtitleColor, lastBody, ts, onOpen, accent, active, onDelete, unread }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{ position: 'relative', marginBottom: 8 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        onClick={onOpen}
        style={{
          display: 'block', width: '100%', textAlign: 'left',
          background: active ? `${T.gold}1A` : unread ? `rgba(184,115,58,0.06)` : accent ? T.parchment : T.white,
          border: active ? `1px solid ${T.gold}66` : unread ? `1px solid rgba(184,115,58,0.3)` : accent ? `1px solid ${T.gold}88` : `1px solid ${T.line}`,
          borderRadius: 14,
          padding: '12px 14px',
          paddingRight: onDelete ? 42 : 14,
          cursor: 'pointer',
          boxShadow: accent && !active ? `0 0 0 3px ${T.gold}14` : 'none',
          transition: 'background 0.12s, border-color 0.12s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: lastBody ? 5 : 0 }}>
          {name ? (
            <Avatar name={name} avatarConfig={avatarConfig} photoUrl={photoUrl} size={36} />
          ) : (
            <div style={{
              width: 36, height: 36, borderRadius: '50%', background: T.parchment,
              border: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}><KinwoveStar size={16} color={T.goldDark} /></div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: unread ? 700 : 600, fontSize: 13.5, color: T.ink, marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {name ?? 'Someone from your church'}
            </div>
            <div style={{ fontSize: 11.5, color: subtitleColor ?? T.inkMuted }}>
              {subtitle}{ts && <> · {timeAgo(ts)}</>}
            </div>
          </div>
          {unread && (
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: T.goldDark, flexShrink: 0 }} />
          )}
          {!unread && <span style={{ color: T.inkMuted, fontSize: 13 }}>›</span>}
        </div>
        {lastBody && (
          <div style={{
            fontSize: 12.5, color: T.inkSoft, lineHeight: 1.45, fontFamily: T.serif, fontStyle: 'italic',
            overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
            WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
            paddingLeft: 46,
          }}>{lastBody}</div>
        )}
      </button>
      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="Delete conversation"
          style={{
            position: 'absolute', top: '50%', right: 10,
            transform: 'translateY(-50%)',
            background: hovered ? 'rgba(192,57,43,0.12)' : 'transparent',
            border: 'none',
            color: hovered ? '#c0392b' : T.inkMuted,
            fontSize: 17, lineHeight: 1,
            cursor: 'pointer', padding: '4px 8px', borderRadius: 8, zIndex: 1,
            opacity: hovered ? 1 : 0.4,
            transition: 'all 0.15s',
          }}
        >×</button>
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

export default function MessagesInbox({ session, profile, onBack, pendingShareUrl, onShareSent }) {
  const [careConvs, setCareConvs] = useState([]);
  const [dmConvs, setDmConvs] = useState([]);
  const [careLastMsgs, setCareLastMsgs] = useState({});
  const [dmLastMsgs, setDmLastMsgs] = useState({});
  const [loading, setLoading] = useState(true);
  const [openCare, setOpenCare] = useState(null);
  const [openDm, setOpenDm] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;
    setLoading(true);
    const uid = session.user.id;

    (async () => {
      const [{ data: care }, { data: dms }] = await Promise.all([
        supabase
          .from('care_conversations')
          .select('*, care_member:profiles!care_member_id(id, display_name, avatar_config, avatar_url)')
          .eq('requester_id', uid)
          .order('last_message_at', { ascending: false, nullsFirst: false }),
        supabase
          .from('dm_conversations')
          .select('*')
          .contains('participant_ids', [uid])
          .order('last_message_at', { ascending: false, nullsFirst: false }),
      ]);

      setCareConvs(care ?? []);

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

      const careIds = (care ?? []).map((c) => c.id);
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
      if (openCare === id) setOpenCare(null);
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
        conversationId={openCare}
        viewerRole="requester"
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
                unread={!!dmLastMsgs[c.id] && dmLastMsgs[c.id].sender_id !== session?.user?.id}
                onOpen={() => { setOpenCare(null); setOpenDm({ id: c.id, otherProfile: c.otherProfile, initialMessage: pendingShareUrl ?? undefined }); if (pendingShareUrl) onShareSent?.(); }}
                accent={isSystem}
                active={!isMobile && openDm?.id === c.id}
                onDelete={() => setDeleteConfirm({ type: 'dm', id: c.id, name: c.otherProfile?.display_name ?? 'this person' })}
              />
            );
          })}
          {filteredCare.map((c) => (
            <ThreadRow
              key={c.id}
              name={c.care_member?.display_name}
              avatarConfig={c.care_member?.avatar_config}
              photoUrl={c.care_member?.avatar_url}
              subtitle={CARE_STATUS_LABEL[c.status] ?? c.status}
              subtitleColor={CARE_STATUS_COLOR[c.status]}
              ts={c.last_message_at ?? c.created_at}
              lastBody={careLastMsgs[c.id]?.body}
              onOpen={() => { setOpenDm(null); setOpenCare(c.id); }}
              active={!isMobile && openCare === c.id}
              onDelete={() => setDeleteConfirm({ type: 'care', id: c.id, name: c.care_member?.display_name ?? 'this conversation' })}
            />
          ))}
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
          padding: '18px 16px 12px',
          paddingTop: 'calc(18px + env(safe-area-inset-top, 0px))',
          borderBottom: `1px solid ${T.line}`,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <button onClick={onBack} style={{
              background: 'none', border: 'none', color: T.goldDark,
              fontSize: 18, cursor: 'pointer', padding: 0, lineHeight: 1,
            }}>←</button>
            <div style={{ fontFamily: T.display, fontSize: 20, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em' }}>
              Messages
            </div>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: T.cream, border: `1px solid ${T.line}`, borderRadius: 999,
              padding: '8px 13px', fontSize: 13, color: T.ink, outline: 'none',
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
            />
          </Suspense>
        ) : openCare ? (
          <CareConversation
            session={session}
            profile={profile}
            conversationId={openCare}
            viewerRole="requester"
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
