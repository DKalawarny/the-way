import { useEffect, useRef, useState, useCallback, lazy, Suspense, Fragment } from 'react';
import { Smile, Bookmark } from 'lucide-react';
import { supabase } from './supabase.js';
import { T, tintFor, SEMANTIC } from './theme.js';
import { KinwoveStar } from './components/brand/KinwoveStar.jsx';
import { KinwoveWordmark } from './components/brand/KinwoveWordmark.jsx';
import { PERSON_TYPES } from './constants.js';
import { Avatar } from './ProfilePage.jsx';
import ShareSheet from './ShareSheet.jsx';
import PostImageGrid from './PostImageGrid.jsx';
import { getDailyVerse } from './dailyVerse.js';
import { codeToFlag } from './countries.js';
import EmptyState from './EmptyState.jsx';
import SponsoredCard from './SponsoredCard.jsx';
const PostComposer = lazy(() => import('./PostComposer.jsx'));

// Each reaction owns its own register: Love is warm + relational (rose),
// Amen is the sacred one (gold + serif weight), Insightful is the lit
// thought (amber). Share stays parchment so it reads as utility.
const REACTIONS = [
  {
    kind: 'resonates', label: 'Love', emoji: '❤️',
    activeBg: 'linear-gradient(180deg, #F5D0D6 0%, #E9B5BD 100%)',
    activeBorder: '#c47a86', activeText: '#7a3c46',
    activeShadow: '0 2px 6px rgba(196,122,134,0.30)',
  },
  {
    kind: 'amen', label: 'Amen', emoji: '🙏',
    activeBg: 'linear-gradient(180deg, #F4D89A 0%, #E8B563 100%)',
    activeBorder: '#9a6328', activeText: '#4d2c0d',
    activeShadow: '0 2px 8px rgba(154,99,40,0.40)',
    serifLabel: true,
  },
  {
    kind: 'thinking', label: 'Insightful', emoji: '💡',
    activeBg: 'linear-gradient(180deg, #FBE5C4 0%, #F4D5A6 100%)',
    activeBorder: '#c4813a', activeText: '#6b3d12',
    activeShadow: '0 2px 6px rgba(184,115,58,0.28)',
  },
];

// One hue per post kind. Drives a 6px left-edge rail on each card so a
// mixed feed reads at a glance. Saturated on purpose — the rail is the
// only kind signal on the card, so it has to read instantly without
// dominating the parchment palette.
const KIND_TINTS = {
  text:              { rail: '#8c7a5e', bg: 'rgba(140,122,94,0.06)'  }, // dark clay — neutral thoughts
  verse:             { rail: '#c4813a', bg: 'rgba(184,115,58,0.08)'  }, // gold — scripture
  question:          { rail: '#3a6b8a', bg: 'rgba(58,107,138,0.08)'  }, // deep blue — seeking
  prayer:            { rail: '#5a8064', bg: 'rgba(90,128,100,0.08)'  }, // forest sage — prayer
  share:             { rail: '#8c7a5e', bg: 'rgba(140,122,94,0.06)'  }, // same as text
  journey:           { rail: '#a05870', bg: 'rgba(160,88,112,0.08)'  }, // saturated rose — journey
  journey_milestone: { rail: '#a05870', bg: 'rgba(160,88,112,0.08)'  }, // same as journey
  sermon_item:       { rail: '#9c5a1f', bg: 'rgba(156,90,31,0.08)'   }, // deep gold — sermons
};
function kindTint(k) { return KIND_TINTS[k] ?? KIND_TINTS.text; }

// Rotating compose prompts — invites a different register than "What's on
// your mind?". Cycles daily so the page feels alive without overwhelming.
// Mix of registers: gratitude, doubt, awe, lament, encouragement, the everyday.
// Kept open enough for newcomers and skeptics — no insider language that assumes belief.
const COMPOSE_PROMPTS = [
  'What\u2019s on your mind today?',
  'A thought, a thanks, a doubt\u2026',
  'What\u2019s on your heart?',
  'Where are you weary?',
  'What are you wrestling with?',
  'A moment worth sharing\u2026',
  'Something you\u2019re grateful for\u2026',
  'What made you pause this week?',
  'A question you can\u2019t answer yet\u2026',
  'What are you carrying?',
  'A moment you didn\u2019t expect\u2026',
  'What would you like support with?',
  'Speak honestly\u2026',
  'A truth you\u2019re still learning\u2026',
  'What\u2019s the hard part right now?',
  'A small joy worth naming\u2026',
  'What did you read today?',
  'What\u2019s this season teaching you?',
  'Reflect, celebrate, or simply share\u2026',
  'A word for someone who needs it\u2026',
  'What surprised you today?',
  'Where are you hopeful?',
  'A doubt, voiced gently\u2026',
  'What are you thankful for?',
  'A burden you can set down here\u2026',
  'What\u2019s becoming clearer to you?',
  'Something small that mattered today\u2026',
  'What are you still figuring out?',
];
function getComposePrompt() {
  const d = new Date();
  const dayKey = d.getFullYear() * 366 + d.getMonth() * 31 + d.getDate();
  return COMPOSE_PROMPTS[dayKey % COMPOSE_PROMPTS.length];
}

