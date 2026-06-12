import { lazy, Suspense, useEffect, useRef, useState, useCallback } from 'react';
import { Smile } from 'lucide-react';
import SwipeableSheet from './SwipeableSheet.jsx';
import { supabase, uploadProfileImage, directProfileUpdate } from './supabase.js';
import { T, SEMANTIC } from './theme.js';
import { PERSON_TYPES } from './constants.js';
import { Avatar, BANNER_PRESETS, bannerBackground } from './ProfilePage.jsx';
import AvatarPicker from './AvatarPicker.jsx';
import PostImageGrid from './PostImageGrid.jsx';
import LinkPreview, { stripFirstUrl } from './LinkPreview.jsx';
import { KinwoveStar } from './components/brand/KinwoveStar.jsx';

const PostComposer = lazy(() => import('./PostComposer.jsx'));
const PostCard     = lazy(() => import('./PostCard.jsx'));
// Shared with UserProfile — same constants, same helpers, same church card.
// PRAYER_REACTIONS stays local because it's only used here (the prayer tab).
import { REACTIONS, TYPE_COLORS, timeAgo, loadChurchContext, ChurchAttendsCard } from './profileShared.jsx';
import EmptyState from './EmptyState.jsx';
import { codeToFlag } from './countries.js';
import { useAiUsage, PLAN_LIMITS } from './useAiUsage.js';

const PRAYER_REACTIONS = [
  { kind: 'praying',  emoji: '🙏', label: 'Praying',  semantic: 'prayer'     },
  { kind: 'love',     emoji: '❤️', label: 'Love'     },
  { kind: 'amen',     emoji: '🔥', label: 'Amen'     },
  { kind: 'hope',     emoji: '✨', label: 'Hope'     },
  { kind: 'strength', emoji: '💪', label: 'Strength' },
];

