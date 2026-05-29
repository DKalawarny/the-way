import { useEffect, useState } from 'react';
import { Heart, Bookmark } from 'lucide-react';
import { supabase } from './supabase.js';
import { T } from './theme.js';
import { BadgeList, presetForRole } from './Badge.jsx';
import { Avatar } from './ProfilePage.jsx';
import { relativeTime } from './time.js';
import Comments from './Comments.jsx';
import SermonDiscussion from './SermonDiscussion.jsx';
import PostImageGrid from './PostImageGrid.jsx';
import { codeToFlag } from './countries.js';
import { useUiKit } from './uikit.jsx';
import { KinwoveStar } from './components/brand/KinwoveStar.jsx';

function renderWithMentions(text, mentions, onViewProfile, onViewChurch) {
  if (!mentions?.length || !text) return text;
  const parts = [];
  let remaining = text;
  // Match longer names first so "@John Smith" beats "@John"
  const sorted = [...mentions].sort((a, b) => b.name.length - a.name.length);
  for (const m of sorted) {
    const marker = `@${m.name}`;
    const idx = remaining.indexOf(marker);
    if (idx === -1) continue;
    if (idx > 0) parts.push(remaining.slice(0, idx));
    parts.push({ mention: m });
    remaining = remaining.slice(idx + marker.length);
  }
  if (remaining) parts.push(remaining);
  if (!parts.length) return text;
  return parts.map((p, i) =>
    typeof p === 'string' ? p :
    <span
      key={i}
      onClick={() => p.mention.type === 'user'
        ? onViewProfile?.(p.mention.id)
        : onViewChurch?.(p.mention.id)}
      style={{
        color: T.goldDark, fontWeight: 600,
        cursor: onViewProfile || onViewChurch ? 'pointer' : 'default',
        textDecoration: 'none',
      }}
    >@{p.mention.name}</span>
  );
}

const REACTIONS = [
  { id: 'amen',       emoji: '🙏', label: 'Amen' },
  { id: 'praying',    emoji: '🤲', label: 'Praying' },
  { id: 'heart',      emoji: null, Icon: Heart, label: 'Love' },
  { id: 'resonates',  emoji: '❤️', label: 'Resonates' },
  { id: 'same',       emoji: '💭', label: 'Same question' },
];

function ReactionButton({ kind, count, mine, onToggle }) {
  return (
    <button
      onClick={onToggle}
      title={kind.label}
      style={{
        background: 'none', border: 'none',
        color: mine ? T.goldDark : T.inkSoft,
        fontSize: 13, cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '6px 8px', transition: 'color 0.15s',
        fontFamily: T.sans,
      }}
      onMouseEnter={(e) => { if (!mine) e.currentTarget.style.color = T.ink; }}
      onMouseLeave={(e) => { if (!mine) e.currentTarget.style.color = T.inkSoft; }}
    >
      {kind.Icon ? <kind.Icon size={13} strokeWidth={mine ? 0 : 1.75} fill={mine ? T.goldDark : 'none'} /> : <span style={{ fontSize: 13 }}>{kind.emoji}</span>}
      <span>{kind.label}{count > 0 ? <span style={{ marginLeft: 3, opacity: 0.75 }}>{count}</span> : null}</span>
    </button>
  );
}

