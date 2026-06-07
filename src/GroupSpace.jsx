import { useEffect, useRef, useState } from 'react';
import { supabase } from './supabase.js';
import { T } from './theme.js';
import { Avatar } from './ProfilePage.jsx';
import ShareSheet from './ShareSheet.jsx';
import PostImageGrid from './PostImageGrid.jsx';
import { useImageDrafts, ImageDraftGrid, ImageAttachButton } from './imageAttach.jsx';

const MEMBER_PALETTE = [
  '#A85530','#6B7C5E','#5B6E8A','#7A4A6B',
  '#8B6E35','#4A6B5B','#6B4A35','#5B4A7A',
];
function memberColor(userId) {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) >>> 0;
  return MEMBER_PALETTE[h % MEMBER_PALETTE.length];
}
function msgTimeAgo(ts) {
  const diff = (Date.now() - new Date(ts)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
}
function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Nested reply (1 level deep, indented) ───────────────────────────────────
function NestedReply({ reply, myId, isPastor, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  const canDelete = reply.author_id === myId || isPastor;
  const name = reply.profiles?.display_name ?? 'Member';
  return (
    <div style={{ marginTop: 10, paddingLeft: 14, borderLeft: `2px solid rgba(184,115,58,0.18)` }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <Avatar name={name} avatarConfig={reply.profiles?.avatar_config} photoUrl={reply.profiles?.avatar_url} size={22} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.inkSoft }}>{name}</span>
            <span style={{ fontSize: 11, color: T.inkMuted }}>{timeAgo(reply.created_at)}</span>
            {canDelete && !confirming && (
              <button onClick={() => setConfirming(true)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: T.inkMuted, fontSize: 11, cursor: 'pointer', padding: 0, opacity: 0.45 }}>✕</button>
            )}
            {confirming && (
              <>
                <button onClick={() => { onDelete(reply.id); setConfirming(false); }} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#c0392b', fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: 0 }}>Delete</button>
                <button onClick={() => setConfirming(false)} style={{ background: 'none', border: 'none', color: T.inkMuted, fontSize: 11, cursor: 'pointer', padding: 0 }}>Cancel</button>
              </>
            )}
          </div>
          <div style={{ fontFamily: T.serif, fontSize: 13, color: T.ink, lineHeight: 1.65 }}>{reply.body}</div>
        </div>
      </div>
    </div>
  );
}

