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
  const [editingId, setEditingId] = useState(null);
  const [editBody, setEditBody] = useState('');
  const [other, setOther] = useState(otherProfile ?? null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [aiThread, setAiThread] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const bottomRef = useRef(null);
  const editRef = useRef(null);
  const aiBottomRef = useRef(null);
  const aiAbortRef = useRef(null);
  const isSystem = isSystemAccount(other);

  async function askAi() {
    const q = aiQuery.trim();
    if (!q || aiLoading) return;
    aiAbortRef.current?.abort();
    const ctrl = new AbortController();
    aiAbortRef.current = ctrl;

    const newThread = [...aiThread, { role: 'user', content: q }];
    setAiThread([...newThread, { role: 'assistant', content: '' }]);
    setAiQuery('');
    setAiLoading(true);
    setTimeout(() => aiBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

    try {
      const res = await authedFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({
          system: getSystemPrompt(profile?.person_type ?? 'curious', null, 0),
          messages: newThread,
          personType: profile?.person_type ?? 'curious',
          plan: profile?.plan ?? 'free',
        }),
      });
      if (!res.ok || !res.body) { setAiLoading(false); return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
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
            try {
              const delta = JSON.parse(data).delta;
              setAiThread((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: updated[updated.length - 1].content + delta };
                return updated;
              });
              setTimeout(() => aiBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 0);
            } catch {}
          }
        }
      }
    } catch {}
    setAiLoading(false);
  }

  async function sendAiResponse() {
    const lastAi = [...aiThread].reverse().find((m) => m.role === 'assistant');
    if (!lastAi?.content.trim()) return;
    const body = `✦ kinwove says:\n\n${lastAi.content.trim()}`;
    const tempId = `temp-${Date.now()}`;
    const tempMsg = { id: tempId, conversation_id: conversationId, sender_id: session.user.id, body, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, tempMsg]);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    setAiOpen(false);
    setAiThread([]);
    setAiQuery('');
    const { data: newMsg } = await supabase.from('dm_messages').insert({
      conversation_id: conversationId, sender_id: session.user.id, body,
    }).select().single();
    if (newMsg) setMessages((prev) => prev.map((m) => m.id === tempId ? newMsg : m));
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
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'dm_messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'dm_messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        setMessages((prev) => prev.map((m) => m.id === payload.new.id ? { ...m, body: payload.new.body } : m));
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
    setDeletingId(null);
    supabase.from('dm_messages').delete().eq('id', id);
  }

  function startEdit(msg) {
    setDeletingId(null);
    setEditingId(msg.id);
    setEditBody(msg.body);
    setTimeout(() => { editRef.current?.focus(); editRef.current?.select(); }, 50);
  }

  async function saveEdit(id) {
    const body = editBody.trim();
    if (!body) return;
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, body } : m));
    setEditingId(null);
    setEditBody('');
    supabase.from('dm_messages').update({ body }).eq('id', id);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditBody('');
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: T.cream }}>
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
        {messages.length === 0 && !isSystem && (
          <div style={{
            height: '100%', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 10,
            color: T.inkMuted, fontFamily: T.serif, textAlign: 'center', padding: '0 24px',
          }}>
            <div style={{ fontSize: 36 }}>✉</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: T.inkSoft, fontFamily: T.display }}>
              Start a conversation with {other?.display_name?.split(' ')[0] ?? 'them'}
            </div>
            <div style={{ fontSize: 13, fontStyle: 'italic', lineHeight: 1.6 }}>
              Say hello, share something on your heart, or ask how they're doing.
            </div>
          </div>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.sender_id === session?.user?.id;
          const prevMsg = messages[i - 1];
          const sameSenderAsPrev = prevMsg?.sender_id === msg.sender_id;
          const senderName = isMe ? 'You' : (other?.display_name ?? '…');
          const isEditing = editingId === msg.id;
          const isDeleting = deletingId === msg.id;

          return (
            <div key={msg.id} style={{ marginBottom: 8, marginTop: sameSenderAsPrev ? 0 : 6 }}>
              {!sameSenderAsPrev && (
                <div style={{ fontSize: 11, fontWeight: 600, color: T.inkMuted, marginBottom: 3, textAlign: isMe ? 'right' : 'left', paddingLeft: isMe ? 0 : 2, paddingRight: isMe ? 2 : 0 }}>
                  {senderName}
                </div>
              )}

              {isEditing ? (
                /* ── Inline edit mode ── */
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, alignItems: 'flex-end' }}>
                  <div style={{ maxWidth: '75%', width: '100%' }}>
                    <textarea
                      ref={editRef}
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(msg.id); }
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      rows={Math.min(6, (editBody.match(/\n/g)?.length ?? 0) + 1)}
                      style={{
                        width: '100%', boxSizing: 'border-box', resize: 'none',
                        background: T.gold, color: T.cream,
                        border: `2px solid ${T.goldDark}`, borderRadius: '18px 18px 4px 18px',
                        padding: '10px 14px', fontSize: 14.5, lineHeight: 1.6,
                        fontFamily: 'inherit', outline: 'none',
                      }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 4 }}>
                      <button onClick={cancelEdit} style={{ background: 'none', border: `1px solid ${T.line}`, color: T.inkMuted, fontSize: 12, borderRadius: 999, padding: '4px 12px', cursor: 'pointer' }}>Cancel</button>
                      <button onClick={() => saveEdit(msg.id)} style={{ background: T.ink, color: T.cream, border: 'none', fontSize: 12, fontWeight: 600, borderRadius: 999, padding: '4px 12px', cursor: 'pointer' }}>Save</button>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── Normal bubble ── */
                <div style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 6 }}>
                  {isMe && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', flexShrink: 0 }}>
                      {isDeleting ? (
                        <button onClick={() => deleteMsg(msg.id)} style={{ background: 'none', border: 'none', color: '#c0392b', fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: '2px 8px', borderRadius: 6, whiteSpace: 'nowrap' }}>Delete</button>
                      ) : (
                        <>
                          <button onClick={() => startEdit(msg)} style={{ background: 'none', border: 'none', color: T.inkMuted, fontSize: 12, cursor: 'pointer', padding: '2px 4px', opacity: 0.45, lineHeight: 1 }} title="Edit message">✎</button>
                          <button onClick={() => setDeletingId(msg.id)} style={{ background: 'none', border: 'none', color: T.inkMuted, fontSize: 14, cursor: 'pointer', padding: '2px 4px', opacity: 0.45, lineHeight: 1 }} title="Delete message">×</button>
                        </>
                      )}
                    </div>
                  )}
                  {(() => {
                    const AI_PREFIX = '✦ kinwove says:\n\n';
                    const isAiMsg = msg.body.startsWith(AI_PREFIX);
                    const aiBody = isAiMsg ? msg.body.slice(AI_PREFIX.length) : null;
                    return (
                      <div style={{
                        maxWidth: '75%',
                        background: isAiMsg ? T.parchment : isMe ? T.gold : T.white,
                        color: T.ink,
                        border: isAiMsg ? `1px solid ${T.gold}88` : isMe ? 'none' : `1px solid ${T.line}`,
                        borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        padding: isAiMsg ? '0' : '10px 14px',
                        fontSize: 14.5, lineHeight: 1.6,
                        wordBreak: 'break-word', userSelect: 'text', cursor: 'text',
                        overflow: 'hidden',
                      }}>
                        {isAiMsg ? (
                          <>
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: 7,
                              padding: '8px 14px 7px',
                              borderBottom: `1px solid ${T.gold}55`,
                              background: `${T.gold}18`,
                            }}>
                              <KinwoveStar size={13} color={T.goldDark} />
                              <span style={{ fontSize: 12, fontWeight: 700, color: T.goldDark, letterSpacing: '0.02em', fontFamily: T.display }}>kinwove says</span>
                            </div>
                            <div style={{ padding: '10px 14px', fontFamily: T.serif }}>
                              <MsgText text={aiBody} />
                            </div>
                          </>
                        ) : (
                          <div style={{ fontFamily: isMe ? 'inherit' : T.serif }}>
                            <MsgText text={msg.body} />
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              <div style={{ fontSize: 10.5, color: T.inkMuted, marginTop: 3, textAlign: isMe ? 'right' : 'left', paddingLeft: isMe ? 0 : 2, paddingRight: isMe ? 2 : 0 }}>
                {timeAgo(msg.created_at)}{msg._edited ? ' · edited' : ''}
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
          Use the <strong style={{ fontStyle: 'normal', color: T.inkSoft }}>Ask <KinwoveStar size={12} style={{ verticalAlign: 'middle', marginLeft: 2, flexShrink: 0 }} /></strong> button to start a conversation.
        </div>
      ) : (
        <div style={{ flexShrink: 0 }}>
          {/* AI ask panel */}
          {aiOpen && (
            <div style={{
              background: T.parchment, borderTop: `1px solid ${T.line}`,
              display: 'flex', flexDirection: 'column', maxHeight: 340,
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px 8px', flexShrink: 0 }}>
                <KinwoveStar size={14} color={T.gold} />
                <span style={{ fontSize: 12, fontWeight: 600, color: T.goldDark }}>Ask kinwove</span>
                {aiThread.length > 0 && (
                  <button onClick={() => setAiThread([])} style={{ background: 'none', border: 'none', color: T.inkMuted, fontSize: 11, cursor: 'pointer', padding: '2px 8px', borderRadius: 999, marginLeft: 4 }}>Clear</button>
                )}
                <button onClick={() => { setAiOpen(false); setAiThread([]); setAiQuery(''); aiAbortRef.current?.abort(); }}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', color: T.inkMuted, fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</button>
              </div>

              {/* Thread */}
              {aiThread.length > 0 && (
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px 8px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {aiThread.map((msg, i) => {
                    const isUser = msg.role === 'user';
                    const isLastAssistant = !isUser && i === aiThread.length - 1;
                    return (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
                          <div style={{
                            maxWidth: '85%',
                            background: isUser ? T.gold : T.white,
                            color: isUser ? T.cream : T.ink,
                            border: isUser ? 'none' : `1px solid ${T.line}`,
                            borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                            padding: '8px 12px', fontSize: 13.5, lineHeight: 1.6,
                            fontFamily: isUser ? 'inherit' : T.serif,
                            wordBreak: 'break-word',
                          }}>
                            {msg.content || (aiLoading && isLastAssistant ? <span style={{ color: T.inkMuted, fontStyle: 'italic' }}>Thinking…</span> : null)}
                          </div>
                        </div>
                        {isLastAssistant && !aiLoading && msg.content && (
                          <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 6 }}>
                            <button onClick={sendAiResponse} style={{
                              background: T.ink, color: T.cream, border: 'none',
                              borderRadius: 999, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            }}>Share to conversation</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div ref={aiBottomRef} />
                </div>
              )}

              {/* Input row */}
              <div style={{ display: 'flex', gap: 8, padding: '0 14px 12px', flexShrink: 0 }}>
                <input
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && askAi()}
                  placeholder={aiThread.length ? 'Ask a follow-up…' : 'Ask a Bible or faith question…'}
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
