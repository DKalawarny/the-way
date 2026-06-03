import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { supabase } from './supabase.js';
import { T } from './theme.js';
import CareConversation from './CareConversation.jsx';
import { KinwoveStar } from './components/brand/KinwoveStar.jsx';

const COVENANT_VERSION = 1;
const STORAGE_KEY = 'kinwove:care-covenant-accepted-v1';

function CovenantModal({ onAccept, onDecline }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(44,24,16,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: T.cream, borderRadius: 18, maxWidth: 560, width: '100%',
        padding: '28px 26px', border: `1px solid ${T.line}`,
      }}>
        <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: T.goldDark, marginBottom: 8 }}>
          Care team covenant
        </div>
        <h2 style={{ fontFamily: T.serif, fontSize: 26, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em', lineHeight: 1.15, margin: '0 0 14px' }}>
          Before you step in
        </h2>
        <div style={{ fontFamily: T.serif, fontSize: 15, color: T.ink, lineHeight: 1.75 }}>
          <p style={{ margin: '0 0 12px' }}>
            People will trust you with hard things. A few promises before you begin:
          </p>
          <ul style={{ margin: '0 0 16px', paddingLeft: 20, lineHeight: 1.85 }}>
            <li><strong>Confidentiality.</strong> What's shared with you stays between you and that person — unless they're in danger.</li>
            <li><strong>Listen first.</strong> Most people don't need answers. They need to feel heard.</li>
            <li><strong>Stay in your lane.</strong> Don't try to handle abuse, suicide ideation, or mental health crises alone. Loop in your pastor and licensed help.</li>
            <li><strong>No proselytizing the pre-believer.</strong> If a seeker shows up, walk with them; don't preach at them.</li>
            <li><strong>Pray, don't fix.</strong> Faith works in time. Be present.</li>
          </ul>
          <p style={{ margin: '0 0 6px', fontSize: 13.5, color: T.inkSoft }}>
            By continuing, you accept this covenant. You can step away anytime by asking your pastor.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
          <button onClick={onDecline} style={{
            background: 'transparent', border: `1px solid ${T.line}`, borderRadius: 999,
            padding: '9px 16px', fontSize: 13, color: T.inkMuted, cursor: 'pointer',
          }}>Not yet</button>
          <button onClick={onAccept} style={{
            background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
            padding: '9px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>I accept</button>
        </div>
      </div>
    </div>
  );
}

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function ConversationRow({ conversation, lastMessage, onOpen, isUnclaimed }) {
  const subjectName = conversation.is_anonymous ? 'Someone in your church' : 'A member';
  return (
    <button onClick={() => onOpen(conversation)} style={{
      display: 'block', width: '100%', textAlign: 'left',
      background: T.white, border: `1px solid ${T.line}`, borderRadius: 14,
      padding: '14px 16px', cursor: 'pointer', marginBottom: 10,
      position: 'relative',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', background: T.parchment,
          border: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: T.goldDark, fontSize: 14,
        }}>
          {conversation.is_anonymous ? '?' : <KinwoveStar size={14} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14.5, color: T.ink }}>{subjectName}</div>
          <div style={{ fontSize: 12, color: T.inkMuted }}>
            {conversation.topic ? `Topic: ${conversation.topic}` : 'No topic specified'}
            {' · '}{timeAgo(conversation.last_message_at ?? conversation.created_at)}
          </div>
        </div>
        {isUnclaimed && (
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
            background: T.gold, color: T.cream, borderRadius: 999, padding: '3px 9px',
          }}>Open</span>
        )}
        {conversation.safety_flagged && (
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
            background: 'rgba(165,63,43,0.12)', color: T.error,
            border: `1px solid rgba(165,63,43,0.4)`,
            borderRadius: 999, padding: '3px 9px',
          }}>Sensitive</span>
        )}
        {conversation.status === 'closed' && (
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
            background: T.parchment, color: T.inkMuted, borderRadius: 999, padding: '3px 9px',
          }}>Closed</span>
        )}
      </div>
      {lastMessage && (
        <div style={{ fontSize: 13, color: T.inkSoft, lineHeight: 1.5, fontFamily: T.serif, fontStyle: 'italic',
          overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', maxHeight: 40,
        }}>
          {lastMessage.body}
        </div>
      )}
    </button>
  );
}