// ── Reply row with optional nested reply compose ─────────────────────────────
function ReplyRow({ reply, myId, isPastor, groupId, onDelete }) {
  const [showCompose, setShowCompose] = useState(false);
  const [replyText, setReplyText]     = useState('');
  const [busy, setBusy]               = useState(false);
  const [nested, setNested]           = useState(reply.nested ?? []);
  const [confirming, setConfirming]   = useState(false);
  const canDelete = reply.author_id === myId || isPastor;
  const name = reply.profiles?.display_name ?? 'Member';

  async function submitNested(e) {
    e?.preventDefault();
    if (!replyText.trim() || busy || !myId) return;
    setBusy(true);
    const { data } = await supabase
      .from('group_posts')
      .insert({ group_id: groupId, author_id: myId, parent_id: reply.id, body: replyText.trim() })
      .select('*, profiles(display_name, avatar_config, avatar_url)')
      .single();
    setReplyText('');
    setShowCompose(false);
    setBusy(false);
    if (data) setNested((prev) => [...prev, data]);
  }

  function deleteNested(id) {
    setNested((prev) => prev.filter((n) => n.id !== id));
    supabase.from('group_posts').delete().eq('id', id);
  }

  return (
    <div style={{ paddingTop: 14, borderTop: `1px solid rgba(184,115,58,0.08)` }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <Avatar name={name} avatarConfig={reply.profiles?.avatar_config} photoUrl={reply.profiles?.avatar_url} size={28} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{name}</span>
            <span style={{ fontSize: 11, color: T.inkMuted }}>{timeAgo(reply.created_at)}</span>
            {canDelete && !confirming && (
              <button onClick={() => setConfirming(true)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: T.inkMuted, fontSize: 11, cursor: 'pointer', padding: 0, opacity: 0.45 }}>✕</button>
            )}
            {confirming && (
              <>
                <button onClick={() => { onDelete(reply.id); setConfirming(false); }} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#c0392b', fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: 0 }}>Delete</button>
                <button onClick={() => setConfirming(false)} style={{ background: 'none', border: 'none', color: T.inkMuted, fontSize: 11, cursor: 'pointer', padding: 0 }}>Cancel</button>
              </>
            )}
          </div>
          <div style={{ fontFamily: T.serif, fontSize: 14, color: T.ink, lineHeight: 1.7, marginBottom: 6 }}>{reply.body}</div>
          <button onClick={() => setShowCompose((v) => !v)} style={{ fontSize: 11, color: T.gold, background: 'none', border: 'none', cursor: 'pointer', padding: 0, opacity: 0.8 }}>
            ↩ Reply
          </button>
        </div>
      </div>

      {nested.map((n) => (
        <NestedReply key={n.id} reply={n} myId={myId} isPastor={isPastor} onDelete={deleteNested} />
      ))}

      {showCompose && (
        <div style={{ marginLeft: 38, marginTop: 10 }}>
          <form onSubmit={submitNested} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitNested(); } }}
              placeholder={`Reply to ${name}…`}
              autoFocus
              style={{ flex: 1, background: T.white, border: `1px solid ${T.line}`, borderRadius: 999, padding: '8px 14px', fontSize: 13, fontFamily: T.serif, color: T.ink, outline: 'none' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = T.gold)}
              onBlur={(e) => (e.currentTarget.style.borderColor = T.line)}
            />
            <button type="submit" disabled={!replyText.trim() || busy} style={{ background: replyText.trim() ? T.gold : T.line, color: T.cream, border: 'none', borderRadius: 999, padding: '8px 14px', fontSize: 12, fontWeight: 600, cursor: replyText.trim() ? 'pointer' : 'default' }}>
              {busy ? '…' : '↑'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// ── Thread card ──────────────────────────────────────────────────────────────
function ThreadCard({ thread, groupId, myId, isPastor, onDelete, onPin }) {
  const [replies, setReplies]       = useState([]);
  const [loaded, setLoaded]         = useState(false);
  const [expanded, setExpanded]     = useState(false);
  const [replyText, setReplyText]   = useState('');
  const [busy, setBusy]             = useState(false);
  const [confirming, setConfirming] = useState(false);
  const name = thread.profiles?.display_name ?? 'Member';
  const canDelete = thread.author_id === myId || isPastor;

  async function load() {
    // Load direct replies
    const { data: direct } = await supabase
      .from('group_posts')
      .select('*, profiles(display_name, avatar_config, avatar_url)')
      .eq('group_id', groupId)
      .eq('parent_id', thread.id)
      .order('created_at', { ascending: true });

    if (!direct?.length) { setReplies([]); setLoaded(true); return; }

    // Load nested (replies to replies) in one extra query
    const ids = direct.map((r) => r.id);
    const { data: nested } = await supabase
      .from('group_posts')
      .select('*, profiles(display_name, avatar_config, avatar_url)')
      .eq('group_id', groupId)
      .in('parent_id', ids)
      .order('created_at', { ascending: true });

    const nestedMap = {};
    (nested ?? []).forEach((n) => {
      if (!nestedMap[n.parent_id]) nestedMap[n.parent_id] = [];
      nestedMap[n.parent_id].push(n);
    });

    setReplies(direct.map((r) => ({ ...r, nested: nestedMap[r.id] ?? [] })));
    setLoaded(true);
  }

  function toggle() {
    if (!expanded && !loaded) load();
    setExpanded((v) => !v);
  }

  async function submitReply(e) {
    e?.preventDefault();
    if (!replyText.trim() || busy || !myId) return;
    setBusy(true);
    const { data } = await supabase
      .from('group_posts')
      .insert({ group_id: groupId, author_id: myId, parent_id: thread.id, body: replyText.trim() })
      .select('*, profiles(display_name, avatar_config, avatar_url)')
      .single();
    setReplyText('');
    setBusy(false);
    if (data) setReplies((prev) => [...prev, { ...data, nested: [] }]);
  }

  function deleteReply(id) {
    setReplies((prev) => prev.filter((r) => r.id !== id));
    supabase.from('group_posts').delete().eq('id', id);
  }

  return (
    <div style={{
      background: T.white,
      border: `1px solid ${thread.pinned ? 'rgba(184,115,58,0.45)' : T.line}`,
      borderRadius: 16,
      overflow: 'hidden',
      marginBottom: 12,
    }}>
      {/* Thread header + body */}
      <div style={{ padding: '16px 18px' }}>
        {thread.pinned && (
          <div style={{ fontSize: 10, letterSpacing: 2.5, color: T.gold, textTransform: 'uppercase', marginBottom: 8, opacity: 0.8 }}>
            📌 Pinned
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
          <Avatar name={name} avatarConfig={thread.profiles?.avatar_config} photoUrl={thread.profiles?.avatar_url} size={32} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{name}</span>
              <span style={{ fontSize: 11, color: T.inkMuted }}>{timeAgo(thread.created_at)}</span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
                {isPastor && !thread.pinned && (
                  <button onClick={() => onPin(thread.id)} style={{ background: 'none', border: 'none', color: T.inkMuted, fontSize: 11, cursor: 'pointer', padding: 0, opacity: 0.6 }}>
                    📌 Pin
                  </button>
                )}
                {isPastor && thread.pinned && (
                  <button onClick={() => onPin(null)} style={{ background: 'none', border: 'none', color: T.inkMuted, fontSize: 11, cursor: 'pointer', padding: 0, opacity: 0.6 }}>
                    Unpin
                  </button>
                )}
                {canDelete && !confirming && (
                  <button onClick={() => setConfirming(true)} style={{ background: 'none', border: 'none', color: T.inkMuted, fontSize: 12, cursor: 'pointer', padding: 0, opacity: 0.4 }}>✕</button>
                )}
                {confirming && (
                  <>
                    <button onClick={() => { onDelete(thread.id); setConfirming(false); }} style={{ background: 'none', border: 'none', color: '#c0392b', fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: 0 }}>Delete</button>
                    <button onClick={() => setConfirming(false)} style={{ background: 'none', border: 'none', color: T.inkMuted, fontSize: 11, cursor: 'pointer', padding: 0 }}>Cancel</button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div style={{ fontFamily: T.serif, fontSize: 15, color: T.ink, lineHeight: 1.72 }}>
          {thread.body}
        </div>
        {Array.isArray(thread.image_urls) && thread.image_urls.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <PostImageGrid urls={thread.image_urls} />
          </div>
        )}

        <button onClick={toggle} style={{ marginTop: 12, background: 'none', border: 'none', color: T.gold, fontSize: 12, cursor: 'pointer', padding: 0, opacity: 0.85 }}>
          {expanded
            ? 'Hide replies'
            : loaded
              ? `${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`
              : 'Reply'}
        </button>
      </div>

      {/* Replies */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${T.line}` }}>
          {!loaded && (
            <div style={{ padding: '14px 18px', background: T.parchment, fontSize: 13, color: T.inkMuted }}>Loading…</div>
          )}
          {loaded && (
            <div style={{ background: T.parchment, padding: '0 18px 6px' }}>
              {replies.length === 0 && (
                <div style={{ padding: '14px 0', fontSize: 13, color: T.inkMuted, fontStyle: 'italic' }}>
                  No replies yet — be the first
                </div>
              )}
              {replies.map((r) => (
                <ReplyRow key={r.id} reply={r} myId={myId} isPastor={isPastor} groupId={groupId} onDelete={deleteReply} />
              ))}
            </div>
          )}

          {/* Reply compose */}
          <form onSubmit={submitReply} style={{ display: 'flex', background: T.white, borderTop: `1px solid ${T.line}` }}>
            <input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitReply(); } }}
              placeholder="Write a reply…"
              style={{ flex: 1, background: 'transparent', border: 'none', padding: '12px 16px', fontSize: 14, fontFamily: T.serif, color: T.ink, outline: 'none' }}
            />
            <button
              type="submit"
              disabled={busy || !replyText.trim()}
              style={{
                background: replyText.trim() ? T.gold : 'transparent',
                border: 'none',
                borderLeft: `1px solid ${T.line}`,
                padding: '12px 18px',
                fontSize: 13,
                fontWeight: 600,
                color: replyText.trim() ? T.cream : T.inkMuted,
                cursor: replyText.trim() ? 'pointer' : 'default',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              {busy ? '…' : 'Post →'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function GroupSpace({ group, role, session, profile, onLeave, onClose, hideHeader, onFindPeople }) {
  const isPastor = role === 'pastor';
  const myId = session?.user?.id;

  const [tab, setTab]               = useState('discussion');
  const [threads, setThreads]       = useState([]);
  const [threadText, setThreadText] = useState('');
  const [posting, setPosting]       = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [inviteOpen, setInviteOpen]   = useState(false);
  const [allUsers, setAllUsers]       = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userFilter, setUserFilter]   = useState('');
  const [selected, setSelected]       = useState(new Set());
  const [inviteSent, setInviteSent]   = useState(new Set());
  const [inviting, setInviting]       = useState(false);
  const [shareOpen, setShareOpen]     = useState(false);
  const imageDrafts = useImageDrafts(4);

  // Chat
  const CHAT_DRAFT_KEY = `kw:group-chat:${group.id}`;
  const [messages, setMessages]     = useState([]);
  const [msgInput, setMsgInput]     = useState(() => sessionStorage.getItem(CHAT_DRAFT_KEY) ?? '');
  const [msgBusy, setMsgBusy]       = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const msgEndRef   = useRef(null);
  const msgInputRef = useRef(null);

  // Load ALL kinwove users when invite opens (cached per mount)
  useEffect(() => {
    if (!inviteOpen || !myId || allUsers.length > 0) return;
    setUsersLoading(true);
    supabase
      .from('profiles')
      .select('id, display_name, avatar_url, avatar_config')
      .neq('id', myId)
      .order('display_name', { ascending: true })
      .limit(1000)
      .then(({ data }) => { setAllUsers(data ?? []); setUsersLoading(false); });
  }, [inviteOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleSelect(id) {
    if (inviteSent.has(id)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function sendInvites() {
    if (!selected.size || inviting) return;
    setInviting(true);
    const ids = [...selected];
    const results = await Promise.all(
      ids.map((id) => supabase.rpc('send_group_invite', { p_group_id: group.id, p_recipient_id: id }))
    );
    results.forEach(({ error }, i) => { if (error) console.error('[group invite]', ids[i], error.message); });
    setInviteSent((prev) => new Set([...prev, ...ids]));
    setSelected(new Set());
    setInviting(false);
  }

  useEffect(() => {
    loadThreads();
    loadMessages();
    supabase.from('group_members').select('id', { count: 'exact' }).eq('group_id', group.id)
      .then(({ count }) => setMemberCount(count ?? 0));

    const sub = supabase
      .channel(`group_messages:${group.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${group.id}` }, (payload) => {
        const msg = payload.new;
        if (msg.author_id === myId) return;
        supabase.from('profiles').select('display_name,avatar_config,avatar_url').eq('id', msg.author_id).single()
          .then(({ data: p }) => {
            setMessages((prev) => [...prev, { ...msg, profiles: p }]);
            setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
          });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'group_messages', filter: `group_id=eq.${group.id}` }, (payload) => {
        setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
      })
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [group.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadThreads() {
    const { data, error } = await supabase
      .from('group_posts')
      .select('*, profiles(display_name, avatar_config, avatar_url)')
      .eq('group_id', group.id)
      .is('parent_id', null)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) console.error('[loadThreads]', error.message, error.details, error.hint);
    setThreads(data ?? []);
  }

  async function postThread(e) {
    e.preventDefault();
    if (!threadText.trim() && imageDrafts.drafts.length === 0) return;
    setPosting(true);
    const image_urls = await imageDrafts.uploadAll(myId);
    // Insert separately so a bad select doesn't swallow the insert error
    const { error: insertErr } = await supabase
      .from('group_posts')
      .insert({ group_id: group.id, author_id: myId, body: threadText.trim(), image_urls });
    if (insertErr) {
      console.error('[postThread] insert:', insertErr.message, insertErr.details, insertErr.hint);
      setPosting(false);
      return;
    }
    setThreadText('');
    imageDrafts.clear();
    setPosting(false);
    loadThreads();
  }

  async function deleteThread(id) {
    setThreads((prev) => prev.filter((t) => t.id !== id));
    await supabase.from('group_posts').delete().eq('id', id);
  }

  async function pinThread(threadId) {
    // Optimistic
    setThreads((prev) => {
      const updated = prev.map((t) => ({ ...t, pinned: threadId ? t.id === threadId : false }));
      return [...updated].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.created_at) - new Date(a.created_at);
      });
    });
    if (threadId) {
      await supabase.rpc('pin_group_post', { p_post_id: threadId });
    } else {
      await supabase.rpc('unpin_group_posts', { p_group_id: group.id });
    }
  }

  async function loadMessages() {
    const { data } = await supabase
      .from('group_messages')
      .select('*, profiles(display_name, avatar_config, avatar_url)')
      .eq('group_id', group.id)
      .order('created_at', { ascending: true })
      .limit(100);
    setMessages(data ?? []);
    setTimeout(() => msgEndRef.current?.scrollIntoView(), 50);
  }

  async function sendMessage(e) {
    e?.preventDefault();
    if (!msgInput.trim() || msgBusy || !session) return;
    setMsgBusy(true);
    const body = msgInput.trim();
    setMsgInput('');
    sessionStorage.removeItem(CHAT_DRAFT_KEY);
    const { data: newMsg } = await supabase
      .from('group_messages')
      .insert({ group_id: group.id, author_id: myId, body })
      .select()
      .single();
    if (newMsg) {
      setMessages((prev) => [...prev, { ...newMsg, profiles: { display_name: profile?.display_name, avatar_config: profile?.avatar_config, avatar_url: profile?.avatar_url } }]);
      setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
    setMsgBusy(false);
    msgInputRef.current?.focus();
  }

  async function deleteMsg(id) {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    setDeletingId(null);
    supabase.from('group_messages').delete().eq('id', id);
  }

  return (
    <div style={{ minHeight: '100vh', background: T.cream, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${T.gold}, transparent)` }} />

      {/* Header */}
      {!hideHeader && (
        <header style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(184,115,58,0.15)', background: T.cream }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.inkMuted, fontSize: 13, cursor: 'pointer', padding: 0 }}>
            ← Back
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: T.serif, fontSize: 19, fontWeight: 600, color: T.ink, letterSpacing: '-0.015em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {group.name}
            </div>
            <div style={{ fontSize: 11, color: T.inkMuted }}>
              {memberCount} {memberCount === 1 ? 'member' : 'members'}
            </div>
          </div>
          <button
            onClick={() => setInviteOpen(true)}
            style={{ background: 'transparent', border: `1px solid ${T.line}`, color: T.inkSoft, borderRadius: 999, padding: '5px 14px', fontSize: 12, cursor: 'pointer' }}
          >
            ↗ Invite
          </button>
        </header>
      )}

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(184,115,58,0.15)', background: T.cream, flexShrink: 0 }}>
        {[{ id: 'discussion', label: 'Discussion' }, { id: 'chat', label: 'Chat' }].map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); if (t.id === 'chat') setTimeout(() => msgEndRef.current?.scrollIntoView(), 100); }}
            style={{ flex: 1, background: 'none', border: 'none', padding: '12px 0', fontSize: 13, fontWeight: tab === t.id ? 700 : 500, fontFamily: T.serif, color: tab === t.id ? T.gold : T.inkMuted, cursor: 'pointer', borderBottom: tab === t.id ? `2px solid ${T.gold}` : '2px solid transparent', transition: 'all 0.15s' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Discussion tab ── */}
      {tab === 'discussion' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 80px', background: T.cream }}>
          <div style={{ maxWidth: 640, margin: '0 auto' }}>

            {/* New thread compose */}
            <form onSubmit={postThread} style={{ marginBottom: 24 }}>
              <textarea
                value={threadText}
                onChange={(e) => setThreadText(e.target.value)}
                placeholder="Start a discussion — a question, a verse, something on your heart…"
                rows={3}
                style={{
                  width: '100%', boxSizing: 'border-box', resize: 'none',
                  background: T.white, border: `1px solid ${T.line}`,
                  borderRadius: 14, padding: '13px 16px',
                  fontSize: 14, color: T.ink, fontFamily: T.serif,
                  outline: 'none', lineHeight: 1.65,
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = T.gold)}
                onBlur={(e) => (e.currentTarget.style.borderColor = T.line)}
              />
              <ImageDraftGrid drafts={imageDrafts.drafts} onRemove={imageDrafts.remove} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, gap: 8 }}>
                <ImageAttachButton drafts={imageDrafts.drafts} max={imageDrafts.max} fileInputRef={imageDrafts.fileInputRef} onPick={imageDrafts.pick} />
                <button
                  type="submit"
                  disabled={posting || (!threadText.trim() && imageDrafts.drafts.length === 0)}
                  style={{
                    background: T.gold, color: T.cream, border: 'none', borderRadius: 999,
                    padding: '9px 22px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    opacity: posting || (!threadText.trim() && imageDrafts.drafts.length === 0) ? 0.4 : 1,
                  }}
                >
                  {posting ? 'Posting…' : 'Post'}
                </button>
              </div>
            </form>

            {/* Thread feed */}
            {threads.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 20px', fontFamily: T.serif, fontSize: 15, color: T.inkMuted, lineHeight: 1.7 }}>
                No discussions yet.<br />Start one above.
              </div>
            )}
            {threads.map((t) => (
              <ThreadCard
                key={t.id}
                thread={t}
                groupId={group.id}
                myId={myId}
                isPastor={isPastor}
                onDelete={deleteThread}
                onPin={pinThread}
              />
            ))}

            {/* Leave / Delete */}
            <div style={{ textAlign: 'center', marginTop: 48 }}>
              {!isPastor && (
                <button onClick={onLeave} style={{ background: 'none', border: 'none', color: T.inkMuted, fontSize: 12, cursor: 'pointer' }}>
                  Leave this group
                </button>
              )}
              {isPastor && (
                <button
                  onClick={async () => {
                    if (!window.confirm('Delete this group and all its data? This cannot be undone.')) return;
                    await supabase.from('group_members').delete().eq('group_id', group.id);
                    await supabase.from('group_posts').delete().eq('group_id', group.id);
                    await supabase.from('church_groups').delete().eq('id', group.id);
                    onLeave?.();
                  }}
                  style={{ background: 'none', border: 'none', color: '#c0392b', fontSize: 12, cursor: 'pointer', opacity: 0.6 }}
                >
                  Delete group
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Chat tab ── */}
      {tab === 'chat' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px', fontFamily: T.serif, fontSize: 15, color: T.inkMuted }}>
                No messages yet. Say hello.
              </div>
            )}
            {messages.map((m, i) => {
              const isMe = m.author_id === myId;
              const name = m.profiles?.display_name ?? 'Member';
              const color = memberColor(m.author_id);
              const showName = !isMe && (i === 0 || messages[i - 1]?.author_id !== m.author_id);
              return (
                <div key={m.id} style={{ marginBottom: 6, display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                  {showName && (
                    <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 2, marginLeft: 4 }}>{name}</div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, flexDirection: isMe ? 'row-reverse' : 'row' }}>
                    <div
                      onClick={() => isMe && setDeletingId(deletingId === m.id ? null : m.id)}
                      style={{
                        maxWidth: '78%',
                        background: isMe ? T.gold : T.white,
                        color: isMe ? T.cream : T.ink,
                        borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        padding: '9px 14px', fontSize: 14, fontFamily: T.serif, lineHeight: 1.55,
                        border: isMe ? 'none' : `1px solid rgba(184,115,58,0.18)`,
                        cursor: isMe ? 'pointer' : 'default',
                      }}
                    >
                      {m.body}
                    </div>
                    {isMe && deletingId === m.id && (
                      <button onClick={() => deleteMsg(m.id)} style={{ background: 'none', border: 'none', color: '#c0392b', fontSize: 11, cursor: 'pointer', padding: '2px 6px', borderRadius: 6, whiteSpace: 'nowrap', flexShrink: 0 }}>
                        Delete
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: T.inkMuted, marginTop: 2, marginLeft: 4, marginRight: 4 }}>{msgTimeAgo(m.created_at)}</div>
                </div>
              );
            })}
            <div ref={msgEndRef} />
          </div>
          <form onSubmit={sendMessage} style={{ padding: '10px 12px 16px', borderTop: '1px solid rgba(184,115,58,0.15)', background: T.cream, display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              ref={msgInputRef}
              value={msgInput}
              onChange={(e) => { setMsgInput(e.target.value); sessionStorage.setItem(CHAT_DRAFT_KEY, e.target.value); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Message the group…"
              style={{ flex: 1, background: T.white, border: `1px solid rgba(184,115,58,0.25)`, borderRadius: 999, padding: '10px 16px', fontSize: 14, fontFamily: T.serif, color: T.ink, outline: 'none' }}
            />
            <button
              type="submit"
              disabled={!msgInput.trim() || msgBusy}
              style={{ width: 36, height: 36, borderRadius: '50%', background: msgInput.trim() ? T.gold : T.line, border: 'none', color: T.cream, fontSize: 16, cursor: msgInput.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s' }}
            >
              →
            </button>
          </form>
        </div>
      )}

      {/* ── Invite panel — load all users, checkbox multi-select ── */}
      {inviteOpen && !shareOpen && (() => {
        const q = userFilter.trim().toLowerCase();
        const filtered = q ? allUsers.filter((u) => (u.display_name ?? '').toLowerCase().includes(q)) : allUsers;
        const selCount = selected.size;
        const closeInvite = () => { setInviteOpen(false); setUserFilter(''); setSelected(new Set()); };
        return (
          <>
            <div onClick={closeInvite} style={{ position: 'fixed', inset: 0, zIndex: 400 }} />
            <div onClick={(e) => e.stopPropagation()} style={{
              position: 'fixed', top: 64, right: 16, zIndex: 401,
              width: 320, maxHeight: 520,
              background: T.white, borderRadius: 16,
              boxShadow: '0 8px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)',
              border: `1px solid ${T.line}`,
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}>
              {/* Header */}
              <div style={{ padding: '14px 16px 10px', borderBottom: `1px solid ${T.line}`, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ fontFamily: T.serif, fontSize: 15, fontWeight: 600, color: T.ink }}>Invite people</div>
                  <button onClick={closeInvite} style={{ background: 'none', border: 'none', color: T.inkMuted, cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1 }}>✕</button>
                </div>
                <div style={{ fontSize: 12, color: T.inkMuted }}>
                  Code: <strong style={{ color: T.ink, letterSpacing: 2, fontFamily: 'monospace' }}>{group.invite_code}</strong>
                  <span style={{ marginLeft: 8, opacity: 0.6 }}>— they enter it under Groups → Join with code</span>
                </div>
              </div>
              {/* Filter */}
              <div style={{ padding: '8px 12px', borderBottom: `1px solid ${T.line}`, flexShrink: 0 }}>
                <input
                  value={userFilter} onChange={(e) => setUserFilter(e.target.value)}
                  placeholder="Filter by name…"
                  style={{ width: '100%', boxSizing: 'border-box', background: T.parchment, border: `1px solid ${T.line}`, borderRadius: 8, padding: '7px 12px', fontSize: 13, color: T.ink, outline: 'none' }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = T.gold)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = T.line)}
                />
              </div>
              {/* Scrollable list */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {usersLoading ? (
                  <div style={{ textAlign: 'center', color: T.inkMuted, fontSize: 13, padding: '24px 0' }}>Loading…</div>
                ) : filtered.length === 0 ? (
                  <div style={{ textAlign: 'center', color: T.inkMuted, fontSize: 13, padding: '24px 16px' }}>No one found.</div>
                ) : filtered.map((u) => {
                  const name = u.display_name || 'Member';
                  const isSent    = inviteSent.has(u.id);
                  const isChecked = selected.has(u.id);
                  return (
                    <div key={u.id} onClick={() => toggleSelect(u.id)} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 16px', cursor: isSent ? 'default' : 'pointer',
                      background: isChecked ? 'rgba(184,115,58,0.07)' : 'transparent',
                      transition: 'background 0.1s',
                    }}
                      onMouseEnter={(e) => { if (!isSent) e.currentTarget.style.background = isChecked ? 'rgba(184,115,58,0.11)' : 'rgba(0,0,0,0.03)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = isChecked ? 'rgba(184,115,58,0.07)' : 'transparent'; }}
                    >
                      <div style={{
                        width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                        border: isSent ? '2px solid rgba(80,160,80,0.5)' : isChecked ? `2px solid ${T.gold}` : `2px solid ${T.line}`,
                        background: isSent ? 'rgba(80,160,80,0.12)' : isChecked ? T.gold : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.12s',
                      }}>
                        {(isSent || isChecked) && (
                          <span style={{ color: isSent ? '#4a9a4a' : T.cream, fontSize: 11, fontWeight: 700, lineHeight: 1 }}>✓</span>
                        )}
                      </div>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: memberColor(u.id), color: T.cream, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0, overflow: 'hidden' }}>
                        {u.avatar_url ? <img src={u.avatar_url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: isSent ? T.inkMuted : T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                      {isSent && <span style={{ fontSize: 11, color: '#4a9a4a', fontWeight: 600, flexShrink: 0 }}>Sent</span>}
                    </div>
                  );
                })}
              </div>
              {/* Footer */}
              <div style={{ padding: '10px 12px', borderTop: `1px solid ${T.line}`, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={sendInvites} disabled={!selCount || inviting} style={{
                  width: '100%', padding: '11px',
                  background: selCount ? T.gold : T.line,
                  border: 'none', borderRadius: 10,
                  fontSize: 13, fontWeight: 700,
                  color: selCount ? T.cream : T.inkMuted,
                  cursor: selCount ? 'pointer' : 'default',
                  transition: 'all 0.15s',
                }}>
                  {inviting ? 'Sending…' : selCount ? `Invite ${selCount} ${selCount === 1 ? 'person' : 'people'}` : 'Select people to invite'}
                </button>
                <button onClick={() => setShareOpen(true)} style={{ width: '100%', padding: '9px', background: T.parchment, border: `1px solid ${T.line}`, borderRadius: 10, fontSize: 13, fontWeight: 600, color: T.ink, cursor: 'pointer' }}>
                  ↗ Share invite link
                </button>
              </div>
            </div>
          </>
        );
      })()}

      {/* ── External share sheet ── */}
      {shareOpen && (
        <ShareSheet
          body={`Join "${group.name}" on kinwove. Use invite code: ${group.invite_code}`}
          title={`Invite to ${group.name}`}
          intro={`Use code ${group.invite_code} to join`}
          previewBody={`Invite code: ${group.invite_code}`}
          onClose={() => { setShareOpen(false); setInviteOpen(false); }}
        />
      )}
    </div>
  );
}
