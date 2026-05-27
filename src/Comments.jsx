import { useEffect, useRef, useState } from 'react';
import { Smile } from 'lucide-react';
import { supabase } from './supabase.js';
import { T } from './theme.js';
import { BadgeList } from './Badge.jsx';
import { relativeTime } from './time.js';
import { useUiKit, TextButton } from './uikit.jsx';
import { codeToFlag } from './countries.js';

const EMOJIS = [
  '😀','😊','😂','🥹','😍','🥰','😭','😅','🤔','😏','😌','🙃','😇','🤩','😬','🤯',
  '🙏','✝️','🕊️','🌿','🌸','🌺','🌻','☀️','🌙','⭐','🔥','💫','✨','🌈','🌊','🍃',
  '❤️','🧡','💛','💚','💙','💜','🤍','🫶','👏','🙌','💪','👍','🎉','🫂','💝','🎊',
];

/**
 * Inline comments block — renders directly inside a PostCard, Facebook-style.
 * Only native posts (source === 'post') support comments today.
 */
export default function Comments({ item, sessionUserId, authorMap, rolesByUser, onCountChange }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [text, setText]         = useState('');
  const [anon, setAnon]         = useState(false);
  const [busy, setBusy]         = useState(false);
  const [profMap, setProfMap]   = useState({});
  const [rolesMap, setRolesMap] = useState({});
  const [emojiOpen, setEmojiOpen] = useState(false);
  const textareaRef = useRef(null);
  const { showToast, askConfirm, ui: uikitUi } = useUiKit();

  function insertEmoji(emoji) {
    const el = textareaRef.current;
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
          .select('id, display_name, flags, show_flag')
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
  }, [item.id, authorMap, rolesByUser, churchScopeId]);

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

  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.line}` }}>
      {uikitUi}

      {loading ? (
        <div style={{ color: T.inkMuted, fontFamily: T.serif, textAlign: 'center', padding: 16, fontSize: 13 }}>Loading…</div>
      ) : comments.length === 0 ? (
        <div style={{ color: T.inkMuted, fontFamily: T.serif, fontSize: 13, fontStyle: 'italic', padding: '6px 2px 10px' }}>
          No comments yet — be the first.
        </div>
      ) : (
        <div style={{ marginBottom: 10 }}>
          {comments.map((c) => {
            const isMine = c.author_id === sessionUserId;
            const name = c.is_anonymous ? 'Anonymous' : (profMap?.[c.author_id]?.display_name ?? 'Someone');
            return (
              <div key={c.id} style={{
                background: T.parchment, borderRadius: 12,
                padding: '8px 12px', marginBottom: 6,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{name}</span>
                  {!c.is_anonymous && profMap?.[c.author_id]?.show_flag && (profMap[c.author_id]?.flags ?? []).length > 0 && (
                    <span style={{ fontSize: 13, lineHeight: 1 }}>{codeToFlag(profMap[c.author_id].flags[0])}</span>
                  )}
                  {!c.is_anonymous && rolesMap?.[c.author_id]?.length > 0 && (
                    <BadgeList roles={rolesMap[c.author_id]} />
                  )}
                  <span style={{ fontSize: 11.5, color: T.inkMuted }}>{relativeTime(c.created_at)}</span>
                  <div style={{ flex: 1 }} />
                  {isMine && (
                    <TextButton onClick={() => remove(c.id)} danger>delete</TextButton>
                  )}
                </div>
                <div style={{ fontFamily: T.serif, fontSize: 14, lineHeight: 1.55, color: T.ink, whiteSpace: 'pre-wrap' }}>
                  {c.body}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Inline composer */}
      <div style={{ position: 'relative' }}>
        {emojiOpen && (
          <>
            <div onClick={() => setEmojiOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
            <div style={{
              position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, zIndex: 11,
              background: T.white, border: `1px solid ${T.line}`, borderRadius: 14,
              boxShadow: '0 8px 24px rgba(44,24,16,0.13)', padding: 10,
              display: 'grid', gridTemplateColumns: 'repeat(16, 1fr)', gap: 2,
              width: 'min(100%, 380px)',
            }}>
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => insertEmoji(e)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 20, lineHeight: 1, padding: '4px 2px', borderRadius: 6,
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(el) => el.currentTarget.style.background = T.parchment}
                  onMouseLeave={(el) => el.currentTarget.style.background = 'none'}
                >{e}</button>
              ))}
            </div>
          </>
        )}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && text.trim() && !busy) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Write a comment…"
          rows={2}
          autoFocus
          style={{
            width: '100%', boxSizing: 'border-box',
            border: `1px solid ${T.line}`, borderRadius: 10, padding: '8px 12px',
            fontSize: 14, fontFamily: T.serif, lineHeight: 1.55,
            background: T.white, color: T.ink, outline: 'none', resize: 'vertical',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: T.inkSoft, cursor: 'pointer' }}>
            <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} style={{ accentColor: T.gold }} />
            Anonymously
          </label>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => setEmojiOpen((v) => !v)}
            title="Add emoji"
            style={{
              border: `1px solid ${emojiOpen ? T.gold : T.line}`, borderRadius: 999,
              width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: emojiOpen ? T.goldDark : T.inkSoft,
              background: emojiOpen ? T.parchment : 'transparent',
            }}
          ><Smile size={16} strokeWidth={1.75} /></button>
          <button
            onClick={submit}
            disabled={busy || !text.trim()}
            style={{
              background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
              padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              opacity: (busy || !text.trim()) ? 0.5 : 1,
            }}
          >{busy ? 'Posting…' : 'Post'}</button>
        </div>
      </div>
    </div>
  );
}
