import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase.js';
import { T, tintFor, SEMANTIC } from './theme.js';
import { PERSON_TYPES } from './constants.js';
import { Avatar } from './ProfilePage.jsx';
import ShareSheet from './ShareSheet.jsx';

const REACTIONS = [
  { kind: 'resonates', label: 'Love',      emoji: '❤️' },
  { kind: 'amen',      label: 'Amen',       emoji: '🙏' },
  { kind: 'thinking',  label: 'Insightful', emoji: '💡' },
];

const DAILY_VERSES = [
  { text: 'Come to me, all you who are weary and burdened, and I will give you rest.', ref: 'Matthew 11:28' },
  { text: 'The Lord is my shepherd; I shall not want.', ref: 'Psalm 23:1' },
  { text: 'Be still, and know that I am God.', ref: 'Psalm 46:10' },
  { text: 'Cast all your anxiety on him, because he cares for you.', ref: '1 Peter 5:7' },
  { text: 'Trust in the Lord with all your heart, and lean not on your own understanding.', ref: 'Proverbs 3:5' },
  { text: 'For I know the plans I have for you — plans to prosper you and not to harm you, plans to give you hope and a future.', ref: 'Jeremiah 29:11' },
  { text: 'And we know that in all things God works for the good of those who love him.', ref: 'Romans 8:28' },
  { text: 'Those who hope in the Lord will renew their strength. They will soar on wings like eagles.', ref: 'Isaiah 40:31' },
  { text: 'His mercies are new every morning; great is your faithfulness.', ref: 'Lamentations 3:22–23' },
  { text: 'I am the way, the truth, and the life.', ref: 'John 14:6' },
  { text: 'Do not be anxious about anything, but in every situation, by prayer and petition, present your requests to God.', ref: 'Philippians 4:6' },
  { text: 'The peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus.', ref: 'Philippians 4:7' },
  { text: 'If God is for us, who can be against us?', ref: 'Romans 8:31' },
  { text: 'Be strong and courageous. Do not be afraid; the Lord your God will be with you wherever you go.', ref: 'Joshua 1:9' },
  { text: 'For God so loved the world that he gave his one and only Son.', ref: 'John 3:16' },
  { text: 'Therefore, if anyone is in Christ, the new creation has come: the old has gone, the new is here.', ref: '2 Corinthians 5:17' },
  { text: 'For we walk by faith, not by sight.', ref: '2 Corinthians 5:7' },
  { text: 'The Lord is my light and my salvation — whom shall I fear?', ref: 'Psalm 27:1' },
  { text: 'Delight yourself in the Lord, and he will give you the desires of your heart.', ref: 'Psalm 37:4' },
  { text: 'Weeping may stay for the night, but rejoicing comes in the morning.', ref: 'Psalm 30:5' },
  { text: 'Your word is a lamp for my feet, a light on my path.', ref: 'Psalm 119:105' },
  { text: 'He heals the brokenhearted and binds up their wounds.', ref: 'Psalm 147:3' },
  { text: 'Ask and it will be given to you; seek and you will find; knock and the door will be opened.', ref: 'Matthew 7:7' },
  { text: 'Love is patient, love is kind. It does not envy, it does not boast.', ref: '1 Corinthians 13:4' },
  { text: 'Above all, love each other deeply, because love covers over a multitude of sins.', ref: '1 Peter 4:8' },
  { text: 'Now faith is confidence in what we hope for and assurance about what we do not see.', ref: 'Hebrews 11:1' },
  { text: 'I have told you these things, so that in me you may have peace. Take heart — I have overcome the world.', ref: 'John 16:33' },
  { text: 'There is now no condemnation for those who are in Christ Jesus.', ref: 'Romans 8:1' },
  { text: 'For by grace you have been saved through faith — and this is not your own doing; it is the gift of God.', ref: 'Ephesians 2:8' },
  { text: 'I sought the Lord, and he answered me; he delivered me from all my fears.', ref: 'Psalm 34:4' },
  { text: 'The Lord is close to the brokenhearted and saves those who are crushed in spirit.', ref: 'Psalm 34:18' },
  { text: 'Surely your goodness and love will follow me all the days of my life.', ref: 'Psalm 23:6' },
  { text: 'He has made everything beautiful in its time.', ref: 'Ecclesiastes 3:11' },
  { text: 'Let us not become weary in doing good, for at the proper time we will reap a harvest if we do not give up.', ref: 'Galatians 6:9' },
  { text: 'The Lord your God is with you, the Mighty Warrior who saves.', ref: 'Zephaniah 3:17' },
  { text: 'Blessed are the pure in heart, for they will see God.', ref: 'Matthew 5:8' },
  { text: 'Greater love has no one than this: to lay down one\u2019s life for one\u2019s friends.', ref: 'John 15:13' },
  { text: 'Cast your cares on the Lord and he will sustain you.', ref: 'Psalm 55:22' },
  { text: 'He gives strength to the weary and increases the power of the weak.', ref: 'Isaiah 40:29' },
  { text: 'I can do all things through Christ who strengthens me.', ref: 'Philippians 4:13' },
];

function getDailyVerse() {
  const d = new Date();
  const dayKey = d.getFullYear() * 366 + d.getMonth() * 31 + d.getDate();
  return DAILY_VERSES[dayKey % DAILY_VERSES.length];
}

const DAILY_QUESTIONS = [
  'If God is good, why is there suffering?',
  'What does it mean to forgive someone who isn\u2019t sorry?',
  'How do I know if I\u2019m reading the Bible right?',
  'Why pray if God already knows?',
  'What if I have doubts \u2014 does that mean my faith is fake?',
  'How was the Bible put together \u2014 and can I trust it?',
  'What\u2019s the difference between religion and faith?',
  'Did Jesus actually say he was God?',
  'What does grace really mean?',
  'Why are there so many denominations?',
  'Is it okay to be angry at God?',
  'What does the Bible actually say about heaven?',
  'How do I pray when I don\u2019t know what to say?',
  'Why did Jesus have to die?',
  'What does \u201cborn again\u201d mean \u2014 and why does it matter?',
  'How do I read the Old Testament without getting lost?',
  'Is it possible to be a Christian and have unanswered questions?',
  'What does it mean to love your enemies?',
  'How does free will fit with God\u2019s plan?',
  'How do I know God hears me?',
  'What\u2019s the gospel \u2014 in one sentence?',
  'Why does God allow evil?',
  'What does the Bible say about anxiety?',
  'Is hell really forever?',
  'How do I find a church that fits?',
  'What if I don\u2019t \u201cfeel\u201d God?',
  'What does Jesus mean by \u201cthe Kingdom of God\u201d?',
  'How do I know if a feeling is from God or just from me?',
  'What\u2019s the point of communion?',
  'How do I deal with shame from things I\u2019ve done?',
  'What does the Bible say about money?',
  'How do I love someone I really don\u2019t like?',
  'What is the Holy Spirit?',
  'How do I trust God when life is falling apart?',
  'What did Jesus mean by \u201cturn the other cheek\u201d?',
  'Is doubt the opposite of faith?',
  'What does it mean to be saved?',
  'Why are the four Gospels different?',
  'How can I tell if I\u2019m hearing God?',
  'What does the Bible say about purpose?',
  'Why is grace so hard to accept?',
  'What does it mean to take up your cross?',
  'How do I deal with regret?',
  'How do I start reading the Bible if I never have?',
  'Can a Christian love someone who hurt them?',
];

