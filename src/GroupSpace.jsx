import { useEffect, useRef, useState } from 'react';
import { supabase, authedFetch } from './supabase.js';
import { T } from './theme.js';
import { Avatar } from './ProfilePage.jsx';
import { KinwoveStar } from './components/brand/KinwoveStar';
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

function SetFocusForm({ groupId, onSaved, onCancel }) {
  const [passage, setPassage] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!passage.trim()) return;
    setBusy(true);
    const { data } = await supabase.from('weekly_focus').insert({
      group_id: groupId,
      passage: passage.trim(),
      pastor_note: note.trim() || null,
      week_of: new Date().toISOString().slice(0, 10),
    }).select().single();
    setBusy(false);
    onSaved(data);
  }

  return (
    <div style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 16, padding: '22px 20px', marginBottom: 20 }}>
      <div style={{ fontSize: 11, letterSpacing: 3, color: T.gold, textTransform: 'uppercase', marginBottom: 16, opacity: 0.8 }}>Set this week's focus</div>
      <input
        value={passage}
        onChange={(e) => setPassage(e.target.value)}
        placeholder="Passage or theme — e.g. Romans 8:1-11"
        style={{
          width: '100%', boxSizing: 'border-box', background: T.white,
          border: `1px solid ${T.line}`, borderRadius: 10, padding: '11px 14px',
          fontSize: 14, color: T.ink, outline: 'none', marginBottom: 12,
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = T.gold)}
        onBlur={(e) => (e.currentTarget.style.borderColor = T.line)}
      />
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Your note to the group — what to sit with, what you want them to bring on Sunday…"
        rows={4}
        style={{
          width: '100%', boxSizing: 'border-box', resize: 'none',
          background: T.white, border: `1px solid ${T.line}`,
          borderRadius: 10, padding: '11px 14px', fontSize: 14, color: T.ink,
          fontFamily: T.serif, outline: 'none', lineHeight: 1.6, marginBottom: 14,
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = T.gold)}
        onBlur={(e) => (e.currentTarget.style.borderColor = T.line)}
      />
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={save} disabled={busy || !passage.trim()} style={{
          background: T.gold, color: T.cream, border: 'none', borderRadius: 999,
          padding: '10px 22px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          opacity: busy || !passage.trim() ? 0.5 : 1,
        }}>
          {busy ? 'Saving…' : 'Post focus'}
        </button>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', color: '#9B8C73', fontSize: 13, cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function ReplyThread({ postId, session, profile }) {
  const [replies, setReplies] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase
      .from('group_replies')
      .select('*, profiles(display_name, avatar_config, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .then(({ data }) => { setReplies(data ?? []); setLoaded(true); });
  }, [postId]);

  async function submit(e) {
    e.preventDefault();
    if (!text.trim() || !session) return;
    setBusy(true);
    const { data } = await supabase.from('group_replies').insert({
      post_id: postId,
      author_id: session.user.id,
      body: text.trim(),
    }).select('*, profiles(display_name, avatar_config, avatar_url)').single();
    setText('');
    setBusy(false);
    if (data) setReplies((prev) => [...prev, data]);
  }

  if (!loaded) return <div style={{ padding: '8px 0', fontSize: 12, color: '#B0A28A' }}>Loading replies…</div>;

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.line}` }}>
      {replies.map((r) => (
        <div key={r.id} style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'flex-start' }}>
          <Avatar name={r.profiles?.display_name} avatarConfig={r.profiles?.avatar_config} photoUrl={r.profiles?.avatar_url} size={26} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.inkSoft, marginBottom: 3 }}>{r.profiles?.display_name ?? 'Member'}</div>
            <div style={{ fontFamily: T.serif, fontSize: 14, color: T.inkSoft, lineHeight: 1.6 }}>{r.body}</div>
          </div>
        </div>
      ))}
      {session && (
        <form onSubmit={submit} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Reply…"
            style={{
              flex: 1, background: T.white, border: `1px solid ${T.line}`,
              borderRadius: 999, padding: '8px 14px', fontSize: 13, color: T.ink, outline: 'none',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = T.gold)}
            onBlur={(e) => (e.currentTarget.style.borderColor = T.line)}
          />
          <button type="submit" disabled={busy || !text.trim()} style={{
            background: T.gold, color: T.cream, border: 'none', borderRadius: 999,
            padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            opacity: busy || !text.trim() ? 0.5 : 1,
          }}>
            Reply
          </button>
        </form>
      )}
    </div>
  );
}

function PostCard({ post, session, profile, isPastor }) {
  const [showReplies, setShowReplies] = useState(false);
  const [replyCount, setReplyCount] = useState(post.reply_count ?? 0);
  const isPastor_ = post.author_id === post.profiles?.id && isPastor;

  return (
    <div style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 16, padding: '18px 20px', marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
        <Avatar name={post.profiles?.display_name} avatarConfig={post.profiles?.avatar_config} photoUrl={post.profiles?.avatar_url} size={32} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{post.profiles?.display_name ?? 'Member'}</div>
          <div style={{ fontSize: 11, color: T.inkMuted }}>{timeAgo(post.created_at)}</div>
        </div>
      </div>
      <div style={{ fontFamily: T.serif, fontSize: 15, color: T.ink, lineHeight: 1.7, marginBottom: 14 }}>
        {post.body}
      </div>
      {Array.isArray(post.image_urls) && post.image_urls.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <PostImageGrid urls={post.image_urls} />
        </div>
      )}
      <button
        onClick={() => setShowReplies((v) => !v)}
        style={{ background: 'none', border: 'none', color: T.gold, fontSize: 12, cursor: 'pointer', padding: 0, opacity: 0.75 }}
      >
        {showReplies ? 'Hide replies' : `Reply${replyCount > 0 ? ` · ${replyCount}` : ''}`}
      </button>
      {showReplies && (
        <ReplyThread
          postId={post.id}
          session={session}
          profile={profile}
        />
      )}
    </div>
  );
}

const STUDY_SYSTEM = `You are a group Bible study facilitator. Given a passage or theme, respond with exactly 3 open-ended discussion questions numbered 1–3. Output only the questions — no preamble, no titles, no explanations. Each question should invite personal reflection and different perspectives.`;

async function streamStudyQuestions(passage, onChunk, signal) {
  const res = await authedFetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      system: STUDY_SYSTEM,
      messages: [{ role: 'user', content: `Passage or theme: ${passage}` }],
      personType: 'group',
    }),
  });
  if (!res.ok || !res.body) return;
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
        try { onChunk(JSON.parse(data).delta); } catch {}
      }
    }
  }
}

function parseQuestions(raw) {
  return raw
    .split('\n')
    .map((l) => l.replace(/^\d+[.)]\s*/, '').trim())
    .filter((l) => l.length > 10);
}

function StudyQuestionsCard({ focus, isPastor, onUseQuestion }) {
  const [raw, setRaw] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusId, setFocusId] = useState(null);
  const abortRef = useRef(null);

  useEffect(() => {
    if (!focus || focus.id === focusId) return;
    generate();
  }, [focus]);

  async function generate() {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setRaw('');
    setLoading(true);
    setFocusId(focus.id);
    try {
      await streamStudyQuestions(focus.passage, (chunk) => setRaw((r) => r + chunk), ctrl.signal);
    } catch {}
    setLoading(false);
  }

  const questions = parseQuestions(raw);

  return (
    <div style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 18, padding: '20px 22px', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 10, letterSpacing: 3, color: T.gold, textTransform: 'uppercase', opacity: 0.8 }}>
          Study Questions
        </div>
        {isPastor && !loading && raw && (
          <button
            onClick={generate}
            style={{ background: 'none', border: 'none', color: T.inkMuted, fontSize: 11, cursor: 'pointer', padding: 0 }}
          >
            ↻ Regenerate
          </button>
        )}
      </div>

      {loading && questions.length === 0 && (
        <div style={{ fontFamily: T.serif, fontSize: 14, color: T.inkMuted, lineHeight: 1.7 }}>
          {raw || 'Generating questions…'}
        </div>
      )}

      {questions.map((q, i) => (
        <div key={i} style={{
          background: T.parchment, borderRadius: 12, padding: '14px 16px',
          marginBottom: i < questions.length - 1 ? 10 : 0,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ fontFamily: T.serif, fontSize: 14, color: T.ink, lineHeight: 1.65, flex: 1 }}>
            {q}
          </div>
          <button
            onClick={() => onUseQuestion(q)}
            style={{
              background: 'none', border: `1px solid ${T.line}`, color: T.inkSoft,
              borderRadius: 999, padding: '5px 12px', fontSize: 11, cursor: 'pointer',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            Reflect →
          </button>
        </div>
      ))}

      {loading && questions.length === 0 && !raw && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <div style={{ width: 14, height: 14, border: `1.5px solid ${T.line}`, borderTopColor: T.gold, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ fontSize: 12, color: T.inkMuted }}>Generating…</span>
        </div>
      )}
    </div>
  );
}

export default function GroupSpace({ group, role, session, profile, onLeave, onClose, hideHeader }) {
  const isPastor = role === 'pastor';
  const [tab, setTab] = useState('study');
  const [focus, setFocus] = useState(null);
  const [posts, setPosts] = useState([]);
  const [text, setText] = useState(() => sessionStorage.getItem(`kw:group-post:${group.id}`) ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [settingFocus, setSettingFocus] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [inviteOpen, setInviteOpen] = useState(false);
  const imageDrafts = useImageDrafts(4);

  // Chat
  const CHAT_DRAFT_KEY = `kw:group-chat:${group.id}`;
  const POST_DRAFT_KEY = `kw:group-post:${group.id}`;
  const [messages, setMessages] = useState([]);
  const [msgInput, setMsgInput] = useState(() => sessionStorage.getItem(CHAT_DRAFT_KEY) ?? '');
  const [msgBusy, setMsgBusy] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const msgEndRef = useRef(null);
  const msgInputRef = useRef(null);

  // Ask AI (inline, contextual to focus passage)
  const [askOpen, setAskOpen] = useState(false);
  const [askMsgs, setAskMsgs] = useState([]);
  const [askInput, setAskInput] = useState('');
  const [askBusy, setAskBusy] = useState(false);
  const askEndRef = useRef(null);

  useEffect(() => {
    loadFocus();
    loadPosts();
    loadMessages();
    supabase
      .from('group_members')
      .select('id', { count: 'exact' })
      .eq('group_id', group.id)
      .then(({ count }) => setMemberCount(count ?? 0));

    const sub = supabase
      .channel(`group_messages:${group.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${group.id}` }, (payload) => {
        const msg = payload.new;
        if (msg.author_id === session?.user?.id) return;
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
  }, [group.id]);

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
      .insert({ group_id: group.id, author_id: session.user.id, body })
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

  async function sendAsk(e) {
    e?.preventDefault();
    if (!askInput.trim() || askBusy) return;
    const userMsg = { role: 'user', content: askInput.trim() };
    setAskMsgs((prev) => [...prev, userMsg]);
    setAskInput('');
    setAskBusy(true);
    const context = focus ? `The group is studying: ${focus.passage}.${focus.pastor_note ? ` Pastor's note: ${focus.pastor_note}` : ''}` : '';
    const system = `You are a warm, knowledgeable Bible study companion for a small group. ${context} Answer questions about scripture thoughtfully and concisely. Be honest about uncertainty.`;
    const res = await authedFetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system, messages: [...askMsgs, userMsg], personType: 'group' }),
    });
    if (!res.ok || !res.body) { setAskBusy(false); return; }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '', full = '';
    setAskMsgs((prev) => [...prev, { role: 'assistant', content: '' }]);
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const events = buf.split('\n\n'); buf = events.pop() ?? '';
      for (const raw of events) {
        const lines = raw.split('\n');
        const ev = lines.find((l) => l.startsWith('event: '))?.slice(7).trim();
        const data = lines.find((l) => l.startsWith('data: '))?.slice(6);
        if (ev === 'text' && data) {
          try { const d = JSON.parse(data).delta; full += d; setAskMsgs((prev) => { const c = [...prev]; c[c.length - 1] = { role: 'assistant', content: full }; return c; }); } catch {}
        }
      }
    }
    setAskBusy(false);
    setTimeout(() => askEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }

  async function loadFocus() {
    const today = new Date().toISOString().slice(0, 10);
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const { data } = await supabase
      .from('weekly_focus')
      .select('*')
      .eq('group_id', group.id)
      .gte('week_of', weekStart.toISOString().slice(0, 10))
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    setFocus(data ?? null);
  }

  async function loadPosts() {
    const { data } = await supabase
      .from('group_posts')
      .select('*, profiles(display_name, avatar_config, avatar_url)')
      .eq('group_id', group.id)
      .order('created_at', { ascending: false })
      .limit(40);
    setPosts(data ?? []);
  }

  async function submitPost(e) {
    e.preventDefault();
    if ((!text.trim() && imageDrafts.drafts.length === 0) || !session) return;
    setSubmitting(true);
    const image_urls = await imageDrafts.uploadAll(session.user.id);
    const { data } = await supabase.from('group_posts').insert({
      group_id: group.id,
      author_id: session.user.id,
      focus_id: focus?.id ?? null,
      body: text.trim(),
      image_urls,
    }).select('*, profiles(display_name, avatar_config, avatar_url)').single();
    setText('');
    sessionStorage.removeItem(POST_DRAFT_KEY);
    setSubmitting(false);
    imageDrafts.clear();
    if (data) setPosts((prev) => [data, ...prev]);
  }

  return (
    <div style={{ minHeight: '100vh', background: T.cream, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${T.gold}, transparent)` }} />

      {!hideHeader && <header style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(184,115,58,0.15)', background: T.cream }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.inkMuted, fontSize: 13, cursor: 'pointer', padding: 0 }}>
          ← Back
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: T.display, fontSize: 19, fontWeight: 600, color: T.ink, letterSpacing: '-0.015em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {group.name}
          </div>
          <div style={{ fontSize: 11, color: T.inkMuted }}>
            {memberCount} {memberCount === 1 ? 'member' : 'members'}{group.tradition ? ` · ${group.tradition}` : ''}
          </div>
        </div>
        {isPastor && (
          <button onClick={() => setInviteOpen(true)} style={{
            background: 'transparent',
            border: `1px solid ${T.line}`, color: T.inkSoft,
            borderRadius: 999, padding: '5px 14px', fontSize: 12, cursor: 'pointer',
            transition: 'all 0.2s',
          }}>
            ↗ Invite
          </button>
        )}
      </header>}

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(184,115,58,0.15)', background: T.cream, flexShrink: 0 }}>
        {['study', 'chat'].map((t) => (
          <button key={t} onClick={() => { setTab(t); if (t === 'chat') setTimeout(() => msgEndRef.current?.scrollIntoView(), 100); }}
            style={{ flex: 1, background: 'none', border: 'none', padding: '12px 0', fontSize: 13, fontWeight: tab === t ? 700 : 500, fontFamily: T.serif, color: tab === t ? T.gold : T.inkMuted, cursor: 'pointer', borderBottom: tab === t ? `2px solid ${T.gold}` : '2px solid transparent', transition: 'all 0.15s' }}>
            {t === 'study' ? 'Study' : 'Chat'}
          </button>
        ))}
      </div>

      {/* Chat tab */}
      {tab === 'chat' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px', fontFamily: T.serif, fontSize: 15, color: T.inkMuted }}>
                No messages yet. Say hello.
              </div>
            )}
            {messages.map((m, i) => {
              const isMe = m.author_id === session?.user?.id;
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
                      style={{ maxWidth: '78%', background: isMe ? T.gold : T.white, color: isMe ? T.cream : T.ink, borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px', padding: '9px 14px', fontSize: 14, fontFamily: T.serif, lineHeight: 1.55, border: isMe ? 'none' : `1px solid rgba(184,115,58,0.18)`, cursor: isMe ? 'pointer' : 'default' }}>
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
            <button type="submit" disabled={!msgInput.trim() || msgBusy}
              style={{ width: 36, height: 36, borderRadius: '50%', background: msgInput.trim() ? T.gold : T.line, border: 'none', color: T.cream, fontSize: 16, cursor: msgInput.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s' }}>
              →
            </button>
          </form>
        </div>
      )}

      {tab === 'study' && (
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 100px', background: T.cream }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>

          {/* Invite code banner — always visible so members can share easily */}
          <div style={{
            background: 'rgba(184,115,58,0.08)', border: '1px solid rgba(184,115,58,0.25)',
            borderRadius: 14, padding: '14px 18px', marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, letterSpacing: 3, color: T.gold, textTransform: 'uppercase', marginBottom: 4, opacity: 0.8 }}>
                Invite code
              </div>
              <div style={{ fontFamily: T.display, fontSize: 26, fontWeight: 600, color: T.ink, letterSpacing: 6 }}>
                {group.invite_code}
              </div>
              <div style={{ fontSize: 11, color: T.inkMuted, marginTop: 4 }}>
                Share this code so others can join
              </div>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(group.invite_code).catch(() => {});
                setInviteOpen(true);
              }}
              style={{
                background: T.gold, color: T.cream, border: 'none', borderRadius: 999,
                padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              ↗ Invite
            </button>
          </div>

          {/* Weekly focus */}
          {settingFocus ? (
            <SetFocusForm groupId={group.id} onSaved={(f) => { setFocus(f); setSettingFocus(false); }} onCancel={() => setSettingFocus(false)} />
          ) : focus ? (
            <div style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 18, padding: '22px 22px', marginBottom: 16 }}>
              <div style={{ fontSize: 10, letterSpacing: 3, color: T.gold, textTransform: 'uppercase', marginBottom: 10, opacity: 0.75 }}>This week</div>
              <div style={{ fontFamily: T.display, fontSize: 24, fontWeight: 600, color: T.ink, letterSpacing: '-0.015em', lineHeight: 1.15, marginBottom: focus.pastor_note ? 12 : 0 }}>
                {focus.passage}
              </div>
              {focus.pastor_note && (
                <div style={{ fontFamily: T.serif, fontStyle: 'italic', fontSize: 15, color: T.inkSoft, lineHeight: 1.7, marginBottom: isPastor ? 14 : 0 }}>
                  "{focus.pastor_note}"
                </div>
              )}
              {isPastor && (
                <button onClick={() => setSettingFocus(true)} style={{ background: 'none', border: 'none', color: T.inkMuted, fontSize: 12, cursor: 'pointer', padding: 0, marginTop: 4 }}>
                  Update focus →
                </button>
              )}
            </div>
          ) : (
            <div style={{ background: T.parchment, border: `1px dashed ${T.line}`, borderRadius: 18, padding: '22px 22px', marginBottom: 24, textAlign: 'center' }}>
              {isPastor ? (
                <>
                  <div style={{ fontFamily: T.serif, fontSize: 16, color: T.inkMuted, marginBottom: 14 }}>No focus set for this week yet.</div>
                  <button onClick={() => setSettingFocus(true)} style={{
                    background: T.gold, color: T.cream, border: 'none', borderRadius: 999,
                    padding: '10px 22px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}>
                    Set this week's focus
                  </button>
                </>
              ) : (
                <div style={{ fontFamily: T.serif, fontSize: 15, color: T.inkMuted }}>
                  Your pastor hasn't set a focus for this week yet.
                </div>
              )}
            </div>
          )}

          {/* AI study questions — shown whenever there's a focus */}
          {focus && !settingFocus && (
            <StudyQuestionsCard
              focus={focus}
              isPastor={isPastor}
              onUseQuestion={(q) => setText(q)}
            />
          )}

          {/* Ask AI — inline, contextual to the focus passage */}
          {focus && !settingFocus && (
            <div style={{ marginBottom: 20 }}>
              {!askOpen ? (
                <button onClick={() => setAskOpen(true)} style={{ width: '100%', background: 'rgba(168,85,48,0.07)', border: `1px solid rgba(168,85,48,0.22)`, borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left' }}>
                  <KinwoveStar size={18} color={T.gold} />
                  <div>
                    <div style={{ fontFamily: T.display, fontSize: 14, fontWeight: 600, color: T.ink, marginBottom: 2 }}>Ask about {focus.passage}</div>
                    <div style={{ fontSize: 12, color: T.inkMuted }}>Ask the AI anything about this week's passage</div>
                  </div>
                  <span style={{ marginLeft: 'auto', color: T.inkMuted, fontSize: 16 }}>›</span>
                </button>
              ) : (
                <div style={{ background: T.white, border: `1px solid rgba(168,85,48,0.22)`, borderRadius: 16, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: `1px solid rgba(168,85,48,0.15)`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: T.display, fontSize: 14, fontWeight: 600, color: T.ink }}>Ask about {focus.passage}</span>
                    <button onClick={() => setAskOpen(false)} style={{ background: 'none', border: 'none', color: T.inkMuted, cursor: 'pointer', fontSize: 13 }}>✕</button>
                  </div>
                  <div style={{ padding: '12px 16px', maxHeight: 280, overflowY: 'auto' }}>
                    {askMsgs.length === 0 && (
                      <div style={{ fontFamily: T.serif, fontSize: 13, color: T.inkMuted, paddingBottom: 8 }}>What do you want to understand better about this passage?</div>
                    )}
                    {askMsgs.map((m, i) => (
                      <div key={i} style={{ marginBottom: 10, display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                        <div style={{ maxWidth: '85%', background: m.role === 'user' ? T.gold : 'rgba(168,85,48,0.07)', color: m.role === 'user' ? T.cream : T.ink, borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px', padding: '8px 13px', fontSize: 13, fontFamily: T.serif, lineHeight: 1.6 }}>
                          {m.content || '…'}
                        </div>
                      </div>
                    ))}
                    <div ref={askEndRef} />
                  </div>
                  <form onSubmit={sendAsk} style={{ padding: '10px 12px', borderTop: `1px solid rgba(168,85,48,0.12)`, display: 'flex', gap: 8 }}>
                    <input
                      value={askInput}
                      onChange={(e) => setAskInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); sendAsk(); } }}
                      placeholder={`Ask about ${focus.passage}…`}
                      style={{ flex: 1, background: 'rgba(168,85,48,0.05)', border: `1px solid rgba(168,85,48,0.2)`, borderRadius: 999, padding: '8px 14px', fontSize: 13, fontFamily: T.serif, color: T.ink, outline: 'none' }}
                    />
                    <button type="submit" disabled={!askInput.trim() || askBusy}
                      style={{ width: 32, height: 32, borderRadius: '50%', background: askInput.trim() ? T.gold : T.line, border: 'none', color: T.cream, fontSize: 15, cursor: askInput.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      →
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* Post composer */}
          <form onSubmit={submitPost} style={{ marginBottom: 24 }}>
            <textarea
              value={text}
              onChange={(e) => { setText(e.target.value); sessionStorage.setItem(POST_DRAFT_KEY, e.target.value); }}
              placeholder={focus ? `Share a reflection on ${focus.passage}…` : 'Share something with the group…'}
              rows={3}
              style={{
                width: '100%', boxSizing: 'border-box', resize: 'none',
                background: T.white, border: `1px solid ${T.line}`,
                borderRadius: 14, padding: '13px 16px', fontSize: 14, color: T.ink,
                fontFamily: T.serif, outline: 'none', lineHeight: 1.65,
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = T.gold)}
              onBlur={(e) => (e.currentTarget.style.borderColor = T.line)}
            />
            <ImageDraftGrid drafts={imageDrafts.drafts} onRemove={imageDrafts.remove} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, gap: 8 }}>
              <ImageAttachButton
                drafts={imageDrafts.drafts} max={imageDrafts.max}
                fileInputRef={imageDrafts.fileInputRef} onPick={imageDrafts.pick}
              />
              <button type="submit"
                disabled={submitting || (!text.trim() && imageDrafts.drafts.length === 0)}
                style={{
                  background: T.gold, color: T.cream, border: 'none', borderRadius: 999,
                  padding: '9px 22px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  opacity: submitting || (!text.trim() && imageDrafts.drafts.length === 0) ? 0.5 : 1,
                }}>
                Post
              </button>
            </div>
          </form>

          {/* Posts */}
          {posts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 20px' }}>
              <div style={{ fontFamily: T.serif, fontSize: 18, color: T.inkSoft, marginBottom: 8 }}>
                No reflections yet.
              </div>
              <div style={{ fontSize: 13, color: T.inkMuted }}>
                Be the first to share something with the group.
              </div>
            </div>
          )}
          {posts.map((p) => (
            <PostCard key={p.id} post={p} session={session} profile={profile} isPastor={isPastor} />
          ))}

          {/* Leave group */}
          {!isPastor && (
            <div style={{ textAlign: 'center', marginTop: 32 }}>
              <button onClick={onLeave} style={{ background: 'none', border: 'none', color: T.inkMuted, fontSize: 12, cursor: 'pointer' }}>
                Leave this group
              </button>
            </div>
          )}
        </div>
      </div>
      )}

      {inviteOpen && (
        <ShareSheet
          body={`Join "${group.name}" on kinwove. Use invite code: ${group.invite_code}`}
          title={`Invite to ${group.name}`}
          intro={`Use code ${group.invite_code} to join`}
          previewBody={`Invite code: ${group.invite_code}`}
          onClose={() => setInviteOpen(false)}
        />
      )}
    </div>
  );
}
