import { useEffect, useState } from 'react';
import { supabase } from './supabase.js';
import { T } from './theme.js';
import { Avatar } from './ProfilePage.jsx';
import ShareSheet from './ShareSheet.jsx';
import PostImageGrid from './PostImageGrid.jsx';
import { useImageDrafts, ImageDraftGrid, ImageAttachButton } from './imageAttach.jsx';

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

export default function GroupSpace({ group, role, session, profile, onLeave, onClose, hideHeader }) {
  const isPastor = role === 'pastor';
  const [focus, setFocus] = useState(null);
  const [posts, setPosts] = useState([]);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [settingFocus, setSettingFocus] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [inviteOpen, setInviteOpen] = useState(false);
  const imageDrafts = useImageDrafts(4);

  useEffect(() => {
    loadFocus();
    loadPosts();
    supabase
      .from('group_members')
      .select('id', { count: 'exact' })
      .eq('group_id', group.id)
      .then(({ count }) => setMemberCount(count ?? 0));
  }, [group.id]);

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

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 100px', background: T.cream }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>

          {/* Weekly focus */}
          {settingFocus ? (
            <SetFocusForm groupId={group.id} onSaved={(f) => { setFocus(f); setSettingFocus(false); }} onCancel={() => setSettingFocus(false)} />
          ) : focus ? (
            <div style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 18, padding: '22px 22px', marginBottom: 24 }}>
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

          {/* Post composer */}
          <form onSubmit={submitPost} style={{ marginBottom: 24 }}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
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
