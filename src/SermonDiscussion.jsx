import { useEffect, useRef, useState } from 'react';
import { Smile } from 'lucide-react';
import { supabase } from './supabase.js';
import { T } from './theme.js';
import { presetForRole } from './Badge.jsx';
import { relativeTime, exactTime } from './time.js';
import { useUiKit, TextButton } from './uikit.jsx';
import PostImageGrid from './PostImageGrid.jsx';
import { useImageDrafts, ImageDraftGrid, ImageAttachButton } from './imageAttach.jsx';
import { KinwoveStar } from './components/brand/KinwoveStar.jsx';
import { Avatar } from './ProfilePage.jsx';
import { track } from './analytics.js';

const EMOJIS = [
  '😀','😊','😂','🥹','😍','🥰','😭','😅','🤔','😏','😌','🙃','😇','🤩','😬','🤯',
  '🙏','✝️','🕊️','🌿','🌸','🌺','🌻','☀️','🌙','⭐','🔥','💫','✨','🌈','🌊','🍃',
  '❤️','🧡','💛','💚','💙','💜','🤍','🫶','👏','🙌','💪','👍','🎉','🫂','💝','🎊',
];

/**
 * Threaded discussion anchored to either:
 *   - sermonContentId — the original "thread per question" surface
 *   - sermonId        — the FB-style "post + comments" thread under the
 *                       whole sermon (see scripts/2026-05-01-sermon-thread.sql)
 *
 * Exactly one anchor prop must be passed; a CHECK constraint enforces the
 * same on the DB side.
 *
 * defaultOpen=true skips the collapsed pill state and renders the thread
 * expanded immediately — used for the bottom-of-sermon thread where it's
 * the main attraction, not an aside.
 */