function formatEventTime(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

function PollBody({ item, sessionUserId }) {
  const options = item.body?.poll_options ?? [];
  const question = item.body?.text ?? '';
  const [votes, setVotes] = useState({});  // { [option_index]: count }
  const [myVote, setMyVote] = useState(null); // option_index | null
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('poll_votes')
        .select('option_index, user_id')
        .eq('post_id', item.id);
      if (!active) return;
      const counts = {};
      let mine = null;
      (data ?? []).forEach((v) => {
        counts[v.option_index] = (counts[v.option_index] ?? 0) + 1;
        if (v.user_id === sessionUserId) mine = v.option_index;
      });
      setVotes(counts);
      setMyVote(mine);
    })();
    return () => { active = false; };
  }, [item.id, sessionUserId]);

  const totalVotes = Object.values(votes).reduce((a, b) => a + b, 0);

  async function vote(idx) {
    if (!sessionUserId || voting) return;
    setVoting(true);
    if (myVote === idx) {
      // Un-vote
      await supabase.from('poll_votes').delete()
        .eq('post_id', item.id).eq('user_id', sessionUserId);
      setVotes((v) => ({ ...v, [idx]: Math.max(0, (v[idx] ?? 0) - 1) }));
      setMyVote(null);
    } else {
      if (myVote !== null) {
        // Remove old vote first
        await supabase.from('poll_votes').delete()
          .eq('post_id', item.id).eq('user_id', sessionUserId);
        setVotes((v) => ({ ...v, [myVote]: Math.max(0, (v[myVote] ?? 0) - 1) }));
      }
      const { error } = await supabase.from('poll_votes').insert({
        post_id: item.id, user_id: sessionUserId, option_index: idx,
      });
      if (!error) {
        setVotes((v) => ({ ...v, [idx]: (v[idx] ?? 0) + 1 }));
        setMyVote(idx);
      }
    }
    setVoting(false);
  }

  return (
    <div style={{ background: T.parchment, border: `1px solid ${T.goldLight}`, borderRadius: 12, padding: '12px 14px' }}>
      <div style={{ fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: question ? 8 : 10 }}>
        🗳 Poll
      </div>
      {question && (
        <div style={{ fontFamily: T.serif, fontSize: 15.5, fontWeight: 600, color: T.ink, lineHeight: 1.4, marginBottom: 12 }}>
          {question}
        </div>
      )}
      {options.map((opt, i) => {
        const count = votes[i] ?? 0;
        const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
        const isChosen = myVote === i;
        return (
          <button
            key={i}
            onClick={() => vote(i)}
            disabled={!sessionUserId || voting}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              background: 'transparent', border: 'none',
              cursor: sessionUserId ? 'pointer' : 'default',
              padding: '0 0 6px', marginBottom: 0,
            }}
          >
            <div style={{
              position: 'relative', borderRadius: 8, overflow: 'hidden',
              border: `1px solid ${isChosen ? T.goldDark : T.line}`,
              background: T.white,
            }}>
              <div style={{
                position: 'absolute', top: 0, left: 0, bottom: 0,
                width: `${pct}%`,
                background: isChosen ? 'rgba(184,115,58,0.18)' : 'rgba(184,115,58,0.07)',
                transition: 'width 0.4s ease',
              }} />
              <div style={{
                position: 'relative', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', padding: '8px 12px', gap: 8,
              }}>
                <span style={{ fontSize: 13.5, fontWeight: isChosen ? 600 : 400, color: T.ink }}>
                  {isChosen && <span style={{ color: T.goldDark, marginRight: 5 }}>✓</span>}
                  {opt}
                </span>
                <span style={{ fontSize: 12, color: T.inkMuted, flexShrink: 0 }}>{pct}%</span>
              </div>
            </div>
          </button>
        );
      })}
      <div style={{ fontSize: 11.5, color: T.inkMuted, marginTop: 6 }}>
        {totalVotes > 0
          ? `${totalVotes} ${totalVotes === 1 ? 'vote' : 'votes'}`
          : 'No votes yet'}
        {!sessionUserId && ' · Sign in to vote'}
      </div>
    </div>
  );
}

