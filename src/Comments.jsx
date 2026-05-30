import { useEffect, useRef, useState } from 'react';
import { Smile } from 'lucide-react';
import { supabase } from './supabase.js';
import { track } from './analytics.js';
import { T } from './theme.js';
import { presetForRole } from './Badge.jsx';
import { relativeTime } from './time.js';
import { useUiKit, TextButton } from './uikit.jsx';
import { codeToFlag } from './countries.js';
import { Avatar } from './ProfilePage.jsx';

const EMOJIS = [
  '😀','😊','😂','🥹','😍','🥰','😭','😅','🤔','😏','😌','🙃','😇','🤩','😬','🤯',
  '🙏','✝️','🕊️','🌿','🌸','🌺','🌻','☀️','🌙','⭐','🔥','💫','✨','🌈','🌊','🍃',
  '❤️','🧡','💛','💚','💙','💜','🤍','🫶','👏','🙌','💪','👍','🎉','🫂','💝','🎊',
];

/**
 * Facebook-style comments block — avatar + parchment bubble layout,
 * matching Community.jsx's modal comment style.
 * Only native posts (source === 'post') support comments today.
 */
export default function Comments({ item, sessionUserId, authorMap, rolesByUser, onCountChange, listOnly = false, refreshKey = 0 }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [text, setText]         = useState('');
  const [anon, setAnon]         = useState(false);
  const [busy, setBusy]         = useState(false);
  const [profMap, setProfMap]   = useState({});
  const [rolesMap, setRolesMap] = useState({});
  const [emojiOpen, setEmojiOpen] = useState(false);
  const inputRef = useRef(null);
  const { showToast, askConfirm, ui: uikitUi } = useUiKit();

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

  // Only church-scoped posts have role badges to show.
  const churchScopeId = item.scope === 'church' ? item.scope_id : null;

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', item.id)
        .order('created_at', { ascending: true });
      if (!active) return;
      const rows = data ?? [];
      setComments(rows);

      const ids = [...new Set(rows.filter((c) => !c.is_anonymous).map((c) => c.author_id))];
      const missing = ids.filter((id) => !authorMap?.[id]);
      let extra = {};
      if (missing.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, display_name, flags, show_flag, avatar_config, avatar_url')
          .in('id', missing);
        (profs ?? []).forEach((p) => { extra[p.id] = p; });
      }
      setProfMap({ ...(authorMap ?? {}), ...extra });

      // Load roles for any comment author not already in the parent's rolesByUser map
      if (churchScopeId && ids.length) {
        const missingRoles = ids.filter((id) => !rolesByUser?.[id]);
        let extraRoles = {};
        if (missingRoles.length) {
          const { data: roleRows } = await supabase
            .from('church_roles')
            .select('id, user_id, role_key, role_label')
            .eq('church_id', churchScopeId)
            .in('user_id', missingRoles);
          (roleRows ?? []).forEach((r) => {
            (extraRoles[r.user_id] ||= []).push(r);
          });
        }
        setRolesMap({ ...(rolesByUser ?? {}), ...extraRoles });
      } else {
        setRolesMap(rolesByUser ?? {});
      }

      setLoading(false);
    })();
    return () => { active = false; };
  }, [item.id, authorMap, rolesByUser, churchScopeId, refreshKey]);

  async function submit() {
    if (!sessionUserId || !text.trim()) return;
    setBusy(true);
    const { data, error } = await supabase
      .from('post_comments')
      .insert({
        post_id: item.id,
        author_id: sessionUserId,
        body: text.trim(),
        is_anonymous: anon,
      })
      .select()
      .single();
    setBusy(false);
    if (error) { showToast(`Couldn't post: ${error.message}`, 'error'); return; }
    setComments((c) => [...c, data]);
    setText(''); setAnon(false);
    onCountChange?.(+1);
    track('comment_posted');
  }

  async function remove(id) {
    const ok = await askConfirm({
      title: 'Delete this comment?',
      body: "Once it's gone it can't be brought back.",
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    const { error } = await supabase.from('post_comments').delete().eq('id', id);
    if (error) { showToast(`Couldn't delete: ${error.message}`, 'error'); return; }
    setComments((c) => c.filter((x) => x.id !== id));
    onCountChange?.(-1);
  }

  // List-only mode: no input, used when PostCard pins the input below the modal scroll area
  if (listOnly) {
    return (
      <div>
        {uikitUi}
        {loading ? (
          <div style={{ color: T.inkMuted, fontFamily: T.serif, textAlign: 'center', padding: 16, fontSize: 13 }}>Loading…</div>
        ) : comments.length === 0 ? (
          <div style={{ color: T.inkMuted, fontStyle: 'italic', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>
            No comments yet — be the first.
          </div>
        ) : (
          <div style={{ marginBottom: 10 }}>
            {comments.map((c) => {
              const isMine = c.author_id === sessionUserId;
              const prof   = c.is_anonymous ? null : profMap?.[c.author_id];
              const name   = c.is_anonymous ? 'Anonymous' : (prof?.display_name ?? 'Someone');
              return (
                <div key={c.id} style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'flex-start' }}>
                  <Avatar name={c.is_anonymous ? null : name} avatarConfig={c.is_anonymous ? null : prof?.avatar_config} photoUrl={c.is_anonymous ? null : prof?.avatar_url} size={34} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ background: T.parchment, borderRadius: 16, padding: '9px 13px' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 2 }}>{name}</div>
                      <div style={{ fontFamily: T.serif, fontSize: 14, color: T.inkSoft, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{c.body}</div>
                    </div>
                    <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 4, paddingLeft: 10, display: 'flex', gap: 10 }}>
                      <span>{relativeTime(c.created_at)}</span>
                      {isMine && <TextButton onClick={() => remove(c.id)} danger>delete</TextButton>}
                    </div>
                  </div>
                </div>
              );
            })}
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
      ) : comments.length === 0 ? (
        <div style={{ color: T.inkMuted, fontStyle: 'italic', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>
          No comments yet — be the first.
        </div>
      ) : (
        <div style={{ marginBottom: 10 }}>
          {comments.map((c) => {
            const isMine = c.author_id === sessionUserId;
            const prof   = c.is_anonymous ? null : profMap?.[c.author_id];
            const name   = c.is_anonymous ? 'Anonymous' : (prof?.display_name ?? 'Someone');

            return (
              <div key={c.id} style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'flex-start' }}>
                {/* Avatar */}
                <Avatar
                  name={c.is_anonymous ? null : name}
                  avatarConfig={c.is_anonymous ? null : prof?.avatar_config}
                  photoUrl={c.is_anonymous ? null : prof?.avatar_url}
                  size={34}
                  style={{ flexShrink: 0 }}
                />
                {/* Bubble + meta */}
                <div style={{ flex: 1 }}>
                  <div style={{ background: T.parchment, borderRadius: 16, padding: '9px 13px' }}>
                    {/* Name + role */}
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {name}
                      {!c.is_anonymous && prof?.show_flag && (prof?.flags ?? []).length > 0 && (
                        <span style={{ fontSize: 13, lineHeight: 1 }}>{codeToFlag(prof.flags[0])}</span>
                      )}
                      {!c.is_anonymous && rolesMap?.[c.author_id]?.length > 0 && (() => {
                        const top = rolesMap[c.author_id].find((r) => r.role_key !== 'owner');
                        if (!top) return null;
                        const label = top.role_label ?? presetForRole(top.role_key)?.label ?? top.role_key;
                        return <span style={{ fontSize: 11, fontWeight: 700, color: T.goldDark }}>{label}</span>;
                      })()}
                    </div>
                    {/* Body */}
                    <div style={{ fontFamily: T.serif, fontSize: 14, color: T.inkSoft, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                      {c.body}
                    </div>
                  </div>
                  {/* Timestamp + delete */}
                  <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 4, paddingLeft: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span>{relativeTime(c.created_at)}</span>
                    {isMine && (
                      <TextButton onClick={() => remove(c.id)} danger>delete</TextButton>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pill comment input */}
      <div style={{ position: 'relative', marginTop: 4 }}>
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
                  onMouseEnter={(el) => el.currentTarget.style.background = T.parchment}
                  onMouseLeave={(el) => el.currentTarget.style.background = 'none'}
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
            placeholder="Write a comment…"
            autoFocus
            style={{
              width: '100%', border: 'none', outline: 'none',
              fontFamily: T.serif, fontSize: 14, color: T.ink,
              background: 'transparent',
            }}
          />
        </div>

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
          <label style={{ fontSize: 12, color: T.inkSoft, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', marginLeft: 6 }}>
            <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} style={{ accentColor: T.gold }} />
            Anon
          </label>
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