export default function CareTeamInbox({ session, profile, churchId, onBack }) {
  const [view, setView] = useState('list');
  const [openConvId, setOpenConvId] = useState(null);
  const [openConvViewerRole, setOpenConvViewerRole] = useState('care_member');
  const [conversations, setConversations] = useState([]);
  const [unclaimed, setUnclaimed] = useState([]);
  const [lastMsgs, setLastMsgs] = useState({});
  const [loading, setLoading] = useState(true);
  const [showCovenant, setShowCovenant] = useState(false);
  const [memberRecord, setMemberRecord] = useState(null);

  useEffect(() => {
    if (!session?.user?.id || !churchId) return;
    setLoading(true);
    (async () => {
      const { data: m } = await supabase
        .from('care_team_members')
        .select('*')
        .eq('church_id', churchId)
        .eq('user_id', session.user.id)
        .maybeSingle();
      setMemberRecord(m);

      const accepted = m?.accepted_covenant_at || localStorage.getItem(STORAGE_KEY) === String(COVENANT_VERSION);
      if (!accepted) setShowCovenant(true);

      const [{ data: claimed }, { data: open }] = await Promise.all([
        // No church_id filter — RLS (auth.uid() = care_member_id) already scopes
        // results to this user only. Removing the filter avoids a church_id
        // mismatch when profile.church_id differs from the conversation's church_id.
        supabase
          .from('care_conversations')
          .select('*')
          .eq('care_member_id', session.user.id)
          .order('last_message_at', { ascending: false }),
        supabase
          .from('care_conversations')
          .select('*')
          .eq('church_id', churchId)
          .is('care_member_id', null)
          .eq('status', 'open')
          .order('created_at', { ascending: false }),
      ]);

      setConversations(claimed ?? []);
      setUnclaimed(open ?? []);

      const allIds = [...(claimed ?? []), ...(open ?? [])].map((c) => c.id);
      if (allIds.length > 0) {
        const { data: msgs } = await supabase
          .from('care_messages')
          .select('*')
          .in('conversation_id', allIds)
          .order('created_at', { ascending: false });
        const map = {};
        (msgs ?? []).forEach((m) => { if (!map[m.conversation_id]) map[m.conversation_id] = m; });
        setLastMsgs(map);
      }
      setLoading(false);
    })();
  }, [session?.user?.id, churchId]);

  async function handleAcceptCovenant() {
    if (memberRecord) {
      await supabase
        .from('care_team_members')
        .update({ accepted_covenant_at: new Date().toISOString() })
        .eq('id', memberRecord.id);
    }
    localStorage.setItem(STORAGE_KEY, String(COVENANT_VERSION));
    setShowCovenant(false);
  }

  function openConversation(c) {
    setOpenConvId(c.id);
    setOpenConvViewerRole(c.care_member_id === session?.user?.id ? 'care_member' : 'unclaimed');
    setView('conv');
  }

  if (view === 'conv' && openConvId) {
    return (
      <CareConversation
        session={session}
        profile={profile}
        conversationId={openConvId}
        viewerRole={openConvViewerRole}
        onBack={() => { setView('list'); setOpenConvId(null); }}
        onClaimed={(updated) => {
          setUnclaimed((u) => u.filter((c) => c.id !== updated.id));
          setConversations((c) => [updated, ...c]);
          setOpenConvViewerRole('care_member');
        }}
      />
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: T.cream, padding: '32px 20px 80px', overflowY: 'auto' }}>
      {showCovenant && <CovenantModal onAccept={handleAcceptCovenant} onDecline={onBack} />}
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', color: T.goldDark, cursor: 'pointer', padding: 0, marginBottom: 14,
          display: 'flex', alignItems: 'center', gap: 5, fontSize: 14,
        }}><ArrowLeft size={15} strokeWidth={2} /> Back</button>

        <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: T.goldDark, marginBottom: 8 }}>
          Care Team
        </div>
        <h1 style={{ fontFamily: T.serif, fontSize: 32, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em', lineHeight: 1.1, margin: '0 0 8px' }}>
          Conversations
        </h1>
        <p style={{ color: T.inkSoft, fontSize: 14, lineHeight: 1.65, margin: '0 0 20px' }}>
          Private threads with people who reached out. Only the two of you can see them.
        </p>

        {loading ? (
          <div style={{ color: T.inkMuted, fontFamily: T.serif, textAlign: 'center', padding: 40 }}>Loading…</div>
        ) : (
          <>
            {unclaimed.length > 0 && (
              <>
                <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, margin: '0 0 8px', display: 'flex', alignItems: 'center' }}>
                  <KinwoveStar size={12} style={{ verticalAlign: 'middle', marginRight: 5, flexShrink: 0 }} /> Open · waiting for someone
                </div>
                {unclaimed.map((c) => (
                  <ConversationRow key={c.id} conversation={c} lastMessage={lastMsgs[c.id]} onOpen={openConversation} isUnclaimed />
                ))}
              </>
            )}

            {conversations.length > 0 && (
              <>
                <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.inkMuted, fontWeight: 700, margin: '20px 0 8px' }}>
                  Yours
                </div>
                {conversations.map((c) => (
                  <ConversationRow key={c.id} conversation={c} lastMessage={lastMsgs[c.id]} onOpen={openConversation} />
                ))}
              </>
            )}

            {unclaimed.length === 0 && conversations.length === 0 && (
              <div style={{
                background: T.white, border: `1px dashed ${T.line}`, borderRadius: 14,
                padding: '40px 20px', textAlign: 'center',
                color: T.inkMuted, fontFamily: T.serif, fontStyle: 'italic', lineHeight: 1.6,
              }}>
                Quiet for now.<br />
                When someone reaches out, you'll see them here.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
