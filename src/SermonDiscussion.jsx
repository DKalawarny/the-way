import { useEffect, useRef, useState } from 'react';
import { supabase } from './supabase.js';
import { T } from './theme.js';
import { BadgeList, presetForRole } from './Badge.jsx';
import { relativeTime } from './time.js';
import { useUiKit, EmptyState, TextButton } from './uikit.jsx';
import PostImageGrid from './PostImageGrid.jsx';
import { useImageDrafts, ImageDraftGrid, ImageAttachButton } from './imageAttach.jsx';
import { KinwoveStar } from './components/brand/KinwoveStar.jsx';
import { Avatar } from './ProfilePage.jsx';

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
export default function SermonDiscussion({ sermonContentId, sermonId, churchId, sessionUserId, isPastor, defaultOpen = false }) {
  const [rows, setRows]       = useState([]);
  const [profMap, setProfMap] = useState({});
  const [rolesMap, setRolesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [text, setText]       = useState('');
  const [anon, setAnon]       = useState(false);
  const [busy, setBusy]       = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [open, setOpen]       = useState(defaultOpen);
  const { showToast, askConfirm, ui: uikitUi } = useUiKit();
  const imageDrafts = useImageDrafts(4);
  const textareaRef = useRef(null);

  // Which anchor column to filter / insert against. The component is a no-op
  // if neither is provided, but that's a developer error — render nothing
  // rather than silently misbehaving.
  const anchorCol = sermonId ? 'sermon_id' : 'sermon_content_id';
  const anchorVal = sermonId ?? sermonContentId;

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
    if (!open) return;
    reload();
  }, [anchorCol, anchorVal, open]);

  // Focus the textarea whenever a reply target is set (or when the composer first mounts open)
  useEffect(() => {
    if (open) requestAnimationFrame(() => textareaRef.current?.focus());
  }, [replyTo, open]);

  async function submit() {
    if (!sessionUserId || !text.trim() || !anchorVal) return;
    setBusy(true);
    const image_urls = await imageDrafts.uploadAll(sessionUserId);
    // Set whichever anchor was supplied; leave the other null. The DB
    // CHECK constraint enforces the same invariant — exactly one set.
    const insertRow = {
      author_id:    sessionUserId,
      parent_id:    replyTo?.id ?? null,
      body:         text.trim(),
      is_anonymous: anon,
      sermon_id:         sermonId        ?? null,
      sermon_content_id: sermonContentId ?? null,
      image_urls,
    };
    const { error } = await supabase
      .from('sermon_discussions')
      .insert(insertRow);
    setBusy(false);
    if (error) { showToast(`Couldn't post: ${error.message}`, 'error'); return; }
    setText(''); setAnon(false); setReplyTo(null);
    imageDrafts.clear();
    // Reload so profMap gets populated for the new comment (prevents "Someone" name).
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

  const top      = rows.filter((r) => !r.parent_id);
  const repliesOf = (id) => rows.filter((r) => r.parent_id === id);
  const total    = rows.length;

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
    const isMine = row.author_id === sessionUserId;
    const canDelete = isMine || isPastor;
    const prof = profMap[row.author_id];
    const name = row.is_anonymous ? 'Anonymous' : (prof?.display_name || 'Someone');
    return (
      <div style={{ marginLeft: depth * 22, marginTop: 8 }}>
        <div style={{
          background: T.white, border: `1px solid ${T.line}`, borderRadius: 12,
          padding: '10px 12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
            {!row.is_anonymous && (
              <Avatar
                name={prof?.display_name}
                avatarConfig={prof?.avatar_config}
                photoUrl={prof?.avatar_url}
                size={30}
              />
            )}
            {row.is_anonymous && (
              <div style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                background: T.line, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, color: T.inkMuted, fontWeight: 700,
              }}>·</div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{name}</span>
            {!row.is_anonymous && rolesMap[row.author_id]?.length > 0 && (() => {
              const top = rolesMap[row.author_id][0];
              const label = top.role_label ?? presetForRole(top.role_key)?.label ?? top.role_key;
              return <span style={{ fontSize: 11, fontWeight: 700, color: T.goldDark }}>{label}</span>;
            })()}
            <span style={{ fontSize: 11.5, color: T.inkMuted }}>{relativeTime(row.created_at)}</span>
            <div style={{ flex: 1 }} />
            {canDelete && (
              <TextButton onClick={() => remove(row.id)} danger>delete</TextButton>
            )}
          </div>
          <div style={{ fontFamily: T.serif, fontSize: 14.5, color: T.ink, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
            {row.body}
          </div>
          {Array.isArray(row.image_urls) && row.image_urls.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <PostImageGrid urls={row.image_urls} />
            </div>
          )}
          <button onClick={() => setReplyTo(row)} style={{
            background: 'none', border: 'none', color: T.goldDark, fontSize: 12, cursor: 'pointer',
            marginTop: 4, padding: '6px 0', fontWeight: 600, minHeight: 28,
          }}>↳ Reply</button>
            </div>
          </div>
        </div>
        {repliesOf(row.id).map((r) => <Bubble key={r.id} row={r} depth={depth + 1} />)}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 10 }}>
      {uikitUi}
      {loading ? (
        <div style={{ color: T.inkMuted, fontFamily: T.serif, fontStyle: 'italic', fontSize: 13, padding: 8 }}>
          Loading discussion…
        </div>
      ) : top.length === 0 ? (
        <EmptyState
          glyph={<KinwoveStar size={22} />}
          title="No replies yet"
          body="Be the first to share a thought."
          dense
        />
      ) : (
        top.map((r) => <Bubble key={r.id} row={r} />)
      )}

      {/* Composer */}
      <div style={{ marginTop: 12, padding: '10px 12px', background: T.cream, borderRadius: 12, border: `1px solid ${T.line}` }}>
        {replyTo && (
          <div style={{
            fontSize: 12, color: T.inkMuted, marginBottom: 6,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            ↳ Replying to {replyTo.is_anonymous ? 'Anonymous' : (profMap[replyTo.author_id]?.display_name || 'someone')}
            <button onClick={() => setReplyTo(null)} style={{
              background: 'none', border: 'none', color: T.goldDark, cursor: 'pointer', fontSize: 12,
            }}>cancel</button>
          </div>
        )}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={replyTo ? 'Write a reply…' : 'Share a thought…'}
          rows={2}
          style={{
            width: '100%', boxSizing: 'border-box',
            border: `1px solid ${T.line}`, borderRadius: 10, padding: '9px 12px',
            fontSize: 14, fontFamily: T.serif, lineHeight: 1.55,
            background: T.white, color: T.ink, outline: 'none', resize: 'vertical',
          }}
        />
        <ImageDraftGrid drafts={imageDrafts.drafts} onRemove={imageDrafts.remove} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: T.inkSoft, cursor: 'pointer' }}>
            <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} style={{ accentColor: T.gold }} />
            Anonymously
          </label>
          <ImageAttachButton
            drafts={imageDrafts.drafts} max={imageDrafts.max}
            fileInputRef={imageDrafts.fileInputRef} onPick={imageDrafts.pick}
          />
          <div style={{ flex: 1 }} />
          <button
            onClick={submit}
            disabled={busy || !text.trim()}
            style={{
              background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
              padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              opacity: (busy || !text.trim()) ? 0.5 : 1,
            }}
          >{busy ? 'Posting…' : 'Post'}</button>
        </div>
      </div>
    </div>
  );
}