export default function SermonDiscussion({ sermonContentId, sermonId, churchId, sessionUserId, isPastor, defaultOpen = false, listOnly = false, refreshKey = 0 }) {
  const [rows, setRows]         = useState([]);
  const [profMap, setProfMap]   = useState({});
  const [rolesMap, setRolesMap] = useState({});
  const [loading, setLoading]   = useState(true);
  const [text, setText]         = useState('');
  const [anon, setAnon]         = useState(false);
  const [busy, setBusy]         = useState(false);
  const [replyTo, setReplyTo]   = useState(null);
  const [open, setOpen]         = useState(defaultOpen);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const { showToast, askConfirm, ui: uikitUi } = useUiKit();
  const imageDrafts = useImageDrafts(4);
  const inputRef = useRef(null);

  // Which anchor column to filter / insert against.
  const anchorCol = sermonId ? 'sermon_id' : 'sermon_content_id';
  const anchorVal = sermonId ?? sermonContentId;

  function insertEmoji(emoji) {
    const el = inputRef.current;
    if (!el) { setText((t) => t + emoji); setEmojiOpen(false); return; }
    const start = el.selectionStart;
    const end   = el.selectionEnd;
    const next  = text.slice(0, start) + emoji + text.slice(end);
    setText(next);
    setEmojiOpen(false);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + [...emoji].length;
      el.setSelectionRange(pos, pos);
    });
  }

  async function reload() {
    if (!anchorVal) return;
    setLoading(true);
    const { data } = await supabase
      .from('sermon_discussions')
      .select('*')
      .eq(anchorCol, anchorVal)
      .order('created_at', { ascending: true });
    const list = data ?? [];
    setRows(list);

    const ids = [...new Set(list.filter((r) => !r.is_anonymous).map((r) => r.author_id))];
    if (ids.length) {
      const [{ data: profs }, { data: roleRows }] = await Promise.all([
        supabase.from('profiles').select('id, display_name, avatar_config, avatar_url').in('id', ids),
        churchId
          ? supabase.from('church_roles')
              .select('id, user_id, role_key, role_label')
              .eq('church_id', churchId).in('user_id', ids)
          : Promise.resolve({ data: [] }),
      ]);
      const pm = {};
      (profs ?? []).forEach((p) => { pm[p.id] = p; });
      setProfMap(pm);
      const rm = {};
      (roleRows ?? []).forEach((r) => { (rm[r.user_id] ||= []).push(r); });
      setRolesMap(rm);
    } else {
      setProfMap({});
      setRolesMap({});
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!open && !listOnly) return;
    reload();
  }, [anchorCol, anchorVal, open, listOnly, refreshKey]);

  // Focus the input whenever a reply target is set (or when the composer first mounts open)
  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [replyTo, open]);

  async function submit() {
    if (!sessionUserId || !text.trim() || !anchorVal) return;
    setBusy(true);
    const image_urls = await imageDrafts.uploadAll(sessionUserId);
    const insertRow = {
      author_id:    sessionUserId,
      parent_id:    replyTo?.id ?? null,
      body:         text.trim(),
      is_anonymous: anon,
      sermon_id:         sermonId        ?? null,
      sermon_content_id: sermonContentId ?? null,
      image_urls,
    };
    const { error } = await supabase.from('sermon_discussions').insert(insertRow);
    setBusy(false);
    if (error) { showToast(`Couldn't post: ${error.message}`, 'error'); return; }
    setText(''); setAnon(false); setReplyTo(null);
    imageDrafts.clear();
    track('sermon_discussion_posted');
    reload();
  }

  async function remove(id) {
    const ok = await askConfirm({
      title: 'Delete this comment?',
      body: "Once it's gone it can't be brought back.",
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    const { error } = await supabase.from('sermon_discussions').delete().eq('id', id);
    if (error) { showToast(`Couldn't delete: ${error.message}`, 'error'); return; }
    setRows((r) => r.filter((x) => x.id !== id && x.parent_id !== id));
  }

  const top       = rows.filter((r) => !r.parent_id);
  const repliesOf = (id) => rows.filter((r) => r.parent_id === id);
  const total     = rows.length;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          background: 'transparent', border: `1px solid ${T.line}`, borderRadius: 999,
          padding: '7px 14px', fontSize: 12.5, color: T.inkSoft, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}
      >
        💬 {total > 0 ? `${total} ${total === 1 ? 'reply' : 'replies'}` : 'Start the discussion'}
      </button>
    );
  }

  function Bubble({ row, depth = 0 }) {
    const isMine    = row.author_id === sessionUserId;
    const canDelete = isMine || isPastor;
    const prof = profMap[row.author_id];
    const name = row.is_anonymous ? 'Anonymous' : (prof?.display_name || 'Someone');
    const children = repliesOf(row.id);

    return (
      <div style={{ marginLeft: depth * 20, marginTop: depth > 0 ? 10 : 0 }}>
        {/* FB-style: avatar on left, parchment bubble on right */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <Avatar
            name={row.is_anonymous ? null : name}
            avatarConfig={row.is_anonymous ? null : prof?.avatar_config}
            photoUrl={row.is_anonymous ? null : prof?.avatar_url}
            size={34}
            style={{ flexShrink: 0 }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ background: T.parchment, borderRadius: 16, padding: '9px 13px' }}>
              {/* Name + role badge */}
              <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {name}
                {!row.is_anonymous && rolesMap[row.author_id]?.length > 0 && (() => {
                  const topRole = rolesMap[row.author_id].find((r) => r.role_key !== 'owner');
                  if (!topRole) return null;
                  const label = topRole.role_label ?? presetForRole(topRole.role_key)?.label ?? topRole.role_key;
                  return <span style={{ fontSize: 11, fontWeight: 700, color: T.goldDark }}>{label}</span>;
                })()}
              </div>
              {/* Body */}
              <div style={{ fontFamily: T.serif, fontSize: 14, color: T.inkSoft, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                {row.body}
              </div>
              {Array.isArray(row.image_urls) && row.image_urls.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <PostImageGrid urls={row.image_urls} />
                </div>
              )}
            </div>
            {/* Timestamp + actions below bubble */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, paddingLeft: 10 }}>
              <span style={{ fontSize: 12, color: T.inkMuted }} title={exactTime(row.created_at)}>{relativeTime(row.created_at)}</span>
              <button
                onClick={() => setReplyTo(row)}
                style={{ background: 'none', border: 'none', color: T.goldDark, fontSize: 12, cursor: 'pointer', padding: 0, fontWeight: 600 }}
              >↳ Reply</button>
              {canDelete && (
                <TextButton onClick={() => remove(row.id)} danger>delete</TextButton>
              )}
            </div>
          </div>
        </div>
        {/* Nested replies */}
        {children.length > 0 && (
          <div style={{ marginTop: 10 }}>
            {children.map((r) => <Bubble key={r.id} row={r} depth={depth + 1} />)}
          </div>
        )}
      </div>
    );
  }

  // List-only mode: no composer, used when PostCard pins the input below the modal scroll area
  if (listOnly) {
    return (
      <div>
        {uikitUi}
        {loading ? (
          <div style={{ color: T.inkMuted, fontFamily: T.serif, textAlign: 'center', padding: 16, fontSize: 13 }}>Loading…</div>
        ) : top.length === 0 ? (
          <div style={{ color: T.inkMuted, fontStyle: 'italic', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>
            No comments yet — be the first.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 10 }}>
            {top.map((r) => <Bubble key={r.id} row={r} />)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {uikitUi}

      {loading ? (
        <div style={{ color: T.inkMuted, fontFamily: T.serif, textAlign: 'center', padding: 16, fontSize: 13 }}>Loading…</div>
      ) : top.length === 0 ? (
        <div style={{ color: T.inkMuted, fontStyle: 'italic', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>
          No comments yet — be the first.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 10 }}>
          {top.map((r) => <Bubble key={r.id} row={r} />)}
        </div>
      )}

      {/* Pill composer */}
      <div style={{ position: 'relative', marginTop: 4 }}>
        {replyTo && (
          <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            ↳ Replying to {replyTo.is_anonymous ? 'Anonymous' : (profMap[replyTo.author_id]?.display_name || 'someone')}
            <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', color: T.goldDark, cursor: 'pointer', fontSize: 12, padding: 0, fontWeight: 600 }}>cancel</button>
          </div>
        )}

        {emojiOpen && (
          <>
            <div onClick={() => setEmojiOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
            <div style={{
              position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, zIndex: 11,
              background: T.white, border: `1px solid ${T.line}`, borderRadius: 14,
              boxShadow: '0 8px 24px rgba(44,24,16,0.13)', padding: 10,
              display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 4,
              width: 'min(100%, 340px)',
            }}>
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => insertEmoji(e)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 20, lineHeight: 1, padding: '6px 2px', borderRadius: 6,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    minHeight: 40, transition: 'background 0.1s',
                  }}
                  onMouseEnter={(ev) => ev.currentTarget.style.background = T.parchment}
                  onMouseLeave={(ev) => ev.currentTarget.style.background = 'none'}
                >{e}</button>
              ))}
            </div>
          </>
        )}

        {/* Pill input */}
        <div style={{ background: T.parchment, borderRadius: 18, border: `1px solid ${T.line}`, padding: '9px 14px' }}>
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && text.trim() && !busy) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={replyTo ? 'Write a reply…' : 'Share a thought…'}
            autoFocus
            style={{
              width: '100%', border: 'none', outline: 'none',
              fontFamily: T.serif, fontSize: 14, color: T.ink,
              background: 'transparent',
            }}
          />
        </div>

        {/* Image previews above controls */}
        {imageDrafts.drafts.length > 0 && (
          <div style={{ marginTop: 6 }}>
            <ImageDraftGrid drafts={imageDrafts.drafts} onRemove={imageDrafts.remove} />
          </div>
        )}

        {/* Controls row */}
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 6, paddingLeft: 2, gap: 2 }}>
          <button
            onClick={() => setEmojiOpen((v) => !v)}
            title="Add emoji"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '4px 6px', borderRadius: 8,
              color: emojiOpen ? T.goldDark : T.inkSoft,
              display: 'flex', alignItems: 'center',
            }}
          >
            <Smile size={20} strokeWidth={1.75} />
          </button>
          <label style={{ fontSize: 12, color: T.inkSoft, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', marginLeft: 4 }}>
            <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} style={{ accentColor: T.gold }} />
            Anon
          </label>
          <ImageAttachButton
            drafts={imageDrafts.drafts} max={imageDrafts.max}
            fileInputRef={imageDrafts.fileInputRef} onPick={imageDrafts.pick}
            label="📷" showHint={false} compact
          />
          <div style={{ flex: 1 }} />
          {text.trim() && (
            <button
              onClick={submit}
              disabled={busy}
              style={{
                background: T.ink, border: 'none', borderRadius: '50%',
                width: 30, height: 30,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: T.cream, cursor: busy ? 'wait' : 'pointer', flexShrink: 0,
                opacity: busy ? 0.6 : 1,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5"/>
                <polyline points="5 12 12 5 19 12"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
