import { useEffect, useRef, useState } from 'react';
import { supabase, authedFetch } from './supabase.js';
import { T } from './theme.js';
import { Avatar } from './ProfilePage.jsx';
import MsgText from './MsgText.jsx';
import { getSystemPrompt } from './prompts.js';
import { KinwoveStar } from './components/brand/KinwoveStar';

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
  const DRAFT_KEY = `kw:dm-draft:${conversationId}`;
  const [input, setInput] = useState(() => sessionStorage.getItem(DRAFT_KEY) ?? '');
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [other, setOther] = useState(otherProfile ?? null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const bottomRef = useRef(null);
  const aiAbortRef = useRef(null);
  const isSystem = isSystemAccount(other);

  async function askAi() {
    if (!aiQuery.trim() || aiLoading) return;
    aiAbortRef.current?.abort();
    const ctrl = new AbortController();
    aiAbortRef.current = ctrl;
    setAiResponse('');
    setAiLoading(true);
    try {
      const res = await authedFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({
          system: getSystemPrompt(profile?.person_type ?? 'curious', null, 0),
          messages: [{ role: 'user', content: aiQuery.trim() }],
          personType: profile?.person_type ?? 'curious',
        }),
      });
      if (!res.ok || !res.body) { setAiLoading(false); return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let full = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const events = buf.split('\n\n');
        buf = events.pop() ?? '';
        for (const raw of events) {
          const lines = raw.split('\n');
          const ev = lines.find((l) => l.startsWith('event: '))?.slice(7).trim();
          const data = lines.find((l) => l.startsWith('data: '))?.slice(6);
          if (ev === 'text' && data) {
            try { const delta = JSON.parse(data).delta; full += delta; setAiResponse((r) => r + delta); } catch {}
          }
        }
      }
    } catch {}
    setAiLoading(false);
  }

  async function sendAiResponse() {
    if (!aiResponse.trim()) return;
    const body = `✦ kinwove says:\n\n${aiResponse.trim()}`;
    const { data: newMsg } = await supabase.from('dm_messages').insert({
      conversation_id: conversationId, sender_id: session.user.id, body,
    }).select().single();
    if (newMsg) {
      setMessages((prev) => [...prev, newMsg]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
    setAiOpen(false);
    setAiQuery('');
    setAiResponse('');
  }

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
        if (payload.new.sender_id === session?.user?.id) return;
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
    sessionStorage.removeItem(DRAFT_KEY);
    const { data: newMsg } = await supabase.from('dm_messages').insert({
      conversation_id: conversationId,
      sender_id: session.user.id,
      body,
    }).select().single();
    if (newMsg) {
      setMessages((prev) => [...prev, newMsg]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
    setSending(false);
  }

  async function deleteMsg(id) {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    await supabase.from('dm_messages').delete().eq('id', id);
    setDeletingId(null);
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '100vh', background: T.cream }}>
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
        {messages.map((msg, i) => {
          const isMe = msg.sender_id === session?.user?.id;
          const prevMsg = messages[i - 1];
          const sameSenderAsPrev = prevMsg?.sender_id === msg.sender_id;
          const senderName = isMe ? 'You' : (other?.display_name ?? '…');

          return (
            <div key={msg.id} style={{ marginBottom: 8, marginTop: sameSenderAsPrev ? 0 : 6 }}>
              {/* Sender name */}
              {!sameSenderAsPrev && (
                <div style={{
                  fontSize: 11, fontWeight: 600, color: T.inkMuted,
                  marginBottom: 3, textAlign: isMe ? 'right' : 'left',
                  paddingLeft: isMe ? 0 : 2, paddingRight: isMe ? 2 : 0,
                }}>
                  {senderName}
                </div>
              )}

              {/* Bubble row — full width, justify pushes bubble to correct side */}
              <div style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 6 }}>
                {isMe && (
                  deletingId === msg.id ? (
                    <button onClick={() => deleteMsg(msg.id)} style={{ background: 'none', border: 'none', color: '#c0392b', fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: '2px 8px', borderRadius: 6, whiteSpace: 'nowrap', flexShrink: 0 }}>
                      Delete
                    </button>
                  ) : (
                    <button onClick={() => setDeletingId(msg.id)} style={{ background: 'none', border: 'none', color: T.inkMuted, fontSize: 13, cursor: 'pointer', padding: '2px 4px', flexShrink: 0, opacity: 0.45, lineHeight: 1 }} title="Delete message">
                      ×
                    </button>
                  )
                )}
                <div
                  onClick={() => isMe && setDeletingId(deletingId === msg.id ? null : msg.id)}
                  onContextMenu={(e) => { if (isMe) { e.preventDefault(); setDeletingId(msg.id); } }}
                  style={{
                    maxWidth: '75%',
                    background: isMe ? T.gold : T.white,
                    color: isMe ? T.cream : T.ink,
                    border: isMe ? 'none' : `1px solid ${T.line}`,
                    borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    padding: '10px 14px',
                    fontSize: 14.5, lineHeight: 1.6,
                    cursor: isMe ? 'pointer' : 'default',
                    wordBreak: 'break-word',
                  }}
                >
                  <div style={{ fontFamily: isMe ? 'inherit' : T.serif }}>
                    <MsgText text={msg.body} />
                  </div>
                </div>
              </div>

              {/* Timestamp below bubble */}
              <div style={{
                fontSize: 10.5, color: T.inkMuted, marginTop: 3,
                textAlign: isMe ? 'right' : 'left',
                paddingLeft: isMe ? 0 : 2, paddingRight: isMe ? 2 : 0,
              }}>
                {timeAgo(msg.created_at)}
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
        <div style={{ flexShrink: 0 }}>
          {/* AI ask panel */}
          {aiOpen && (
            <div style={{
              background: T.parchment, borderTop: `1px solid ${T.line}`,
              padding: '12px 14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <KinwoveStar size={14} color={T.gold} />
                <span style={{ fontSize: 12, fontWeight: 600, color: T.goldDark }}>Ask kinwove</span>
                <button onClick={() => { setAiOpen(false); setAiQuery(''); setAiResponse(''); aiAbortRef.current?.abort(); }}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', color: T.inkMuted, fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</button>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: aiResponse || aiLoading ? 10 : 0 }}>
                <input
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && askAi()}
                  placeholder="Ask a Bible or faith question…"
                  style={{
                    flex: 1, border: `1px solid ${T.line}`, borderRadius: 999,
                    padding: '9px 14px', fontSize: 14, color: T.ink,
                    background: T.white, outline: 'none', fontFamily: 'inherit',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = T.gold)}
                  onBlur={(e) => (e.target.style.borderColor = T.line)}
                />
                <button onClick={askAi} disabled={!aiQuery.trim() || aiLoading} style={{
                  background: T.gold, color: T.cream, border: 'none', borderRadius: 999,
                  padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  opacity: !aiQuery.trim() || aiLoading ? 0.5 : 1,
                }}>Ask</button>
              </div>
              {(aiResponse || aiLoading) && (
                <div style={{
                  background: T.white, border: `1px solid ${T.line}`, borderRadius: 12,
                  padding: '12px 14px', maxHeight: 160, overflowY: 'auto',
                }}>
                  <div style={{ fontFamily: T.serif, fontSize: 14, color: T.ink, lineHeight: 1.7 }}>
                    {aiResponse || <span style={{ color: T.inkMuted }}>Thinking…</span>}
                  </div>
                  {!aiLoading && aiResponse && (
                    <button onClick={sendAiResponse} style={{
                      marginTop: 10, background: T.ink, color: T.cream, border: 'none',
                      borderRadius: 999, padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    }}>
                      Share to conversation
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Normal input row */}
          <div style={{
            padding: '10px 16px',
            paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
            background: T.white, borderTop: `1px solid ${T.line}`,
            display: 'flex', gap: 10, alignItems: 'flex-end',
          }}>
            {/* AI assist button */}
            <button
              onClick={() => setAiOpen((v) => !v)}
              title="Ask kinwove"
              style={{
                width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                background: aiOpen ? 'rgba(184,115,58,0.15)' : T.parchment,
                border: `1px solid ${aiOpen ? T.gold : T.line}`,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: T.gold, fontSize: 16, transition: 'all 0.15s',
              }}
            ><KinwoveStar size={18} color={T.gold} /></button>
            <textarea
              value={input}
              onChange={(e) => { setInput(e.target.value); sessionStorage.setItem(DRAFT_KEY, e.target.value); }}
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
        </div>
      )}
    </div>
  );
}