function ProfilePost({ post, session, profile, onReact, churchCtx, onDelete, onViewProfile }) {
  const [expanded,     setExpanded]     = useState(false);
  const [sheetOpen,    setSheetOpen]    = useState(false);
  const [replies,      setReplies]      = useState(null);
  const [replyInput,   setReplyInput]   = useState('');
  const [replyLoading, setReplyLoading] = useState(false);
  const [emojiOpen,    setEmojiOpen]    = useState(false);
  const replyInputRef = useRef(null);

  function insertReplyEmoji(emoji) {
    const el = replyInputRef.current;
    const start = el?.selectionStart ?? replyInput.length;
    const end   = el?.selectionEnd   ?? replyInput.length;
    const next  = replyInput.slice(0, start) + emoji + replyInput.slice(end);
    setReplyInput(next);
    setEmojiOpen(false);
    requestAnimationFrame(() => {
      el?.focus();
      const pos = start + [...emoji].length;
      el?.setSelectionRange(pos, pos);
    });
  }
  const [menuOpen,           setMenuOpen]           = useState(false);
  const [editing,            setEditing]            = useState(false);
  const [editText,           setEditText]           = useState('');
  const [editBusy,           setEditBusy]           = useState(false);
  const [localBody,          setLocalBody]          = useState(null);
  const [confirmingDelete,   setConfirmingDelete]   = useState(false);
  const [deleteBusy,         setDeleteBusy]         = useState(false);
  const [actionError,        setActionError]        = useState(null);

  const isOwn = !!session?.user?.id && session.user.id === post.author_id;
  const displayBody = localBody ?? post.body;

  const replyCount = replies ? replies.length : (post.reply_count ?? 0);

  function startEdit() {
    setEditText(displayBody ?? '');
    setEditing(true);
    setMenuOpen(false);
  }

  async function saveEdit() {
    const next = editText.trim();
    if (!next || editBusy) return;
    setEditBusy(true);
    const { error } = await supabase.from('posts').update({ body: next }).eq('id', post.id);
    setEditBusy(false);
    if (error) { console.error('edit failed', error.message); setActionError("Couldn't save — try again."); return; }
    setActionError(null);
    setLocalBody(next);
    setEditing(false);
  }

  async function deletePost() {
    if (deleteBusy) return;
    setDeleteBusy(true);
    const { error } = await supabase.from('posts').delete().eq('id', post.id);
    setDeleteBusy(false);
    setConfirmingDelete(false);
    setMenuOpen(false);
    if (error) { console.error('delete failed', error.message); setActionError("Couldn't delete — try again."); return; }
    onDelete?.(post.id);
  }

  async function openSheet() {
    setSheetOpen(true);
    if (replies === null) {
      setReplyLoading(true);
      // post_comments is the privacy-gated canonical table (see
      // scripts/2026-05-01-private-comments.sql). RLS limits reads to the
      // post's church family, so callers outside that boundary see [].
      const { data } = await supabase
        .from('post_comments')
        .select('*, profiles(display_name, avatar_config, avatar_url)')
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });
      setReplies(data ?? []);
      setReplyLoading(false);
    }
  }

  async function submitReply() {
    if (!replyInput.trim() || !session?.user?.id) return;
    const { data } = await supabase
      .from('post_comments')
      .insert({ post_id: post.id, author_id: session.user.id, body: replyInput.trim() })
      .select('*, profiles(display_name, avatar_config, avatar_url)')
      .single();
    if (data) { setReplies(prev => [...(prev ?? []), data]); setReplyInput(''); }
  }

  return (
    <>
      <div style={{ background: T.white, borderRadius: 14, border: `1px solid ${T.line}`, marginBottom: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: T.inkMuted }}>{timeAgo(post.created_at)}</div>
            {isOwn && (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
                  aria-label="Post options"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 18, color: T.inkMuted, padding: '4px 8px', lineHeight: 1,
                  }}
                >⋯</button>
                {menuOpen && (
                  <>
                    <div
                      onClick={() => setMenuOpen(false)}
                      style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'transparent' }}
                    />
                    <div
                      style={{
                        position: 'absolute', top: 'calc(100% + 4px)', right: 0,
                        background: T.white, border: `1px solid ${T.line}`, borderRadius: 10,
                        boxShadow: '0 6px 20px rgba(0,0,0,0.10)',
                        minWidth: 180, zIndex: 100, overflow: 'hidden',
                      }}
                    >
                      <button
                        onClick={startEdit}
                        style={{
                          width: '100%', textAlign: 'left', background: 'none', border: 'none',
                          padding: '10px 14px', fontSize: 13, color: T.ink, cursor: 'pointer',
                        }}
                      >
                        Edit post
                      </button>
                      <button
                        onClick={() => { setMenuOpen(false); setConfirmingDelete(true); }}
                        style={{
                          width: '100%', textAlign: 'left', background: 'none', border: 'none',
                          padding: '10px 14px', fontSize: 13, color: T.error ?? '#A53F2B', cursor: 'pointer',
                        }}
                      >
                        Delete post
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          {editing ? (
            <div>
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                autoFocus
                rows={4}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  border: `1px solid ${T.line}`, borderRadius: 10, padding: '10px 12px',
                  fontFamily: T.serif, fontSize: 15.5, lineHeight: 1.65,
                  color: T.ink, background: T.cream, outline: 'none', resize: 'vertical',
                }}
              />
              {actionError && (
                <div style={{ fontSize: 12, color: T.error, marginTop: 6 }}>{actionError}</div>
              )}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button
                  onClick={() => { setEditing(false); setActionError(null); }}
                  disabled={editBusy}
                  style={{
                    background: 'transparent', border: `1px solid ${T.line}`, borderRadius: 999,
                    padding: '6px 14px', fontSize: 13, color: T.inkSoft, cursor: 'pointer',
                  }}
                >Cancel</button>
                <button
                  onClick={saveEdit}
                  disabled={editBusy || !editText.trim()}
                  style={{
                    background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
                    padding: '6px 16px', fontSize: 13, fontWeight: 600,
                    cursor: editBusy || !editText.trim() ? 'not-allowed' : 'pointer',
                    opacity: editBusy || !editText.trim() ? 0.5 : 1,
                  }}
                >{editBusy ? 'Saving…' : 'Save'}</button>
              </div>
            </div>
          ) : (
            <>
              {/* FB-style repost card */}
              {post.body_data?.repost_of ? (
                <div>
                  {displayBody ? (
                    <div style={{ fontFamily: T.serif, fontSize: 16, color: T.ink, lineHeight: 1.75, whiteSpace: 'pre-wrap', marginBottom: 10 }}>
                      {displayBody}
                    </div>
                  ) : null}
                  <div style={{ border: `1px solid ${T.line}`, borderRadius: 10, padding: '12px 14px', background: T.parchment }}>
                    <button
                      onClick={() => post.body_data.repost_author_id && onViewProfile?.(post.body_data.repost_author_id)}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: post.body_data.repost_author_id ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}
                    >
                      <Avatar size={26} profile={{ display_name: post.body_data.repost_author_name }} />
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: T.inkSoft }}>{post.body_data.repost_author_name ?? 'Someone'}</span>
                    </button>
                    {post.body_data.repost_body ? (
                      <div style={{ fontFamily: T.serif, fontSize: 15, color: T.ink, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                        {post.body_data.repost_body}
                      </div>
                    ) : null}
                    {post.body_data.repost_body && <LinkPreview text={post.body_data.repost_body} />}
                  </div>
                </div>
              ) : (
                <>
                  {displayBody && (
                    <div style={{ fontFamily: T.serif, fontSize: 16, color: T.ink, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
                      {(() => { const t = stripFirstUrl(displayBody); return expanded ? t : (t.slice(0, 300) + (t.length > 300 ? '…' : '')); })()}
                    </div>
                  )}
                  {(stripFirstUrl(displayBody ?? '').length ?? 0) > 300 && (
                    <button onClick={() => setExpanded((v) => !v)} style={{ background: 'none', border: 'none', color: T.goldDark, fontSize: 13, cursor: 'pointer', padding: '6px 0 0', display: 'block' }}>
                      {expanded ? 'Show less' : 'Read more'}
                    </button>
                  )}
                  <LinkPreview text={displayBody} />
                  <PostImageGrid urls={post.body_data?.image_urls} />
                </>
              )}
            </>
          )}
        </div>
        <div style={{ padding: '8px 18px', borderTop: `1px solid ${T.line}`, display: 'flex', gap: 6, alignItems: 'center' }}>
          {REACTIONS.map((r) => {
            const count = post.reaction_counts?.[r.kind] ?? 0;
            const active = post.my_reaction === r.kind;
            return (
              <button key={r.kind} onClick={() => session && onReact(post.id, r.kind, active)} style={{
                background: active ? 'rgba(184,115,58,0.12)' : 'transparent',
                border: `1px solid ${active ? T.gold : T.line}`,
                borderRadius: 999, padding: '5px 11px', fontSize: 12,
                color: active ? T.goldDark : T.inkMuted, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.15s',
              }}>
                {r.emoji} <span>{r.label}</span>{count > 0 && <span style={{ fontWeight: 700, marginLeft: 2 }}>{count}</span>}
              </button>
            );
          })}
          <button onClick={openSheet} style={{
            marginLeft: 'auto', background: 'none', border: 'none',
            fontSize: 12, color: T.inkMuted, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            💬 {replyCount > 0 ? replyCount : ''}
          </button>
        </div>
      </div>

      {confirmingDelete && (
        <div
          onClick={() => !deleteBusy && setConfirmingDelete(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <SwipeableSheet
            canDismiss={!deleteBusy}
            onDismiss={() => setConfirmingDelete(false)}
            style={{
              background: T.white, borderRadius: 14, padding: '20px 22px',
              maxWidth: 380, width: '100%', boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ fontFamily: T.serif, fontSize: 18, fontWeight: 700, color: T.ink, marginBottom: 8 }}>
              Delete this post?
            </div>
            <div style={{ fontSize: 13.5, color: T.inkSoft, lineHeight: 1.55, marginBottom: 16 }}>
              This can't be undone. Reactions and comments on this post will also be removed.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmingDelete(false)}
                disabled={deleteBusy}
                style={{
                  background: 'transparent', border: `1px solid ${T.line}`, borderRadius: 999,
                  padding: '8px 16px', fontSize: 13, color: T.inkSoft, cursor: 'pointer',
                }}
              >Cancel</button>
              <button
                onClick={deletePost}
                disabled={deleteBusy}
                style={{
                  background: T.error ?? '#A53F2B', color: T.cream, border: 'none', borderRadius: 999,
                  padding: '8px 18px', fontSize: 13, fontWeight: 600,
                  cursor: deleteBusy ? 'wait' : 'pointer', opacity: deleteBusy ? 0.7 : 1,
                }}
              >{deleteBusy ? 'Deleting…' : 'Delete'}</button>
            </div>
          </SwipeableSheet>
        </div>
      )}

      {/* Facebook-style centered post dialog */}
      {sheetOpen && (
        <div
          onClick={() => setSheetOpen(false)}
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
                {profile?.display_name ? `${profile.display_name}'s Post` : 'Your Post'}
              </span>
              <button onClick={() => setSheetOpen(false)} style={{
                position: 'absolute', right: 14,
                width: 34, height: 34, borderRadius: '50%', background: T.parchment,
                border: 'none', cursor: 'pointer', fontSize: 20, color: T.inkMuted,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>×</button>
            </div>

            {/* Scrollable post + comments */}
            <div className="scroll" style={{ flex: 1, overflowY: 'auto' }}>
              {/* Post author + full body */}
              <div style={{ padding: '16px 18px' }}>
                <div style={{ display: 'flex', gap: 11, alignItems: 'center', marginBottom: 12 }}>
                  <Avatar name={profile?.display_name} avatarConfig={profile?.avatar_config} photoUrl={profile?.avatar_url} size={42} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600, fontSize: 14, color: T.ink }}>
                      {profile?.display_name ?? 'You'}
                      {profile?.show_flag && (profile?.flags ?? []).length > 0 && (
                        <span style={{ fontSize: 13, lineHeight: 1 }}>{codeToFlag(profile.flags[0])}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: T.inkMuted }}>{timeAgo(post.created_at)}</div>
                  </div>
                </div>
                <div style={{ fontFamily: T.serif, fontSize: 16, color: T.ink, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
                  {stripFirstUrl(post.body)}
                </div>
                <LinkPreview text={post.body} />
              </div>

              {/* Reaction counts */}
              {replyCount > 0 && (
                <div style={{ padding: '8px 18px', borderTop: `1px solid ${T.line}`, borderBottom: `1px solid ${T.line}`, fontSize: 13, color: T.inkMuted }}>
                  {replyCount} comment{replyCount !== 1 ? 's' : ''}
                </div>
              )}

              {/* Action bar */}
              <div style={{ display: 'flex', borderBottom: `1px solid ${T.line}` }}>
                {REACTIONS.map((r, i) => {
                  const active = post.my_reaction === r.kind;
                  return (
                    <button key={r.kind} onClick={() => session && onReact(post.id, r.kind, active)} style={{
                      flex: 1, padding: '10px 4px', background: 'none',
                      border: 'none', borderRight: i < REACTIONS.length - 1 ? `1px solid ${T.line}` : 'none',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      fontSize: 14, fontWeight: 600, color: active ? T.goldDark : T.inkSoft,
                    }}>
                      {r.emoji} {r.label}
                    </button>
                  );
                })}
              </div>

              {/* Comments */}
              <div style={{ padding: '14px 18px' }}>
                {replyLoading ? (
                  <div style={{ color: T.inkMuted, fontSize: 14, textAlign: 'center', padding: '20px 0' }}>Loading…</div>
                ) : (replies ?? []).length === 0 ? (
                  <div style={{ color: T.inkMuted, fontStyle: 'italic', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>
                    No comments yet — be the first.
                  </div>
                ) : (
                  (replies ?? []).map(reply => (
                    <div key={reply.id} style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'flex-start' }}>
                      <Avatar name={reply.profiles?.display_name} avatarConfig={reply.profiles?.avatar_config} photoUrl={reply.profiles?.avatar_url} size={34} style={{ flexShrink: 0 }} />
                      <div>
                        <div style={{ background: T.parchment, borderRadius: 16, padding: '9px 13px' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 2 }}>{reply.profiles?.display_name ?? 'Someone'}</div>
                          <div style={{ fontFamily: T.serif, fontSize: 14, color: T.inkSoft, lineHeight: 1.55 }}>{reply.body}</div>
                        </div>
                        <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 4, paddingLeft: 10 }}>{reply.created_at ? timeAgo(reply.created_at) : ''}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Pinned comment input */}
            <div style={{ borderTop: `1px solid ${T.line}`, padding: '10px 16px 14px', flexShrink: 0, background: T.white, position: 'relative' }}>
              {emojiOpen && (
                <>
                  <div onClick={() => setEmojiOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
                  <div style={{
                    position: 'absolute', bottom: 'calc(100% + 4px)', left: 16, right: 16, zIndex: 11,
                    background: T.white, border: `1px solid ${T.line}`, borderRadius: 14,
                    boxShadow: '0 8px 24px rgba(44,24,16,0.13)', padding: 10,
                    display: 'grid', gridTemplateColumns: 'repeat(16, 1fr)', gap: 2,
                  }}>
                    {['😀','😊','😂','🥹','😍','🥰','😭','😅','🤔','😏','😌','🙃','😇','🤩','😬','🤯',
                      '🙏','✝️','🕊️','🌿','🌸','🌺','🌻','☀️','🌙','⭐','🔥','💫','✨','🌈','🌊','🍃',
                      '❤️','🧡','💛','💚','💙','💜','🤍','🫶','👏','🙌','💪','👍','🎉','🫂','💝','🎊',
                    ].map((e) => (
                      <button key={e} onClick={() => insertReplyEmoji(e)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '4px 2px', borderRadius: 6 }}
                        onMouseEnter={(ev) => ev.currentTarget.style.background = T.parchment}
                        onMouseLeave={(ev) => ev.currentTarget.style.background = 'none'}
                      >{e}</button>
                    ))}
                  </div>
                </>
              )}
              <div style={{ fontSize: 11, color: T.inkMuted, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                {churchCtx?.church
                  ? <>👥 Visible to {churchCtx.church.name} family</>
                  : <>🔒 Visible only to you (join a church to share)</>}
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <Avatar name={profile?.display_name} avatarConfig={profile?.avatar_config} photoUrl={profile?.avatar_url} size={36} style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ background: T.parchment, borderRadius: 18, border: `1px solid ${T.line}`, padding: '9px 14px' }}>
                    <input
                      ref={replyInputRef}
                      value={replyInput}
                      onChange={(e) => setReplyInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitReply(); } }}
                      placeholder="Write a comment…"
                      autoFocus
                      style={{ width: '100%', border: 'none', outline: 'none', fontFamily: T.serif, fontSize: 14, color: T.ink, background: 'transparent' }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', marginTop: 6, paddingLeft: 2, gap: 2 }}>
                    <button onClick={() => setEmojiOpen((v) => !v)} title="Emoji"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 8, color: emojiOpen ? T.goldDark : T.inkSoft, display: 'flex', alignItems: 'center' }}>
                      <Smile size={20} strokeWidth={1.75} />
                    </button>
                    <div style={{ flex: 1 }} />
                    {replyInput.trim() && (
                      <button onClick={submitReply} style={{
                        background: T.gold, border: 'none', borderRadius: '50%',
                        width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: T.cream, cursor: 'pointer', flexShrink: 0,
                      }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg></button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Plan & AI usage card ───────────────────────────────────────────────────────
const PLAN_LABELS = {
  free:          { label: 'Free',       color: T.inkMuted },
  premium:       { label: 'Premium',    color: '#8a5a20'  },
  premium_plus:  { label: 'Premium+',   color: T.goldDark },
  church_pro:    { label: 'Church Pro', color: '#4a1542'  },
};

function PlanCard({ plan, aiUsage, session, onUpgrade }) {
  const meta      = PLAN_LABELS[plan] ?? PLAN_LABELS.free;
  const cfg       = PLAN_LIMITS[plan]  ?? PLAN_LIMITS.free;
  const pct       = cfg.limit > 0 ? Math.min(100, Math.round((aiUsage.used / (cfg.limit + aiUsage.topup)) * 100)) : 0;
  const isMonthly = cfg.period === 'monthly';
  const isPaid    = plan !== 'free';
  const [openingPortal, setOpeningPortal] = useState(false);

  async function openPortal() {
    if (!session?.user) return;
    setOpeningPortal(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-portal-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            user_id: session.user.id,
            return_url: window.location.origin,
          }),
        }
      );
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch {
      window.open('mailto:hello@kinwove.app?subject=Manage%20my%20subscription');
    } finally {
      setOpeningPortal(false);
    }
  }

  return (
    <div style={{
      margin: '0 14px 16px',
      padding: '14px 16px',
      background: T.parchment,
      border: `1px solid ${T.line}`,
      borderRadius: 14,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.inkMuted }}>Plan</span>
          <span style={{
            fontSize: 11.5, fontWeight: 700, letterSpacing: '0.05em',
            color: meta.color, textTransform: 'uppercase',
            background: `${meta.color}18`, borderRadius: 999,
            padding: '2px 8px',
          }}>{meta.label}</span>
        </div>

        {isPaid ? (
          <button
            onClick={openPortal}
            disabled={openingPortal}
            style={{
              background: 'none', border: `1px solid ${T.line}`,
              borderRadius: 999, padding: '4px 10px',
              fontSize: 11.5, fontWeight: 600, color: T.inkSoft,
              cursor: openingPortal ? 'wait' : 'pointer',
              opacity: openingPortal ? 0.6 : 1,
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = T.gold)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = T.line)}
          >
            {openingPortal ? 'Opening…' : 'Manage subscription'}
          </button>
        ) : (
          <button
            onClick={() => onUpgrade?.()}
            style={{ background: 'none', border: 'none', padding: 0, fontSize: 12, fontWeight: 600, color: T.goldDark, cursor: 'pointer' }}
          >
            Upgrade →
          </button>
        )}
      </div>

      {/* Usage bar */}
      {!aiUsage.loading && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T.inkMuted, marginBottom: 5 }}>
            <span>AI messages {isMonthly ? 'this month' : 'total'}</span>
            <span style={{ fontWeight: 600, color: aiUsage.atLimit ? '#A53F2B' : T.ink }}>
              {aiUsage.used} / {cfg.limit + aiUsage.topup}
            </span>
          </div>
          <div style={{ height: 5, background: T.line, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${pct}%`,
              background: aiUsage.atLimit
                ? '#A53F2B'
                : `linear-gradient(90deg, ${T.gold}, #c47020)`,
              borderRadius: 3,
              transition: 'width 0.4s ease',
            }} />
          </div>
          {isMonthly && (
            <div style={{ fontSize: 11, color: T.inkMuted, marginTop: 5 }}>
              Resets at the start of next billing cycle
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PlanLine({ plan, aiUsage, session, onUpgrade }) {
  const meta  = PLAN_LABELS[plan] ?? PLAN_LABELS.free;
  const cfg   = PLAN_LIMITS[plan]  ?? PLAN_LIMITS.free;
  const used  = aiUsage.used ?? 0;
  const total = cfg.limit + (aiUsage.topup ?? 0);
  const [opening, setOpening] = useState(false);
  const [portalError, setPortalError] = useState(null);

  async function openPortal() {
    if (!session?.user) return;
    setOpening(true);
    setPortalError(null);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-portal-session`,
        { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ user_id: session.user.id, return_url: window.location.origin }) }
      );
      const json = await res.json();
      if (json.url) {
        window.location.href = json.url;
      } else {
        setPortalError(json.error ?? 'Could not open billing portal. Email hello@kinwove.app for help.');
      }
    } catch (e) {
      setPortalError('Could not reach billing portal. Email hello@kinwove.app for help.');
    } finally {
      setOpening(false);
    }
  }

  return (
    <div style={{ fontSize: 12.5, color: T.inkSoft }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: meta.color, fontWeight: 600 }}>{meta.label}</span>
        <span>·</span>
        {plan === 'free' ? (
          <button onClick={() => onUpgrade?.()} style={{ background: 'none', border: 'none', padding: 0, color: T.goldDark, fontWeight: 600, cursor: 'pointer', fontSize: 12.5 }}>Upgrade →</button>
        ) : (
          <button onClick={openPortal} disabled={opening} style={{ background: 'none', border: 'none', padding: 0, color: T.goldDark, fontWeight: 600, cursor: 'pointer', fontSize: 12.5 }}>
            {opening ? 'Opening…' : 'Manage →'}
          </button>
        )}
      </div>
      {portalError && (
        <div style={{ marginTop: 4, color: T.inkMuted, fontSize: 11.5 }}>{portalError}</div>
      )}
    </div>
  );
}

export default function MePanel({ session, profile, onClose, onEditProfile, onSignOut, onDeleteAccount, onOpenBoard, onOpenHistory, onProfileUpdate, onOpenChat, onViewProfile, onFindPeople, onInviteFriends, onFindChurches, onApplyAsPastor, onOpenPastorAdminQueue, onOpenChurchDisputesQueue, onOpenChurch, onOpenSermon, onOpenWalks, onOpenTalkToSomeone, onOpenCareInbox, onOpenMessages, onOpenConnect, onOpenPastorDashboard, hasCareTeamRole, hasPastoredChurch, onUpgrade }) {
  const [posts, setPosts] = useState([]);
  const [stats, setStats] = useState({ posts: 0, following: 0, followers: 0 });
  const [followingList, setFollowingList] = useState([]);
  const [followersList, setFollowersList] = useState([]);
  const [followersLoading, setFollowersLoading] = useState(false);
  const [followersOpen, setFollowersOpen] = useState(false);
  const [friendsList, setFriendsList] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]); // incoming pending
  const [tab, setTab] = useState('posts');
  const [loading, setLoading] = useState(true);
  const [pickingAvatar, setPickingAvatar] = useState(false);
  const [avatarLightbox, setAvatarLightbox] = useState(false);
  const [bannerError, setBannerError] = useState(null);
  const [bannerPickerOpen, setBannerPickerOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [prayers, setPrayers] = useState([]);
  const [prayerText, setPrayerText] = useState('');
  const [prayerSubmitting, setPrayerSubmitting] = useState(false);
  const [prayerError, setPrayerError] = useState(null);
  const [prayersLoaded, setPrayersLoaded] = useState(false);
  const [prayerComposeOpen, setPrayerComposeOpen] = useState(false);
  const [praiseTarget,      setPraiseTarget]      = useState(null);
  const [praiseText,        setPraiseText]        = useState('');
  const [supportMap,        setSupportMap]        = useState({});   // { prayerId: count }
  const [expandedEnc,       setExpandedEnc]       = useState(new Set());
  const [encMap,            setEncMap]            = useState({});
  const [encInputMap,       setEncInputMap]       = useState({});   // { prayerId: draftText }
  const [encCountMap,       setEncCountMap]       = useState({});   // { prayerId: count }
  const [reactionMap,       setReactionMap]       = useState({});   // { prayerId: { kind: count } }
  const [myReactionMap,     setMyReactionMap]     = useState({});   // { prayerId: kind | null }
  const [menuPrayerId,      setMenuPrayerId]      = useState(null); // which card's ⋯ menu is open
  const [savedPosts,        setSavedPosts]        = useState([]);
  const [savedLoaded,       setSavedLoaded]       = useState(false);
  // Your church + this week's sermon, for the ChurchAttendsCard above the
  // tabs. Same shape as UserProfile — see profileShared.jsx#loadChurchContext.
  const [churchCtx, setChurchCtx] = useState({ church: null, sermon: null, memberCount: 0 });
  const aiUsage = useAiUsage(session?.user?.id, profile?.plan ?? 'free');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ctx = await loadChurchContext(profile?.church_id);
      if (!cancelled) setChurchCtx(ctx);
    })();
    return () => { cancelled = true; };
  }, [profile?.church_id]);

  async function loadPrayers() {
    if (prayersLoaded || !session?.user?.id) return;
    const { data } = await supabase.from('personal_prayers')
      .select('*').eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    setPrayers(data ?? []);
    setPrayersLoaded(true);
    const ids = (data ?? []).map(p => p.id);
    if (!ids.length) return;

    // Community "praying" support counts (for public prayers)
    const pubIds = (data ?? []).filter(p => p.is_public).map(p => p.id);
    if (pubIds.length > 0) {
      const { data: sd } = await supabase.from('personal_prayer_support')
        .select('prayer_id').in('prayer_id', pubIds);
      const counts = {};
      for (const r of sd ?? []) counts[r.prayer_id] = (counts[r.prayer_id] ?? 0) + 1;
      setSupportMap(counts);
    }

    // Reaction counts + my reactions
    const { data: rd } = await supabase.from('personal_prayer_reactions')
      .select('prayer_id, kind, user_id').in('prayer_id', ids);
    const rMap = {}, myRMap = {};
    for (const r of rd ?? []) {
      if (!rMap[r.prayer_id]) rMap[r.prayer_id] = {};
      rMap[r.prayer_id][r.kind] = (rMap[r.prayer_id][r.kind] ?? 0) + 1;
      if (r.user_id === session.user.id) myRMap[r.prayer_id] = r.kind;
    }
    setReactionMap(rMap);
    setMyReactionMap(myRMap);

    // Encouragement counts
    const { data: ed } = await supabase.from('personal_prayer_encouragements')
      .select('prayer_id').in('prayer_id', ids);
    const eCounts = {};
    for (const r of ed ?? []) eCounts[r.prayer_id] = (eCounts[r.prayer_id] ?? 0) + 1;
    setEncCountMap(eCounts);
  }

  async function toggleMePanelEnc(prayerId) {
    if (expandedEnc.has(prayerId)) {
      setExpandedEnc(prev => { const s = new Set(prev); s.delete(prayerId); return s; });
      return;
    }
    const { data } = await supabase
      .from('personal_prayer_encouragements')
      .select('*, profiles(display_name)')
      .eq('prayer_id', prayerId)
      .order('created_at', { ascending: true });
    setEncMap(prev => ({ ...prev, [prayerId]: data ?? [] }));
    setExpandedEnc(prev => new Set([...prev, prayerId]));
  }

  async function handlePrayerReact(prayerId, kind, isActive) {
    if (!session?.user?.id) return;
    if (isActive) {
      await supabase.from('personal_prayer_reactions')
        .delete().eq('prayer_id', prayerId).eq('user_id', session.user.id);
      setMyReactionMap(prev => ({ ...prev, [prayerId]: null }));
      setReactionMap(prev => {
        const updated = { ...(prev[prayerId] ?? {}) };
        updated[kind] = Math.max(0, (updated[kind] ?? 1) - 1);
        return { ...prev, [prayerId]: updated };
      });
    } else {
      const prevKind = myReactionMap[prayerId];
      await supabase.from('personal_prayer_reactions')
        .upsert({ prayer_id: prayerId, user_id: session.user.id, kind }, { onConflict: 'prayer_id,user_id' });
      setMyReactionMap(prev => ({ ...prev, [prayerId]: kind }));
      setReactionMap(prev => {
        const updated = { ...(prev[prayerId] ?? {}) };
        if (prevKind) updated[prevKind] = Math.max(0, (updated[prevKind] ?? 1) - 1);
        updated[kind] = (updated[kind] ?? 0) + 1;
        return { ...prev, [prayerId]: updated };
      });
    }
  }

  async function submitMePanelEnc(prayerId) {
    const text = (encInputMap[prayerId] ?? '').trim();
    if (!text || !session?.user?.id) return;
    const { data } = await supabase
      .from('personal_prayer_encouragements')
      .insert({ prayer_id: prayerId, user_id: session.user.id, body: text })
      .select('*, profiles(display_name)')
      .single();
    if (data) {
      setEncMap(prev => ({ ...prev, [prayerId]: [...(prev[prayerId] ?? []), data] }));
      setEncCountMap(prev => ({ ...prev, [prayerId]: (prev[prayerId] ?? 0) + 1 }));
      setEncInputMap(prev => ({ ...prev, [prayerId]: '' }));
    }
  }

  async function addPrayer(e) {
    e.preventDefault();
    if (!prayerText.trim() || prayerSubmitting) return;
    setPrayerSubmitting(true);
    const { data, error } = await supabase.from('personal_prayers').insert({
      user_id: session.user.id, body: prayerText.trim(), is_public: false,
    }).select().single();
    setPrayerSubmitting(false);
    if (error) {
      console.error('[addPrayer] insert failed', error);
      setPrayerError("Couldn't save prayer — try again.");
      return;
    }
    setPrayerError(null);
    if (data) { setPrayers((prev) => [data, ...prev]); setPrayerText(''); setPrayerComposeOpen(false); }
  }

  function handlePrayerAnswerButton(p) {
    if (p.is_answered) {
      applyPrayerAnswered(p, false, null);
    } else {
      setPraiseTarget(p);
      setPraiseText('');
    }
  }

  async function applyPrayerAnswered(p, answered, report) {
    const updates = {
      is_answered: answered,
      answered_at: answered ? new Date().toISOString() : null,
      praise_report: answered ? (report?.trim() || null) : null,
    };
    await supabase.from('personal_prayers').update(updates).eq('id', p.id);
    setPrayers((prev) => prev.map((x) => x.id === p.id ? { ...x, ...updates } : x));
    setPraiseTarget(null);
    setPraiseText('');
  }

  async function removePrayer(id) {
    await supabase.from('personal_prayers').delete().eq('id', id);
    setPrayers((prev) => prev.filter((x) => x.id !== id));
  }

  const person = PERSON_TYPES.find((p) => p.id === profile?.person_type);
  const typeColors = TYPE_COLORS[profile?.person_type] ?? TYPE_COLORS.curious;

  useEffect(() => {
    if (!session?.user?.id) return;
    const uid = session.user.id;
    Promise.all([
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('author_id', uid).eq('scope', 'me'),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', uid),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', uid),
    ]).then(([{ count: p }, { count: ing }, { count: ers }]) => {
      setStats({ posts: p ?? 0, following: ing ?? 0, followers: ers ?? 0 });
    });
    supabase.from('follows').select('following_id').eq('follower_id', uid)
      .then(async ({ data }) => {
        if (!data?.length) return;
        const { data: profiles } = await supabase
          .from('profiles').select('id, display_name, avatar_config, avatar_url, person_type, tradition')
          .in('id', data.map((f) => f.following_id));
        setFollowingList(profiles ?? []);
      });
    loadFriends(uid);
    loadPosts(uid);
  }, [session]);

  async function loadFriends(uid) {
    const { data } = await supabase
      .from('friend_requests')
      .select('id, sender_id, receiver_id, status')
      .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`);
    if (!data?.length) return;

    const accepted = data.filter((r) => r.status === 'accepted');
    const pending = data.filter((r) => r.status === 'pending' && r.receiver_id === uid);

    const friendIds = accepted.map((r) => r.sender_id === uid ? r.receiver_id : r.sender_id);
    const pendingIds = pending.map((r) => ({ reqId: r.id, senderId: r.sender_id }));

    if (friendIds.length) {
      const { data: fp } = await supabase.from('profiles')
        .select('id, display_name, avatar_config, avatar_url, person_type, tradition')
        .in('id', friendIds);
      setFriendsList(fp ?? []);
    }
    if (pendingIds.length) {
      const { data: pp } = await supabase.from('profiles')
        .select('id, display_name, avatar_config, avatar_url, person_type, tradition')
        .in('id', pendingIds.map((p) => p.senderId));
      setPendingRequests((pp ?? []).map((p) => ({
        ...p, reqId: pendingIds.find((r) => r.senderId === p.id)?.reqId,
      })));
    }
  }

  async function acceptFriend(reqId, senderId) {
    await supabase.from('friend_requests').update({ status: 'accepted' }).eq('id', reqId);
    const { data } = await supabase.from('profiles').select('id, display_name, avatar_config, avatar_url, person_type, tradition').eq('id', senderId).single();
    if (data) setFriendsList((prev) => [...prev, data]);
    setPendingRequests((prev) => prev.filter((r) => r.reqId !== reqId));
  }

  async function declineFriend(reqId) {
    await supabase.from('friend_requests').update({ status: 'declined' }).eq('id', reqId);
    setPendingRequests((prev) => prev.filter((r) => r.reqId !== reqId));
  }

  async function unfriend(friendId) {
    const uid = session.user.id;
    await supabase.from('friend_requests')
      .delete()
      .or(`and(sender_id.eq.${uid},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${uid})`);
    setFriendsList((prev) => prev.filter((f) => f.id !== friendId));
  }

  async function loadSaved() {
    if (savedLoaded || !session?.user?.id) return;
    const { data: saves } = await supabase
      .from('saved_posts')
      .select('post_id, created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    if (!saves?.length) { setSavedLoaded(true); return; }
    const postIds = saves.map((s) => s.post_id);
    const { data: feedRows } = await supabase
      .from('feed_items')
      .select('*')
      .in('id', postIds);
    const rows = feedRows ?? [];
    const authorIds = [...new Set(rows.map((p) => p.author_id).filter(Boolean))];
    let authorMap = {};
    if (authorIds.length) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_config, avatar_url')
        .in('id', authorIds);
      for (const p of profs ?? []) authorMap[p.id] = p;
    }
    // Preserve save order from the saved_posts query
    const ordered = postIds.map((id) => rows.find((r) => r.id === id)).filter(Boolean);
    setSavedPosts(ordered.map((p) => ({ ...p, authorProfile: authorMap[p.author_id] })));
    setSavedLoaded(true);
  }

  async function loadPosts(uid) {
    setLoading(true);
    const { data } = await supabase.from('posts').select('*, post_comments(id)').eq('author_id', uid).eq('scope', 'me').order('created_at', { ascending: false });
    if (!data) { setLoading(false); return; }
    const { data: reactions } = await supabase.from('reactions').select('post_id, kind, author_id').in('post_id', data.map((p) => p.id));
    setPosts(data.map((p) => {
      const pr = reactions?.filter((r) => r.post_id === p.id) ?? [];
      const counts = {};
      pr.forEach((r) => { counts[r.kind] = (counts[r.kind] ?? 0) + 1; });
      return { ...p, reaction_counts: counts, my_reaction: pr.find((r) => r.author_id === session.user.id)?.kind ?? null, reply_count: p.post_comments?.length ?? 0 };
    }));
    setLoading(false);
  }

  async function handleReact(postId, kind, isActive) {
    if (!session) return;
    if (isActive) { await supabase.from('reactions').delete().eq('post_id', postId).eq('author_id', session.user.id); }
    else { await supabase.from('reactions').upsert({ post_id: postId, author_id: session.user.id, kind }, { onConflict: 'post_id,author_id' }); }
    loadPosts(session.user.id);
  }

  async function saveAvatar({ photoUrl, config }) {
    const updates = { avatar_url: photoUrl ?? null };
    if (config) updates.avatar_config = config;
    try {
      await directProfileUpdate(session.user.id, updates);
      setPickingAvatar(false);
      onProfileUpdate?.({ ...profile, ...updates });
    } catch (err) {
      console.error('saveAvatar failed:', err.message);
      setBannerError("Couldn't save avatar — try again.");
    }
  }

  async function savePreset(key) {
    if (!session?.user?.id) return;
    setBannerError(null);
    try {
      await directProfileUpdate(session.user.id, { banner_preset: key, banner_url: null });
      onProfileUpdate?.({ ...profile, banner_preset: key, banner_url: null });
      setBannerPickerOpen(false);
    } catch (err) { setBannerError(err.message); }
  }

  async function toggleConnectFlag(field) {
    if (!session?.user?.id) return;
    const next = !profile?.[field];
    try {
      await directProfileUpdate(session.user.id, { [field]: next });
      onProfileUpdate?.({ ...profile, [field]: next });
    } catch {}
  }


  return (
    <>
      {pickingAvatar && (
        <AvatarPicker
          current={profile?.avatar_config}
          currentPhotoUrl={profile?.avatar_url}
          userId={session?.user?.id}
          onSave={saveAvatar}
          onCancel={() => setPickingAvatar(false)}
        />
      )}

      <div className="scene" style={{ minHeight: '100vh', paddingBottom: 80 }}>

        {/* Sticky header — walnut "leather cover" matches Community so the
            app reads as one editorial work. Gold back arrow + ivory title. */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          background: '#1e1208',
          borderBottom: 'none',
          boxShadow: '0 1px 0 rgba(255,255,255,0.04)',
          paddingTop: 'env(safe-area-inset-top, 0px)',
        }}><div style={{ height: 56, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', color: '#e8b563',
            fontSize: 20, cursor: 'pointer', width: 36, height: 36, borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s',
            textShadow: '0 1px 0 rgba(0,0,0,0.4)',
          }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(232,181,99,0.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            aria-label="Back"
          >←</button>
          <div style={{
            flex: 1, textAlign: 'center',
            fontFamily: T.display, fontSize: 17, fontWeight: 600,
            color: '#f4e9d4', letterSpacing: '-0.01em',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            textShadow: '0 1px 0 rgba(0,0,0,0.4)',
          }}>
            {profile?.display_name ?? 'Profile'}
          </div>
          {/* Messages button */}
          {onOpenMessages && (
            <button onClick={onOpenMessages} aria-label="Messages" style={{
              background: 'transparent', border: 'none', color: '#e8b563',
              width: 36, height: 36, borderRadius: 10, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginLeft: 'auto',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </button>
          )}
        </div></div>

        {/* Hero cover */}
        <div style={{ background: T.cream, marginBottom: 10 }}>
          <div style={{ position: 'relative' }}>
            {/* Banner strip */}
            <div style={{
              height: 108, background: bannerBackground(profile),
              position: 'relative', overflow: 'hidden',
            }}>
              <button onClick={() => setBannerPickerOpen((v) => !v)} style={{
                position: 'absolute', top: 10, right: 10,
                background: 'rgba(44,24,16,0.55)', color: T.cream,
                border: 'none', borderRadius: 999, padding: '6px 12px',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                backdropFilter: 'blur(4px)',
              }}>
                🎨 Banner colour
              </button>
              {bannerError && (
                <div style={{ position: 'absolute', bottom: 8, left: 12, right: 12, background: 'rgba(220,53,69,0.92)', color: '#fff', borderRadius: 8, padding: '5px 10px', fontSize: 12, textAlign: 'center' }}>
                  {bannerError}
                </div>
              )}
            </div>
            {/* Colour picker panel */}
            {bannerPickerOpen && (
              <div style={{ background: T.cream, borderBottom: `1px solid ${T.line}`, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: T.inkMuted, fontWeight: 700, marginBottom: 10 }}>Choose a colour</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {BANNER_PRESETS.map((p) => {
                    const active = profile?.banner_preset === p.key;
                    return (
                      <button key={p.key} onClick={() => savePreset(p.key)} title={p.label} style={{
                        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                        background: p.bg, border: active ? `2.5px solid ${T.goldDark}` : '2px solid transparent',
                        cursor: 'pointer', boxShadow: active ? `0 0 0 2px ${T.goldLight}` : 'none',
                      }} />
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div style={{ padding: '0 20px 22px' }}>
            {/* Avatar row */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: bannerPickerOpen ? 16 : -50, marginBottom: 16 }}>
              <div style={{ position: 'relative' }}>
                <div
                  onClick={() => (profile?.avatar_url || profile?.avatar_config) && setAvatarLightbox(true)}
                  style={{
                    borderRadius: '50%',
                    display: 'inline-block',
                    boxShadow: '0 4px 16px rgba(26,17,8,0.15)',
                    cursor: (profile?.avatar_url || profile?.avatar_config) ? 'zoom-in' : 'default',
                  }}
                >
                  <Avatar
                    name={profile?.display_name}
                    avatarConfig={profile?.avatar_config} photoUrl={profile?.avatar_url}
                    size={108}
                    style={{ display: 'block', borderRadius: '50%' }}
                  />
                </div>
                <button onClick={() => setPickingAvatar(true)} style={{
                  position: 'absolute', bottom: 4, right: 4,
                  width: 30, height: 30, borderRadius: '50%',
                  background: T.ink, color: T.cream, border: `2px solid ${T.white}`,
                  fontSize: 12, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }} title="Change photo">✏</button>
              </div>

              {/* Avatar lightbox */}
              {avatarLightbox && (
                <div
                  onClick={() => setAvatarLightbox(false)}
                  style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: 'rgba(0,0,0,0.82)',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 20,
                  }}
                >
                  <Avatar
                    name={profile?.display_name}
                    avatarConfig={profile?.avatar_config}
                    photoUrl={profile?.avatar_url}
                    size={280}
                    style={{ border: `4px solid ${T.white}`, boxShadow: '0 8px 48px rgba(0,0,0,0.5)', pointerEvents: 'none' }}
                  />
                  {profile?.avatar_url && (
                    <a
                      href={profile.avatar_url}
                      download="profile-photo.jpg"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        background: 'rgba(255,255,255,0.15)',
                        color: '#fff',
                        border: '1.5px solid rgba(255,255,255,0.35)',
                        borderRadius: 999,
                        padding: '10px 24px',
                        fontSize: 14,
                        fontWeight: 600,
                        textDecoration: 'none',
                        backdropFilter: 'blur(8px)',
                        letterSpacing: '0.01em',
                      }}
                    >
                      💾 Save photo
                    </a>
                  )}
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: -8 }}>
                    Tap anywhere to close
                  </div>
                </div>
              )}

              {!profile?.is_system_account && (
                <div style={{ display: 'flex', gap: 8, paddingBottom: 4 }}>
                  <button onClick={onEditProfile} style={{
                    background: T.white, color: T.ink,
                    border: `1.5px solid ${T.ink}`,
                    borderRadius: 999, padding: '8px 18px',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}>Edit profile</button>
                </div>
              )}
            </div>

            {/* Name + person type badge */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontFamily: T.serif, fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em', color: T.ink, lineHeight: 1, marginBottom: 8 }}>
                {profile?.display_name ?? 'You'}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                {person && (
                  <span style={{
                    background: typeColors.bg, border: `1px solid ${typeColors.border}`,
                    color: typeColors.text, borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 600,
                  }}>
                    {person.emoji} {person.label}
                  </span>
                )}
                {profile?.tradition && (
                  <span style={{ fontSize: 13, color: T.inkMuted }}>· {profile.tradition}</span>
                )}
                {(profile?.city || profile?.country) && (
                  <span style={{ fontSize: 13, color: T.inkMuted }}>· 📍 {[profile.city, profile.country].filter(Boolean).join(', ')}</span>
                )}
              </div>
            </div>

            {/* Bio / description */}
            {profile?.what_brought ? (
              <div style={{
                fontFamily: T.serif, fontSize: 15, color: T.inkSoft,
                fontStyle: 'italic', lineHeight: 1.65, marginBottom: 16,
                padding: '12px 14px',
                background: 'rgba(184,115,58,0.05)',
                borderLeft: `3px solid ${T.gold}`,
                borderRadius: '0 10px 10px 0',
              }}>
                "{profile.what_brought}"
              </div>
            ) : !profile?.is_system_account ? (
              <button onClick={onEditProfile} style={{
                background: 'none', border: `1px dashed ${T.line}`,
                borderRadius: 10, padding: '10px 14px', width: '100%', textAlign: 'left',
                color: T.inkMuted, fontSize: 14, cursor: 'pointer', marginBottom: 16,
              }}>
                + Add a bio
              </button>
            ) : null}

            {/* Stats — frontispiece-style: display numerals + gold-leaf small caps */}
            <div style={{
              display: 'flex', gap: 28, padding: '14px 0',
              borderTop: `1px solid ${T.line}`, borderBottom: `1px solid ${T.line}`, marginBottom: 14,
            }}>
              {[
                { value: stats.posts,          label: 'Posts',     onClick: null },
                { value: friendsList.length,   label: 'Friends',   onClick: () => setTab('friends') },
                { value: stats.following,      label: 'Following', onClick: () => setTab('following') },
                { value: stats.followers,      label: 'Followers', onClick: async () => {
                  setFollowersOpen(true);
                  if (followersList.length > 0) return;
                  setFollowersLoading(true);
                  const uid = session?.user?.id;
                  const { data } = await supabase.from('follows').select('follower_id').eq('following_id', uid);
                  const ids = (data ?? []).map((r) => r.follower_id);
                  if (ids.length) {
                    const { data: profs } = await supabase.from('profiles').select('id, display_name, avatar_config, avatar_url').in('id', ids);
                    setFollowersList(profs ?? []);
                  }
                  setFollowersLoading(false);
                }},
              ].map((s) => (
                <div
                  key={s.label}
                  onClick={s.onClick ?? undefined}
                  style={{ cursor: s.onClick ? 'pointer' : 'default' }}
                >
                  <span style={{ fontFamily: T.display, fontSize: 20, fontWeight: 500, color: T.ink, marginRight: 5, letterSpacing: '-0.01em' }}>{s.value}</span>
                  <span style={{
                    fontSize: 12, color: s.onClick ? T.goldDark : T.inkSoft,
                    fontWeight: s.onClick ? 600 : 400,
                    textDecoration: s.onClick ? 'underline' : 'none',
                  }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Your church — same component UserProfile uses on others' pages.
            Renders nothing if you haven't joined a church yet. Self-mode shows
            "Your church" instead of "Danny attends" and points the top row at
            your existing onOpenChurch handler. */}
        <div style={{ padding: '0 14px' }}>
          <ChurchAttendsCard
            isSelf={true}
            church={churchCtx.church}
            sermon={churchCtx.sermon}
            memberCount={churchCtx.memberCount}
            onOpenChurch={onOpenChurch}
            onOpenSermon={onOpenSermon}
          />
        </div>


        {/* ── Plan & AI usage ──── */}
        {!profile?.is_system_account && (
          <div style={{ padding: '10px 20px 4px' }}>
            <PlanLine plan={profile?.plan ?? 'free'} aiUsage={aiUsage} session={session} onUpgrade={onUpgrade} />
          </div>
        )}

        {/* Tabs — 4 tabs, gold accent, hairline anchor */}
        <div style={{
          display: 'flex',
          background: T.cream,
          borderBottom: `1px solid ${T.line}`,
          marginBottom: 12,
        }}>
          {[
            { id: 'posts',   label: 'Posts'   },
            { id: 'prayers', label: 'Prayer Journal' },
            { id: 'saved',   label: 'Saves'   },
            { id: 'about',   label: 'About'   },
          ].map((t) => {
            const isActive = tab === t.id;
            return (
              <button key={t.id} onClick={() => { setTab(t.id); if (t.id === 'prayers') loadPrayers(); if (t.id === 'saved') loadSaved(); }} style={{
                flex: 1,
                padding: '13px 8px',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? `2px solid ${T.goldDark}` : '2px solid transparent',
                marginBottom: -1,
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                fontFamily: T.serif,
                color: isActive ? T.goldDark : T.inkMuted,
                cursor: 'pointer',
                transition: 'color 0.15s, border-color 0.15s',
              }}>
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Posts tab */}
        {tab === 'posts' && (
          <div style={{ padding: '0 14px', maxWidth: 620, margin: '0 auto' }}>
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
                    border: '1px solid #C9B98E', borderRadius: 999, padding: '11px 16px',
                    fontSize: 14.5, fontFamily: T.serif, fontStyle: 'italic', color: '#6b5d48',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    boxShadow: 'inset 0 2px 4px rgba(154,99,40,0.10), inset 0 -1px 0 rgba(255,255,255,0.6)',
                  }}>
                    <span>A thought, a doubt, a question…</span>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 26, height: 26, marginLeft: 12, borderRadius: '50%',
                      background: `linear-gradient(135deg, ${T.goldLight}, ${T.goldDark})`,
                      color: T.cream, fontSize: 13, fontWeight: 700,
                      boxShadow: '0 2px 6px rgba(184,115,58,0.35)',
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
                        onPosted={() => {
                          setComposeOpen(false);
                          loadPosts(session.user.id);
                          setStats((s) => ({ ...s, posts: s.posts + 1 }));
                        }}
                        onCancel={() => setComposeOpen(false)}
                      />
                    </Suspense>
                  </div>
                </div>
              )}
            </div>
            {loading && <div style={{ textAlign: 'center', padding: 40, color: T.inkMuted, fontFamily: T.serif }}>Loading…</div>}
            {!loading && posts.length === 0 && (
              <EmptyState compact title="Nothing shared yet." body="Thoughts, verses, questions — post anything." />
            )}
            {posts.map((p) => (
              <ProfilePost
                key={p.id}
                post={p}
                session={session}
                profile={profile}
                onReact={handleReact}
                churchCtx={churchCtx}
                onViewProfile={onViewProfile}
                onDelete={(id) => {
                  setPosts((prev) => prev.filter((x) => x.id !== id));
                  setStats((s) => ({ ...s, posts: Math.max(0, s.posts - 1) }));
                }}
              />
            ))}
          </div>
        )}

        {/* Prayers tab */}
        {tab === 'prayers' && (
          <div style={{ padding: '0 14px', maxWidth: 620, margin: '0 auto' }}>

            {/* Prayer compose — pill collapses to sage-tinted input, expands inline */}
            <div style={{ marginBottom: 14 }}>
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
                    boxShadow: '0 2px 8px rgba(44,24,16,0.14), 0 0 0 2px rgba(255,255,255,0.95), 0 0 0 3px rgba(90,128,100,0.22)',
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
                    <span>What are you bringing to God today?</span>
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
                <form onSubmit={addPrayer} style={{
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                  background: 'linear-gradient(180deg, #F4F8F0 0%, #E5EFD9 100%)',
                  border: `1px solid ${SEMANTIC.prayer.line}`,
                  borderRadius: 14, padding: '14px',
                  boxShadow: 'inset 0 2px 4px rgba(90,128,100,0.08), inset 0 -1px 0 rgba(255,255,255,0.6)',
                }}>
                  <div style={{
                    borderRadius: '50%',
                    boxShadow: '0 2px 8px rgba(44,24,16,0.14), 0 0 0 2px rgba(255,255,255,0.95), 0 0 0 3px rgba(90,128,100,0.22)',
                    flexShrink: 0, marginTop: 2,
                  }}>
                    <Avatar name={profile?.display_name} avatarConfig={profile?.avatar_config} photoUrl={profile?.avatar_url} size={40} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <textarea
                      autoFocus
                      value={prayerText}
                      onChange={(e) => setPrayerText(e.target.value)}
                      placeholder="What are you bringing to God today?"
                      rows={4}
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        border: 'none', outline: 'none', resize: 'vertical',
                        fontFamily: T.serif, fontSize: 15, lineHeight: 1.65,
                        color: T.ink, background: 'transparent',
                      }}
                    />
                    {prayerError && <div style={{ fontSize: 12, color: T.error, marginTop: 6 }}>{prayerError}</div>}
                    <div style={{ marginTop: 10, borderTop: `1px solid rgba(90,128,100,0.2)`, paddingTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 11, color: '#5a7a5a', fontStyle: 'italic' }}>🔒 Private — only you can see this. Never shared, sold, or used for AI training.</span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => { setPrayerComposeOpen(false); setPrayerText(''); }}
                          style={{ background: 'none', border: 'none', color: T.inkMuted, fontSize: 13, cursor: 'pointer', padding: '6px 10px' }}
                        >Cancel</button>
                        <button
                          type="submit"
                          disabled={!prayerText.trim() || prayerSubmitting}
                          style={{
                            background: prayerText.trim() ? `linear-gradient(135deg, ${SEMANTIC.prayer.rail} 0%, #7A4E20 100%)` : T.line,
                            color: T.cream, border: 'none', borderRadius: 999,
                            padding: '8px 22px', fontSize: 13, fontWeight: 600,
                            cursor: prayerText.trim() ? 'pointer' : 'not-allowed',
                            transition: 'all 0.15s',
                          }}
                        >
                          {prayerSubmitting ? 'Adding…' : 'Pray'}
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              )}
            </div>

            {prayers.length === 0 && (
              <EmptyState compact icon="🕯️" title="Your prayer list is empty." body="Add your first prayer above — just between you and God." />
            )}

            {prayers.map((p) => (
              <div key={p.id} style={{
                background: T.white,
                border: `1px solid ${p.is_answered ? T.goldLight : T.line}`,
                borderRadius: 14, marginBottom: 12, overflow: 'hidden',
              }}>

                {/* ── Header: timestamp · privacy · answered pill · ⋯ menu ── */}
                <div style={{ padding: '14px 18px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {p.is_answered && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(184,115,58,0.12)', borderRadius: 999, padding: '2px 8px' }}>
                        <svg width="11" height="11" viewBox="0 0 34 34">
                          <circle cx="17" cy="17" r="10" fill={T.gold}/>
                          <polyline points="11,17 15,21 23,12" fill="none" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span style={{ fontSize: 11, fontWeight: 700, color: T.goldDark }}>Answered</span>
                      </div>
                    )}
                    <span style={{ fontSize: 12, color: T.inkMuted }}>{timeAgo(p.created_at)}</span>
                  </div>
                  {/* ⋯ options menu */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <button
                      onClick={() => setMenuPrayerId(menuPrayerId === p.id ? null : p.id)}
                      style={{ background: 'none', border: 'none', color: T.inkMuted, fontSize: 20, cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}
                    >⋯</button>
                    {menuPrayerId === p.id && (
                      <>
                        <div onClick={() => setMenuPrayerId(null)} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
                        <div style={{
                          position: 'absolute', top: '110%', right: 0, zIndex: 50,
                          background: T.white, border: `1px solid ${T.line}`,
                          borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                          overflow: 'hidden', minWidth: 195,
                        }}>
                          {[
                            { key: 'answered', content: p.is_answered ? '○  Mark unanswered' : <><KinwoveStar size={12} style={{ verticalAlign: 'middle', marginRight: 4, flexShrink: 0 }} />  Mark answered</>, onClick: () => { setMenuPrayerId(null); handlePrayerAnswerButton(p); } },
                            { key: 'remove', content: 'Remove prayer', danger: true, onClick: () => { setMenuPrayerId(null); removePrayer(p.id); } },
                          ].map((item, i, arr) => (
                            <button key={item.key} onClick={item.onClick} style={{
                              width: '100%', textAlign: 'left', background: 'none', border: 'none',
                              padding: '11px 16px', fontSize: 13,
                              color: item.danger ? T.error : T.ink, cursor: 'pointer',
                              borderBottom: i < arr.length - 1 ? `1px solid ${T.line}` : 'none',
                            }}>{item.content}</button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* ── Body ── */}
                <div style={{ padding: '10px 18px 14px', fontFamily: T.serif, fontSize: 16, color: T.ink, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
                  {p.body}
                </div>

                {/* ── Praise report ── */}
                {p.is_answered && p.praise_report && (
                  <div style={{ margin: '0 18px 14px', background: 'rgba(184,115,58,0.07)', borderRadius: 10, padding: '10px 13px', borderLeft: `3px solid ${T.gold}` }}>
                    <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 4 }}>Praise Report <KinwoveStar size={10} style={{ verticalAlign: 'middle', marginLeft: 3, flexShrink: 0 }} /></div>
                    <div style={{ fontFamily: T.serif, fontStyle: 'italic', fontSize: 13, color: T.inkSoft, lineHeight: 1.6 }}>"{p.praise_report}"</div>
                  </div>
                )}

                {/* ── Reactions bar — matches ProfilePost exactly ── */}
                <div style={{ padding: '8px 18px', borderTop: `1px solid ${T.line}`, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  {PRAYER_REACTIONS.map(r => {
                    const count = (reactionMap[p.id] ?? {})[r.kind] ?? 0;
                    const active = myReactionMap[p.id] === r.kind;
                    const sem = r.semantic ? SEMANTIC[r.semantic] : null;
                    const activeBg     = sem ? sem.bgActive    : 'rgba(184,115,58,0.12)';
                    const activeBorder = sem ? sem.line        : T.gold;
                    const activeText   = sem ? sem.text        : T.goldDark;
                    return (
                      <button key={r.kind} onClick={() => handlePrayerReact(p.id, r.kind, active)} style={{
                        background: active ? activeBg : 'transparent',
                        border: `1px solid ${active ? activeBorder : T.line}`,
                        borderRadius: 999, padding: '5px 11px', fontSize: 12,
                        color: active ? activeText : T.inkMuted,
                        fontWeight: active ? 600 : 400,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                        transition: 'all 0.15s',
                      }}>
                        {r.emoji} <span>{r.label}</span>
                        {count > 0 && <span style={{ fontWeight: 700, marginLeft: 2 }}>{count}</span>}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => toggleMePanelEnc(p.id)}
                    style={{
                      marginLeft: 'auto', background: 'none', border: 'none',
                      fontSize: 12, color: expandedEnc.has(p.id) ? T.goldDark : T.inkMuted,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    💬 {(encCountMap[p.id] ?? 0) > 0 ? encCountMap[p.id] : ''}
                  </button>
                </div>

                {/* ── Encouragements thread ── */}
                {expandedEnc.has(p.id) && (
                  <div style={{ borderTop: `1px solid ${T.line}`, background: T.parchment, padding: '10px 18px' }}>
                    {(encMap[p.id] ?? []).length === 0 ? (
                      <div style={{ fontSize: 12, color: T.inkMuted, fontStyle: 'italic', textAlign: 'center', padding: '4px 0 8px' }}>
                        No encouragements yet — be the first.
                      </div>
                    ) : (
                      (encMap[p.id] ?? []).map(enc => (
                        <div key={enc.id} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: '50%',
                            background: `linear-gradient(135deg, ${T.gold}, #c47020)`,
                            flexShrink: 0, display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: 12, color: T.cream, fontWeight: 700,
                          }}>
                            {(enc.profiles?.display_name ?? '?')[0].toUpperCase()}
                          </div>
                          <div style={{ background: T.white, borderRadius: 12, padding: '7px 11px', flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: T.ink, marginBottom: 2 }}>{enc.profiles?.display_name ?? 'Someone'}</div>
                            <div style={{ fontFamily: T.serif, fontSize: 13, color: T.inkSoft, lineHeight: 1.5 }}>{enc.body}</div>
                            <div style={{ fontSize: 10, color: T.inkMuted, marginTop: 3 }}>{enc.created_at ? timeAgo(enc.created_at) : ''}</div>
                          </div>
                        </div>
                      ))
                    )}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                      <Avatar name={profile?.display_name} avatarConfig={profile?.avatar_config} photoUrl={profile?.avatar_url} size={28} style={{ flexShrink: 0 }} />
                      <div style={{ flex: 1, background: T.white, borderRadius: 20, border: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', padding: '6px 12px', gap: 8 }}>
                        <input
                          value={encInputMap[p.id] ?? ''}
                          onChange={(e) => setEncInputMap(prev => ({ ...prev, [p.id]: e.target.value.slice(0, 120) }))}
                          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitMePanelEnc(p.id); } }}
                          placeholder="Write an encouragement…"
                          style={{ flex: 1, border: 'none', outline: 'none', fontFamily: T.serif, fontSize: 13, color: T.ink, background: 'transparent' }}
                        />
                        {(encInputMap[p.id] ?? '').trim() && (
                          <button onClick={() => submitMePanelEnc(p.id)} style={{ background: 'none', border: 'none', color: T.goldDark, fontSize: 18, cursor: 'pointer', padding: 0, lineHeight: 1 }}>↑</button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            ))}

            {/* Praise report sheet */}
            {praiseTarget && (
              <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(44,24,16,0.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 20 }}
                onClick={() => setPraiseTarget(null)}
              >
                <div onClick={e => e.stopPropagation()} style={{
                  background: T.cream, border: `1px solid ${T.line}`, borderRadius: 20,
                  padding: '28px 24px', width: '100%', maxWidth: 420, marginBottom: 20,
                  boxShadow: '0 18px 50px rgba(44,24,16,0.18)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <svg width="30" height="30" viewBox="0 0 34 34" style={{ flexShrink: 0, animation: 'badgePop 0.55s cubic-bezier(0.34,1.56,0.64,1) both' }}>
                      <line x1="17" y1="1"  x2="17" y2="6"  stroke={T.gold} strokeWidth="2"   strokeLinecap="round"/>
                      <line x1="17" y1="28" x2="17" y2="33" stroke={T.gold} strokeWidth="2"   strokeLinecap="round"/>
                      <line x1="1"  y1="17" x2="6"  y2="17" stroke={T.gold} strokeWidth="2"   strokeLinecap="round"/>
                      <line x1="28" y1="17" x2="33" y2="17" stroke={T.gold} strokeWidth="2"   strokeLinecap="round"/>
                      <line x1="5.5"  y1="5.5"  x2="8.8"  y2="8.8"  stroke={T.gold} strokeWidth="1.5" strokeLinecap="round"/>
                      <line x1="25.2" y1="25.2" x2="28.5" y2="28.5" stroke={T.gold} strokeWidth="1.5" strokeLinecap="round"/>
                      <line x1="28.5" y1="5.5"  x2="25.2" y2="8.8"  stroke={T.gold} strokeWidth="1.5" strokeLinecap="round"/>
                      <line x1="8.8"  y1="25.2" x2="5.5"  y2="28.5" stroke={T.gold} strokeWidth="1.5" strokeLinecap="round"/>
                      <circle cx="17" cy="17" r="10" fill={T.gold}/>
                      <ellipse cx="15" cy="13.5" rx="4" ry="2" fill="rgba(255,255,255,0.22)"/>
                      <polyline points="11,17 15,21 23,12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <div style={{ fontFamily: T.display, fontSize: 19, color: T.ink, fontWeight: 600, letterSpacing: '-0.012em' }}>Prayer Answered!</div>
                  </div>
                  <div style={{ fontFamily: T.serif, fontStyle: 'italic', fontSize: 13, color: T.inkMuted, marginBottom: 18, lineHeight: 1.6 }}>
                    "{praiseTarget.body}"
                  </div>
                  <div style={{ fontSize: 12, color: T.inkSoft, marginBottom: 10 }}>
                    Want to share what happened? <span style={{ color: '#9B8C73' }}>(optional)</span>
                  </div>
                  <textarea
                    value={praiseText} onChange={e => setPraiseText(e.target.value.slice(0, 200))}
                    placeholder="Share your testimony…" rows={3} autoFocus
                    style={{
                      width: '100%', boxSizing: 'border-box', resize: 'none',
                      background: T.white, border: `1px solid ${T.line}`,
                      borderRadius: 10, padding: '11px 14px', fontSize: 14, color: T.ink,
                      fontFamily: T.serif, outline: 'none', lineHeight: 1.6, marginBottom: 4,
                    }}
                    onFocus={e => (e.currentTarget.style.borderColor = T.gold)}
                    onBlur={e => (e.currentTarget.style.borderColor = T.line)}
                  />
                  <div style={{ fontSize: 10, color: '#B0A28A', textAlign: 'right', marginBottom: 16 }}>{praiseText.length}/200</div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => applyPrayerAnswered(praiseTarget, true, praiseText)} style={{
                      background: T.gold, color: T.cream, border: 'none', borderRadius: 999,
                      padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', flex: 1,
                    }}>
                      {praiseText.trim() ? 'Save testimony' : 'Mark answered'}
                    </button>
                    <button onClick={() => setPraiseTarget(null)} style={{ background: 'none', border: 'none', color: T.inkMuted, fontSize: 13, cursor: 'pointer' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Friends tab */}
        {tab === 'friends' && (
          <div style={{ padding: '0 14px' }}>
            {/* Find people button */}
            <button
              onClick={() => onFindPeople?.()}
              style={{
                width: '100%', background: T.parchment,
                border: `1.5px dashed ${T.goldLight}`, borderRadius: 12,
                padding: '12px 16px', marginBottom: 12, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontSize: 14, color: T.goldDark, fontWeight: 600,
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(184,115,58,0.08)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = T.parchment)}
            >
              🔍 Find people
            </button>

            {/* Pending requests */}
            {pendingRequests.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, letterSpacing: '0.07em', textTransform: 'uppercase', color: T.inkMuted, fontWeight: 600, marginBottom: 10 }}>
                  Friend requests
                </div>
                {pendingRequests.map((req) => {
                  const fp = PERSON_TYPES.find((p) => p.id === req.person_type);
                  const fc = TYPE_COLORS[req.person_type] ?? TYPE_COLORS.curious;
                  return (
                    <div key={req.id} style={{
                      background: T.white, border: `1.5px solid ${T.goldLight}`,
                      borderRadius: 14, padding: '14px 16px', marginBottom: 10,
                      display: 'flex', alignItems: 'center', gap: 14,
                    }}>
                      <button onClick={() => onViewProfile?.(req.id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                        <Avatar name={req.display_name} avatarConfig={req.avatar_config} photoUrl={req.avatar_url} size={46} />
                      </button>
                      <div style={{ flex: 1 }}>
                        <button onClick={() => onViewProfile?.(req.id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
                          <div style={{ fontWeight: 600, fontSize: 15, color: T.ink }}>{req.display_name}</div>
                        </button>
                        {fp && (
                          <span style={{ background: fc.bg, border: `1px solid ${fc.border}`, color: fc.text, borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                            {fp.emoji} {fp.label}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => acceptFriend(req.reqId, req.id)} style={{
                          background: T.gold, color: T.cream, border: 'none',
                          borderRadius: 999, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        }}>Accept</button>
                        <button onClick={() => declineFriend(req.reqId)} style={{
                          background: T.white, color: T.inkMuted, border: `1px solid ${T.line}`,
                          borderRadius: 999, padding: '7px 12px', fontSize: 13, cursor: 'pointer',
                        }}>✕</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Friends list */}
            {friendsList.length === 0 && pendingRequests.length === 0 && (
              <EmptyState
                compact
                icon="👥"
                title="No friends yet."
                body="Search for people by name and send them a friend request."
                cta={{ label: 'Find people →', onClick: () => onFindPeople?.() }}
              />
            )}
            {friendsList.length > 0 && (
              <>
                {pendingRequests.length > 0 && (
                  <div style={{ fontSize: 11, letterSpacing: '0.07em', textTransform: 'uppercase', color: T.inkMuted, fontWeight: 600, marginBottom: 10 }}>
                    Your friends
                  </div>
                )}
                {friendsList.map((f) => {
                  const fp = PERSON_TYPES.find((p) => p.id === f.person_type);
                  const fc = TYPE_COLORS[f.person_type] ?? TYPE_COLORS.curious;
                  return (
                    <div key={f.id} style={{
                      background: T.white, border: `1px solid ${T.line}`,
                      borderRadius: 14, padding: '14px 16px', marginBottom: 10,
                      display: 'flex', alignItems: 'center', gap: 14,
                    }}>
                      <button onClick={() => onViewProfile?.(f.id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, flex: 1, textAlign: 'left' }}>
                        <Avatar name={f.display_name} avatarConfig={f.avatar_config} photoUrl={f.avatar_url} size={46} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 15, color: T.ink, marginBottom: 4 }}>{f.display_name}</div>
                          {fp && (
                            <span style={{ background: fc.bg, border: `1px solid ${fc.border}`, color: fc.text, borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                              {fp.emoji} {fp.label}
                            </span>
                          )}
                        </div>
                        <span style={{ color: T.goldDark, fontSize: 16 }}>→</span>
                      </button>
                      <button onClick={() => unfriend(f.id)} style={{
                        background: 'none', border: 'none', color: T.inkMuted,
                        fontSize: 11, cursor: 'pointer', padding: '4px 8px',
                        marginLeft: 4,
                      }}>Unfriend</button>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* Following tab */}
        {tab === 'following' && (
          <div style={{ padding: '0 14px' }}>
            {followingList.length === 0 && (
              <EmptyState compact title="Not following anyone yet." body="Follow people from the community feed." />
            )}
            {followingList.map((f) => {
              const fp = PERSON_TYPES.find((p) => p.id === f.person_type);
              const fc = TYPE_COLORS[f.person_type] ?? TYPE_COLORS.curious;
              return (
                <button
                  key={f.id}
                  onClick={() => onViewProfile?.(f.id)}
                  style={{
                    width: '100%', textAlign: 'left',
                    background: T.white, border: `1px solid ${T.line}`,
                    borderRadius: 14, padding: '14px 16px', marginBottom: 10,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14,
                    transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.gold; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.line; }}
                >
                  <Avatar name={f.display_name} avatarConfig={f.avatar_config} photoUrl={f.avatar_url} size={48} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, color: T.ink, marginBottom: 4 }}>{f.display_name}</div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {fp && (
                        <span style={{
                          background: fc.bg, border: `1px solid ${fc.border}`,
                          color: fc.text, borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 600,
                        }}>
                          {fp.emoji} {fp.label}
                        </span>
                      )}
                      {f.tradition && <span style={{ fontSize: 12, color: T.inkMuted }}>{f.tradition}</span>}
                    </div>
                  </div>
                  <span style={{ color: T.goldDark, fontSize: 16 }}>→</span>
                </button>
              );
            })}
          </div>
        )}

        {/* About tab */}
        {tab === 'about' && (
          <div style={{ padding: '0 14px' }}>
            {[
              profile?.tradition       && { label: 'Tradition',         value: profile.tradition },
              profile?.age_range       && { label: 'Age range',         value: profile.age_range },
              profile?.exploring_since && { label: 'Exploring since',   value: profile.exploring_since },
              profile?.what_brought    && { label: 'What brought me here', value: `"${profile.what_brought}"`, serif: true },
            ].filter(Boolean).map((item) => (
              <div key={item.label} style={{ background: T.white, borderRadius: 14, border: `1px solid ${T.line}`, padding: '15px 18px', marginBottom: 10 }}>
                <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: T.inkMuted, marginBottom: 6 }}>{item.label}</div>
                <div style={{ fontFamily: item.serif ? T.serif : 'inherit', fontSize: 14, color: T.inkSoft, lineHeight: 1.65, fontStyle: item.serif ? 'italic' : 'normal' }}>{item.value}</div>
              </div>
            ))}
            {profile?.looking_for?.length > 0 && (
              <div style={{ background: T.white, borderRadius: 14, border: `1px solid ${T.line}`, padding: '15px 18px', marginBottom: 10 }}>
                <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: T.inkMuted, marginBottom: 10 }}>Looking for</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {profile.looking_for.map((item) => (
                    <span key={item} style={{ background: T.parchment, border: `1px solid ${T.line}`, borderRadius: 999, padding: '5px 12px', fontSize: 13, color: T.inkSoft }}>
                      {item.replace(/-/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {!profile?.tradition && !profile?.background && !profile?.what_brought && (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontFamily: T.serif, fontSize: 18, color: T.ink, marginBottom: 16 }}>Nothing filled in yet.</div>
                <button onClick={onEditProfile} style={{ background: T.ink, color: T.cream, border: 'none', borderRadius: 999, padding: '10px 24px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Fill in your profile
                </button>
              </div>
            )}

          </div>
        )}

        {/* Saved tab */}
        {tab === 'saved' && (
          <div style={{ padding: '0 14px', maxWidth: 620, margin: '0 auto' }}>
            {!savedLoaded ? (
              <div style={{ padding: 40, textAlign: 'center', color: T.inkMuted, fontFamily: T.serif }}>Loading…</div>
            ) : savedPosts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 24px', background: T.white, borderRadius: 14, border: `1px solid ${T.line}` }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>🔖</div>
                <div style={{ fontFamily: T.display, fontSize: 17, fontWeight: 600, color: T.ink, marginBottom: 8 }}>No private saves yet.</div>
                <div style={{ fontSize: 13, color: T.inkMuted, lineHeight: 1.55 }}>
                  Tap the bookmark icon on any post to privately save it here. Only you can see this.
                </div>
              </div>
            ) : savedPosts.map((post) => (
              <Suspense key={post.id} fallback={null}>
                <PostCard
                  item={post}
                  authorProfile={post.authorProfile}
                  sessionUserId={session?.user?.id}
                  authorMap={{ [post.author_id]: post.authorProfile }}
                  isSaved
                  onSaveToggle={async (postId) => {
                    await supabase.from('saved_posts').delete().eq('user_id', session.user.id).eq('post_id', postId);
                    setSavedPosts((prev) => prev.filter((p) => p.id !== postId));
                  }}
                />
              </Suspense>
            ))}
          </div>
        )}
      </div>

      {/* ── Followers modal ────────────────────────────────────── */}
      {followersOpen && (
        <div
          onClick={() => setFollowersOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: T.white, borderRadius: 18, width: '100%', maxWidth: 400,
              maxHeight: '70vh', display: 'flex', flexDirection: 'column',
              boxShadow: '0 12px 40px rgba(0,0,0,0.18)', overflow: 'hidden',
            }}
          >
            <div style={{
              padding: '16px 20px', borderBottom: `1px solid ${T.line}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              fontFamily: T.display, fontSize: 17, fontWeight: 600, color: T.ink,
            }}>
              Followers
              <button onClick={() => setFollowersOpen(false)} style={{ background: 'none', border: 'none', color: T.inkMuted, fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {followersLoading && (
                <div style={{ padding: 32, textAlign: 'center', color: T.inkMuted, fontFamily: T.serif, fontSize: 14 }}>Loading…</div>
              )}
              {!followersLoading && followersList.length === 0 && (
                <div style={{ padding: '40px 24px', textAlign: 'center', color: T.inkMuted, fontFamily: T.serif, fontStyle: 'italic', fontSize: 14 }}>No followers yet.</div>
              )}
              {!followersLoading && followersList.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setFollowersOpen(false); onViewProfile?.(p.id); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 20px', background: 'none', border: 'none',
                    borderBottom: `1px solid ${T.line}`, cursor: 'pointer', textAlign: 'left',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = T.parchment}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                  <Avatar name={p.display_name} avatarConfig={p.avatar_config} photoUrl={p.avatar_url} size={38} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{p.display_name}</span>
                  <span style={{ marginLeft: 'auto', color: T.goldDark, fontSize: 14 }}>→</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
