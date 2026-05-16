import { lazy, useEffect, useState, Suspense } from 'react';
import { supabase } from './supabase.js';
import { T } from './theme.js';
import { Avatar } from './ProfilePage.jsx';
import CareConversation from './CareConversation.jsx';
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

function SectionLabel({ children, top }) {
  return (
    <div style={{
      fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase',
      color: T.inkMuted, fontWeight: 700, margin: `${top ? 0 : 24}px 0 8px`,
    }}>{children}</div>
  );
}

function ThreadRow({ name, avatarConfig, photoUrl, subtitle, subtitleColor, lastBody, ts, onOpen, accent }) {
  return (
    <button
      onClick={onOpen}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        background: accent ? T.parchment : T.white,
        border: accent ? `1px solid ${T.gold}88` : `1px solid ${T.line}`,
        borderRadius: 14,
        padding: '14px 16px', cursor: 'pointer', marginBottom: 10,
        boxShadow: accent ? `0 0 0 3px ${T.gold}14` : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: lastBody ? 6 : 0 }}>
        {name ? (
          <Avatar name={name} avatarConfig={avatarConfig} photoUrl={photoUrl} size={38} />
        ) : (
          <div style={{
            width: 38, height: 38, borderRadius: '50%', background: T.parchment,
            border: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: T.goldDark, fontSize: 16, flexShrink: 0,
          }}>✦</div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14.5, color: T.ink, marginBottom: 2 }}>
            {name ?? 'Someone from your church'}
          </div>
          <div style={{ fontSize: 12, color: subtitleColor ?? T.inkMuted }}>
            {subtitle}{ts && <> · {timeAgo(ts)}</>}
          </div>
        </div>
        <span style={{ color: T.inkMuted, fontSize: 14 }}>→</span>
      </div>
      {lastBody && (
        <div style={{
          fontSize: 13, color: T.inkSoft, lineHeight: 1.5, fontFamily: T.serif, fontStyle: 'italic',
          overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          paddingLeft: 50,
        }}>{lastBody}</div>
      )}
    </button>
  );
}

export default function MessagesInbox({ session, profile, onBack }) {
  const [careConvs, setCareConvs] = useState([]);
  const [dmConvs, setDmConvs] = useState([]);
  const [careLastMsgs, setCareLastMsgs] = useState({});
  const [dmLastMsgs, setDmLastMsgs] = useState({});
  const [loading, setLoading] = useState(true);
  const [openCare, setOpenCare] = useState(null);   // conv id
  const [openDm, setOpenDm] = useState(null);       // { id, otherProfile }

  useEffect(() => {
    if (!session?.user?.id) return;
    setLoading(true);
    const uid = session.user.id;

    (async () => {
      const [
        { data: care },
        { data: dms },
      ] = await Promise.all([
        supabase
          .from('care_conversations')
          .select('*, care_member:profiles!care_member_id(id, display_name, avatar_config, avatar_url)')
          .eq('requester_id', uid)
          .order('last_message_at', { ascending: false, nullsFirst: false }),
        supabase
          .from('dm_conversations')
          .select('*, p1:profiles!inner(id, display_name, avatar_config, avatar_url)')
          .contains('participant_ids', [uid])
          .order('last_message_at', { ascending: false, nullsFirst: false }),
      ]);

      setCareConvs(care ?? []);

      // Resolve the other participant's profile for each DM
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

      // Last messages for care threads
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

      // Last messages for DM threads
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
  }, [session?.user?.id]);

  if (openCare) {
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

  if (openDm) {
    return (
      <Suspense fallback={null}>
        <DMConversation
          session={session}
          profile={profile}
          conversationId={openDm.id}
          otherProfile={openDm.otherProfile}
          onBack={() => setOpenDm(null)}
        />
      </Suspense>
    );
  }

  const empty = careConvs.length === 0 && dmConvs.length === 0;

  return (
    <div style={{ minHeight: '100vh', background: T.cream, padding: '32px 20px 80px', overflowY: 'auto' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', color: T.goldDark,
          fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 14,
        }}>← Back</button>

        <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: T.goldDark, marginBottom: 8 }}>
          Your messages
        </div>
        <h1 style={{ fontFamily: T.display, fontSize: 32, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em', lineHeight: 1.1, margin: '0 0 24px' }}>
          Conversations
        </h1>

        {loading ? (
          <div style={{ color: T.inkMuted, fontFamily: T.serif, textAlign: 'center', padding: 40 }}>Loading…</div>
        ) : empty ? (
          <div style={{
            background: T.white, border: `1px dashed ${T.line}`, borderRadius: 14,
            padding: '40px 20px', textAlign: 'center',
            color: T.inkMuted, fontFamily: T.serif, fontStyle: 'italic', lineHeight: 1.65,
          }}>
            No conversations yet.<br />
            Message someone from their profile, or use "Talk to someone" from your church.
          </div>
        ) : (
          <>
            {dmConvs.length > 0 && (
              <>
                <SectionLabel top>Direct messages</SectionLabel>
                {/* Sort: "kinwove" system account pinned first */}
                {[...dmConvs]
                  .sort((a, b) => {
                    const aIsSystem = a.otherProfile?.display_name === 'kinwove';
                    const bIsSystem = b.otherProfile?.display_name === 'kinwove';
                    if (aIsSystem && !bIsSystem) return -1;
                    if (!aIsSystem && bIsSystem) return 1;
                    return 0;
                  })
                  .map((c) => {
                    const isSystem = c.otherProfile?.display_name === 'kinwove';
                    return (
                      <ThreadRow
                        key={c.id}
                        name={c.otherProfile?.display_name}
                        avatarConfig={c.otherProfile?.avatar_config}
                        photoUrl={c.otherProfile?.avatar_url}
                        subtitle={isSystem ? 'Welcome message ✦' : 'Direct message'}
                        subtitleColor={isSystem ? T.goldDark : undefined}
                        ts={c.last_message_at ?? c.created_at}
                        lastBody={dmLastMsgs[c.id]?.body}
                        onOpen={() => setOpenDm({ id: c.id, otherProfile: c.otherProfile })}
                        accent={isSystem}
                      />
                    );
                  })}
              </>
            )}

            {careConvs.length > 0 && (
              <>
                <SectionLabel top={dmConvs.length === 0}>Care conversations</SectionLabel>
                {careConvs.map((c) => (
                  <ThreadRow
                    key={c.id}
                    name={c.care_member?.display_name}
                    avatarConfig={c.care_member?.avatar_config}
                    photoUrl={c.care_member?.avatar_url}
                    subtitle={CARE_STATUS_LABEL[c.status] ?? c.status}
                    subtitleColor={CARE_STATUS_COLOR[c.status]}
                    ts={c.last_message_at ?? c.created_at}
                    lastBody={careLastMsgs[c.id]?.body}
                    onOpen={() => setOpenCare(c.id)}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
