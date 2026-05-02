import { useEffect, useState } from 'react';
import { supabase } from './supabase.js';
import { T } from './theme.js';
import { BadgeList } from './Badge.jsx';
import { relativeTime } from './time.js';
import Comments from './Comments.jsx';

const REACTIONS = [
  { id: 'amen',    emoji: '🙏', label: 'Amen' },
  { id: 'praying', emoji: '🤲', label: 'Praying' },
  { id: 'heart',   emoji: '♡',  label: 'Love' },
];

function ReactionButton({ kind, count, mine, onToggle }) {
  return (
    <button
      onClick={onToggle}
      style={{
        background: mine ? T.parchment : 'transparent',
        border: `1px solid ${mine ? T.gold : T.line}`,
        color: mine ? T.goldDark : T.inkSoft,
        borderRadius: 999, padding: '5px 11px', fontSize: 12.5, fontWeight: 600,
        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
      }}
      title={kind.label}
    >
      <span style={{ fontSize: 13 }}>{kind.emoji}</span>
      {count > 0 && <span>{count}</span>}
    </button>
  );
}

function bodyForKind(item) {
  const b = item.body ?? {};
  switch (item.kind) {
    case 'verse':
      return (
        <>
          {b.scripture_ref && (
            <div style={{ fontSize: 13, color: T.goldDark, fontStyle: 'italic', marginBottom: 6 }}>
              {b.scripture_ref}
            </div>
          )}
          <div style={{ fontFamily: T.serif, fontSize: 15.5, lineHeight: 1.65, color: T.ink, whiteSpace: 'pre-wrap' }}>
            {b.text}
          </div>
        </>
      );
    case 'question':
      return (
        <div style={{ fontFamily: T.serif, fontSize: 15.5, lineHeight: 1.65, color: T.ink, whiteSpace: 'pre-wrap' }}>
          <span style={{ fontWeight: 600, color: T.goldDark, marginRight: 6 }}>Q:</span>{b.text}
        </div>
      );
    case 'prayer':
      return (
        <div style={{ fontFamily: T.serif, fontSize: 15.5, lineHeight: 1.65, color: T.ink, whiteSpace: 'pre-wrap' }}>
          {b.text}
        </div>
      );
    case 'sermon_item':
      return (
        <>
          <div style={{ fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 4 }}>
            {b.sermon_title} {b.day != null && `· Day ${b.day}`}
          </div>
          {b.scripture && (
            <div style={{ fontSize: 13, color: T.goldDark, fontStyle: 'italic', marginBottom: 6 }}>
              {b.scripture}
            </div>
          )}
          <div style={{ fontFamily: T.serif, fontSize: 15.5, lineHeight: 1.7, color: T.ink, whiteSpace: 'pre-wrap' }}>
            {b.text}
          </div>
        </>
      );
    case 'journey_milestone':
      return (
        <div style={{ fontFamily: T.serif, fontSize: 15, lineHeight: 1.65, color: T.ink, whiteSpace: 'pre-wrap' }}>
          <span style={{ fontWeight: 600, color: T.goldDark, marginRight: 6 }}>✶ Journey:</span>{b.text}
        </div>
      );
    default: // 'text'
      return (
        <>
          {b.scripture_ref && (
            <div style={{ fontSize: 13, color: T.goldDark, fontStyle: 'italic', marginBottom: 4 }}>
              {b.scripture_ref}
            </div>
          )}
          <div style={{ fontFamily: T.serif, fontSize: 15.5, lineHeight: 1.65, color: T.ink, whiteSpace: 'pre-wrap' }}>
            {b.text}
          </div>
        </>
      );
  }
}

/**
 * Renders one feed_items row.
 * item: { id, source, author_id, scope, scope_id, kind, body, is_anonymous, created_at }
 * authorProfile / churchInfo: optional preloaded display data so cards don't each re-fetch
 * sessionUserId: current user (for "your reaction" highlight)
 * authorMap / rolesByUser: passed through to inline <Comments> so commenter names + role badges hydrate
 * onOpenSermon: parent opens the SermonView for a given sermon id (used by sermon-announcement cards)
 * defaultCommentsOpen: optionally render the comments thread expanded on first paint
 */