// Tiny ornamental separator between feed cards — a hairline rule with a
// faint ✦ floating in the middle. Pulled into the existing 22px margin
// with negative offset so it sits in the gap rather than adding height.
function CardSeparator() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      margin: '-12px auto 10px', maxWidth: 220,
      pointerEvents: 'none',
    }}>
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(154,99,40,0.28), transparent)' }} />
      <KinwoveStar size={9} color="rgba(168,85,48,0.5)" />
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(154,99,40,0.28), transparent)' }} />
    </div>
  );
}

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function PostCard({ post, index = 0, session, currentUserId, userProfile, userGroup, onReact, onReplySubmit, onRepost, isFollowing, onFollow, onViewProfile, tabColor = '#B8733A', tabText = '#8E5528', isSaved = false, onSaveToggle, isAuthorBlocked = false, onBlockAuthor }) {
  const [bodyExpanded,   setBodyExpanded]   = useState(false);
  const [commentsOpen,   setCommentsOpen]   = useState(false);
  // post.post_comments is the embedded select from loadPosts; it's a thin
  // shape ({id, body, created_at, profiles}) hydrated by the relationship.
  // Optimistic appends use the same shape so the UI doesn't flicker.
  const [localReplies,   setLocalReplies]   = useState(post.post_comments ?? []);
  const [replyText,      setReplyText]      = useState('');
  const [submitting,     setSubmitting]     = useState(false);
  const [shareOpen,      setShareOpen]      = useState(false);
  const [emojiOpen,      setEmojiOpen]      = useState(false);
  const [menuOpen,       setMenuOpen]       = useState(false);
  const [reportOpen,     setReportOpen]     = useState(false);
  const [reportType,     setReportType]     = useState('');
  const [reportNote,     setReportNote]     = useState('');
  const [reportBusy,     setReportBusy]     = useState(false);
  const [reportDone,     setReportDone]     = useState(false);
  const [blockBusy,      setBlockBusy]      = useState(false);
  const replyInputRef = useRef(null);
  const commentScrollRef = useRef(null);

  // Scroll to bottom of comments list when modal opens so the input is in view
  useEffect(() => {
    if (commentsOpen && commentScrollRef.current) {
      commentScrollRef.current.scrollTop = commentScrollRef.current.scrollHeight;
    }
  }, [commentsOpen]);

  function insertReplyEmoji(emoji) {
    const el = replyInputRef.current;
    const start = el?.selectionStart ?? replyText.length;
    const end   = el?.selectionEnd   ?? replyText.length;
    const next  = replyText.slice(0, start) + emoji + replyText.slice(end);
    setReplyText(next);
    setEmojiOpen(false);
    requestAnimationFrame(() => {
      el?.focus();
      const pos = start + [...emoji].length;
      el?.setSelectionRange(pos, pos);
    });
  }
  async function handleBlockAuthor() {
    if (!currentUserId || blockBusy || !onBlockAuthor) return;
    setBlockBusy(true);
    await onBlockAuthor(post.author_id, isAuthorBlocked);
    setBlockBusy(false);
  }

  async function submitReport() {
    if (!currentUserId || !reportType || reportBusy) return;
    setReportBusy(true);
    const { error } = await supabase.from('post_reports').insert({
      reporter_id: currentUserId,
      post_id: post.id,
      type: reportType,
      note: reportNote.trim() || null,
    });
    setReportBusy(false);
    if (error) { console.error('report failed', error.message); return; }
    setReportDone(true);
  }

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
        background: 'linear-gradient(180deg, #FFFEFA 0%, #FBF4E3 100%)',
        borderRadius: 14,
        border: '1px solid rgba(154,99,40,0.18)',
        marginBottom: 22, overflow: 'hidden',
        position: 'relative',
        // Engraved/debossed: top edge catches a soft shadow (looks pressed
        // into the page), bottom edge a hairline white highlight (the lip
        // of the depression). No drop shadow — cards live in the page,
        // not floating on it.
        boxShadow: 'inset 0 2px 4px rgba(44,24,16,0.07), inset 0 -1px 0 rgba(255,255,255,0.6), 0 1px 0 rgba(255,253,247,0.9)',
      }}>
        {/* Kind accent rail — color signals what type of post this is
            (verse vs prayer vs milestone). Persona stays in the bg gradient. */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 6,
          background: kindTint(post.kind).rail,
        }} />
        {/* Header */}
        <div style={{ padding: '16px 18px 0' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
            <button onClick={() => onViewProfile?.(post.author_id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0, lineHeight: 0 }}>
              <Avatar name={post.profiles?.display_name} avatarConfig={post.profiles?.avatar_config} photoUrl={post.profiles?.avatar_url} size={38} />
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <button onClick={() => onViewProfile?.(post.author_id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600, fontSize: 15, color: T.ink, letterSpacing: '-0.005em' }}>
                  {post.profiles?.display_name ?? 'Anonymous'}
                  {post.profiles?.show_flag && (post.profiles?.flags ?? []).length > 0 && (
                    <span style={{ fontSize: 14, lineHeight: 1 }}>{codeToFlag(post.profiles.flags[0])}</span>
                  )}
                </div>
              </button>
              {/* Quiet dateline: just place + time. Denomination & person-type
                  become chips below so they don't crowd the byline. */}
              <div style={{ fontSize: 11.5, color: T.inkMuted, marginTop: 1 }}>
                {post.profiles?.country ? `${post.profiles.country} · ` : ''}
                {timeAgo(post.created_at)}
              </div>
            </div>
            {currentUserId && !isOwnPost && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                <button onClick={() => onFollow(post.author_id, isFollowing)} style={{
                  background: isFollowing
                    ? 'transparent'
                    : 'linear-gradient(180deg, #FFFCF4 0%, #F5ECD9 100%)',
                  color: isFollowing ? T.inkMuted : tabText,
                  border: `1px solid ${isFollowing ? T.line : tabColor}`,
                  borderRadius: 999, padding: '5px 12px',
                  fontSize: 11.5, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                  letterSpacing: '0.02em',
                  boxShadow: isFollowing
                    ? 'none'
                    : 'inset 0 1px 0 rgba(255,255,255,0.7), 0 1px 2px rgba(184,115,58,0.15)',
                  transition: 'all 0.15s',
                }}>
                  {isFollowing ? 'Following' : '+ Follow'}
                </button>
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setMenuOpen((v) => !v)}
                    aria-label="Post options"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 18, color: T.inkMuted, padding: '4px 6px', lineHeight: 1,
                    }}
                  >⋯</button>
                  {menuOpen && (
                    <>
                      <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'transparent' }} />
                      <div style={{
                        position: 'absolute', top: 'calc(100% + 4px)', right: 0,
                        background: T.white, border: `1px solid ${T.line}`, borderRadius: 10,
                        boxShadow: '0 6px 20px rgba(0,0,0,0.10)',
                        minWidth: 180, zIndex: 100, overflow: 'hidden',
                      }}>
                        <button
                          onClick={() => { setMenuOpen(false); setReportOpen(true); }}
                          style={{
                            width: '100%', textAlign: 'left', background: 'none', border: 'none',
                            borderBottom: `1px solid ${T.line}`,
                            padding: '11px 14px', fontSize: 13, color: T.error ?? '#A53F2B',
                            cursor: 'pointer',
                          }}
                        >
                          🚩 Report post
                        </button>
                        {onBlockAuthor && (
                          <button
                            onClick={() => { setMenuOpen(false); handleBlockAuthor(); }}
                            disabled={blockBusy}
                            style={{
                              width: '100%', textAlign: 'left', background: 'none', border: 'none',
                              padding: '11px 14px', fontSize: 13,
                              color: isAuthorBlocked ? T.inkMuted : (T.error ?? '#A53F2B'),
                              cursor: blockBusy ? 'wait' : 'pointer',
                              opacity: blockBusy ? 0.6 : 1,
                            }}
                          >
                            🚫 {isAuthorBlocked ? `Unblock ${post.profiles?.display_name?.split(' ')[0] ?? 'user'}` : `Block ${post.profiles?.display_name?.split(' ')[0] ?? 'user'}`}
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {post.question && (
            <div style={{ fontFamily: T.serif, fontStyle: 'italic', fontSize: 15, color: T.inkSoft, marginBottom: 10, lineHeight: 1.5 }}>
              {post.question}
            </div>
          )}

          {/* Per-kind editorial eyebrow — small uppercase tag above the body
              so a milestone reads as a milestone before you read the words.
              Skipped for plain text/share to keep the feed quiet. */}
          {(() => {
            const eyebrowFor = {
              journey_milestone: { label: '✦ A STEP ON THE WAY', color: '#a05870' },
              verse:             { label: '📖 SCRIPTURE',         color: '#9c5a1f' },
              question:          { label: '? ASKING',             color: '#3a6b8a' },
              prayer:            { label: '🙏 A PRAYER',           color: '#5a8064' },
            }[post.kind];
            if (!eyebrowFor) return null;
            return (
              <div style={{
                fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em',
                color: eyebrowFor.color, marginBottom: 8,
                fontFamily: T.sans,
              }}>
                {eyebrowFor.label}
              </div>
            );
          })()}

          {/* Body — verse posts get pulled-quote treatment so scripture
              feels like scripture; everything else gets the journal-body
              presence we set in step 2. */}
          {post.kind === 'verse' ? (
            <div style={{
              position: 'relative', marginBottom: 14,
              padding: '4px 0 4px 18px',
              borderLeft: `3px solid ${kindTint('verse').rail}`,
            }}>
              <div style={{
                position: 'absolute', left: -8, top: -6,
                fontFamily: T.display, fontSize: 36, lineHeight: 1,
                color: kindTint('verse').rail, opacity: 0.35,
                fontWeight: 700,
              }}>“</div>
              <div style={{
                fontFamily: T.serif, fontSize: 19, fontStyle: 'italic',
                color: '#1f1410', lineHeight: 1.55, whiteSpace: 'pre-wrap', overflowWrap: 'break-word', wordBreak: 'break-word',
                letterSpacing: '-0.003em',
              }}>
                {bodyExpanded ? post.body : post.body.slice(0, 280) + (post.body.length > 280 ? '…' : '')}
              </div>
            </div>
          ) : (
            <div style={{
              fontFamily: T.serif, fontSize: 18.5, color: '#1f1410',
              lineHeight: 1.6, margin: '6px 0 16px', whiteSpace: 'pre-wrap', overflowWrap: 'break-word', wordBreak: 'break-word',
              letterSpacing: '-0.003em', fontWeight: 400,
            }}>
              {bodyExpanded ? post.body : post.body.slice(0, 280) + (post.body.length > 280 ? '…' : '')}
            </div>
          )}

          {post.body.length > 280 && (
            <button onClick={() => setBodyExpanded(v => !v)}
              style={{ background: 'none', border: 'none', color: tabText, fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 10 }}>
              {bodyExpanded ? 'Show less' : 'Read more'}
            </button>
          )}
          <PostImageGrid urls={post.body_data?.image_urls} />
        </div>

        {/* Quiet reaction row — no pill backgrounds */}
        <div style={{ padding: '10px 18px', borderTop: `1px solid ${T.line}`, display: 'flex', gap: 0, alignItems: 'center', flexWrap: 'wrap' }}>
          {REACTIONS.map((r, i) => {
            const count  = post.reaction_counts?.[r.kind] ?? 0;
            const active = myReaction === r.kind;
            return (
              <button
                key={r.kind}
                onClick={() => onReact(post.id, r.kind, active)}
                style={{
                  background: 'none', border: 'none',
                  padding: i === 0 ? '6px 8px 6px 0' : '6px 8px',
                  fontSize: 13,
                  color: active ? T.gold : T.inkSoft,
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontFamily: T.sans, transition: 'color 0.15s',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.color = T.ink; }}
                onMouseLeave={e => { e.currentTarget.style.color = active ? T.gold : T.inkSoft; }}
              >
                {r.emoji} <span>{count > 0 ? count : r.label}</span>
              </button>
            );
          })}
          <button
            onClick={() => setShareOpen(true)}
            style={{
              background: 'none', border: 'none',
              padding: '6px 8px', fontSize: 13,
              color: T.inkSoft, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
              fontFamily: T.sans, transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = T.ink}
            onMouseLeave={e => e.currentTarget.style.color = T.inkSoft}
          >↗ Share</button>
          <div style={{ flex: 1 }} />
          <button onClick={() => setCommentsOpen(true)} style={{
            background: 'none', border: 'none', color: T.inkMuted,
            fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px',
          }}>
            💬 {localReplies.length > 0 ? localReplies.length : 'Comment'}
          </button>
          {onSaveToggle && !!currentUserId && (
            <button
              onClick={() => onSaveToggle(post.id, isSaved)}
              title={isSaved ? 'Remove private save' : 'Private save'}
              style={{
                background: isSaved ? 'rgba(184,115,58,0.12)' : 'none',
                border: 'none', cursor: 'pointer', padding: '4px 8px',
                borderRadius: 999, display: 'flex', alignItems: 'center',
                color: isSaved ? tabText : T.inkMuted,
              }}
            >
              <Bookmark size={15} strokeWidth={2} fill={isSaved ? tabText : 'none'} />
            </button>
          )}
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
            className="full-screen-mobile"
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
            <div ref={commentScrollRef} className="scroll" style={{ flex: 1, overflowY: 'auto' }}>
              {/* Post author */}
              <div style={{ padding: '16px 18px 0' }}>
                <div style={{ display: 'flex', gap: 11, alignItems: 'center', marginBottom: 12 }}>
                  <Avatar name={post.profiles?.display_name} avatarConfig={post.profiles?.avatar_config} photoUrl={post.profiles?.avatar_url} size={42} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: T.ink }}>{post.profiles?.display_name ?? 'Anonymous'}</div>
                    <div style={{ fontSize: 12, color: T.inkMuted }}>
                      {post.profiles?.country ?? ''}
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
                      color: active ? tabText : T.inkSoft,
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
                      <Avatar name={r.profiles?.display_name} avatarConfig={r.profiles?.avatar_config} photoUrl={r.profiles?.avatar_url} size={34} style={{ flexShrink: 0 }} />
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
              <div style={{ borderTop: `1px solid ${T.line}`, padding: '10px 16px 14px', flexShrink: 0, background: T.white, position: 'relative' }}>
                {emojiOpen && (
                  <>
                    <div onClick={() => setEmojiOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
                    <div style={{
                      position: 'absolute', bottom: 'calc(100% + 4px)', left: 16, right: 16, zIndex: 11,
                      background: T.white, border: `1px solid ${T.line}`, borderRadius: 14,
                      boxShadow: '0 8px 24px rgba(44,24,16,0.13)', padding: 10,
                      display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 4,
                    }}>
                      {['😀','😊','😂','🥹','😍','🥰','😭','😅','🤔','😏','😌','🙃','😇','🤩','😬','🤯',
                        '🙏','✝️','🕊️','🌿','🌸','🌺','🌻','☀️','🌙','⭐','🔥','💫','✨','🌈','🌊','🍃',
                        '❤️','🧡','💛','💚','💙','💜','🤍','🫶','👏','🙌','💪','👍','🎉','🫂','💝','🎊',
                      ].map((e) => (
                        <button key={e} onClick={() => insertReplyEmoji(e)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 24, lineHeight: 1, padding: '6px 4px', borderRadius: 8, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          onMouseEnter={(ev) => ev.currentTarget.style.background = T.parchment}
                          onMouseLeave={(ev) => ev.currentTarget.style.background = 'none'}
                        >{e}</button>
                      ))}
                    </div>
                  </>
                )}
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <Avatar name={userProfile?.display_name} avatarConfig={userProfile?.avatar_config} photoUrl={userProfile?.avatar_url} size={36} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ background: T.parchment, borderRadius: 18, border: `1px solid ${T.line}`, padding: '9px 14px' }}>
                      <input
                        ref={replyInputRef}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
                        placeholder="Write a comment…"
                        autoFocus
                        onFocus={(e) => { setTimeout(() => e.target.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 350); }}
                        style={{ width: '100%', border: 'none', outline: 'none', fontFamily: T.serif, fontSize: 14, color: T.ink, background: 'transparent' }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', marginTop: 6, paddingLeft: 2, gap: 2 }}>
                      <button onClick={() => setEmojiOpen((v) => !v)} title="Emoji"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 8, color: emojiOpen ? tabText : T.inkSoft, display: 'flex', alignItems: 'center' }}>
                        <Smile size={20} strokeWidth={1.75} />
                      </button>
                      <div style={{ flex: 1 }} />
                      {replyText.trim() && (
                        <button onClick={handleReply} disabled={submitting} style={{
                          background: tabColor, border: 'none', borderRadius: '50%',
                          width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: T.cream, cursor: 'pointer', flexShrink: 0,
                        }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg></button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {reportOpen && (
        <div
          onClick={() => !reportBusy && setReportOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: T.white, borderRadius: 14, padding: '20px 22px',
              maxWidth: 380, width: '100%', boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
            }}
          >
            {reportDone ? (
              <>
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>✅</div>
                  <div style={{ fontFamily: T.serif, fontSize: 18, fontWeight: 600, color: T.ink, marginBottom: 8 }}>Report submitted</div>
                  <div style={{ fontSize: 13.5, color: T.inkSoft, lineHeight: 1.55 }}>Thanks for helping keep this community safe.</div>
                </div>
                <button
                  onClick={() => { setReportOpen(false); setReportDone(false); setReportType(''); setReportNote(''); }}
                  style={{ marginTop: 16, width: '100%', background: T.ink, color: T.cream, border: 'none', borderRadius: 999, padding: '9px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >Done</button>
              </>
            ) : (
              <>
                <div style={{ fontFamily: T.serif, fontSize: 18, fontWeight: 700, color: T.ink, marginBottom: 8 }}>Report post</div>
                <div style={{ fontSize: 13.5, color: T.inkSoft, lineHeight: 1.55, marginBottom: 14 }}>Why are you reporting this?</div>
                {[
                  { id: 'spam',           label: 'Spam or scam' },
                  { id: 'harmful',        label: 'Harmful or dangerous content' },
                  { id: 'offensive',      label: 'Offensive or inappropriate' },
                  { id: 'misinformation', label: 'False or misleading information' },
                  { id: 'other',          label: 'Something else' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setReportType(opt.id)}
                    style={{
                      width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
                      background: reportType === opt.id ? T.parchment : 'transparent',
                      border: `1px solid ${reportType === opt.id ? tabColor : T.line}`,
                      borderRadius: 8, padding: '9px 12px', marginBottom: 6,
                      fontSize: 13, color: T.ink, cursor: 'pointer',
                    }}
                  >
                    <span style={{
                      width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                      border: `2px solid ${reportType === opt.id ? tabColor : T.line}`,
                      background: reportType === opt.id ? tabColor : 'transparent',
                    }} />
                    {opt.label}
                  </button>
                ))}
                {reportType === 'other' && (
                  <textarea
                    value={reportNote}
                    onChange={(e) => setReportNote(e.target.value)}
                    placeholder="Tell us more (optional)…"
                    rows={3}
                    style={{
                      width: '100%', boxSizing: 'border-box', marginTop: 4,
                      border: `1px solid ${T.line}`, borderRadius: 8, padding: '9px 12px',
                      fontFamily: T.serif, fontSize: 13.5, color: T.ink,
                      background: T.cream, outline: 'none', resize: 'vertical',
                    }}
                  />
                )}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
                  <button
                    onClick={() => setReportOpen(false)}
                    disabled={reportBusy}
                    style={{ background: 'transparent', border: `1px solid ${T.line}`, borderRadius: 999, padding: '8px 16px', fontSize: 13, color: T.inkSoft, cursor: 'pointer' }}
                  >Cancel</button>
                  <button
                    onClick={submitReport}
                    disabled={reportBusy || !reportType}
                    style={{
                      background: reportType ? (T.error ?? '#A53F2B') : T.line,
                      color: T.cream, border: 'none', borderRadius: 999,
                      padding: '8px 18px', fontSize: 13, fontWeight: 600,
                      cursor: reportBusy || !reportType ? 'not-allowed' : 'pointer',
                      opacity: reportBusy ? 0.7 : 1,
                    }}
                  >{reportBusy ? 'Submitting…' : 'Submit report'}</button>
                </div>
              </>
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

function FeaturedThread({ thread, onRespond, tabColor = '#B8733A' }) {
  if (!thread) return null;
  return (
    <div style={{
      background: T.ink, borderRadius: 18, padding: '22px 22px 18px',
      marginBottom: 20, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: 'radial-gradient(circle, rgba(184,115,58,0.12) 1px, transparent 1px)',
        backgroundSize: '24px 24px', pointerEvents: 'none',
      }} />
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{
            background: tabColor, color: T.cream, fontSize: 11, fontWeight: 700,
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
            style={{ background: tabColor, color: T.cream, border: 'none', borderRadius: 999, padding: '10px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            Respond in Chat →
          </button>
          <span style={{ fontSize: 13, color: 'rgba(253,248,240,0.45)' }}>{thread.reply_count ?? 0} responses</span>
        </div>
      </div>
    </div>
  );
}

function PrayerCard({ prayer, session, currentUserId, onPray, onViewProfile, tabColor = '#B8733A', tabText = '#8E5528' }) {
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
        .select('*, profiles(display_name, avatar_config, avatar_url)')
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
      .select('*, profiles(display_name, avatar_config, avatar_url)')
      .single();
    if (data) { setEncs(prev => [...(prev ?? []), data]); setEncCount(c => c + 1); setEncInput(''); }
  }

  return (
    <>
      <div style={{
        position: 'relative',
        background: prayer.is_answered
          ? 'linear-gradient(180deg, #FFF8E8 0%, #F8E9C8 100%)'
          : 'linear-gradient(180deg, #F4F8F0 0%, #E5EFD9 100%)',
        borderRadius: 14,
        border: `1px solid ${prayer.is_answered ? 'rgba(154,99,40,0.32)' : 'rgba(90,128,100,0.28)'}`,
        marginBottom: 22, overflow: 'hidden',
        boxShadow: prayer.is_answered
          ? 'inset 0 2px 4px rgba(154,99,40,0.10), inset 0 -1px 0 rgba(255,255,255,0.6), 0 1px 0 rgba(255,253,247,0.9)'
          : 'inset 0 2px 4px rgba(90,128,100,0.10), inset 0 -1px 0 rgba(255,255,255,0.6), 0 1px 0 rgba(255,253,247,0.9)',
      }}>
        {/* Semantic accent rail — sage for prayer, gold for answered */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: 6,
          background: prayer.is_answered ? T.gold : kindTint('prayer').rail,
        }} />
        {/* Header */}
        <div style={{ padding: '16px 18px 0' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
            <button onClick={() => onViewProfile?.(prayer.user_id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0, lineHeight: 0 }}>
              <Avatar name={prayer.profiles?.display_name} avatarConfig={prayer.profiles?.avatar_config} photoUrl={prayer.profiles?.avatar_url} size={38} />
            </button>
            <div style={{ flex: 1 }}>
              <button onClick={() => onViewProfile?.(prayer.user_id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600, fontSize: 14, color: T.ink }}>
                  {prayer.profiles?.display_name ?? 'Someone'}
                  {prayer.profiles?.show_flag && (prayer.profiles?.flags ?? []).length > 0 && (
                    <span style={{ fontSize: 13, lineHeight: 1 }}>{codeToFlag(prayer.profiles.flags[0])}</span>
                  )}
                </div>
              </button>
              <div style={{ fontSize: 12, color: T.inkMuted }}>
                {prayer.profiles?.country ?? ''}
                {prayer.profiles?.tradition ? ` · ${prayer.profiles.tradition}` : ''}
                {' · '}{timeAgo(prayer.created_at)}
              </div>
            </div>
            {prayer.is_answered && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(184,115,58,0.12)', borderRadius: 999, padding: '4px 10px', flexShrink: 0 }}>
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
            <div style={{ marginBottom: 14, background: 'rgba(184,115,58,0.07)', borderRadius: 10, padding: '10px 13px', borderLeft: `3px solid ${T.gold}` }}>
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
            className="full-screen-mobile"
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
                  <Avatar name={prayer.profiles?.display_name} avatarConfig={prayer.profiles?.avatar_config} photoUrl={prayer.profiles?.avatar_url} size={42} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600, fontSize: 14, color: T.ink }}>
                  {prayer.profiles?.display_name ?? 'Someone'}
                  {prayer.profiles?.show_flag && (prayer.profiles?.flags ?? []).length > 0 && (
                    <span style={{ fontSize: 13, lineHeight: 1 }}>{codeToFlag(prayer.profiles.flags[0])}</span>
                  )}
                </div>
                    <div style={{ fontSize: 12, color: T.inkMuted }}>
                      {prayer.profiles?.country ?? ''}
                      {prayer.profiles?.tradition ? ` · ${prayer.profiles.tradition}` : ''}
                      {' · '}{timeAgo(prayer.created_at)}
                    </div>
                  </div>
                </div>
                <div style={{ fontFamily: T.serif, fontSize: 16, color: T.ink, lineHeight: 1.75, marginBottom: 14, whiteSpace: 'pre-wrap' }}>
                  {prayer.body}
                </div>
                {prayer.is_answered && prayer.praise_report && (
                  <div style={{ marginBottom: 14, background: 'rgba(184,115,58,0.07)', borderRadius: 10, padding: '10px 13px', borderLeft: `3px solid ${T.gold}` }}>
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
                    color: prayer.my_prayed ? tabText : T.inkSoft,
                  }}
                >
                  🙏 {prayer.my_prayed ? 'Praying' : 'Pray'}
                </button>
                <button style={{
                  flex: 1, padding: '10px 4px', background: 'none', border: 'none',
                  borderRight: `1px solid ${T.line}`,
                  cursor: 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  fontSize: 14, fontWeight: 600, color: tabText,
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
                      <Avatar name={enc.profiles?.display_name} avatarConfig={enc.profiles?.avatar_config} photoUrl={enc.profiles?.avatar_url} size={34} style={{ flexShrink: 0 }} />
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
                  <button onClick={submitEnc} style={{ background: tabColor, border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.cream, fontSize: 14, cursor: 'pointer', flexShrink: 0 }}>↑</button>
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

export default function Community({ session, profile, onClose, onOpenChat, hideHeader, userGroup, onViewProfile, onFindPeople, onInviteFriends, onOpenPrayer, onOpenRead, onOpenBible, onVerseClick, onOpenChurch, onOpenSermon, onOpenConnect, onOpenGroups, accentColor }) {
  // Section colour: gold for main Feed, forest green for church community feed
  const TAB_COLOR = accentColor ?? '#B8733A';
  const TAB_TEXT  = accentColor ?? '#8E5528'; // slightly darker for text legibility
  const [posts, setPosts] = useState([]);
  const [sermonItems, setSermonItems] = useState([]);
  const [pastorMap, setPastorMap] = useState({});
  const [churchMap, setChurchMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [filterPersonalized, setFilterPersonalized] = useState(false);
  const [blockedIds, setBlockedIds] = useState([]);
  const [savedPostIds, setSavedPostIds] = useState(new Set());
  const [following, setFollowing] = useState(new Set());
  const [featuredThread, setFeaturedThread] = useState(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [prayerComposeOpen, setPrayerComposeOpen] = useState(false);
  const [prayerText, setPrayerText] = useState('');
  const [prayerSubmitting, setPrayerSubmitting] = useState(false);
  const [feedType, setFeedType] = useState('posts');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [prayers, setPrayers] = useState([]);
  const [prayersLoading, setPrayersLoading] = useState(false);
  const [sponsors, setSponsors] = useState([]);
  useEffect(() => {
    supabase.from('sponsored_posts').select('*').eq('is_active', true).order('sort_order')
      .then(({ data }) => setSponsors(data ?? []));
  }, []);
  const [qotd, setQotd] = useState(null);
  useEffect(() => {
    if (!profile?.church_id) return;
    supabase
      .from('churches')
      .select('question_of_day, question_of_day_set_at')
      .eq('id', profile.church_id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.question_of_day) setQotd(data);
        else setQotd(null);
      });
  }, [profile?.church_id]);
  useEffect(() => {
    if (!session?.user?.id) return;
    const uid = session.user.id;
    supabase.from('follows').select('following_id').eq('follower_id', uid)
      .then(({ data }) => setFollowing(new Set(data?.map((f) => f.following_id) ?? [])));
    supabase.from('blocked_users').select('blocked_id').eq('blocker_id', uid)
      .then(({ data }) => setBlockedIds((data ?? []).map((r) => r.blocked_id)));
    supabase.from('saved_posts').select('post_id').eq('user_id', uid)
      .then(({ data }) => setSavedPostIds(new Set((data ?? []).map((r) => r.post_id))));
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

  async function handleSaveToggle(postId, wasSaved) {
    if (!session?.user?.id) return;
    if (wasSaved) {
      await supabase.from('saved_posts').delete().eq('post_id', postId).eq('user_id', session.user.id);
      setSavedPostIds((prev) => { const s = new Set(prev); s.delete(postId); return s; });
    } else {
      await supabase.from('saved_posts').insert({ post_id: postId, user_id: session.user.id });
      setSavedPostIds((prev) => new Set([...prev, postId]));
    }
  }

  async function handleBlockAuthor(authorId, wasBlocked) {
    if (!session?.user?.id) return;
    if (wasBlocked) {
      await supabase.from('blocked_users').delete().eq('blocker_id', session.user.id).eq('blocked_id', authorId);
      setBlockedIds((prev) => prev.filter((id) => id !== authorId));
    } else {
      await supabase.from('blocked_users').insert({ blocker_id: session.user.id, blocked_id: authorId });
      setBlockedIds((prev) => [...prev, authorId]);
    }
  }

  const loadPosts = useCallback(async () => {
    setLoading(true);
    // Disambiguate the FK: post_comments + reactions also link posts→profiles,
    // so PostgREST refuses the bare `profiles(...)` embed. !author_id pins it
    // to posts.author_id. Same for post_comments → profiles via author_id.
    //
    // visibility='public' filter: Community only shows posts the author
    // explicitly marked public. 'church' and 'private' are excluded by RLS
    // for non-authors, but authors would otherwise see their own non-public
    // posts here too, which isn't what we want for the universal feed.
    let query = supabase
      .from('posts')
      .select(`*, profiles!author_id(display_name, city, country, tradition, person_type, avatar_config, avatar_url, show_flag, flags), post_comments(id, body, created_at, profiles!author_id(display_name, avatar_config, avatar_url))`)
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .limit(60);
    if (filter !== 'all') query = query.eq('person_type', filter);

    // Sermon items live in their own tables — feed_items unions them in.
    // Person-type filter doesn't apply (sermons aren't authored by a persona),
    // so when a filter is active we drop sermons.
    const sermonPromise = filter === 'all'
      ? supabase
          .from('feed_items')
          .select('id, author_id, scope_id, body, created_at')
          .eq('source', 'sermon_item')
          .order('created_at', { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] });

    const [{ data: postData, error: postErr }, { data: sermonData }] = await Promise.all([query, sermonPromise]);
    if (postErr) console.error('[Community.loadPosts]', postErr.message);
    if (!postData) { setLoading(false); return; }

    const myId = session?.user?.id;
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

    // Hydrate pastor profiles + church names for sermon items so the byline
    // can read "Pastor X · Y Church" without each card re-fetching.
    const sermons = sermonData ?? [];
    const pastorIds = [...new Set(sermons.map((s) => s.author_id).filter(Boolean))];
    const churchIds = [...new Set(sermons.map((s) => s.scope_id).filter(Boolean))];
    const [{ data: pastors }, { data: churches }] = await Promise.all([
      pastorIds.length
        ? supabase.from('profiles').select('id, display_name, avatar_config, avatar_url').in('id', pastorIds)
        : Promise.resolve({ data: [] }),
      churchIds.length
        ? supabase.from('churches').select('id, name').in('id', churchIds)
        : Promise.resolve({ data: [] }),
    ]);
    const pMap = {}; (pastors ?? []).forEach((p) => { pMap[p.id] = p; });
    const cMap = {}; (churches ?? []).forEach((c) => { cMap[c.id] = c; });

    setPosts(enriched);
    setSermonItems(sermons);
    setPastorMap(pMap);
    setChurchMap(cMap);
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
      .select('*, profiles(display_name, city, country, tradition, person_type, avatar_config, avatar_url, show_flag, flags)')
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

  // Default filter to user's own faith stage on first open (before they manually change it)
  useEffect(() => {
    if (!filterPersonalized && profile?.person_type && filter === 'all') {
      setFilter(profile.person_type);
      setFilterPersonalized(true);
    }
  }, [profile?.person_type, filterPersonalized, filter]);

  async function submitPrayer(e) {
    e.preventDefault();
    if (!prayerText.trim() || prayerSubmitting || !session?.user?.id) return;
    setPrayerSubmitting(true);
    const { data, error } = await supabase
      .from('personal_prayers')
      .insert({ user_id: session.user.id, body: prayerText.trim(), is_public: true })
      .select('*, profiles(display_name, city, country, tradition, person_type, avatar_config, avatar_url, show_flag, flags)')
      .single();
    setPrayerSubmitting(false);
    if (error) {
      console.error('[submitPrayer] insert failed', error);
      alert(`Couldn't post prayer: ${error.message}`);
      return;
    }
    if (data) {
      setPrayers(prev => [{ ...data, support_count: 0, enc_count: 0, my_prayed: false }, ...prev]);
      setPrayerText('');
      setPrayerComposeOpen(false);
    }
  }

  async function handlePray(prayerId, isPraying) {
    if (!session?.user?.id) return;
    if (isPraying) {
      await supabase.from('personal_prayer_support').delete().eq('prayer_id', prayerId).eq('user_id', session.user.id);
    } else {
      await supabase.from('personal_prayer_support').upsert({ prayer_id: prayerId, user_id: session.user.id }, { onConflict: 'prayer_id,user_id' });
    }
    setPrayers(prev => prev.map(p => p.id === prayerId ? { ...p, support_count: p.support_count + (isPraying ? -1 : 1), my_prayed: !isPraying } : p));
  }

  // On desktop the global AppHeader takes 56px — subtract from scene height.
  const sceneH = hideHeader ? 'calc(100dvh - 56px)' : '100dvh';

  return (
    <div className="scene" style={{ height: sceneH, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {!hideHeader && (
        <>
          {/* App top bar — deep walnut "leather cover" so the page has an
              anchor of weight. Gold ✦ glows against it; the daily verse
              reads as a gold-leaf inscription. The cream feed below becomes
              "lit content" instead of a flat parchment sheet. */}
          <header style={{
            background: 'linear-gradient(180deg, #2a1a14 0%, #1f1410 100%)',
            borderBottom: '1px solid #3a261d',
            boxShadow: '0 4px 14px rgba(20,10,6,0.35), inset 0 -1px 0 rgba(184,115,58,0.18)',
            position: 'sticky', top: 0, zIndex: 10,
            paddingTop: 'env(safe-area-inset-top, 0px)',
          }}>
            <div style={{ padding: '0 12px 0 16px', height: 56, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              fontFamily: T.display, fontSize: 21, fontWeight: 600, color: '#f4e9d4',
              letterSpacing: '-0.018em', display: 'flex', alignItems: 'center', gap: 7,
              flexShrink: 0,
              textShadow: '0 1px 0 rgba(0,0,0,0.4)',
            }}>
              <KinwoveWordmark size={18} textColor="#f4e9d4" starColor={T.honey} />
            </div>
            {(() => {
              const v = getDailyVerse();
              return (
                <button
                  onClick={() => onVerseClick ? onVerseClick() : onOpenBible?.(v.ref)}
                  title="Today's verse — tap to reflect"
                  style={{
                    flex: 1, minWidth: 0,
                    display: 'flex', alignItems: 'baseline', gap: 8,
                    fontFamily: T.serif,
                    paddingLeft: 12,
                    borderLeft: '1px solid rgba(232,181,99,0.22)',
                    overflow: 'hidden',
                    background: 'none', border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left', padding: '0 0 0 12px',
                  }}
                >
                  <span style={{
                    fontStyle: 'italic', fontSize: 13.5, color: '#e8dcc2',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    minWidth: 0, flex: 1,
                    textShadow: '0 1px 0 rgba(0,0,0,0.3)',
                  }}>
                    &ldquo;{v.text}&rdquo;
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: '#e8b563',
                    letterSpacing: '0.06em', flexShrink: 0,
                    textShadow: '0 1px 0 rgba(0,0,0,0.4)',
                  }}>
                    {v.ref} ↗
                  </span>
                </button>
              );
            })()}
            {/* Reserved space for the mobile FABs: 3 buttons × 44px + 2 gaps × 8px + 12px edge = 164px */}
            <div style={{ width: 164, flexShrink: 0 }} aria-hidden="true" />
            </div>
          </header>

        </>
      )}

      {/* Feed type tabs — underline style matching ChurchPage */}
      <div style={{
        display: 'flex',
        background: T.white,
        borderBottom: `1px solid ${T.line}`,
      }}>
        {[
          { id: 'posts',      label: '📝 Posts'     },
          { id: 'prayers',    label: '🙏 Prayers'   },
          { id: 'milestones', label: '✦ Milestones' },
        ].map(t => {
          const isActive = feedType === t.id;
          return (
            <button key={t.id} onClick={() => setFeedType(t.id)} style={{
              flex: 1,
              padding: '13px 4px',
              background: 'transparent',
              border: 'none',
              borderBottom: isActive ? `2px solid ${TAB_COLOR}` : '2px solid transparent',
              marginBottom: -1,
              fontSize: 13,
              fontWeight: isActive ? 700 : 500,
              color: isActive ? TAB_TEXT : T.inkMuted,
              cursor: 'pointer',
              transition: 'color 0.15s, border-color 0.15s',
            }}>{t.label}</button>
          );
        })}
      </div>

      {/* Persona filter — collapsed behind a toggle so the tabs breathe.
          Active filter pill is summarized in the toggle label so the user
          always sees what's filtered without expanding. */}
      {feedType === 'posts' && (() => {
        const activePersona = filter === 'all'
          ? null
          : PERSON_TYPES.find((p) => p.id === filter);
        const toggleLabel = activePersona
          ? `Filter: ${activePersona.emoji} ${activePersona.label}`
          : 'Filter';
        const activeTint = activePersona ? tintFor(activePersona.id) : null;
        return (
          <div style={{
            borderBottom: `1px solid ${T.line}`,
            background: `linear-gradient(180deg, #FBF6EA, ${T.cream})`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px' }}>
              <button
                onClick={() => setFiltersOpen((v) => !v)}
                style={{
                  background: activeTint ? activeTint.bgChip : T.white,
                  color: activeTint ? activeTint.text : T.inkSoft,
                  border: `1.5px solid ${activeTint ? activeTint.rail : T.line}`,
                  borderRadius: 999, padding: '6px 14px', fontSize: 13,
                  cursor: 'pointer', fontWeight: activePersona ? 700 : 500,
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  boxShadow: activeTint
                    ? `0 2px 8px ${activeTint.rail}30`
                    : '0 1px 2px rgba(44,24,16,0.05)',
                  transition: 'all 0.15s',
                }}
              >
                {toggleLabel}
                <span style={{ fontSize: 11, opacity: 0.7 }}>{filtersOpen ? '▴' : '▾'}</span>
              </button>
              {activePersona && (
                <button
                  onClick={() => setFilter('all')}
                  style={{
                    background: 'transparent', border: 'none', color: T.inkMuted,
                    fontSize: 12, cursor: 'pointer', padding: '4px 6px',
                  }}
                >
                  Clear
                </button>
              )}
            </div>
            {filtersOpen && (
              <div style={{
                display: 'flex', gap: 8, padding: '0 16px 12px', overflowX: 'auto',
              }}>
                {[{ id: 'all', label: 'All' }, ...PERSON_TYPES.map((p) => ({ id: p.id, label: `${p.emoji} ${p.label}` }))].map((f) => {
                  const active = filter === f.id;
                  const tint = f.id === 'all' ? null : tintFor(f.id);
                  const activeBg     = tint ? tint.bgChip : T.ink;
                  const activeBorder = tint ? tint.rail   : T.ink;
                  const activeText   = tint ? tint.text   : T.cream;
                  return (
                    <button key={f.id} onClick={() => { setFilter(f.id); if (f.id === 'all') setFiltersOpen(false); }} style={{
                      background: active ? activeBg : T.white,
                      color: active ? activeText : T.inkSoft,
                      border: `1.5px solid ${active ? activeBorder : T.line}`,
                      borderRadius: 999, padding: '6px 14px', fontSize: 13, cursor: 'pointer',
                      whiteSpace: 'nowrap', fontWeight: active ? 700 : 500,
                      flexShrink: 0,
                      boxShadow: active
                        ? (tint ? `0 2px 8px ${tint.rail}30` : '0 2px 8px rgba(44,24,16,0.18)')
                        : '0 1px 2px rgba(44,24,16,0.05)',
                      transition: 'all 0.15s',
                    }}>
                      {f.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 90px' }}>
        <div style={{ maxWidth: 740, margin: '0 auto' }}>

          {/* Compose pill — first item in the feed column. Tapping it expands
              the full composer in place; no modal overlay so the rest of the
              feed stays visible below. */}
          {session && feedType === 'posts' && (
            <div style={{ marginBottom: 16 }}>
              {!composeOpen ? (
                <button
                  onClick={() => setComposeOpen(true)}
                  style={{
                    width: '100%', display: 'flex', gap: 12, alignItems: 'center',
                    background: 'transparent', border: 'none',
                    cursor: 'pointer', padding: 0, textAlign: 'left',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <div style={{
                    borderRadius: '50%',
                    boxShadow: '0 2px 8px rgba(44,24,16,0.14), 0 0 0 2px rgba(255,255,255,0.95), 0 0 0 3px rgba(184,115,58,0.18)',
                    flexShrink: 0,
                  }}>
                    <Avatar name={profile?.display_name} avatarConfig={profile?.avatar_config} photoUrl={profile?.avatar_url} size={40} />
                  </div>
                  <div style={{
                    flex: 1, minWidth: 0,
                    background: 'linear-gradient(180deg, #FFFEFA 0%, #FBF4E3 100%)',
                    border: '1px solid #C9B98E',
                    borderRadius: 999, padding: '11px 16px',
                    fontSize: 14.5, fontFamily: T.serif, fontStyle: 'italic',
                    color: '#6b5d48',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    boxShadow: 'inset 0 2px 4px rgba(154,99,40,0.10), inset 0 -1px 0 rgba(255,255,255,0.6)',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = TAB_COLOR;
                    e.currentTarget.style.boxShadow = `inset 0 2px 4px rgba(0,0,0,0.05), 0 2px 10px ${TAB_COLOR}33`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#C9B98E';
                    e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(154,99,40,0.10), inset 0 -1px 0 rgba(255,255,255,0.6)';
                  }}
                  >
                    <span>{getComposePrompt()}</span>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 26, height: 26, marginLeft: 12,
                      borderRadius: '50%',
                      background: TAB_COLOR,
                      color: T.cream, fontSize: 13, fontWeight: 700,
                      boxShadow: `0 2px 6px ${TAB_COLOR}55`,
                    }}>✎</span>
                  </div>
                </button>
              ) : (
                <div style={{
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                  background: 'linear-gradient(180deg, #FFFEFA 0%, #FBF4E3 100%)',
                  border: '1px solid rgba(154,99,40,0.18)',
                  borderRadius: 14, padding: '14px',
                  boxShadow: 'inset 0 2px 4px rgba(44,24,16,0.05), inset 0 -1px 0 rgba(255,255,255,0.6)',
                }}>
                  <div style={{
                    borderRadius: '50%',
                    boxShadow: '0 2px 8px rgba(44,24,16,0.14), 0 0 0 2px rgba(255,255,255,0.95), 0 0 0 3px rgba(184,115,58,0.18)',
                    flexShrink: 0, marginTop: 2,
                  }}>
                    <Avatar name={profile?.display_name} avatarConfig={profile?.avatar_config} photoUrl={profile?.avatar_url} size={40} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Suspense fallback={<div style={{ padding: 24, textAlign: 'center', color: T.inkMuted, fontFamily: T.serif }}>Loading…</div>}>
                      <PostComposer
                        inModal
                        bare
                        session={session}
                        profile={profile}
                        scope="me"
                        onPosted={() => { setComposeOpen(false); loadPosts(); }}
                        onCancel={() => setComposeOpen(false)}
                      />
                    </Suspense>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Question of the Day banner ── */}
          {qotd?.question_of_day && feedType === 'posts' && (
            <div style={{
              margin: '0 0 16px',
              padding: '16px 20px',
              background: 'rgba(184,115,58,0.08)',
              border: '1px solid rgba(184,115,58,0.25)',
              borderRadius: 16,
            }}>
              <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: T.gold, opacity: 0.8, marginBottom: 8, fontWeight: 600 }}>
                Pastor’s question
              </div>
              <div style={{ fontFamily: T.serif, fontSize: 17, color: T.ink, lineHeight: 1.65, fontStyle: 'italic' }}>
                “{qotd.question_of_day}”
              </div>
            </div>
          )}

          {/* ── Groups card ── */}
          {feedType === 'posts' && onOpenGroups && (
            <button
              onClick={onOpenGroups}
              style={{
                width: '100%', margin: '0 0 10px', padding: '14px 18px',
                background: userGroup
                  ? 'linear-gradient(135deg, rgba(107,36,56,0.08) 0%, rgba(184,115,58,0.06) 100%)'
                  : T.white,
                border: `1px solid ${userGroup ? 'rgba(107,36,56,0.2)' : T.line}`,
                borderRadius: 14,
                display: 'flex', alignItems: 'center', gap: 14,
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 26, flexShrink: 0 }}>⛪</span>
              <div style={{ flex: 1 }}>
                {userGroup ? (
                  <>
                    <div style={{ fontFamily: T.display, fontSize: 14, fontWeight: 600, color: T.ink, marginBottom: 2 }}>
                      {userGroup.group.name}
                    </div>
                    <div style={{ fontSize: 12, color: T.inkMuted }}>
                      Your group · Tap to open
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontFamily: T.display, fontSize: 14, fontWeight: 600, color: T.ink, marginBottom: 2 }}>
                      Join or create a group
                    </div>
                    <div style={{ fontSize: 12, color: T.inkMuted }}>
                      Private Bible study, discipleship circle, or church group.
                    </div>
                  </>
                )}
              </div>
              <span style={{ color: T.inkMuted, fontSize: 16, flexShrink: 0 }}>›</span>
            </button>
          )}

          {/* ── Connect banner ── */}
          {feedType === 'posts' && onOpenConnect && (
            <button
              onClick={onOpenConnect}
              style={{
                width: '100%', margin: '0 0 16px', padding: '14px 18px',
                background: 'linear-gradient(135deg, rgba(184,115,58,0.07) 0%, rgba(58,107,138,0.07) 100%)',
                border: `1px solid ${T.line}`, borderRadius: 14,
                display: 'flex', alignItems: 'center', gap: 14,
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 26, flexShrink: 0 }}>🤝</span>
              <div>
                <div style={{ fontFamily: T.display, fontSize: 14, fontWeight: 600, color: T.ink, marginBottom: 2 }}>
                  Connect with someone on the journey
                </div>
                <div style={{ fontSize: 12, color: T.inkMuted, lineHeight: 1.5 }}>
                  Find a mentor, a partner, or someone to have an honest conversation with.
                </div>
              </div>
              <span style={{ marginLeft: 'auto', color: T.inkMuted, fontSize: 16, flexShrink: 0 }}>›</span>
            </button>
          )}

          {/* ── Posts feed (excludes milestones + sermons — those have own tabs) ── */}
          {feedType === 'posts' && (() => {
            const filtered = posts
              .filter((p) => p.kind !== 'journey_milestone')
              .filter((p) => !blockedIds.includes(p.author_id));
            return (
              <>
                {loading && <div style={{ textAlign: 'center', color: T.inkMuted, padding: 40, fontFamily: T.serif, fontSize: 16 }}>Loading…</div>}
                {!loading && filtered.length === 0 && (
                  <EmptyState
                    icon={
                      <svg width={30} height={30} viewBox="0 0 36 36" fill="none" aria-hidden>
                        {/* Two connected circles — community */}
                        <circle cx="13" cy="17" r="7" fill="none" stroke={T.gold} strokeWidth="1.8"/>
                        <circle cx="23" cy="17" r="7" fill="none" stroke={T.gold} strokeWidth="1.8"/>
                        <path d="M18 11 Q21 9 24 11" stroke={T.gold} strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.5"/>
                      </svg>
                    }
                    title="Nothing here yet."
                    body="Be the first to start the conversation."
                  />
                )}
                <div className="stagger-in">
                  {(() => {
                    const isFreeUser = !profile?.plan || profile.plan === 'free';
                    const showAds = isFreeUser && sponsors.length > 0;
                    return filtered.map((p, i) => (
                      <Fragment key={`post:${p.id}`}>
                        <PostCard
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
                          tabColor={TAB_COLOR}
                          tabText={TAB_TEXT}
                          isSaved={savedPostIds.has(p.id)}
                          onSaveToggle={session ? handleSaveToggle : undefined}
                          isAuthorBlocked={blockedIds.includes(p.author_id)}
                          onBlockAuthor={session ? handleBlockAuthor : undefined}
                        />
                        {showAds && (i + 1) % 10 === 0 && (
                          <SponsoredCard
                            key={`sponsored-${i}`}
                            {...sponsors[Math.floor(i / 10) % sponsors.length]}
                          />
                        )}
                        {i < filtered.length - 1 && <CardSeparator />}
                      </Fragment>
                    ));
                  })()}
                </div>
              </>
            );
          })()}

          {/* ── Milestones feed ── */}
          {feedType === 'milestones' && (() => {
            const milestones = posts.filter((p) => p.kind === 'journey_milestone');
            return (
              <>
                {/* Milestone composer — pre-selects the ✦ Milestone toggle */}
                {session && (
                  <div style={{ marginBottom: 16 }}>
                    <Suspense fallback={null}>
                      <PostComposer
                        session={session}
                        profile={profile}
                        defaultMilestone={true}
                        placeholder="Mark a step on your walk…"
                        onPosted={(post) => {
                          setPosts((prev) => [post, ...prev]);
                        }}
                      />
                    </Suspense>
                  </div>
                )}
                {loading && <div style={{ textAlign: 'center', color: T.inkMuted, padding: 40, fontFamily: T.serif, fontSize: 16 }}>Loading…</div>}
                {!loading && milestones.length === 0 && (
                  <EmptyState icon="✦" title="No milestones yet." body="Share a step on your faith journey — big or small." />
                )}
                <div className="stagger-in">
                  {milestones.map((p, i) => (
                    <Fragment key={`post:${p.id}`}>
                      <PostCard
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
                        tabColor={TAB_COLOR}
                        tabText={TAB_TEXT}
                        isSaved={savedPostIds.has(p.id)}
                        onSaveToggle={session ? handleSaveToggle : undefined}
                        isAuthorBlocked={blockedIds.includes(p.author_id)}
                        onBlockAuthor={session ? handleBlockAuthor : undefined}
                      />
                      {i < milestones.length - 1 && <CardSeparator />}
                    </Fragment>
                  ))}
                </div>
              </>
            );
          })()}

          {/* ── Prayers feed ── */}
          {feedType === 'prayers' && (
            <>
              {/* Public prayer composer — writes to personal_prayers with
                  is_public=true so the feed picks it up. Profile journal stays
                  private; this is the door to the community feed. */}
              {session && (
                <div style={{ marginBottom: 16 }}>
                  {!prayerComposeOpen ? (
                    <button
                      onClick={() => setPrayerComposeOpen(true)}
                      style={{
                        width: '100%', display: 'flex', gap: 12, alignItems: 'center',
                        background: 'transparent', border: 'none',
                        cursor: 'pointer', padding: 0, textAlign: 'left',
                        WebkitTapHighlightColor: 'transparent',
                      }}
                    >
                      <div style={{
                        borderRadius: '50%',
                        boxShadow: '0 2px 8px rgba(44,24,16,0.14), 0 0 0 2px rgba(255,255,255,0.95), 0 0 0 3px rgba(184,115,58,0.18)',
                        flexShrink: 0,
                      }}>
                        <Avatar name={profile?.display_name} avatarConfig={profile?.avatar_config} photoUrl={profile?.avatar_url} size={40} />
                      </div>
                      <div style={{
                        flex: 1, minWidth: 0,
                        background: 'linear-gradient(180deg, #F4F8F0 0%, #E5EFD9 100%)',
                        border: `1px solid ${SEMANTIC.prayer.line}`,
                        borderRadius: 999, padding: '11px 16px',
                        fontSize: 14.5, fontFamily: T.serif, fontStyle: 'italic',
                        color: '#5a6b58',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        boxShadow: 'inset 0 2px 4px rgba(90,128,100,0.10), inset 0 -1px 0 rgba(255,255,255,0.6)',
                      }}>
                        <span>Share a prayer request…</span>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: 26, height: 26, marginLeft: 12,
                          borderRadius: '50%',
                          background: SEMANTIC.prayer.rail,
                          color: T.cream, fontSize: 14,
                          boxShadow: '0 2px 6px rgba(90,128,100,0.30)',
                        }}>🙏</span>
                      </div>
                    </button>
                  ) : (
                    <form onSubmit={submitPrayer} style={{
                      display: 'flex', gap: 12, alignItems: 'flex-start',
                      background: 'linear-gradient(180deg, #F4F8F0 0%, #E5EFD9 100%)',
                      border: `1px solid ${SEMANTIC.prayer.line}`,
                      borderRadius: 14, padding: '14px',
                      boxShadow: 'inset 0 2px 4px rgba(90,128,100,0.08), inset 0 -1px 0 rgba(255,255,255,0.6)',
                    }}>
                      <div style={{
                        borderRadius: '50%',
                        boxShadow: '0 2px 8px rgba(44,24,16,0.14), 0 0 0 2px rgba(255,255,255,0.95), 0 0 0 3px rgba(184,115,58,0.18)',
                        flexShrink: 0, marginTop: 2,
                      }}>
                        <Avatar name={profile?.display_name} avatarConfig={profile?.avatar_config} photoUrl={profile?.avatar_url} size={40} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <textarea
                          autoFocus
                          value={prayerText}
                          onChange={(e) => setPrayerText(e.target.value)}
                          placeholder="What are you praying for? The community will stand with you."
                          rows={3}
                          style={{
                            width: '100%', boxSizing: 'border-box', resize: 'none',
                            background: 'transparent', border: 'none', outline: 'none',
                            fontFamily: T.serif, fontSize: 15, lineHeight: 1.65,
                            color: T.ink, padding: 0,
                          }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                          <span style={{ fontSize: 11, color: T.inkMuted, fontStyle: 'italic' }}>
                            🌐 Visible to the community
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
                            <button
                              type="button"
                              onClick={() => { setPrayerComposeOpen(false); setPrayerText(''); }}
                              style={{
                                background: 'none', border: 'none', color: T.inkMuted,
                                fontSize: 13, cursor: 'pointer', padding: '6px 10px',
                              }}
                            >Cancel</button>
                            <button
                              type="submit"
                              disabled={!prayerText.trim() || prayerSubmitting}
                              style={{
                                background: prayerText.trim() ? `linear-gradient(135deg, ${SEMANTIC.prayer.rail} 0%, #4a6b50 100%)` : T.line,
                                color: T.cream, border: 'none', borderRadius: 999,
                                padding: '8px 22px', fontSize: 13, fontWeight: 600,
                                cursor: prayerText.trim() ? 'pointer' : 'not-allowed',
                              }}
                            >
                              {prayerSubmitting ? 'Sharing…' : 'Share prayer'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </form>
                  )}
                </div>
              )}
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
                  tabColor={TAB_COLOR}
                  tabText={TAB_TEXT}
                />
              ))}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
