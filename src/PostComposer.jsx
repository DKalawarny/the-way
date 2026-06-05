import { useEffect, useRef, useState } from 'react';
import { Camera, Lock, Globe, Building2, X, ChevronDown, Smile, Plus, Trash2 } from 'lucide-react';
import { supabase, uploadPostImage } from './supabase.js';
import { T } from './theme.js';
import { track } from './analytics.js';
import MentionInput from './MentionInput.jsx';
import { Avatar } from './ProfilePage.jsx';
import { KinwoveStar } from './components/brand/KinwoveStar.jsx';
import { cleanText } from './moderation.js';

const MAX_IMAGES_PER_POST = 4;

export const VISIBILITY_OPTIONS = [
  { id: 'public',  label: 'Public',   Icon: Globe,     desc: 'Anyone on kinwove can see this' },
  { id: 'church',  label: 'Church',   Icon: Building2, desc: 'Only members of your church' },
  { id: 'private', label: 'Only me',  Icon: Lock,      desc: 'A private note — only you can see it' },
];

const inputCss = {
  width: '100%', boxSizing: 'border-box',
  border: `1px solid ${T.line}`, borderRadius: 10, padding: '10px 12px',
  fontSize: 14.5, fontFamily: 'inherit', background: T.cream, color: T.ink, outline: 'none',
};

function ToolBtn({ active, onClick, children, title, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        background: active ? 'rgba(184,115,58,0.14)' : T.cream,
        border: `1px solid ${active ? T.gold : T.line}`,
        borderRadius: 999, padding: '6px 10px', fontSize: 12.5,
        color: active ? T.goldDark : T.inkSoft,
        fontWeight: active ? 600 : 400,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        whiteSpace: 'nowrap',
      }}
    >{children}</button>
  );
}

/**
 * Unified composer for the public.posts table.
 * scope:     'me' | 'church' | 'group'
 * scopeId:   required for church / group
 * isPastor:  unlocks the Announcement type
 */
