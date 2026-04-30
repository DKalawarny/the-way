import { useEffect, useRef, useState } from 'react';
import { supabase } from './supabase.js';
import { T } from './theme.js';
import { Avatar } from './ProfilePage.jsx';

const SAFETY_PATTERNS = [
  /\b(suicide|kill myself|end my life|don'?t want to (be alive|live)|wanna die|want to die|self[\s-]?harm|cutting myself|hurt myself)\b/i,
  /\b(being (abused|hit|beaten)|he hits|she hits|hits me|raped|sexual(ly)? assault|molest)\b/i,
  /\b(starving myself|throwing up after|purging)\b/i,
];

const CRISIS_RESOURCES = [
  { label: 'US/Canada · Suicide & Crisis Lifeline', value: '988' },
  { label: 'UK · Samaritans', value: '116 123' },
  { label: 'International', value: 'findahelpline.com' },
];

function detectSafety(text) {
  if (!text) return false;
  return SAFETY_PATTERNS.some((p) => p.test(text));
}

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function SafetyBanner() {
  return (
    <div style={{
      background: 'rgba(165,63,43,0.06)', border: `1px solid rgba(165,63,43,0.35)`,
      borderRadius: 12, padding: '14px 16px', margin: '0 0 14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 16 }}>⚠</span>
        <strong style={{ fontSize: 13, color: T.error }}>This may need professional support</strong>
      </div>
      <div style={{ fontSize: 13, color: T.inkSoft, lineHeight: 1.6, marginBottom: 10 }}>
        You don't have to handle this alone. Stay present, listen, and gently share these resources. If there's immediate danger, encourage them to call emergency services.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {CRISIS_RESOURCES.map((r) => (
          <div key={r.value} style={{ fontSize: 12.5, color: T.inkSoft }}>
            <strong style={{ color: T.ink }}>{r.value}</strong> — {r.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CareConversation({ session, profile, conversationId, viewerRole, onBack, onClaimed }) {
  // viewerRole: 'requester' | 'care_member' | 'unclaimed'
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [showSafety, setShowSafety] = useState(false);
  const [otherProfile, setOtherProfile] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!conversationId) return;
    let active = true;
    setLoading(true);
    (async () => {
      const { data: c } = await supabase
        .from('care_conversations')
        .select('*')
        .eq('id', conversationId)
        .maybeSingle();
      if (!active) return;
      setConversation(c);

      if (c) {
        const otherId = viewerRole === 'requester' ? c.care_member_id : c.requester_id;
        const showOther = otherId && !(viewerRole === 'care_member' && c.is_anonymous);
        if (showOther) {
          const { data: p } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_config')
            .eq('id', otherId)
            .maybeSingle();
          if (active) setOtherProfile(p);
        }

        const { data: msgs } = await supabase
          .from('care_messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });
        if (active) {
          setMessages(msgs ?? []);
          setShowSafety((msgs ?? []).some((m) => m.is_safety_flag));
        }
      }
      if (active) setLoading(false);
    })();

    const channel = supabase
      .channel(`care-msgs-${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'care_messages', filter: `conversation_id=eq.${conversationId}` }, ({ new: m }) => {
        setMessages((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]);
        if (m.is_safety_flag) setShowSafety(true);
      })
      .subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [conversationId, viewerRole]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  async function handleSend() {
    if (!draft.trim() || !session?.user?.id || !conversation) return;
    const body = draft.trim();
    const flag = detectSafety(body);
    setSending(true);
    setDraft('');

    const { data, error } = await supabase
      .from('care_messages')
      .insert({
        conversation_id: conversation.id,
        sender_id: session.user.id,
        body,
        is_safety_flag: flag,
      })
      .select()
      .single();

    if (!error && data) {
      setMessages((m) => m.some((x) => x.id === data.id) ? m : [...m, data]);
      if (flag) {
        setShowSafety(true);
        await supabase.from('care_conversations')
          .update({ safety_flagged: true, last_message_at: new Date().toISOString() })
          .eq('id', conversation.id);
      } else {
        await supabase.from('care_conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', conversation.id);
      }
    }
    setSending(false);
  }

  async function handleClaim() {
    if (!session?.user?.id || !conversation) return;
    const { data } = await supabase
      .from('care_conversations')
      .update({ care_member_id: session.user.id, status: 'claimed' })
      .eq('id', conversation.id)
      .select()
      .single();
    if (data) {
      setConversation(data);
      onClaimed?.(data);
    }
  }

  async function handleClose() {
    if (!conversation) return;
    if (!confirm('Close this conversation? Both of you will still be able to read it.')) return;
    const { data } = await supabase
      .from('care_conversations')
      .update({ status: 'closed' })
      .eq('id', conversation.id)
      .select()
      .single();
    if (data) setConversation(data);
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: T.cream, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: T.inkMuted, fontFamily: T.serif }}>Loading…</div>
      </div>
    );
  }
  if (!conversation) {
    return (
      <div style={{ minHeight: '100vh', background: T.cream, padding: '40px 20px' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: T.goldDark, fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 18 }}>← Back</button>
          <div style={{ fontFamily: T.serif, color: T.ink }}>Conversation not found.</div>
        </div>
      </div>
    );
  }

  const isUnclaimed = viewerRole === 'unclaimed' || (viewerRole === 'care_member' && !conversation.care_member_id);
  const headingName = viewerRole === 'requester'
    ? (otherProfile?.display_name ?? 'Care team')
    : conversation.is_anonymous ? 'Someone in your church' : (otherProfile?.display_name ?? 'Member');
  const headingSubtitle = conversation.topic
    ? `Topic: ${conversation.topic}`
    : null;

  const closed = conversation.status === 'closed';

  return (
    <div style={{ minHeight: '100vh', background: T.cream, display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <header style={{
        padding: '0 16px', height: 60, background: T.white,
        borderBottom: `1px solid ${T.line}`,
        display: 'flex', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10, gap: 10,
      }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', color: T.goldDark, fontSize: 14, cursor: 'pointer', padding: '6px 4px',
        }}>← Back</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          {viewerRole === 'requester' && otherProfile && (
            <Avatar name={otherProfile.display_name} avatarConfig={otherProfile.avatar_config} size={32} />
          )}
          {viewerRole !== 'requester' && conversation.is_anonymous && (
            <div style={{
              width: 32, height: 32, borderRadius: '50%', background: T.parchment,
              border: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: T.goldDark, fontSize: 14,
            }}>?</div>
          )}
          {viewerRole !== 'requester' && !conversation.is_anonymous && otherProfile && (
            <Avatar name={otherProfile.display_name} avatarConfig={otherProfile.avatar_config} size={32} />
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14.5, color: T.ink, lineHeight: 1.2 }}>{headingName}</div>
            {headingSubtitle && (
              <div style={{ fontSize: 11.5, color: T.inkMuted, lineHeight: 1.2 }}>{headingSubtitle}</div>
            )}
          </div>
        </div>
        {viewerRole === 'care_member' && !closed && conversation.care_member_id === session?.user?.id && (
          <button onClick={handleClose} style={{
            background: 'transparent', border: `1px solid ${T.line}`, borderRadius: 999,
            padding: '6px 12px', fontSize: 12, color: T.inkMuted, cursor: 'pointer',
          }}>Close</button>
        )}
      </header>

      {/* Body */}
      <div ref={scrollRef} className="scroll" style={{
        flex: 1, overflowY: 'auto', padding: '20px 16px',
      }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          {/* Privacy reminder for both sides */}
          <div style={{
            fontSize: 12, color: T.inkMuted, textAlign: 'center', fontStyle: 'italic',
            padding: '0 0 14px', lineHeight: 1.6,
          }}>
            Private conversation. Only the two of you can see it. Your pastor cannot read this.
          </div>

          {/* Unclaimed claim card (for care team viewing routed-to-anyone) */}
          {isUnclaimed && viewerRole === 'care_member' && (
            <div style={{
              background: T.parchment, border: `1px solid ${T.goldLight}`, borderRadius: 14,
              padding: 16, marginBottom: 16, textAlign: 'center',
            }}>
              <div style={{ fontSize: 13, color: T.inkSoft, marginBottom: 12, lineHeight: 1.55 }}>
                This conversation is open for anyone on the care team. Claim it to reply.
              </div>
              <button onClick={handleClaim} style={{
                background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
                padding: '9px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}>Claim conversation</button>
            </div>
          )}

          {showSafety && viewerRole === 'care_member' && <SafetyBanner />}

          {messages.map((m) => {
            const mine = m.sender_id === session?.user?.id;
            return (
              <div key={m.id} style={{
                display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start',
                marginBottom: 8,
              }}>
                <div style={{
                  maxWidth: '78%',
                  background: mine ? T.ink : T.white,
                  color: mine ? T.cream : T.ink,
                  border: mine ? 'none' : `1px solid ${T.line}`,
                  borderRadius: 16, padding: '10px 14px',
                  fontFamily: T.serif, fontSize: 15, lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  borderTopRightRadius: mine ? 4 : 16,
                  borderTopLeftRadius:  mine ? 16 : 4,
                }}>
                  {m.body}
                  <div style={{
                    fontSize: 10, color: mine ? 'rgba(253,248,240,0.55)' : T.inkMuted,
                    marginTop: 4, fontFamily: T.sans,
                  }}>
                    {timeAgo(m.created_at)}
                    {m.is_safety_flag && <span style={{ marginLeft: 6, color: mine ? T.goldLight : T.error }}>· flagged</span>}
                  </div>
                </div>
              </div>
            );
          })}

          {messages.length === 0 && !isUnclaimed && (
            <div style={{ textAlign: 'center', color: T.inkMuted, fontFamily: T.serif, fontStyle: 'italic', padding: 30 }}>
              Say hello — anything you'd like to share.
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      {!closed && !isUnclaimed && (
        <div style={{
          borderTop: `1px solid ${T.line}`, padding: '12px 16px', background: T.white,
        }}>
          <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSend(); }
              }}
              placeholder="Write a message…"
              rows={1}
              style={{
                flex: 1, border: `1px solid ${T.line}`, borderRadius: 14,
                padding: '11px 14px', fontSize: 15, fontFamily: T.serif, lineHeight: 1.55,
                background: T.cream, outline: 'none', resize: 'none', minHeight: 44, maxHeight: 200,
                boxSizing: 'border-box',
              }}
            />
            <button
              onClick={handleSend}
              disabled={sending || !draft.trim()}
              style={{
                background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
                padding: '10px 18px', fontSize: 14, fontWeight: 600,
                cursor: (sending || !draft.trim()) ? 'not-allowed' : 'pointer',
                opacity: (sending || !draft.trim()) ? 0.5 : 1,
              }}
            >Send</button>
          </div>
        </div>
      )}

      {closed && (
        <div style={{
          borderTop: `1px solid ${T.line}`, padding: '14px 16px', background: T.parchment,
          textAlign: 'center', fontSize: 13, color: T.inkSoft, fontFamily: T.serif, fontStyle: 'italic',
        }}>
          This conversation is closed.
        </div>
      )}
    </div>
  );
}
