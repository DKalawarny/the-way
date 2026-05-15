import { useEffect, useRef, useState } from 'react';
import { supabase } from './supabase.js';
import { T } from './theme.js';
import { Avatar } from './ProfilePage.jsx';
import MsgText from './MsgText.jsx';

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// The system "kinwove" account is identified by display_name — read-only thread
const isSystemAccount = (p) => p?.display_name === 'kinwove';

export default function DMConversation({ session, profile, conversationId, otherProfile, onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [other, setOther] = useState(otherProfile ?? null);
  const bottomRef = useRef(null);
  const isSystem = isSystemAccount(other);

  useEffect(() => {
    if (!conversationId) return;

    // Load messages
    supabase
      .from('dm_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setMessages(data ?? []);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'instant' }), 0);
      });

    // Load other participant's profile if not passed in
    if (!otherProfile && session?.user?.id) {
      supabase
        .from('dm_conversations')
        .select('participant_ids')
        .eq('id', conversationId)
        .single()
        .then(({ data }) => {
          if (!data) return;
          const otherId = data.participant_ids.find((id) => id !== session.user.id);
          if (otherId) {
            supabase
              .from('profiles')
              .select('id, display_name, avatar_config, avatar_url')
              .eq('id', otherId)
              .single()
              .then(({ data: p }) => { if (p) setOther(p); });
          }
        });
    }

    // Real-time subscription
    const channel = supabase
      .channel(`dm:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'dm_messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  async function send() {
    const body = input.trim();
    if (!body || sending || !session?.user?.id) return;
    setSending(true);
    setInput('');
    await supabase.from('dm_messages').insert({
      conversation_id: conversationId,
      sender_id: session.user.id,
      body,
    });
    setSending(false);
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: T.cream }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: isSystem ? T.parchment : T.white,
        borderBottom: `1px solid ${isSystem ? T.gold + '44' : T.line}`,
        flexShrink: 0,
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}><div style={{ height: 56, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px' }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', color: T.goldDark, fontSize: 20,
          cursor: 'pointer', padding: 0, lineHeight: 1,
        }}>←</button>
        {other && (
          <Avatar name={other.display_name} avatarConfig={other.avatar_config} photoUrl={other.avatar_url} size={32} />
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: T.display, fontSize: 16, fontWeight: 600, color: T.ink }}>
            {other?.display_name ?? '…'}
          </div>
          {isSystem && (
            <div style={{ fontSize: 11, color: T.goldDark, letterSpacing: '0.04em' }}>Your welcome message</div>
          )}
        </div>
      </div></div>

      {/* Message list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px' }}>
        {messages.map((msg) => {
          const isMe = msg.sender_id === session?.user?.id;
          return (
            <div key={msg.id} style={{
              display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start',
              marginBottom: 10,
            }}>
              <div style={{
                maxWidth: '80%',
                background: isMe ? T.ink : T.white,
                color: isMe ? T.cream : T.ink,
                border: isMe ? 'none' : `1px solid ${T.line}`,
                borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                padding: '10px 14px',
                fontSize: 14.5, lineHeight: 1.6,
              }}>
                {isMe ? (
                  <div>{msg.body}</div>
                ) : (
                  <div style={{ fontFamily: T.serif }}>
                    <MsgText text={msg.body} />
                  </div>
                )}
                <div style={{ fontSize: 10.5, color: isMe ? 'rgba(253,248,240,0.5)' : T.inkMuted, marginTop: 4, textAlign: 'right' }}>
                  {timeAgo(msg.created_at)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input — hidden for system account (one-way welcome thread) */}
      {isSystem ? (
        <div style={{
          padding: '12px 20px',
          paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
          background: T.parchment, borderTop: `1px solid ${T.gold}44`,
          textAlign: 'center', flexShrink: 0,
          fontSize: 13, color: T.inkMuted, fontFamily: T.serif, fontStyle: 'italic',
        }}>
          This is a welcome message from kinwove — not a monitored inbox.
          Use the <strong style={{ fontStyle: 'normal', color: T.inkSoft }}>Ask ✦</strong> button to start a conversation.
        </div>
      ) : (
        <div style={{
          padding: '10px 16px',
          paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
          background: T.white, borderTop: `1px solid ${T.line}`,
          display: 'flex', gap: 10, alignItems: 'flex-end', flexShrink: 0,
        }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Message…"
            rows={1}
            style={{
              flex: 1, resize: 'none', border: `1px solid ${T.line}`, borderRadius: 20,
              padding: '10px 14px', fontSize: 15, fontFamily: 'inherit', color: T.ink,
              background: T.cream, outline: 'none', lineHeight: 1.45,
              maxHeight: 120, overflowY: 'auto',
            }}
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
            onFocus={(e) => (e.target.style.borderColor = T.gold)}
            onBlur={(e) => (e.target.style.borderColor = T.line)}
          />
          <button
            onClick={send}
            disabled={!input.trim() || sending}
            style={{
              width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
              background: input.trim() ? T.ink : T.parchment,
              border: 'none', cursor: input.trim() ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: input.trim() ? T.cream : T.inkMuted,
              fontSize: 18, transition: 'background 0.15s',
            }}
          >↑</button>
        </div>
      )}
    </div>
  );
}