export default function PostComposer({
  session, scope = 'me', scopeId = null, placeholder,
  onPosted, profile, inModal = false, onCancel,
  bare = false, defaultMilestone = false, isPastor = false,
}) {
  const [open, setOpen]       = useState(inModal);
  const [text, setText]       = useState('');
  const [scriptureRef, setScriptureRef] = useState('');
  const [anon, setAnon]       = useState(false);
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState(null);
  const [personType, setPersonType] = useState(profile?.person_type ?? null);
  const [visibility, setVisibility] = useState('public');
  const [audienceMenuOpen, setAudienceMenuOpen] = useState(false);
  const [imageDrafts, setImageDrafts] = useState([]);
  const [mentions, setMentions] = useState([]);
  const [emojiOpen, setEmojiOpen] = useState(false);

  // Post kind — mutually exclusive type selector
  // 'text' | 'milestone' | 'event' | 'poll' | 'announcement'
  const [postKind, setPostKind] = useState(defaultMilestone ? 'milestone' : 'text');

  // Event-specific fields
  const [eventDate, setEventDate]         = useState('');
  const [eventTime, setEventTime]         = useState('');
  const [eventLocation, setEventLocation] = useState('');

  // Poll-specific fields (2–6 options)
  const [pollOptions, setPollOptions] = useState(['', '']);

  const fileInputRef = useRef(null);

  const isChurchScope = scope === 'church';

  const EMOJIS = [
    '😀','😊','😂','🥹','😍','🥰','😭','😅','🤔','😏','😌','🙃','😇','🤩','😬','🤯',
    '🙏','✝️','🕊️','🌿','🌸','🌺','🌻','☀️','🌙','⭐','🔥','💫','✨','🌈','🌊','🍃',
    '❤️','🧡','💛','💚','💙','💜','🤍','🫶','👏','🙌','💪','👍','🎉','🫂','💝','🎊',
  ];

  function insertEmoji(emoji) { setText((t) => t + emoji); setEmojiOpen(false); }

  useEffect(() => {
    if (profile?.person_type) { setPersonType(profile.person_type); return; }
    if (!session?.user?.id) return;
    let cancelled = false;
    supabase.from('profiles').select('person_type').eq('id', session.user.id).maybeSingle()
      .then(({ data }) => { if (!cancelled) setPersonType(data?.person_type ?? null); });
    return () => { cancelled = true; };
  }, [profile?.person_type, session?.user?.id]);

  function reset() {
    setText(''); setScriptureRef(''); setAnon(false); setError(null);
    setVisibility('public'); setAudienceMenuOpen(false);
    setPostKind(defaultMilestone ? 'milestone' : 'text');
    setEventDate(''); setEventTime(''); setEventLocation('');
    setPollOptions(['', '']);
    imageDrafts.forEach((d) => URL.revokeObjectURL(d.previewUrl));
    setImageDrafts([]); setMentions([]);
  }

  function toggleKind(kind) {
    setPostKind((k) => k === kind ? 'text' : kind);
  }

  function pickImages(eventFiles) {
    const incoming = Array.from(eventFiles ?? []);
    if (!incoming.length) return;
    const slotsLeft = MAX_IMAGES_PER_POST - imageDrafts.length;
    if (slotsLeft <= 0) { setError(`Up to ${MAX_IMAGES_PER_POST} images per post.`); return; }
    const accepted = incoming.slice(0, slotsLeft).filter((f) => f.type.startsWith('image/'));
    if (!accepted.length) return;
    setImageDrafts((prev) => [...prev, ...accepted.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }))]);
    setError(null);
  }

  function removeImageDraft(idx) {
    setImageDrafts((prev) => {
      const next = prev.slice();
      const [removed] = next.splice(idx, 1);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return next;
    });
  }

  function updatePollOption(idx, val) {
    setPollOptions((prev) => { const next = [...prev]; next[idx] = val; return next; });
  }
  function removePollOption(idx) {
    setPollOptions((prev) => prev.filter((_, i) => i !== idx));
  }

  async function submit() {
    if (!session?.user?.id) { setError('Sign in first.'); return; }

    // Validation per kind
    if (postKind === 'poll') {
      const filled = pollOptions.filter((o) => o.trim());
      if (filled.length < 2) { setError('Add at least 2 poll options.'); return; }
    } else {
      if (!text.trim() && imageDrafts.length === 0) { setError('Say something first.'); return; }
    }

    setBusy(true); setError(null);

    let imageUrls = [];
    try {
      for (const draft of imageDrafts) {
        imageUrls.push(await uploadPostImage(draft.file, session.user.id));
      }
    } catch (e) {
      setBusy(false); setError(`Image upload failed: ${e.message ?? e}`); return;
    }

    const bodyData = {};
    if (scriptureRef.trim())  bodyData.scripture_ref  = scriptureRef.trim();
    if (imageUrls.length)     bodyData.image_urls     = imageUrls;
    if (mentions.length)      bodyData.mentions       = mentions;

    if (postKind === 'event') {
      if (eventDate)              bodyData.event_date     = eventDate;
      if (eventTime)              bodyData.event_time     = eventTime;
      if (eventLocation.trim())   bodyData.event_location = eventLocation.trim();
    }
    if (postKind === 'poll') {
      bodyData.poll_options = pollOptions.filter((o) => o.trim()).map((o) => cleanText(o.trim()));
    }

    const dbKind = postKind === 'milestone' ? 'journey_milestone' : postKind;

    const { data, error: err } = await supabase
      .from('posts')
      .insert({
        author_id:    session.user.id,
        scope,
        scope_id:     scope === 'me' ? null : scopeId,
        kind:         dbKind,
        body:         cleanText(text.trim()),
        body_data:    bodyData,
        is_anonymous: anon,
        person_type:  personType,
        visibility,
      })
      .select()
      .single();

    setBusy(false);
    if (err) { setError(err.message); return; }
    track('post_created', { scope, kind: dbKind });
    reset(); setOpen(false);
    onPosted?.(data);
  }

  const teaserText = placeholder
    ?? (scope === 'church' ? 'Post to your congregation\u2026' : 'Share something\u2026');

  if (!open && !inModal) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          width: '100%', display: 'flex', gap: 12, alignItems: 'center',
          background: 'transparent', border: 'none',
          cursor: 'pointer', padding: 0, textAlign: 'left',
          marginBottom: 14, WebkitTapHighlightColor: 'transparent',
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
          <span>{teaserText}</span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 26, height: 26, marginLeft: 12, borderRadius: '50%',
            background: `linear-gradient(135deg, ${T.goldLight}, ${T.goldDark})`,
            color: T.cream, fontSize: 13, fontWeight: 700,
            boxShadow: '0 2px 6px rgba(184,115,58,0.35)',
          }}>✎</span>
        </div>
      </button>
    );
  }

  // ── Announcement banner colour ──────────────────────────────────────────────
  const isAnnouncement = postKind === 'announcement';
  const wrapperStyle = bare ? { position: 'relative', marginBottom: 0 } : {
    position: 'relative',
    background: isAnnouncement
      ? 'linear-gradient(180deg,rgba(184,115,58,0.08) 0%,rgba(184,115,58,0.03) 100%)'
      : 'linear-gradient(180deg, #FFFEFA 0%, #FBF4E3 100%)',
    border: `1px solid ${isAnnouncement ? T.gold : 'rgba(154,99,40,0.18)'}`,
    borderRadius: 14, padding: '14px 16px', marginBottom: 14,
    boxShadow: 'inset 0 2px 4px rgba(44,24,16,0.05), inset 0 -1px 0 rgba(255,255,255,0.6)',
  };

  const textPlaceholder =
    postKind === 'milestone'     ? 'A step on your walk — e.g. "Got baptized today"'
    : postKind === 'event'       ? 'Describe the event\u2026'
    : postKind === 'poll'        ? 'Ask a question (optional)\u2026'
    : postKind === 'announcement'? 'Write your announcement\u2026'
    : "What's on your heart?";

  const canPost = busy ? false
    : postKind === 'poll' ? pollOptions.filter((o) => o.trim()).length >= 2
    : (text.trim().length > 0 || imageDrafts.length > 0);

  return (
    <div style={wrapperStyle}>

      {/* ── Announcement header ── */}
      {isAnnouncement && (
        <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 10 }}>
          📢 Announcement
        </div>
      )}

      {/* ── Scripture ref (not for poll) ── */}
      {postKind !== 'poll' && (
        <input
          value={scriptureRef}
          onChange={(e) => setScriptureRef(e.target.value)}
          placeholder="Scripture reference (optional)"
          style={{ ...inputCss, fontSize: 13, marginBottom: 8 }}
        />
      )}

      {/* ── Event date / time / location ── */}
      {postKind === 'event' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            style={inputCss}
          />
          <input
            type="time"
            value={eventTime}
            onChange={(e) => setEventTime(e.target.value)}
            style={inputCss}
          />
          <input
            type="text"
            value={eventLocation}
            onChange={(e) => setEventLocation(e.target.value)}
            placeholder="Location (optional)"
            style={{ ...inputCss, gridColumn: '1 / -1' }}
          />
        </div>
      )}

      {/* ── Poll options ── */}
      {postKind === 'poll' && (
        <div style={{ marginBottom: 8 }}>
          {pollOptions.map((opt, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <input
                value={opt}
                onChange={(e) => updatePollOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
                style={{ ...inputCss, flex: 1 }}
              />
              {pollOptions.length > 2 && (
                <button
                  type="button"
                  onClick={() => removePollOption(i)}
                  style={{
                    background: 'transparent', border: `1px solid ${T.line}`,
                    borderRadius: 8, padding: '0 10px', cursor: 'pointer',
                    color: T.inkMuted, flexShrink: 0,
                  }}
                ><Trash2 size={13} strokeWidth={2} /></button>
              )}
            </div>
          ))}
          {pollOptions.length < 6 && (
            <button
              type="button"
              onClick={() => setPollOptions((p) => [...p, ''])}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: 'transparent', border: `1px dashed ${T.line}`,
                borderRadius: 8, padding: '7px 12px', fontSize: 12.5,
                color: T.inkSoft, cursor: 'pointer', width: '100%',
                justifyContent: 'center',
              }}
            ><Plus size={13} strokeWidth={2} /> Add option</button>
          )}
        </div>
      )}

      {/* ── Body text ── */}
      <MentionInput
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={textPlaceholder}
        rows={postKind === 'poll' ? 2 : 4}
        style={{ ...inputCss, fontFamily: T.serif, lineHeight: 1.65, resize: 'vertical' }}
        mentions={mentions}
        onMentionsChange={setMentions}
      />

      {/* ── Image previews ── */}
      {imageDrafts.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8, marginTop: 10 }}>
          {imageDrafts.map((d, i) => (
            <div key={d.previewUrl} style={{ position: 'relative', paddingBottom: '100%', borderRadius: 10, overflow: 'hidden', background: T.parchment }}>
              <img src={d.previewUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              <button type="button" onClick={() => removeImageDraft(i)} aria-label="Remove image" style={{
                position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: '50%',
                background: 'rgba(0,0,0,0.55)', color: T.cream, border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}><X size={14} strokeWidth={2} /></button>
            </div>
          ))}
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
        onChange={(e) => { pickImages(e.target.files); e.target.value = ''; }} />

      {error && (
        <div style={{ color: T.error, fontSize: 13, margin: '8px 0 0', padding: '8px 10px', background: 'rgba(165,63,43,0.08)', borderRadius: 8 }}>
          {error}
        </div>
      )}

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>

        {/* Emoji picker */}
        <div style={{ position: 'relative' }}>
          {emojiOpen && (
            <>
              <div onClick={() => setEmojiOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 11,
                background: T.white, border: `1px solid ${T.line}`, borderRadius: 14,
                boxShadow: '0 8px 24px rgba(44,24,16,0.13)', padding: 10,
                display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 2,
                width: 'min(90vw, 320px)',
              }}>
                {EMOJIS.map((e) => (
                  <button key={e} type="button" onClick={() => insertEmoji(e)} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 20, lineHeight: 1, padding: '4px 2px', borderRadius: 6,
                  }}>{e}</button>
                ))}
              </div>
            </>
          )}
          <button type="button" onClick={() => setEmojiOpen((v) => !v)} title="Add emoji" style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: emojiOpen ? T.parchment : T.cream,
            border: `1px solid ${emojiOpen ? T.gold : T.line}`, borderRadius: 999,
            width: 32, height: 32, cursor: 'pointer', color: emojiOpen ? T.goldDark : T.inkSoft,
          }}>
            <Smile size={15} strokeWidth={1.75} />
          </button>
        </div>

        {/* Photo — not for poll */}
        {postKind !== 'poll' && (
          <ToolBtn
            onClick={() => fileInputRef.current?.click()}
            disabled={imageDrafts.length >= MAX_IMAGES_PER_POST}
            title={imageDrafts.length >= MAX_IMAGES_PER_POST ? `Up to ${MAX_IMAGES_PER_POST} images` : 'Add photo'}
          >
            <Camera size={14} strokeWidth={2} /> Photo
          </ToolBtn>
        )}

        {/* Milestone — only for text/personal scope */}
        {!isChurchScope && postKind !== 'announcement' && (
          <ToolBtn active={postKind === 'milestone'} onClick={() => toggleKind('milestone')}
            title="Mark as a step on your walk">
            <KinwoveStar size={12} style={{ verticalAlign: 'middle', marginRight: 5, flexShrink: 0 }} /> Milestone
          </ToolBtn>
        )}

        {/* ── Church-scope type buttons ── */}
        {isChurchScope && (
          <>
            <ToolBtn active={postKind === 'event'} onClick={() => toggleKind('event')} title="Announce an event">
              📅 Event
            </ToolBtn>
            <ToolBtn active={postKind === 'poll'} onClick={() => toggleKind('poll')} title="Ask the congregation">
              🗳 Poll
            </ToolBtn>
            {isPastor && (
              <ToolBtn active={postKind === 'announcement'} onClick={() => toggleKind('announcement')} title="Post an official announcement">
                📢 Announce
              </ToolBtn>
            )}
          </>
        )}

        {/* Anonymous — not for announcement */}
        {postKind !== 'announcement' && (
          <ToolBtn active={anon} onClick={() => setAnon((v) => !v)} title="Post without your name">
            👤 Anonymous
          </ToolBtn>
        )}

        {/* Visibility picker */}
        <div style={{ position: 'relative' }}>
          <button type="button" onClick={() => setAudienceMenuOpen((v) => !v)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: T.cream, border: `1px solid ${T.line}`, borderRadius: 999,
            padding: '6px 10px', fontSize: 12.5, color: T.inkSoft, cursor: 'pointer',
          }}>
            {(() => { const Ic = VISIBILITY_OPTIONS.find((v) => v.id === visibility)?.Icon; return Ic ? <Ic size={13} strokeWidth={2} /> : null; })()}
            {VISIBILITY_OPTIONS.find((v) => v.id === visibility)?.label}
            <ChevronDown size={12} strokeWidth={2} style={{ color: T.inkMuted }} />
          </button>
          {audienceMenuOpen && (
            <div style={{
              position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, zIndex: 10,
              background: T.white, border: `1px solid ${T.line}`, borderRadius: 12,
              boxShadow: '0 6px 20px rgba(44,24,16,0.12)', padding: 6, minWidth: 240,
            }}>
              {VISIBILITY_OPTIONS.map((v) => (
                <button key={v.id} type="button" onClick={() => { setVisibility(v.id); setAudienceMenuOpen(false); }} style={{
                  width: '100%', textAlign: 'left', display: 'flex', alignItems: 'flex-start', gap: 10,
                  background: visibility === v.id ? T.parchment : 'transparent', border: 'none',
                  borderRadius: 8, padding: '8px 10px', cursor: 'pointer',
                }}>
                  <v.Icon size={16} strokeWidth={1.75} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{v.label}</div>
                    <div style={{ fontSize: 11.5, color: T.inkMuted, marginTop: 2 }}>{v.desc}</div>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cancel / Post */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
          <button onClick={() => { reset(); if (inModal && onCancel) onCancel(); else setOpen(false); }} disabled={busy}
            style={{ background: 'transparent', border: `1px solid ${T.line}`, borderRadius: 999, padding: '8px 14px', fontSize: 13, color: T.inkSoft, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={submit} disabled={!canPost} style={{
            background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
            padding: '9px 18px', fontSize: 13.5, fontWeight: 600,
            cursor: canPost ? 'pointer' : 'not-allowed', opacity: canPost ? 1 : 0.5,
          }}>
            {busy ? 'Posting\u2026' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  );
}