function getDailyQuestion() {
  const d = new Date();
  const dayKey = d.getFullYear() * 366 + d.getMonth() * 31 + d.getDate();
  return DAILY_QUESTIONS[dayKey % DAILY_QUESTIONS.length];
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function PostCard({ post, index = 0, session, currentUserId, userProfile, userGroup, onReact, onReplySubmit, onRepost, isFollowing, onFollow, onViewProfile }) {
  const [bodyExpanded,   setBodyExpanded]   = useState(false);
  const [commentsOpen,   setCommentsOpen]   = useState(false);
  // post.post_comments is the embedded select from loadPosts; it's a thin
  // shape ({id, body, created_at, profiles}) hydrated by the relationship.
  // Optimistic appends use the same shape so the UI doesn't flicker.
  const [localReplies,   setLocalReplies]   = useState(post.post_comments ?? []);
  const [replyText,      setReplyText]      = useState('');
  const [submitting,     setSubmitting]     = useState(false);
  const [shareOpen,      setShareOpen]      = useState(false);
  const person     = PERSON_TYPES.find((p) => p.id === post.profiles?.person_type);
  const tint       = tintFor(post.profiles?.person_type);
  const myReaction = post.my_reaction;
  const isOwnPost  = currentUserId && post.author_id === currentUserId;

  async function handleReply(e) {
    e?.preventDefault();
    if (!replyText.trim() || submitting) return;
    const text = replyText.trim();
    setReplyText('');
    setSubmitting(true);
    setLocalReplies(prev => [...prev, { id: `tmp-${Date.now()}`, body: text, created_at: new Date().toISOString(), profiles: { display_name: userProfile?.display_name ?? 'You', avatar_config: userProfile?.avatar_config ?? null } }]);
    await onReplySubmit(post.id, text);
    setSubmitting(false);
  }

  return (
    <>
      <div className="lift" style={{
        '--i': index,
        background: `linear-gradient(180deg, ${tint.bg}, ${T.white})`,
        borderRadius: 16, border: `1px solid ${T.line}`,
        marginBottom: 14, overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 1px 2px rgba(44,24,16,0.04)',
      }}>
        {/* Persona accent rail (left edge) — full-color so the post owns its identity */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
          background: tint.rail,
        }} />
        {/* Header */}
        <div style={{ padding: '16px 18px 0' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
            <button onClick={() => onViewProfile?.(post.author_id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0 }}>
              <Avatar name={post.profiles?.display_name} avatarConfig={post.profiles?.avatar_config} size={38} />
            </button>
            <div style={{ flex: 1 }}>
              <button onClick={() => onViewProfile?.(post.author_id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: T.ink }}>{post.profiles?.display_name ?? 'Anonymous'}</div>
              </button>
              <div style={{ fontSize: 12, color: T.inkMuted, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                <span>
                  {[post.profiles?.city, post.profiles?.country].filter(Boolean).join(', ')}
                  {post.profiles?.tradition ? ` · ${post.profiles.tradition}` : ''}
                  {person ? ` · ${person.emoji} ${person.label}` : ''}
                  {' · '}{timeAgo(post.created_at)}
                </span>
                {/* Audience badges removed 2026-05-01: posts.audience is being
                    dropped — privacy is now expressed via posts.scope and
                    enforced by RLS, so a 'friends'/'private' badge cannot
                    correspond to anything visible in this feed. */}
              </div>
            </div>
            {currentUserId && !isOwnPost && (
              <button onClick={() => onFollow(post.author_id, isFollowing)} style={{
                background: isFollowing ? 'transparent' : T.ink,
                color: isFollowing ? T.inkMuted : T.cream,
                border: `1px solid ${isFollowing ? T.line : T.ink}`,
                borderRadius: 999, padding: '5px 14px',
                fontSize: 12, fontWeight: 500, cursor: 'pointer', flexShrink: 0,
              }}>
                {isFollowing ? 'Following' : '+ Follow'}
              </button>
            )}
          </div>

          {post.question && (
            <div style={{ fontFamily: T.serif, fontStyle: 'italic', fontSize: 15, color: T.inkSoft, marginBottom: 10, lineHeight: 1.5 }}>
              {post.question}
            </div>
          )}

          <div style={{ fontFamily: T.serif, fontSize: 16, color: T.ink, lineHeight: 1.7, marginBottom: 14, whiteSpace: 'pre-wrap' }}>
            {bodyExpanded ? post.body : post.body.slice(0, 280) + (post.body.length > 280 ? '…' : '')}
          </div>

          {post.body.length > 280 && (
            <button onClick={() => setBodyExpanded(v => !v)}
              style={{ background: 'none', border: 'none', color: T.goldDark, fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 10 }}>
              {bodyExpanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>

        {/* Reaction pills + Comment button */}
        <div style={{ padding: '10px 18px', borderTop: `1px solid ${T.line}`, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {REACTIONS.map((r) => {
            const count  = post.reaction_counts?.[r.kind] ?? 0;
            const active = myReaction === r.kind;
            return (
              <button key={r.kind} onClick={() => onReact(post.id, r.kind, active)} style={{
                background: active ? 'rgba(196,129,58,0.12)' : 'transparent',
                border: `1px solid ${active ? T.gold : T.line}`,
                borderRadius: 999, padding: '5px 12px', fontSize: 13,
                color: active ? T.goldDark : T.inkMuted,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
              }}>
                {r.emoji} <span>{r.label}</span>{count > 0 && <span style={{ fontWeight: 600, color: active ? T.goldDark : T.ink }}>{count}</span>}
              </button>
            );
          })}
          <button onClick={() => setShareOpen(true)} style={{
            background: 'transparent', border: `1px solid ${T.line}`,
            borderRadius: 999, padding: '5px 12px', fontSize: 13,
            color: T.inkMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
          }}>↗ Share</button>
          <button onClick={() => setCommentsOpen(true)} style={{
            background: 'none', border: 'none', color: T.inkMuted,
            fontSize: 13, cursor: 'pointer', marginLeft: 'auto',
            display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px',
          }}>
            💬 {localReplies.length > 0 ? localReplies.length : 'Comment'}
          </button>
        </div>
      </div>

      {/* Facebook-style centered post dialog */}
      {commentsOpen && (
        <div
          onClick={() => setCommentsOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: T.white, borderRadius: 10,
              width: 'min(660px, 96vw)', height: '85vh',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 8px 48px rgba(0,0,0,0.3)',
              animation: 'fadeIn 0.18s ease',
            }}
          >
            {/* Modal header */}
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0 }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: T.ink }}>
                {post.profiles?.display_name ? `${post.profiles.display_name}'s Post` : 'Post'}
              </span>
              <button onClick={() => setCommentsOpen(false)} style={{
                position: 'absolute', right: 14,
                width: 34, height: 34, borderRadius: '50%', background: T.parchment,
                border: 'none', cursor: 'pointer', fontSize: 20, color: T.inkMuted,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>×</button>
            </div>

            {/* Scrollable post + comments */}
            <div className="scroll" style={{ flex: 1, overflowY: 'auto' }}>
              {/* Post author */}
              <div style={{ padding: '16px 18px 0' }}>
                <div style={{ display: 'flex', gap: 11, alignItems: 'center', marginBottom: 12 }}>
                  <Avatar name={post.profiles?.display_name} avatarConfig={post.profiles?.avatar_config} size={42} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: T.ink }}>{post.profiles?.display_name ?? 'Anonymous'}</div>
                    <div style={{ fontSize: 12, color: T.inkMuted }}>
                      {[post.profiles?.city, post.profiles?.country].filter(Boolean).join(', ')}
                      {post.profiles?.tradition ? ` · ${post.profiles.tradition}` : ''}
                      {' · '}{timeAgo(post.created_at)}
                    </div>
                  </div>
                </div>
                {/* Full post body — no truncation in modal */}
                <div style={{ fontFamily: T.serif, fontSize: 16, color: T.ink, lineHeight: 1.75, marginBottom: 14, whiteSpace: 'pre-wrap' }}>
                  {post.body}
                </div>
              </div>

              {/* Reaction counts row */}
              {(() => {
                const total = REACTIONS.reduce((s, r) => s + (post.reaction_counts?.[r.kind] ?? 0), 0);
                return (total > 0 || localReplies.length > 0) ? (
                  <div style={{ padding: '8px 18px', borderTop: `1px solid ${T.line}`, borderBottom: `1px solid ${T.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: T.inkMuted }}>
                      {REACTIONS.filter(r => (post.reaction_counts?.[r.kind] ?? 0) > 0).map(r => (
                        <span key={r.kind}>{r.emoji}</span>
                      ))}
                      {total > 0 && <span>{total}</span>}
                    </div>
                    {localReplies.length > 0 && (
                      <span style={{ fontSize: 13, color: T.inkMuted }}>{localReplies.length} comment{localReplies.length !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                ) : null;
              })()}

              {/* Action bar — Like | Comment | Share */}
              <div style={{ display: 'flex', borderBottom: `1px solid ${T.line}` }}>
                {REACTIONS.map((r, i) => {
                  const active = myReaction === r.kind;
                  return (
                    <button key={r.kind} onClick={() => onReact(post.id, r.kind, active)} style={{
                      flex: 1, padding: '10px 4px', background: 'none',
                      border: 'none', borderRight: i < REACTIONS.length - 1 ? `1px solid ${T.line}` : 'none',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      fontSize: 14, fontWeight: 600,
                      color: active ? T.goldDark : T.inkSoft,
                    }}>
                      {r.emoji} {r.label}
                    </button>
                  );
                })}
                <button onClick={() => { setCommentsOpen(false); setShareOpen(true); }} style={{
                  flex: 1, padding: '10px 4px', background: 'none',
                  border: 'none', borderLeft: `1px solid ${T.line}`,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  fontSize: 14, fontWeight: 600, color: T.inkSoft,
                }}>
                  ↗ Share
                </button>
              </div>

              {/* Comments */}
              <div style={{ padding: '14px 18px' }}>
                {localReplies.length === 0 ? (
                  <div style={{ color: T.inkMuted, fontStyle: 'italic', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>
                    No comments yet — be the first.
                  </div>
                ) : (
                  localReplies.map(r => (
                    <div key={r.id} style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'flex-start' }}>
                      <Avatar name={r.profiles?.display_name} avatarConfig={r.profiles?.avatar_config} size={34} style={{ flexShrink: 0 }} />
                      <div>
                        <div style={{ background: T.parchment, borderRadius: 16, padding: '9px 13px' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 2 }}>
                            {r.profiles?.display_name ?? 'Anonymous'}
                          </div>
                          <div style={{ fontFamily: T.serif, fontSize: 14, color: T.inkSoft, lineHeight: 1.55 }}>{r.body}</div>
                        </div>
                        <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 4, paddingLeft: 10 }}>
                          {timeAgo(r.created_at)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Pinned comment input */}
            {currentUserId && (
              <div style={{ borderTop: `1px solid ${T.line}`, padding: '12px 18px 16px', display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0, background: T.white }}>
                <Avatar name={userProfile?.display_name} avatarConfig={userProfile?.avatar_config} size={36} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, background: T.parchment, borderRadius: 22, border: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', padding: '10px 16px', gap: 8 }}>
                  <input
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
                    placeholder="Write a comment…"
                    autoFocus
                    style={{ flex: 1, border: 'none', outline: 'none', fontFamily: T.serif, fontSize: 14, color: T.ink, background: 'transparent' }}
                  />
                  {replyText.trim() && (
                    <button onClick={handleReply} disabled={submitting} style={{
                      background: T.gold, border: 'none', borderRadius: '50%',
                      width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: T.cream, fontSize: 14, cursor: 'pointer', flexShrink: 0,
                    }}>↑</button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {shareOpen && (
        <ShareSheet
          body={post.body}
          title="Share this post"
          customActions={[
            session && {
              id: 'repost', icon: '↩', label: 'Repost to feed',
              sub: 'Share with attribution to your followers',
              doneLabel: 'Reposted',
              onClick: () => onRepost(post, 'feed'),
            },
            session && userGroup && {
              id: 'group', icon: '⛪', label: `Share to ${userGroup.group.name}`,
              sub: 'Visible to group members only',
              doneLabel: 'Shared',
              onClick: () => onRepost(post, 'group'),
            },
          ].filter(Boolean)}
          onClose={() => setShareOpen(false)}
        />
      )}
    </>
  );
}

function FeaturedThread({ thread, onRespond }) {
  if (!thread) return null;
  return (
    <div style={{
      background: T.ink, borderRadius: 18, padding: '22px 22px 18px',
      marginBottom: 20, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: 'radial-gradient(circle, rgba(196,129,58,0.12) 1px, transparent 1px)',
        backgroundSize: '24px 24px', pointerEvents: 'none',
      }} />
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{
            background: T.gold, color: T.cream, fontSize: 11, fontWeight: 700,
            padding: '3px 10px', borderRadius: 999, letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            This Week's Thread
          </span>
        </div>
        <div style={{ fontFamily: T.display, fontSize: 22, fontWeight: 600, color: T.cream, letterSpacing: '-0.015em', lineHeight: 1.2, marginBottom: 14 }}>
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
            style={{ background: T.gold, color: T.cream, border: 'none', borderRadius: 999, padding: '10px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            Respond in Chat →
          </button>
          <span style={{ fontSize: 13, color: 'rgba(253,248,240,0.45)' }}>{thread.reply_count ?? 0} responses</span>
        </div>
      </div>
    </div>
  );
}

function PrayerCard({ prayer, session, currentUserId, onPray, onViewProfile }) {
  const [encOpen,    setEncOpen]    = useState(false);
  const [encs,       setEncs]       = useState(null);
  const [encInput,   setEncInput]   = useState('');
  const [encLoading, setEncLoading] = useState(false);
  const [encCount,   setEncCount]   = useState(prayer.enc_count ?? 0);
  const [shareOpen,  setShareOpen]  = useState(false);
  const person  = PERSON_TYPES.find(p => p.id === prayer.profiles?.person_type);
  const isOwn   = currentUserId === prayer.user_id;

  async function openEnc() {
    setEncOpen(true);
    if (encs === null) {
      setEncLoading(true);
      const { data } = await supabase
        .from('personal_prayer_encouragements')
        .select('*, profiles(display_name, avatar_config)')
        .eq('prayer_id', prayer.id)
        .order('created_at', { ascending: true });
      setEncs(data ?? []);
      setEncLoading(false);
    }
  }

  async function submitEnc() {
    if (!encInput.trim() || !session?.user?.id) return;
    const { data } = await supabase
      .from('personal_prayer_encouragements')
      .insert({ prayer_id: prayer.id, user_id: session.user.id, body: encInput.trim() })
      .select('*, profiles(display_name, avatar_config)')
      .single();
    if (data) { setEncs(prev => [...(prev ?? []), data]); setEncCount(c => c + 1); setEncInput(''); }
  }

  return (
    <>
      <div style={{
        position: 'relative',
        background: prayer.is_answered
          ? `linear-gradient(180deg, rgba(196,129,58,0.05), ${T.white})`
          : `linear-gradient(180deg, ${SEMANTIC.prayer.bg}, ${T.white})`,
        borderRadius: 16,
        border: `1px solid ${prayer.is_answered ? T.goldLight : T.line}`,
        marginBottom: 14, overflow: 'hidden',
      }}>
        {/* Semantic accent rail — sage for prayer, gold for answered */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: 4,
          background: prayer.is_answered ? T.gold : SEMANTIC.prayer.rail,
        }} />
        {/* Header */}
        <div style={{ padding: '16px 18px 0' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
            <button onClick={() => onViewProfile?.(prayer.user_id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0 }}>
              <Avatar name={prayer.profiles?.display_name} avatarConfig={prayer.profiles?.avatar_config} size={38} />
            </button>
            <div style={{ flex: 1 }}>
              <button onClick={() => onViewProfile?.(prayer.user_id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: T.ink }}>{prayer.profiles?.display_name ?? 'Someone'}</div>
              </button>
              <div style={{ fontSize: 12, color: T.inkMuted }}>
                {[prayer.profiles?.city, prayer.profiles?.country].filter(Boolean).join(', ')}
                {prayer.profiles?.tradition ? ` · ${prayer.profiles.tradition}` : ''}
                {person ? ` · ${person.emoji} ${person.label}` : ''}
                {' · '}{timeAgo(prayer.created_at)}
              </div>
            </div>
            {prayer.is_answered && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(196,129,58,0.12)', borderRadius: 999, padding: '4px 10px', flexShrink: 0 }}>
                <svg width="11" height="11" viewBox="0 0 34 34">
                  <circle cx="17" cy="17" r="10" fill={T.gold}/>
                  <polyline points="11,17 15,21 23,12" fill="none" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span style={{ fontSize: 11, fontWeight: 700, color: T.goldDark }}>Answered ✦</span>
              </div>
            )}
          </div>

          <div style={{ fontFamily: T.serif, fontSize: 16, color: T.ink, lineHeight: 1.7, marginBottom: 14, whiteSpace: 'pre-wrap' }}>
            {prayer.body}
          </div>

          {prayer.is_answered && prayer.praise_report && (
            <div style={{ marginBottom: 14, background: 'rgba(196,129,58,0.07)', borderRadius: 10, padding: '10px 13px', borderLeft: `3px solid ${T.gold}` }}>
              <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 4 }}>Praise Report ✦</div>
              <div style={{ fontFamily: T.serif, fontStyle: 'italic', fontSize: 13, color: T.inkSoft, lineHeight: 1.6 }}>"{prayer.praise_report}"</div>
            </div>
          )}
        </div>

        {/* Action bar */}
        <div style={{ padding: '10px 18px', borderTop: `1px solid ${T.line}`, display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            onClick={() => !isOwn && onPray(prayer.id, prayer.my_prayed)}
            style={{
              background: prayer.my_prayed ? SEMANTIC.prayer.bgActive : 'transparent',
              border: `1px solid ${prayer.my_prayed ? SEMANTIC.prayer.line : T.line}`,
              borderRadius: 999, padding: '5px 12px', fontSize: 13,
              color: prayer.my_prayed ? SEMANTIC.prayer.text : T.inkMuted,
              fontWeight: prayer.my_prayed ? 600 : 400,
              cursor: isOwn ? 'default' : 'pointer', opacity: isOwn ? 0.45 : 1,
              display: 'flex', alignItems: 'center', gap: 5,
              transition: 'all 0.15s',
            }}
          >
            🙏 <span>Praying</span>
            {prayer.support_count > 0 && <span style={{ fontWeight: 700, color: prayer.my_prayed ? SEMANTIC.prayer.text : T.ink, marginLeft: 2 }}>{prayer.support_count}</span>}
          </button>

          <button
            onClick={openEnc}
            style={{
              background: 'none', border: 'none', color: T.inkMuted,
              fontSize: 13, cursor: 'pointer', marginLeft: 'auto',
              display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px',
            }}
          >
            💬 {encCount > 0 ? encCount : 'Encourage'}
          </button>
        </div>
      </div>

      {/* Facebook-style centered encouragements dialog */}
      {encOpen && (
        <div
          onClick={() => setEncOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: T.white, borderRadius: 10,
              width: 'min(660px, 96vw)', height: '85vh',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 8px 48px rgba(0,0,0,0.3)',
              animation: 'fadeIn 0.18s ease',
            }}
          >
            {/* Header */}
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0 }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: T.ink }}>
                {prayer.profiles?.display_name ? `${prayer.profiles.display_name}'s Prayer` : 'Prayer Request'}
              </span>
              <button onClick={() => setEncOpen(false)} style={{
                position: 'absolute', right: 14,
                width: 34, height: 34, borderRadius: '50%', background: T.parchment,
                border: 'none', cursor: 'pointer', fontSize: 20, color: T.inkMuted,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>×</button>
            </div>

            {/* Scrollable prayer + encouragements */}
            <div className="scroll" style={{ flex: 1, overflowY: 'auto' }}>
              {/* Prayer author + body */}
              <div style={{ padding: '16px 18px' }}>
                <div style={{ display: 'flex', gap: 11, alignItems: 'center', marginBottom: 12 }}>
                  <Avatar name={prayer.profiles?.display_name} avatarConfig={prayer.profiles?.avatar_config} size={42} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: T.ink }}>{prayer.profiles?.display_name ?? 'Someone'}</div>
                    <div style={{ fontSize: 12, color: T.inkMuted }}>
                      {[prayer.profiles?.city, prayer.profiles?.country].filter(Boolean).join(', ')}
                      {prayer.profiles?.tradition ? ` · ${prayer.profiles.tradition}` : ''}
                      {' · '}{timeAgo(prayer.created_at)}
                    </div>
                  </div>
                </div>
                <div style={{ fontFamily: T.serif, fontSize: 16, color: T.ink, lineHeight: 1.75, marginBottom: 14, whiteSpace: 'pre-wrap' }}>
                  {prayer.body}
                </div>
                {prayer.is_answered && prayer.praise_report && (
                  <div style={{ marginBottom: 14, background: 'rgba(196,129,58,0.07)', borderRadius: 10, padding: '10px 13px', borderLeft: `3px solid ${T.gold}` }}>
                    <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 4 }}>Praise Report ✦</div>
                    <div style={{ fontFamily: T.serif, fontStyle: 'italic', fontSize: 13, color: T.inkSoft, lineHeight: 1.6 }}>"{prayer.praise_report}"</div>
                  </div>
                )}
              </div>

              {/* Counts row */}
              {(prayer.support_count > 0 || encCount > 0) && (
                <div style={{ padding: '8px 18px', borderTop: `1px solid ${T.line}`, borderBottom: `1px solid ${T.line}`, display: 'flex', justifyContent: 'space-between', fontSize: 13, color: T.inkMuted }}>
                  {prayer.support_count > 0 && <span>🙏 {prayer.support_count} praying</span>}
                  {encCount > 0 && <span>{encCount} encouragement{encCount !== 1 ? 's' : ''}</span>}
                </div>
              )}

              {/* Action bar */}
              <div style={{ display: 'flex', borderBottom: `1px solid ${T.line}` }}>
                <button
                  onClick={() => { !isOwn && onPray(prayer.id, prayer.my_prayed); }}
                  style={{
                    flex: 1, padding: '10px 4px', background: 'none',
                    border: 'none', borderRight: `1px solid ${T.line}`,
                    cursor: isOwn ? 'default' : 'pointer', opacity: isOwn ? 0.4 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    fontSize: 14, fontWeight: 600,
                    color: prayer.my_prayed ? T.goldDark : T.inkSoft,
                  }}
                >
                  🙏 {prayer.my_prayed ? 'Praying' : 'Pray'}
                </button>
                <button style={{
                  flex: 1, padding: '10px 4px', background: 'none', border: 'none',
                  borderRight: `1px solid ${T.line}`,
                  cursor: 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  fontSize: 14, fontWeight: 600, color: T.goldDark,
                }}>
                  💬 Encourage
                </button>
                <button
                  onClick={() => setShareOpen(true)}
                  style={{
                    flex: 1, padding: '10px 4px', background: 'none', border: 'none',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    fontSize: 14, fontWeight: 600, color: T.inkSoft,
                  }}
                >
                  ↗ Share
                </button>
              </div>

              {/* Encouragements */}
              <div style={{ padding: '14px 18px' }}>
                {encLoading ? (
                  <div style={{ color: T.inkMuted, fontSize: 14, textAlign: 'center', padding: '20px 0' }}>Loading…</div>
                ) : (encs ?? []).length === 0 ? (
                  <div style={{ color: T.inkMuted, fontStyle: 'italic', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>
                    No encouragements yet — be the first.
                  </div>
                ) : (
                  (encs ?? []).map(enc => (
                    <div key={enc.id} style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'flex-start' }}>
                      <Avatar name={enc.profiles?.display_name} avatarConfig={enc.profiles?.avatar_config} size={34} style={{ flexShrink: 0 }} />
                      <div>
                        <div style={{ background: T.parchment, borderRadius: 16, padding: '9px 13px' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 2 }}>{enc.profiles?.display_name ?? 'Someone'}</div>
                          <div style={{ fontFamily: T.serif, fontSize: 14, color: T.inkSoft, lineHeight: 1.55 }}>{enc.body}</div>
                        </div>
                        <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 4, paddingLeft: 10 }}>{enc.created_at ? timeAgo(enc.created_at) : ''}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Pinned input */}
            <div style={{ borderTop: `1px solid ${T.line}`, padding: '12px 18px 16px', display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0, background: T.white }}>
              <Avatar name={null} avatarConfig={null} size={36} style={{ flexShrink: 0, opacity: 0 }} />
              <div style={{ flex: 1, background: T.parchment, borderRadius: 22, border: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', padding: '10px 16px', gap: 8 }}>
                <input
                  value={encInput}
                  onChange={(e) => setEncInput(e.target.value.slice(0, 120))}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitEnc(); } }}
                  placeholder="Write an encouragement…"
                  autoFocus
                  style={{ flex: 1, border: 'none', outline: 'none', fontFamily: T.serif, fontSize: 14, color: T.ink, background: 'transparent' }}
                />
                {encInput.trim() && (
                  <button onClick={submitEnc} style={{ background: T.gold, border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.cream, fontSize: 14, cursor: 'pointer', flexShrink: 0 }}>↑</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {shareOpen && (
        <ShareSheet
          body={prayer.body}
          title="Share this prayer"
          onClose={() => setShareOpen(false)}
        />
      )}
    </>
  );
}

export function ComposeSheet({ session, profile, onPost, onClose }) {
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handlePost(e) {
    e.preventDefault();
    if (!body.trim() || !session) return;
    setSubmitting(true);
    // scope='me' + kind='text' are NOT NULL in posts; the old composer
    // omitted them and the insert was silently failing for non-pastors.
    // Privacy is enforced by the RLS policy "Same-church members read
    // me-scope posts" — no client-side audience picker needed.
    const { data, error } = await supabase
      .from('posts')
      .insert({
        author_id: session.user.id,
        scope: 'me',
        kind: 'text',
        body: body.trim(),
        person_type: profile?.person_type ?? null,
      })
      .select('*, profiles(display_name, city, country, tradition, person_type, avatar_config), post_comments(id)')
      .single();
    setSubmitting(false);
    if (error) { console.error('Post failed:', error.message); return; }
    if (data) onPost({ ...data, reaction_counts: {}, my_reaction: null, reply_count: 0 });
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(44,24,16,0.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: T.white, borderRadius: '20px 20px 0 0',
          width: '100%', maxWidth: 540, padding: '20px 20px 36px',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.15)', animation: 'slideUp 0.2s ease',
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: T.line, margin: '0 auto 18px' }} />

        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
          <Avatar name={profile?.display_name} avatarConfig={profile?.avatar_config} size={40} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: T.ink, marginBottom: 4 }}>{profile?.display_name ?? 'You'}</div>
            {/* Privacy hint — replaces the old 3-option picker. The visibility
                is set by RLS, not the author: same-church members can read,
                everyone else sees the count but can't enter the comments. */}
            <div style={{
              fontSize: 11, color: T.inkMuted, fontStyle: 'italic',
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}>
              👥 Visible to your church family
            </div>
          </div>
        </div>

        <form onSubmit={handlePost}>
          <textarea
            autoFocus
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="A thought, a doubt, a question…"
            rows={5}
            style={{
              width: '100%', border: 'none', outline: 'none', resize: 'none',
              fontFamily: T.serif, fontSize: 16, lineHeight: 1.7, color: T.ink,
              background: 'transparent', marginBottom: 16,
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', borderTop: `1px solid ${T.line}`, paddingTop: 14 }}>
            <button
              type="submit"
              disabled={submitting || !body.trim()}
              style={{
                background: body.trim() ? `linear-gradient(135deg, ${T.gold} 0%, #c47020 100%)` : T.line,
                color: T.cream, border: 'none', borderRadius: 999,
                padding: '10px 24px', fontSize: 14, fontWeight: 600,
                cursor: body.trim() ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s',
                boxShadow: body.trim() ? '0 4px 14px rgba(196,129,58,0.3)' : 'none',
              }}
            >
              {submitting ? 'Posting…' : 'Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Community({ session, profile, onClose, onOpenChat, hideHeader, userGroup, onViewProfile, onFindPeople, onInviteFriends }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [following, setFollowing] = useState(new Set());
  const [featuredThread, setFeaturedThread] = useState(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [feedType, setFeedType] = useState('posts');
  const [prayers, setPrayers] = useState([]);
  const [prayersLoading, setPrayersLoading] = useState(false);
  const [questionRevealed, setQuestionRevealed] = useState(() => {
    try { return localStorage.getItem('theway:dailyQ:revealed') === todayKey(); }
    catch { return false; }
  });
  const revealQuestion = () => {
    setQuestionRevealed(true);
    try { localStorage.setItem('theway:dailyQ:revealed', todayKey()); } catch {}
  };

  useEffect(() => {
    if (!session?.user?.id) return;
    const uid = session.user.id;
    supabase.from('follows').select('following_id').eq('follower_id', uid)
      .then(({ data }) => setFollowing(new Set(data?.map((f) => f.following_id) ?? [])));
    // The friend_requests fetch lived here to power the now-removed
    // audience='friends' filter; with RLS doing privacy gating we no
    // longer need to know who the viewer's friends are at this surface.
  }, [session]);

  useEffect(() => {
    supabase.from('featured_threads').select('*').eq('active', true)
      .order('created_at', { ascending: false }).limit(1)
      .then(({ data }) => {
        if (data?.[0]) {
          supabase.from('posts').select('id', { count: 'exact', head: true })
            .eq('featured_thread_id', data[0].id)
            .then(({ count }) => setFeaturedThread({ ...data[0], reply_count: count ?? 0 }));
        }
      });
  }, []);

  async function handleFollow(userId, isFollowing) {
    if (!session) return;
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', session.user.id).eq('following_id', userId);
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
      .select(`*, profiles(display_name, city, country, tradition, person_type, avatar_config), post_comments(id, body, created_at, profiles(display_name, avatar_config))`)
      .order('created_at', { ascending: false })
      .limit(60);
    if (filter !== 'all') query = query.eq('person_type', filter);
    const { data: postData } = await query;
    if (!postData) { setLoading(false); return; }

    const myId = session?.user?.id;
    // Visibility is now enforced entirely by RLS — see
    // scripts/2026-05-01-private-comments.sql. The legacy client-side
    // audience filter (public/private/friends) was removed because no
    // composer writes audience anymore and RLS already returns only the
    // posts this viewer is allowed to see.
    const visible = postData;

    const postIds = visible.map((p) => p.id);
    const { data: reactions } = postIds.length
      ? await supabase.from('reactions').select('post_id, kind, author_id').in('post_id', postIds)
      : { data: [] };

    const enriched = visible.map((p) => {
      const postReactions = reactions?.filter((r) => r.post_id === p.id) ?? [];
      const counts = {};
      postReactions.forEach((r) => { counts[r.kind] = (counts[r.kind] ?? 0) + 1; });
      const myReaction = postReactions.find((r) => r.author_id === myId)?.kind ?? null;
      return { ...p, reaction_counts: counts, my_reaction: myReaction, reply_count: p.post_comments?.length ?? 0 };
    });

    setPosts(enriched);
    setLoading(false);
  }, [filter, session]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  async function handleReact(postId, kind, isActive) {
    if (!session) return;
    if (isActive) {
      await supabase.from('reactions').delete().eq('post_id', postId).eq('author_id', session.user.id);
    } else {
      await supabase.from('reactions').upsert({ post_id: postId, author_id: session.user.id, kind }, { onConflict: 'post_id,author_id' });
    }
    loadPosts();
  }

  async function handleReply(postId, body) {
    if (!session) return;
    // post_comments is the privacy-gated canonical table (see
    // scripts/2026-05-01-private-comments.sql). The legacy 'replies' table
    // is wide-open to any authed user and should not be written anymore.
    await supabase.from('post_comments').insert({ post_id: postId, author_id: session.user.id, body });
    loadPosts();
  }

  async function handleRepost(post, target) {
    if (!session) return;
    const authorName = post.profiles?.display_name ?? 'Someone';
    const body = `"${post.body}"\n\n— ${authorName}`;
    if (target === 'feed') {
      await supabase.from('posts').insert({
        author_id: session.user.id,
        body,
        person_type: post.person_type ?? profile?.person_type ?? null,
      });
    } else if (target === 'group' && userGroup) {
      await supabase.from('group_posts').insert({
        group_id: userGroup.group.id,
        author_id: session.user.id,
        body,
      });
    }
    if (target === 'feed') loadPosts();
  }

  const loadCommunityPrayers = useCallback(async () => {
    setPrayersLoading(true);
    const myId = session?.user?.id;
    const { data } = await supabase
      .from('personal_prayers')
      .select('*, profiles(display_name, city, country, tradition, person_type, avatar_config)')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(60);
    if (!data) { setPrayersLoading(false); return; }
    const ids = data.map(p => p.id);
    const [{ data: sd }, { data: ed }, { data: myPrayedRows }] = await Promise.all([
      supabase.from('personal_prayer_support').select('prayer_id').in('prayer_id', ids),
      supabase.from('personal_prayer_encouragements').select('prayer_id').in('prayer_id', ids),
      myId ? supabase.from('personal_prayer_support').select('prayer_id').eq('user_id', myId).in('prayer_id', ids) : Promise.resolve({ data: [] }),
    ]);
    const supportCounts = {}, encCounts = {};
    for (const r of sd ?? []) supportCounts[r.prayer_id] = (supportCounts[r.prayer_id] ?? 0) + 1;
    for (const r of ed ?? []) encCounts[r.prayer_id] = (encCounts[r.prayer_id] ?? 0) + 1;
    const myPrayedSet = new Set((myPrayedRows ?? []).map(r => r.prayer_id));
    setPrayers(data.map(p => ({ ...p, support_count: supportCounts[p.id] ?? 0, enc_count: encCounts[p.id] ?? 0, my_prayed: myPrayedSet.has(p.id) })));
    setPrayersLoading(false);
  }, [session]);

  useEffect(() => { if (feedType === 'prayers') loadCommunityPrayers(); }, [feedType, loadCommunityPrayers]);

  async function handlePray(prayerId, isPraying) {
    if (!session?.user?.id) return;
    if (isPraying) {
      await supabase.from('personal_prayer_support').delete().eq('prayer_id', prayerId).eq('user_id', session.user.id);
    } else {
      await supabase.from('personal_prayer_support').upsert({ prayer_id: prayerId, user_id: session.user.id }, { onConflict: 'prayer_id,user_id' });
    }
    setPrayers(prev => prev.map(p => p.id === prayerId ? { ...p, support_count: p.support_count + (isPraying ? -1 : 1), my_prayed: !isPraying } : p));
  }

  return (
    <div className="scene" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {!hideHeader && (
        <>
          {/* App top bar — clean, integrated icon row */}
          <header style={{
            padding: '0 12px 0 16px', height: 52, background: T.white,
            borderBottom: `1px solid ${T.line}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            position: 'sticky', top: 0, zIndex: 10,
          }}>
            <div style={{ fontFamily: T.display, fontSize: 21, fontWeight: 600, color: T.ink, letterSpacing: '-0.018em', display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{
                color: T.goldDark, fontSize: 17,
                filter: 'drop-shadow(0 0 8px rgba(196,129,58,0.45))',
              }}>✦</span>
              The Way
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <button
                onClick={() => onFindPeople?.()}
                title="Find people"
                aria-label="Find people"
                style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'transparent', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', fontSize: 16, color: T.inkSoft,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = T.parchment; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                🔍
              </button>
              <button
                onClick={() => onOpenChat?.()}
                title="Ask AI"
                aria-label="Ask AI"
                style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'transparent', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', fontSize: 16, color: T.inkSoft,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = T.parchment; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                💬
              </button>
              {profile && (
                <button
                  onClick={() => onViewProfile?.(session?.user?.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: 6, display: 'flex' }}
                  title="Your profile"
                  aria-label="Your profile"
                >
                  <Avatar name={profile.display_name} avatarConfig={profile.avatar_config} size={32} />
                </button>
              )}
            </div>
          </header>

          {/* Compact verse — single line, no eyebrow noise */}
          {(() => {
            const v = getDailyVerse();
            return (
              <div style={{
                background: T.parchment,
                borderBottom: `1px solid ${T.line}`,
                padding: '7px 16px',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{
                  flexShrink: 0, fontSize: 11, color: T.gold,
                  filter: 'drop-shadow(0 0 4px rgba(196,129,58,0.4))',
                  lineHeight: 1,
                }}>❉</div>
                <div style={{
                  flex: 1, minWidth: 0,
                  fontFamily: T.serif, fontStyle: 'italic',
                  fontSize: 12.5, lineHeight: 1.4, color: T.inkSoft,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  &ldquo;{v.text}&rdquo;{' '}
                  <span style={{ fontStyle: 'normal', fontWeight: 600, color: T.goldDark }}>— {v.ref}</span>
                </div>
                {onInviteFriends && (
                  <button
                    onClick={onInviteFriends}
                    style={{
                      background: 'transparent', border: 'none',
                      padding: '2px 4px', flexShrink: 0,
                      fontSize: 11, fontWeight: 600, color: T.goldDark,
                      cursor: 'pointer', whiteSpace: 'nowrap',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    ↗ Invite
                  </button>
                )}
              </div>
            );
          })()}

          {/* Daily question — sealed envelope that reveals on tap */}
          {onOpenChat && feedType === 'posts' && (() => {
            const q = getDailyQuestion();
            if (!questionRevealed) {
              return (
                <button
                  onClick={revealQuestion}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    background: `linear-gradient(135deg, ${T.parchment} 0%, ${T.parchmentDark} 100%)`,
                    border: 'none', borderBottom: `1px solid ${T.line}`,
                    padding: '14px 16px', cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                    position: 'relative', overflow: 'hidden',
                  }}
                  aria-label="Reveal today's question"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div className="halo" style={{
                      flexShrink: 0, width: 38, height: 38, borderRadius: '50%',
                      background: `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: T.cream, fontSize: 16, fontWeight: 700,
                      boxShadow: '0 2px 8px rgba(196,129,58,0.25)',
                    }}>✦</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 9.5, letterSpacing: '0.16em', textTransform: 'uppercase',
                        color: T.goldDark, fontWeight: 700, marginBottom: 2,
                      }}>
                        Today's Question
                      </div>
                      <div style={{
                        fontFamily: T.serif, fontSize: 14, fontStyle: 'italic',
                        color: T.inkSoft, lineHeight: 1.35,
                      }}>
                        Tap to reveal
                      </div>
                    </div>
                    <div style={{
                      flexShrink: 0, fontSize: 12, color: T.goldDark,
                      fontWeight: 600, letterSpacing: '0.05em',
                    }}>
                      Open ▸
                    </div>
                  </div>
                </button>
              );
            }
            return (
              <button
                onClick={() => onOpenChat(q)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  background: T.white, border: 'none',
                  borderBottom: `1px solid ${T.line}`,
                  padding: '12px 16px', cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                  animation: 'questionReveal 0.55s cubic-bezier(0.2, 0.8, 0.2, 1) both',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 9.5, letterSpacing: '0.16em', textTransform: 'uppercase',
                      color: T.goldDark, fontWeight: 700, marginBottom: 3,
                    }}>
                      Today's Question
                    </div>
                    <div style={{
                      fontFamily: T.serif, fontSize: 14.5, lineHeight: 1.4,
                      color: T.ink, fontWeight: 500,
                    }}>
                      {q}
                    </div>
                  </div>
                  <div className="magnet" style={{
                    flexShrink: 0, width: 34, height: 34, borderRadius: '50%',
                    background: T.parchment, border: `1px solid ${T.goldLight}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: T.goldDark, fontSize: 15, fontWeight: 600,
                  }}>
                    →
                  </div>
                </div>
              </button>
            );
          })()}

          {/* Compose box — posts only */}
          {session && feedType === 'posts' && (
            <div style={{ background: T.white, padding: '12px 16px', borderBottom: `1px solid ${T.line}` }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <Avatar name={profile?.display_name} avatarConfig={profile?.avatar_config} size={38} />
                <button
                  onClick={() => setComposeOpen(true)}
                  style={{
                    flex: 1, textAlign: 'left',
                    background: T.parchment, border: `1px solid ${T.line}`,
                    borderRadius: 999, padding: '10px 16px',
                    color: T.inkMuted, cursor: 'pointer', fontSize: 14,
                    fontFamily: T.serif,
                  }}
                >
                  A thought, a doubt, a question…
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Feed type tabs — each tab owns a semantic color */}
      <div style={{ display: 'flex', background: T.white, borderBottom: `1px solid ${T.line}` }}>
        {[
          { id: 'posts',   label: '📝 Posts',   bg: 'rgba(196,129,58,0.10)', rail: T.gold,             text: T.goldDark      },
          { id: 'prayers', label: '🙏 Prayers', bg: SEMANTIC.prayer.bg,      rail: SEMANTIC.prayer.rail, text: SEMANTIC.prayer.text },
        ].map(t => {
          const isActive = feedType === t.id;
          return (
            <button key={t.id} onClick={() => setFeedType(t.id)} style={{
              flex: 1, padding: '13px 4px',
              background: isActive ? t.bg : 'transparent',
              border: 'none',
              borderBottom: isActive ? `3px solid ${t.rail}` : '3px solid transparent',
              fontSize: 14, fontWeight: isActive ? 700 : 500,
              color: isActive ? t.text : T.inkMuted,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}>{t.label}</button>
          );
        })}
      </div>

      {/* Person-type filter chips — each persona owns its color when selected */}
      {feedType === 'posts' && (
        <div style={{ display: 'flex', gap: 8, padding: '10px 16px', overflowX: 'auto', borderBottom: `1px solid ${T.line}`, background: T.white }}>
          {[{ id: 'all', label: 'All' }, ...PERSON_TYPES.map((p) => ({ id: p.id, label: `${p.emoji} ${p.label}` }))].map((f) => {
            const active = filter === f.id;
            const tint = f.id === 'all' ? null : tintFor(f.id);
            const activeBg     = tint ? tint.bgChip : T.ink;
            const activeBorder = tint ? tint.rail   : T.ink;
            const activeText   = tint ? tint.text   : T.cream;
            return (
              <button key={f.id} onClick={() => setFilter(f.id)} style={{
                background: active ? activeBg : 'transparent',
                color: active ? activeText : T.inkSoft,
                border: `1.5px solid ${active ? activeBorder : T.line}`,
                borderRadius: 999, padding: '6px 14px', fontSize: 13, cursor: 'pointer',
                whiteSpace: 'nowrap', fontWeight: active ? 700 : 400,
                flexShrink: 0,
                transition: 'all 0.15s',
              }}>
                {f.label}
              </button>
            );
          })}
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 90px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>

          {/* ── Posts feed ── */}
          {feedType === 'posts' && (
            <>
              <FeaturedThread thread={featuredThread} onRespond={(q) => onOpenChat?.(q)} />
              {loading && <div style={{ textAlign: 'center', color: T.inkMuted, padding: 40, fontFamily: T.serif, fontSize: 16 }}>Loading…</div>}
              {!loading && posts.length === 0 && (
                <div style={{ textAlign: 'center', padding: 60 }}>
                  <div style={{ fontFamily: T.display, fontSize: 24, fontWeight: 600, color: T.ink, marginBottom: 10, letterSpacing: '-0.018em', lineHeight: 1.15 }}>Nothing here yet.</div>
                  <div style={{ fontSize: 15, color: T.inkMuted, lineHeight: 1.6 }}>Be the first to start the conversation.</div>
                </div>
              )}
              <div className="stagger-in">
                {posts.map((p, i) => (
                  <PostCard
                    key={p.id}
                    post={p}
                    index={Math.min(i, 6)}
                    session={session}
                    currentUserId={session?.user?.id}
                    userProfile={profile}
                    userGroup={userGroup}
                    onReact={handleReact}
                    onReplySubmit={handleReply}
                    onRepost={handleRepost}
                    isFollowing={following.has(p.author_id)}
                    onFollow={handleFollow}
                    onViewProfile={onViewProfile}
                  />
                ))}
              </div>
            </>
          )}

          {/* ── Prayers feed ── */}
          {feedType === 'prayers' && (
            <>
              {prayersLoading && <div style={{ textAlign: 'center', color: T.inkMuted, padding: 40, fontFamily: T.serif, fontSize: 16 }}>Loading…</div>}
              {!prayersLoading && prayers.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: '50%',
                    background: SEMANTIC.prayer.bgActive,
                    border: `1.5px solid ${SEMANTIC.prayer.line}`,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 26, color: SEMANTIC.prayer.text, marginBottom: 18,
                    boxShadow: `0 0 0 8px ${SEMANTIC.prayer.bg}`,
                  }}>🕯️</div>
                  <div style={{ fontFamily: T.display, fontSize: 24, fontWeight: 600, color: T.ink, marginBottom: 10, letterSpacing: '-0.018em', lineHeight: 1.15 }}>No public prayers yet.</div>
                  <div style={{ fontSize: 15, color: T.inkMuted, lineHeight: 1.6, maxWidth: 360, margin: '0 auto' }}>Share a prayer request and the community will stand with you.</div>
                </div>
              )}
              {prayers.map(p => (
                <PrayerCard
                  key={p.id}
                  prayer={p}
                  session={session}
                  currentUserId={session?.user?.id}
                  onPray={handlePray}
                  onViewProfile={onViewProfile}
                />
              ))}
            </>
          )}

        </div>
      </div>

      {composeOpen && (
        <ComposeSheet
          session={session}
          profile={profile}
          onPost={(newPost) => { setPosts((prev) => [newPost, ...prev]); setComposeOpen(false); }}
          onClose={() => setComposeOpen(false)}
        />
      )}
    </div>
  );
}