function bodyForKind(item, onViewProfile, onViewChurch, sessionUserId, onOpenSermon) {
  const b = item.body ?? {};
  // Mentions may live in body.mentions (feed_items jsonb merge) or body_data.mentions
  const mentions = b.mentions ?? item.body_data?.mentions ?? [];
  switch (item.kind) {
    case 'event': {
      const dateStr = b.event_date
        ? new Date(b.event_date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
        : null;
      const timeStr = formatEventTime(b.event_time);
      return (
        <div style={{ background: T.parchment, border: `1px solid ${T.goldLight}`, borderRadius: 12, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 6 }}>
            📅 Event
          </div>
          {(dateStr || timeStr) && (
            <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, marginBottom: 4 }}>
              {[dateStr, timeStr].filter(Boolean).join(' · ')}
            </div>
          )}
          {b.event_location && (
            <div style={{ fontSize: 13, color: T.inkSoft, marginBottom: b.text ? 8 : 0 }}>
              📍 {b.event_location}
            </div>
          )}
          {b.text && (
            <div style={{ fontFamily: T.serif, fontSize: 15, lineHeight: 1.65, color: T.ink, whiteSpace: 'pre-wrap', marginTop: 6 }}>
              {b.text}
            </div>
          )}
        </div>
      );
    }
    case 'poll':
      return <PollBody item={item} sessionUserId={sessionUserId} />;
    case 'announcement':
      return (
        <div style={{
          background: 'linear-gradient(180deg,rgba(184,115,58,0.08) 0%,rgba(184,115,58,0.03) 100%)',
          border: `1px solid ${T.gold}`, borderRadius: 12, padding: '12px 14px',
        }}>
          <div style={{ fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 8 }}>
            📢 Announcement
          </div>
          {b.scripture_ref && (
            <div style={{ fontSize: 13, color: T.goldDark, fontStyle: 'italic', marginBottom: 6 }}>
              {b.scripture_ref}
            </div>
          )}
          <div style={{ fontFamily: T.serif, fontSize: 15.5, lineHeight: 1.65, color: T.ink, whiteSpace: 'pre-wrap' }}>
            {b.text}
          </div>
        </div>
      );
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
    case 'sermon_item': {
      // New format (2026-05-27): question is the FIRST line (ends with ?),
      // followed by a blank line, then 2–3 sentences of context.
      // Legacy format (context first, question last) is handled by fallback.
      const rawText = b.text ?? '';
      const paras = rawText.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
      const firstPara = paras[0] ?? '';
      const isQuestionFirst = firstPara.endsWith('?');
      let question, contextLines;
      if (isQuestionFirst) {
        question = firstPara;
        contextLines = paras.slice(1);
      } else {
        // Legacy: question is the last non-empty line ending with ?
        const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
        const lastLine = lines[lines.length - 1] ?? '';
        question = lastLine.endsWith('?') ? lastLine : null;
        contextLines = question ? [lines.slice(0, -1).join(' ')] : [lines.join(' ')];
      }

      // Kids version gets a completely different, simpler layout
      if (b.item_kind === 'kid_version') {
        // Parse: retelling lines before "Questions to talk about:", then numbered questions
        const allLines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
        const splitIdx = allLines.findIndex((l) => /questions to talk about/i.test(l));
        const retelling = splitIdx > -1 ? allLines.slice(0, splitIdx) : allLines.slice(0, 2);
        const qs = splitIdx > -1 ? allLines.slice(splitIdx + 1) : [];
        return (
          <div style={{ background: T.parchment, border: `1px solid ${T.goldLight}`, borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 10.5, letterSpacing: 1.4, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 10 }}>
              🧒 For kids{b.sermon_title ? ` · ${b.sermon_title}` : ''}
            </div>
            <div style={{ fontFamily: T.serif, fontSize: 15, lineHeight: 1.65, color: T.inkSoft, marginBottom: 14 }}>
              {retelling.join(' ')}
            </div>
            {qs.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: T.inkMuted, marginBottom: 8 }}>
                  Questions to talk about
                </div>
                {qs.map((q, i) => (
                  <div key={i} style={{
                    fontFamily: T.serif, fontSize: 15.5, fontWeight: 600, color: T.ink,
                    lineHeight: 1.5, paddingLeft: 12, borderLeft: `3px solid ${T.gold}`,
                    marginBottom: i < qs.length - 1 ? 10 : 0,
                  }}>
                    {q.replace(/^\d+\.\s*/, '')}
                  </div>
                ))}
              </>
            )}
          </div>
        );
      }

      // Going deeper
      if (b.item_kind === 'going_deeper') {
        return (
          <div style={{ background: T.parchment, border: `1px solid ${T.goldLight}`, borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 10.5, letterSpacing: 1.4, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 10 }}>
              📖 Going deeper{b.sermon_title ? ` · ${b.sermon_title}` : ''}
            </div>
            <div style={{ fontFamily: T.serif, fontSize: 15, lineHeight: 1.75, color: T.ink, whiteSpace: 'pre-wrap' }}>
              {rawText}
            </div>
          </div>
        );
      }

      // Daily discussion — question leads
      return (
        <div style={{ background: T.parchment, border: `1px solid rgba(184,115,58,0.28)`, borderRadius: 12, padding: '14px 16px' }}>
          {/* Eyebrow: Day number is the key info; sermon title is secondary context */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: T.goldDark }}>
              💬 {b.day != null ? `Day ${b.day}` : 'Discussion'}
            </span>
            {b.sermon_title && (
              <span style={{ fontSize: 11, color: T.inkMuted }}>· {b.sermon_title}</span>
            )}
          </div>
          {/* Question — the hero */}
          {question && (
            <div style={{
              fontFamily: T.serif, fontSize: 17, fontWeight: 600, lineHeight: 1.5,
              letterSpacing: '-0.02em',
              color: T.ink, marginBottom: contextLines.length ? 12 : 0,
            }}>
              {question}
            </div>
          )}
          {/* Topic label — small, beneath the question */}
          {b.scripture && (
            <div style={{ fontSize: 11.5, color: T.goldDark, fontStyle: 'italic', marginBottom: contextLines.length ? 8 : 0 }}>
              {b.scripture}
            </div>
          )}
          {/* Context — supporting material */}
          {contextLines.length > 0 && (
            <div style={{ fontFamily: T.serif, fontSize: 14.5, lineHeight: 1.7, color: T.inkSoft }}>
              {contextLines.join('\n\n')}
            </div>
          )}
        </div>
      );
    }
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
          <div style={{
            fontFamily: T.display, fontSize: 17, lineHeight: 1.55, color: T.ink,
            whiteSpace: 'pre-wrap', overflowWrap: 'break-word', wordBreak: 'break-word',
            letterSpacing: '-0.01em', fontVariationSettings: '"opsz" 18',
          }}>
            {renderWithMentions(b.text, mentions, onViewProfile, onViewChurch)}
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
  onDeleted,
  commentCount = 0,
  defaultCommentsOpen = false,
  onViewProfile,
  onViewChurch,
  onPickWalk,
  isSaved = false,
  onSaveToggle,
  isPastor = false,
}) {
  const [reactions, setReactions] = useState({}); // { amen: 4, praying: 2, heart: 1 }
  const [mine, setMine]           = useState({}); // { amen: true }
  const [viewCount, setViewCount] = useState(item.view_count ?? 0);
  const [commentsOpen, setCommentsOpen] = useState(defaultCommentsOpen);
  const [localCommentCount, setLocalCommentCount] = useState(commentCount);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hiddenLocally, setHiddenLocally] = useState(false);
  const [hideBusy, setHideBusy] = useState(false);
  const [localVisibility, setLocalVisibility] = useState(item.visibility ?? 'public');
  const [visBusy, setVisBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [editBusy, setEditBusy] = useState(false);
  const [localBodyText, setLocalBodyText] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deletedLocally, setDeletedLocally] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportType, setReportType] = useState('');
  const [reportNote, setReportNote] = useState('');
  const [reportBusy, setReportBusy] = useState(false);
  const [reportDone, setReportDone] = useState(false);

  const { showToast, ui: postCardUi } = useUiKit();

  const isSermonAnnouncement = item.source === 'post' && !!item.body?.is_sermon_announcement;
  const isPostLike = item.source === 'post' || item.source === 'sermon_item';
  const isOwn = !!sessionUserId && item.author_id === sessionUserId && isPostLike;
  const canModerate = isPastor && !isOwn && isPostLike;
  const canHideFromProfile = isOwn && item.scope === 'church' && !isSermonAnnouncement;
  const canChangeVisibility = isOwn && !isSermonAnnouncement;
  const canEdit = isOwn && !isSermonAnnouncement;
  const canDelete = (isOwn || canModerate) && !isSermonAnnouncement;

  async function toggleHideFromProfile() {
    if (!canHideFromProfile || hideBusy) return;
    setHideBusy(true);
    const next = !item.hide_from_profile && !hiddenLocally;
    const { error } = await supabase
      .from('posts')
      .update({ hide_from_profile: next })
      .eq('id', item.id);
    setHideBusy(false);
    setMenuOpen(false);
    if (error) { showToast("Couldn't update post. Try again.", 'error'); return; }
    setHiddenLocally(next);
  }

  async function changeVisibility(next) {
    if (!canChangeVisibility || visBusy || next === localVisibility) { setMenuOpen(false); return; }
    setVisBusy(true);
    const { error } = await supabase
      .from('posts')
      .update({ visibility: next })
      .eq('id', item.id);
    setVisBusy(false);
    setMenuOpen(false);
    if (error) { showToast("Couldn't change visibility. Try again.", 'error'); return; }
    setLocalVisibility(next);
  }

  function startEdit() {
    setEditText(localBodyText ?? item.body?.text ?? '');
    setEditing(true);
    setMenuOpen(false);
  }

  async function saveEdit() {
    if (!canEdit || editBusy) return;
    const next = editText.trim();
    if (!next) return;
    setEditBusy(true);
    const { error } = await supabase
      .from('posts')
      .update({ body: next })
      .eq('id', item.id);
    setEditBusy(false);
    if (error) { showToast("Couldn't save edit. Try again.", 'error'); return; }
    setLocalBodyText(next);
    setEditing(false);
  }

  async function deletePost() {
    if (!canDelete || deleteBusy) return;
    setDeleteBusy(true);
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', item.id);
    setDeleteBusy(false);
    setConfirmingDelete(false);
    setMenuOpen(false);
    if (error) { showToast("Couldn't delete post. Try again.", 'error'); return; }
    setDeletedLocally(true);
    onDeleted?.(item.id);
  }

  async function submitReport() {
    if (!sessionUserId || !reportType || reportBusy) return;
    setReportBusy(true);
    const { error } = await supabase.from('post_reports').insert({
      reporter_id: sessionUserId,
      post_id: item.id,
      type: reportType,
      note: reportNote.trim() || null,
    });
    setReportBusy(false);
    if (error) { showToast("Couldn't submit report. Try again.", 'error'); return; }
    setReportDone(true);
  }

  const VIS_META = {
    public:  { emoji: '🌐', label: 'Public' },
    church:  { emoji: '🏛️', label: 'Church' },
    private: { emoji: '🔒', label: 'Only me' },
  };
  const visMeta = VIS_META[localVisibility] ?? VIS_META.public;

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

  // Record a view once per user per post (deduplicated in DB via primary key)
  useEffect(() => {
    if (item.source !== 'post' || !sessionUserId) return;
    supabase.rpc('record_post_view', { p_post_id: item.id, p_viewer_id: sessionUserId })
      .then(() => setViewCount((c) => c + 1));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

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

  // Byline — person is always primary; church goes in the subline as context
  const showAsChurch = item.scope === 'church' && churchInfo;
  let displayName, avatarLabel;
  if (item.is_anonymous) {
    displayName = 'Anonymous'; avatarLabel = '·';
  } else {
    displayName = authorProfile?.display_name ?? 'Someone';
    avatarLabel = (displayName[0] ?? '·').toUpperCase();
  }

  if (deletedLocally) return null;

  const effectiveItem = localBodyText !== null
    ? { ...item, body: { ...(item.body ?? {}), text: localBodyText } }
    : item;

  return (
    <div style={{
      background: T.parchment, border: `1px solid ${T.line}`, borderRadius: 14,
      padding: '18px 20px', marginBottom: 14,
      opacity: hiddenLocally ? 0.55 : 1,
    }}>
      {postCardUi}
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        {/* Avatar — clickable to view profile */}
        <div
          onClick={() => !item.is_anonymous && onViewProfile?.(item.author_id)}
          style={{ cursor: (!item.is_anonymous && onViewProfile) ? 'pointer' : 'default', flexShrink: 0, lineHeight: 0 }}
        >
          <Avatar
            name={item.is_anonymous ? null : (authorProfile?.display_name ?? displayName)}
            avatarConfig={item.is_anonymous ? null : authorProfile?.avatar_config}
            photoUrl={item.is_anonymous ? null : authorProfile?.avatar_url}
            size={36}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span
              onClick={() => !item.is_anonymous && onViewProfile?.(item.author_id)}
              style={{
                fontSize: 14, fontWeight: 600, color: T.ink, lineHeight: 1.2,
                cursor: (!item.is_anonymous && onViewProfile) ? 'pointer' : 'default',
              }}
            >
              {displayName}
            </span>
            {!item.is_anonymous && authorProfile?.show_flag && (authorProfile?.flags ?? []).length > 0 && (
              <span style={{ fontSize: 14, lineHeight: 1 }}>{codeToFlag(authorProfile.flags[0])}</span>
            )}
          </div>
          <div style={{ fontSize: 11.5, color: T.inkMuted }}>
            {/* Role title inline — shows the top role as readable text */}
            {!item.is_anonymous && authorRoles && authorRoles.length > 0 && (() => {
              const top = authorRoles.find((r) => r.role_key !== 'owner');
              if (!top) return null;
              const label = top.role_label ?? presetForRole(top.role_key)?.label ?? top.role_key;
              return <span style={{ color: T.goldDark, fontWeight: 600, marginRight: 4 }}>{label} · </span>;
            })()}
            {relativeTime(item.created_at)}
            {item.scope === 'church' && churchInfo?.name && <> · in {churchInfo.name}</>}
            {item.source === 'post' && localVisibility !== 'public' && ` · ${visMeta.emoji} ${visMeta.label}`}
            {hiddenLocally && ' · hidden from your profile'}
            {!item.is_anonymous && (authorProfile?.flags ?? []).length > 0 && (
              <span style={{ marginLeft: 6, fontSize: 13 }}>
                {(authorProfile.flags).map(codeToFlag).join(' ')}
              </span>
            )}
          </div>
        </div>
        {(canHideFromProfile || canChangeVisibility || canEdit || canDelete || (!isOwn && !!sessionUserId && isPostLike)) && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
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
                    minWidth: 220, zIndex: 100, overflow: 'hidden',
                  }}
                >
                  {canChangeVisibility && (
                    <>
                      <div style={{
                        padding: '8px 14px 4px', fontSize: 11, fontWeight: 600,
                        color: T.inkMuted, textTransform: 'uppercase', letterSpacing: 1,
                      }}>Audience</div>
                      {['public', 'church', 'private'].map((v) => (
                        <button
                          key={v}
                          onClick={() => changeVisibility(v)}
                          disabled={visBusy}
                          style={{
                            width: '100%', textAlign: 'left', background: 'none', border: 'none',
                            padding: '8px 14px', fontSize: 13, color: T.ink,
                            cursor: visBusy ? 'wait' : 'pointer',
                            display: 'flex', alignItems: 'center', gap: 8,
                            fontWeight: localVisibility === v ? 600 : 400,
                          }}
                        >
                          <span>{VIS_META[v].emoji}</span>
                          <span>{VIS_META[v].label}</span>
                          {localVisibility === v && (
                            <span style={{ marginLeft: 'auto', color: T.goldDark }}>✓</span>
                          )}
                        </button>
                      ))}
                    </>
                  )}
                  {canHideFromProfile && (
                    <>
                      {canChangeVisibility && <div style={{ borderTop: `1px solid ${T.line}`, margin: '4px 0' }} />}
                      <button
                        onClick={toggleHideFromProfile}
                        disabled={hideBusy}
                        style={{
                          width: '100%', textAlign: 'left', background: 'none', border: 'none',
                          padding: '10px 14px', fontSize: 13, color: T.ink,
                          cursor: hideBusy ? 'wait' : 'pointer',
                        }}
                      >
                        {hiddenLocally || item.hide_from_profile ? 'Show on my profile' : 'Hide from my profile'}
                      </button>
                    </>
                  )}
                  {canEdit && (
                    <>
                      {(canChangeVisibility || canHideFromProfile) && <div style={{ borderTop: `1px solid ${T.line}`, margin: '4px 0' }} />}
                      <button
                        onClick={startEdit}
                        style={{
                          width: '100%', textAlign: 'left', background: 'none', border: 'none',
                          padding: '10px 14px', fontSize: 13, color: T.ink, cursor: 'pointer',
                        }}
                      >
                        Edit post
                      </button>
                    </>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => { setMenuOpen(false); setConfirmingDelete(true); }}
                      style={{
                        width: '100%', textAlign: 'left', background: 'none', border: 'none',
                        padding: '10px 14px', fontSize: 13, color: T.error ?? '#A53F2B', cursor: 'pointer',
                      }}
                    >
                      {canModerate ? 'Remove from church' : 'Delete post'}
                    </button>
                  )}
                  {!isOwn && !canModerate && !!sessionUserId && isPostLike && (
                    <button
                      onClick={() => { setMenuOpen(false); setReportOpen(true); }}
                      style={{
                        width: '100%', textAlign: 'left', background: 'none', border: 'none',
                        padding: '10px 14px', fontSize: 13, color: T.error ?? '#A53F2B', cursor: 'pointer',
                      }}
                    >
                      🚩 Report post
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ marginBottom: 10 }}>
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
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                onClick={() => setEditing(false)}
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
        ) : effectiveItem.source === 'post' && effectiveItem.body?.is_sermon_announcement && effectiveItem.body?.sermon_id ? (
          <div style={{
            background: T.parchment, border: `1px solid ${T.goldLight}`, borderRadius: 12,
            padding: '12px 14px',
          }}>
            <div style={{ fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center' }}>
              <KinwoveStar size={12} style={{ verticalAlign: 'middle', marginRight: 5, flexShrink: 0 }} /> This week's sermon
            </div>
            <div style={{ fontFamily: T.serif, fontSize: 17, fontWeight: 600, color: T.ink, lineHeight: 1.3, marginBottom: 4 }}>
              {effectiveItem.body.sermon_title ?? effectiveItem.body.text}
            </div>
            {effectiveItem.body.scripture_ref && (
              <div style={{ fontSize: 13, color: T.goldDark, fontStyle: 'italic', marginBottom: 6 }}>
                {effectiveItem.body.scripture_ref}
              </div>
            )}
            {onOpenSermon && (
              <button
                onClick={() => onOpenSermon(effectiveItem.body.sermon_id)}
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
          bodyForKind(effectiveItem, onViewProfile, onViewChurch, sessionUserId, onOpenSermon)
        )}
        {!editing && <PostImageGrid urls={effectiveItem.body?.image_urls} />}

        {/* Walk announcement card — body_data is merged into body by feed_items view */}
        {!editing && (effectiveItem.body?.is_walk_announcement || effectiveItem.body?.walk_id) && (
          <div style={{
            marginTop: 12,
            background: T.parchment,
            border: `1px solid rgba(184,115,58,0.28)`,
            borderRadius: 12,
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}>
            <div>
              <div style={{ fontSize: 10.5, letterSpacing: 1.4, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 5 }}>
                🚶 New Walk
              </div>
              <div style={{ fontFamily: T.serif, fontSize: 16, fontWeight: 600, color: T.ink, lineHeight: 1.3 }}>
                {effectiveItem.body.walk_emoji} {effectiveItem.body.walk_title}
              </div>
            </div>
            {onPickWalk && (
              <button
                onClick={() => onPickWalk(effectiveItem.body.walk_id)}
                style={{
                  flexShrink: 0,
                  background: T.ink, color: T.cream, border: 'none',
                  borderRadius: 999, padding: '8px 14px',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                View →
              </button>
            )}
          </div>
        )}
      </div>

      {confirmingDelete && (
        <div
          onClick={() => !deleteBusy && setConfirmingDelete(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
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
                  style={{
                    marginTop: 16, width: '100%', background: T.ink, color: T.cream, border: 'none',
                    borderRadius: 999, padding: '9px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}
                >Done</button>
              </>
            ) : (
              <>
                <div style={{ fontFamily: T.serif, fontSize: 18, fontWeight: 700, color: T.ink, marginBottom: 8 }}>
                  Report post
                </div>
                <div style={{ fontSize: 13.5, color: T.inkSoft, lineHeight: 1.55, marginBottom: 14 }}>
                  Why are you reporting this?
                </div>
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
                      border: `1px solid ${reportType === opt.id ? T.gold : T.line}`,
                      borderRadius: 8, padding: '9px 12px', marginBottom: 6,
                      fontSize: 13, color: T.ink, cursor: 'pointer',
                    }}
                  >
                    <span style={{
                      width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                      border: `2px solid ${reportType === opt.id ? T.goldDark : T.line}`,
                      background: reportType === opt.id ? T.goldDark : 'transparent',
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
                    style={{
                      background: 'transparent', border: `1px solid ${T.line}`, borderRadius: 999,
                      padding: '8px 16px', fontSize: 13, color: T.inkSoft, cursor: 'pointer',
                    }}
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

      {/* Reactions + comments row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 8, borderTop: `1px solid ${T.line}`, flexWrap: 'wrap' }}>
        {isPostLike && REACTIONS.map((r) => (
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
        {isPostLike && viewCount > 0 && (
          <span style={{ fontSize: 11.5, color: T.inkMuted, marginLeft: 2 }}>
            {viewCount.toLocaleString()} {viewCount === 1 ? 'view' : 'views'}
          </span>
        )}
        <div style={{ flex: 1 }} />
        {isPostLike && (
          <button
            onClick={() => setCommentsOpen((v) => !v)}
            style={{
              background: 'none', border: 'none',
              color: commentsOpen ? T.goldDark : T.inkSoft,
              fontSize: 13, cursor: 'pointer', padding: '6px 8px',
              display: 'inline-flex', alignItems: 'center', gap: 5,
              transition: 'color 0.15s', fontFamily: T.sans,
            }}
            onMouseEnter={(e) => { if (!commentsOpen) e.currentTarget.style.color = T.ink; }}
            onMouseLeave={(e) => { if (!commentsOpen) e.currentTarget.style.color = T.inkSoft; }}
          >
            💬 Comment{localCommentCount > 0 ? <span style={{ marginLeft: 3, opacity: 0.75 }}>{localCommentCount}</span> : null}
          </button>
        )}
        {isPostLike && onSaveToggle && !!sessionUserId && (
          <button
            onClick={() => onSaveToggle(item.id, isSaved)}
            title={isSaved ? 'Remove private save' : 'Private save'}
            style={{
              background: 'none', border: 'none',
              color: isSaved ? T.goldDark : T.inkMuted,
              cursor: 'pointer', padding: '6px 8px',
              display: 'flex', alignItems: 'center',
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => { if (!isSaved) e.currentTarget.style.color = T.ink; }}
            onMouseLeave={(e) => { if (!isSaved) e.currentTarget.style.color = T.inkMuted; }}
          >
            <Bookmark size={15} strokeWidth={2} fill={isSaved ? T.goldDark : 'none'} />
          </button>
        )}
      </div>

      {/* FB-style comment modal */}
      {isPostLike && commentsOpen && (
        <div
          onClick={() => setCommentsOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: T.white, borderRadius: 18, width: '100%', maxWidth: 580,
              maxHeight: '85vh', display: 'flex', flexDirection: 'column',
              boxShadow: '0 12px 48px rgba(0,0,0,0.22)',
              overflow: 'hidden',
            }}
          >
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: `1px solid ${T.line}` }}>
              <span style={{ fontFamily: T.serif, fontWeight: 600, fontSize: 15, color: T.ink }}>
                {displayName}'s post
              </span>
              <button onClick={() => setCommentsOpen(false)} style={{ background: 'none', border: 'none', fontSize: 20, color: T.inkMuted, cursor: 'pointer', lineHeight: 1, padding: 4 }}>×</button>
            </div>
            {/* Scrollable body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>
              {/* Post body preview */}
              <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: `1px solid ${T.line}` }}>
                {bodyForKind(effectiveItem, onViewProfile, onViewChurch, sessionUserId, onOpenSermon)}
              </div>
              {/* Thread */}
              {item.source === 'sermon_item'
                ? <SermonDiscussion
                    sermonContentId={item.id}
                    churchId={item.scope_id}
                    sessionUserId={sessionUserId}
                    isPastor={isPastor}
                    defaultOpen
                  />
                : <Comments
                    item={item}
                    sessionUserId={sessionUserId}
                    authorMap={authorMap}
                    rolesByUser={rolesByUser}
                    onCountChange={(delta) => setLocalCommentCount((n) => Math.max(0, n + delta))}
                  />
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
