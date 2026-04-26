import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase.js';
import { T } from './theme.js';
import { PERSON_TYPES } from './constants.js';
import { Avatar } from './ProfilePage.jsx';

const REACTIONS = [
  { kind: 'resonates', label: 'Resonates', emoji: '🕊️' },
  { kind: 'amen',      label: 'Amen',       emoji: '🙏' },
  { kind: 'thinking',  label: 'Thinking',   emoji: '💭' },
];

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function PostCard({ post, currentUserId, onReact, onReplySubmit, isFollowing, onFollow }) {
  const [expanded, setExpanded] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const person = PERSON_TYPES.find((p) => p.id === post.profiles?.person_type);
  const myReaction = post.my_reaction;
  const isOwnPost = currentUserId && post.author_id === currentUserId;

  async function handleReply(e) {
    e.preventDefault();
    if (!replyText.trim()) return;
    setSubmitting(true);
    await onReplySubmit(post.id, replyText.trim());
    setReplyText('');
    setSubmitting(false);
  }

  return (
    <div style={{
      background: T.white,
      borderRadius: 16,
      border: `1px solid ${T.line}`,
      marginBottom: 14,
      overflow: 'hidden',
    }}>
      {/* Post header */}
      <div style={{ padding: '16px 18px 0' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
          <Avatar
            name={post.profiles?.display_name}
            avatarConfig={post.profiles?.avatar_config}
            size={38}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: T.ink }}>
              {post.profiles?.display_name ?? 'Anonymous'}
            </div>
            <div style={{ fontSize: 12, color: T.inkMuted }}>
              {[post.profiles?.city, post.profiles?.country].filter(Boolean).join(', ')}
              {post.profiles?.tradition ? ` · ${post.profiles.tradition}` : ''}
              {person ? ` · ${person.emoji} ${person.label}` : ''}
              {' · '}{timeAgo(post.created_at)}
            </div>
          </div>
          {currentUserId && !isOwnPost && (
            <button
              onClick={() => onFollow(post.author_id, isFollowing)}
              style={{
                background: isFollowing ? 'transparent' : T.ink,
                color: isFollowing ? T.inkMuted : T.cream,
                border: `1px solid ${isFollowing ? T.line : T.ink}`,
                borderRadius: 999,
                padding: '5px 14px',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              {isFollowing ? 'Following' : '+ Follow'}
            </button>
          )}
        </div>

        {/* Question */}
        <div style={{
          fontFamily: T.serif,
          fontStyle: 'italic',
          fontSize: 15,
          color: T.inkSoft,
          marginBottom: 10,
          lineHeight: 1.5,
        }}>
          {post.question}
        </div>

        {/* Answer preview / full */}
        <div style={{
          fontFamily: T.serif,
          fontSize: 16,
          color: T.ink,
          lineHeight: 1.7,
          marginBottom: 14,
          whiteSpace: 'pre-wrap',
        }}>
          {expanded
            ? post.body
            : post.body.slice(0, 280) + (post.body.length > 280 ? '…' : '')}
        </div>

        {post.body.length > 280 && (
          <button
            onClick={() => setExpanded(!expanded)}
            style={{ background: 'none', border: 'none', color: T.goldDark, fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 10 }}
          >
            {expanded ? 'Show less' : 'Read more'}
          </button>
        )}
      </div>

      {/* Reactions */}
      <div style={{
        padding: '10px 18px',
        borderTop: `1px solid ${T.line}`,
        display: 'flex',
        gap: 8,
        alignItems: 'center',
      }}>
        {REACTIONS.map((r) => {
          const count = post.reaction_counts?.[r.kind] ?? 0;
          const active = myReaction === r.kind;
          return (
            <button
              key={r.kind}
              onClick={() => onReact(post.id, r.kind, active)}
              style={{
                background: active ? 'rgba(196,129,58,0.12)' : 'transparent',
                border: `1px solid ${active ? T.gold : T.line}`,
                borderRadius: 999,
                padding: '5px 12px',
                fontSize: 13,
                color: active ? T.goldDark : T.inkMuted,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              {r.emoji} {count > 0 ? count : r.label}
            </button>
          );
        })}
        <button
          onClick={() => setExpanded(true)}
          style={{ background: 'none', border: 'none', color: T.inkMuted, fontSize: 13, cursor: 'pointer', marginLeft: 'auto' }}
        >
          💬 {post.reply_count ?? 0} {post.reply_count === 1 ? 'reply' : 'replies'}
        </button>
      </div>

      {/* Replies */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${T.line}`, background: T.cream }}>
          {post.replies?.map((r) => (
            <div key={r.id} style={{ padding: '14px 18px', borderBottom: `1px solid ${T.line}`, display: 'flex', gap: 10 }}>
              <Avatar name={r.profiles?.display_name} avatarConfig={r.profiles?.avatar_config} size={30} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 4 }}>
                  {r.profiles?.display_name ?? 'Anonymous'}
                  <span style={{ fontWeight: 400, color: T.inkMuted, marginLeft: 8 }}>{timeAgo(r.created_at)}</span>
                </div>
                <div style={{ fontSize: 14, color: T.inkSoft, lineHeight: 1.6 }}>{r.body}</div>
              </div>
            </div>
          ))}

          {currentUserId && (
            <form onSubmit={handleReply} style={{ padding: '14px 18px', display: 'flex', gap: 10 }}>
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Add a reply…"
                style={{
                  flex: 1,
                  border: `1px solid ${T.line}`,
                  borderRadius: 999,
                  padding: '9px 14px',
                  fontSize: 14,
                  background: T.white,
                  color: T.ink,
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
              <button
                type="submit"
                disabled={submitting || !replyText.trim()}
                style={{
                  background: T.ink,
                  color: T.cream,
                  border: 'none',
                  borderRadius: 999,
                  padding: '9px 18px',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                Reply
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

function FeaturedThread({ thread, onRespond }) {
  if (!thread) return null;
  return (
    <div style={{
      background: T.ink,
      borderRadius: 18,
      padding: '22px 22px 18px',
      marginBottom: 20,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: 'radial-gradient(circle, rgba(196,129,58,0.12) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        pointerEvents: 'none',
      }} />
      <div style={{ position: 'relative' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
        }}>
          <span style={{
            background: T.gold, color: T.cream, fontSize: 11, fontWeight: 700,
            padding: '3px 10px', borderRadius: 999, letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
            This Week's Thread
          </span>
        </div>
        <div style={{
          fontFamily: T.serif, fontSize: 19, fontWeight: 600, color: T.cream,
          lineHeight: 1.45, marginBottom: 14,
        }}>
          {thread.question}
        </div>
        {thread.context && (
          <div style={{ fontSize: 13, color: 'rgba(253,248,240,0.55)', marginBottom: 16, lineHeight: 1.5 }}>
            {thread.context}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={() => onRespond(thread.question)}
            style={{
              background: T.gold, color: T.cream, border: 'none', borderRadius: 999,
              padding: '10px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Respond in Chat →
          </button>
          <span style={{ fontSize: 13, color: 'rgba(253,248,240,0.45)' }}>
            {thread.reply_count ?? 0} responses
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Community({ session, profile, onClose, onOpenChat }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [following, setFollowing] = useState(new Set());
  const [featuredThread, setFeaturedThread] = useState(null);

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase.from('follows').select('following_id').eq('follower_id', session.user.id)
      .then(({ data }) => setFollowing(new Set(data?.map((f) => f.following_id) ?? [])));
  }, [session]);

  useEffect(() => {
    supabase
      .from('featured_threads')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data?.[0]) {
          supabase
            .from('posts')
            .select('id', { count: 'exact', head: true })
            .eq('featured_thread_id', data[0].id)
            .then(({ count }) => setFeaturedThread({ ...data[0], reply_count: count ?? 0 }));
        }
      });
  }, []);

  async function handleFollow(userId, isFollowing) {
    if (!session) return;
    if (isFollowing) {
      await supabase.from('follows').delete()
        .eq('follower_id', session.user.id).eq('following_id', userId);
      setFollowing((prev) => { const s = new Set(prev); s.delete(userId); return s; });
    } else {
      await supabase.from('follows').insert({ follower_id: session.user.id, following_id: userId });
      setFollowing((prev) => new Set([...prev, userId]));
    }
  }

  const loadPosts = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('posts')
      .select(`
        *,
        profiles (display_name, city, country, tradition, person_type, avatar_config),
        replies (
          id, body, created_at,
          profiles (display_name, avatar_config)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(40);

    if (filter !== 'all') query = query.eq('person_type', filter);

    const { data: postData } = await query;
    if (!postData) { setLoading(false); return; }

    // Load reaction counts + my reactions
    const postIds = postData.map((p) => p.id);
    const { data: reactions } = await supabase
      .from('reactions')
      .select('post_id, kind, author_id')
      .in('post_id', postIds);

    const enriched = postData.map((p) => {
      const postReactions = reactions?.filter((r) => r.post_id === p.id) ?? [];
      const counts = {};
      postReactions.forEach((r) => { counts[r.kind] = (counts[r.kind] ?? 0) + 1; });
      const myReaction = postReactions.find((r) => r.author_id === session?.user?.id)?.kind ?? null;
      return {
        ...p,
        reaction_counts: counts,
        my_reaction: myReaction,
        reply_count: p.replies?.length ?? 0,
      };
    });

    setPosts(enriched);
    setLoading(false);
  }, [filter, session]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  async function handleReact(postId, kind, isActive) {
    if (!session) return;
    if (isActive) {
      await supabase.from('reactions').delete()
        .eq('post_id', postId).eq('author_id', session.user.id);
    } else {
      await supabase.from('reactions').upsert(
        { post_id: postId, author_id: session.user.id, kind },
        { onConflict: 'post_id,author_id' }
      );
    }
    loadPosts();
  }

  async function handleReply(postId, body) {
    if (!session) return;
    await supabase.from('replies').insert({ post_id: postId, author_id: session.user.id, body });
    loadPosts();
  }

  return (
    <div style={{ minHeight: '100vh', background: T.cream, display: 'flex', flexDirection: 'column' }}>
      <header style={{
        padding: '14px 20px',
        background: T.white,
        borderBottom: `1px solid ${T.line}`,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.goldDark, fontSize: 14, cursor: 'pointer', padding: 0 }}>
          ← Back
        </button>
        <div style={{ fontFamily: T.serif, fontSize: 20, fontWeight: 600, color: T.ink, flex: 1 }}>
          Community
        </div>
        {profile && (
          <Avatar name={profile.display_name} avatarConfig={profile.avatar_config} size={28} />
        )}
      </header>

      {/* Filter tabs */}
      <div style={{
        display: 'flex',
        gap: 8,
        padding: '12px 20px',
        overflowX: 'auto',
        borderBottom: `1px solid ${T.line}`,
        background: T.white,
      }}>
        {[{ id: 'all', label: 'All' }, ...PERSON_TYPES.map((p) => ({ id: p.id, label: `${p.emoji} ${p.label}` }))].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              background: filter === f.id ? T.ink : 'transparent',
              color: filter === f.id ? T.cream : T.inkSoft,
              border: `1px solid ${filter === f.id ? T.ink : T.line}`,
              borderRadius: 999,
              padding: '6px 14px',
              fontSize: 13,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontWeight: filter === f.id ? 600 : 400,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 80px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <FeaturedThread
            thread={featuredThread}
            onRespond={(question) => onOpenChat?.(question)}
          />
          {loading && (
            <div style={{ textAlign: 'center', color: T.inkMuted, padding: 40, fontFamily: T.serif, fontSize: 16 }}>
              Loading…
            </div>
          )}
          {!loading && posts.length === 0 && (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <div style={{ fontFamily: T.serif, fontSize: 22, color: T.ink, marginBottom: 10 }}>Nothing here yet.</div>
              <div style={{ fontSize: 15, color: T.inkMuted, lineHeight: 1.6 }}>
                Save a note from your chat and share it publicly — be the first to start the conversation.
              </div>
            </div>
          )}
          {posts.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              currentUserId={session?.user?.id}
              onReact={handleReact}
              onReplySubmit={handleReply}
              isFollowing={following.has(p.author_id)}
              onFollow={handleFollow}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