export default function PostCard({
  item,
  authorProfile,
  authorRoles,
  churchInfo,
  sessionUserId,
  authorMap,
  rolesByUser,
  onOpenSermon,
  commentCount = 0,
  defaultCommentsOpen = false,
}) {
  const [reactions, setReactions] = useState({}); // { amen: 4, praying: 2, heart: 1 }
  const [mine, setMine]           = useState({}); // { amen: true }
  const [commentsOpen, setCommentsOpen] = useState(defaultCommentsOpen);
  const [localCommentCount, setLocalCommentCount] = useState(commentCount);

  // Keep local count in sync if the parent reloads with fresh counts.
  useEffect(() => { setLocalCommentCount(commentCount); }, [commentCount]);

  useEffect(() => {
    let active = true;
    if (item.source !== 'post') {
      // Reactions only attach to native posts for now.
      setReactions({}); setMine({}); return;
    }
    (async () => {
      const { data } = await supabase
        .from('post_reactions')
        .select('kind, user_id')
        .eq('post_id', item.id);
      if (!active) return;
      const counts = {}; const mineMap = {};
      (data ?? []).forEach((r) => {
        counts[r.kind] = (counts[r.kind] ?? 0) + 1;
        if (r.user_id === sessionUserId) mineMap[r.kind] = true;
      });
      setReactions(counts); setMine(mineMap);
    })();
    return () => { active = false; };
  }, [item.id, item.source, sessionUserId]);

  async function toggleReaction(kindId) {
    if (!sessionUserId || item.source !== 'post') return;
    const wasMine = !!mine[kindId];
    // Optimistic
    setMine((m) => ({ ...m, [kindId]: !wasMine }));
    setReactions((r) => ({ ...r, [kindId]: Math.max(0, (r[kindId] ?? 0) + (wasMine ? -1 : 1)) }));
    if (wasMine) {
      await supabase.from('post_reactions').delete()
        .eq('post_id', item.id).eq('user_id', sessionUserId).eq('kind', kindId);
    } else {
      await supabase.from('post_reactions').insert({
        post_id: item.id, user_id: sessionUserId, kind: kindId,
      });
    }
  }

  // Byline
  const showAsChurch = item.scope === 'church' && churchInfo;
  let displayName, avatarLabel;
  if (item.is_anonymous) {
    displayName = 'Anonymous'; avatarLabel = '·';
  } else if (showAsChurch) {
    displayName = churchInfo.name ?? 'Church'; avatarLabel = '⛪';
  } else {
    displayName = authorProfile?.display_name ?? 'Someone'; avatarLabel = (displayName[0] ?? '·').toUpperCase();
  }

  return (
    <div style={{
      background: T.white, border: `1px solid ${T.line}`, borderRadius: 14,
      padding: '14px 16px', marginBottom: 12,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: showAsChurch ? T.parchment : (item.is_anonymous ? T.line : T.parchment),
          color: T.goldDark,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700,
        }}>
          {avatarLabel}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: T.ink, lineHeight: 1.2 }}>
              {displayName}
            </span>
            {!item.is_anonymous && !showAsChurch && authorRoles && authorRoles.length > 0 && (
              <BadgeList roles={authorRoles} />
            )}
          </div>
          <div style={{ fontSize: 11.5, color: T.inkMuted }}>
            {relativeTime(item.created_at)}
            {item.scope === 'church' && !showAsChurch && churchInfo?.name && ` · in ${churchInfo.name}`}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ marginBottom: 10 }}>
        {item.source === 'post' && item.body?.is_sermon_announcement && item.body?.sermon_id ? (
          <div style={{
            background: T.parchment, border: `1px solid ${T.goldLight}`, borderRadius: 12,
            padding: '12px 14px',
          }}>
            <div style={{ fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 6 }}>
              ✦ This week's sermon
            </div>
            <div style={{ fontFamily: T.serif, fontSize: 17, fontWeight: 600, color: T.ink, lineHeight: 1.3, marginBottom: 4 }}>
              {item.body.sermon_title ?? item.body.text}
            </div>
            {item.body.scripture_ref && (
              <div style={{ fontSize: 13, color: T.goldDark, fontStyle: 'italic', marginBottom: 6 }}>
                {item.body.scripture_ref}
              </div>
            )}
            {onOpenSermon && (
              <button
                onClick={() => onOpenSermon(item.body.sermon_id)}
                style={{
                  marginTop: 6, background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
                  padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Discuss this sermon →
              </button>
            )}
          </div>
        ) : (
          bodyForKind(item)
        )}
      </div>

      {/* Reactions + comments row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 8, borderTop: `1px solid ${T.line}`, flexWrap: 'wrap' }}>
        {item.source === 'post' && REACTIONS.map((r) => (
          <ReactionButton
            key={r.id}
            kind={r}
            count={reactions[r.id] ?? 0}
            mine={!!mine[r.id]}
            onToggle={() => toggleReaction(r.id)}
          />
        ))}
        {item.source === 'prayer' && (
          <span style={{
            background: 'rgba(122,149,104,0.18)', color: '#3F5635',
            borderRadius: 999, padding: '5px 11px', fontSize: 12.5, fontWeight: 600,
          }}>
            🙏 {item.body?.prayer_count ?? 0} praying
          </span>
        )}
        <div style={{ flex: 1 }} />
        {item.source === 'post' && (
          <button
            onClick={() => setCommentsOpen((v) => !v)}
            style={{
              background: commentsOpen ? T.parchment : 'transparent',
              border: 'none',
              color: commentsOpen ? T.goldDark : T.inkSoft,
              fontSize: 12.5, fontWeight: commentsOpen ? 600 : 400,
              cursor: 'pointer', padding: '5px 10px', borderRadius: 999,
            }}
          >
            💬 {localCommentCount > 0 ? localCommentCount : 'Comment'}
          </button>
        )}
      </div>

      {/* Inline FB-style comments — toggled by the Comment button above */}
      {item.source === 'post' && commentsOpen && (
        <Comments
          item={item}
          sessionUserId={sessionUserId}
          authorMap={authorMap}
          rolesByUser={rolesByUser}
          onCountChange={(delta) => setLocalCommentCount((n) => Math.max(0, n + delta))}
        />
      )}
    </div>
  );
}
