import { useEffect, useMemo, useRef, useState } from 'react';
import { T } from './theme.js';
import { PERSON_TYPES, STARTERS, DEEPER_STARTERS, ADS } from './constants.js';
import { getSystemPrompt } from './prompts.js';
import { useSpeechRecognition } from './useSpeechRecognition.js';
import { useTextToSpeech } from './useTextToSpeech.js';
import { supabase, authedFetch } from './supabase.js';
import { trialStatus } from './trial.js';
import MsgText from './MsgText.jsx';

const GUEST_COUNT_KEY = 'theway:guest_count';

function getStarters(personType, conversations) {
  const totalMessages = conversations.reduce((sum, c) => sum + c.messages.length, 0);
  const pool = totalMessages >= 15
    ? (DEEPER_STARTERS[personType] ?? DEEPER_STARTERS.curious)
    : (STARTERS[personType] ?? STARTERS.curious);
  const offset = new Date().getDate() % pool.length;
  return [...pool.slice(offset), ...pool.slice(0, offset)].slice(0, 3);
}

function TypingDots() {
  return (
    <div style={{ display: 'inline-flex', gap: 4, padding: '4px 0' }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: 99,
            background: T.gold,
            animation: `bounce 1s ${i * 0.15}s infinite ease-in-out`,
          }}
        />
      ))}
    </div>
  );
}

function AdStrip() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % ADS.length), 9000);
    return () => clearInterval(t);
  }, []);
  const ad = ADS[idx];
  return (
    <div
      key={ad.id}
      className="fade-in"
      style={{
        background: T.parchment,
        borderBottom: `1px solid ${T.line}`,
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 12,
        color: T.inkMuted,
      }}
    >
      <span style={{ color: T.gold, fontSize: 9, letterSpacing: 1 }}>✦</span>
      <span
        style={{
          fontSize: 9,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          color: T.goldDark,
          opacity: 0.75,
        }}
      >
        {ad.tag}
      </span>
      <span style={{ fontStyle: 'italic', color: T.inkSoft }}>{ad.text}</span>
    </div>
  );
}

function BookmarkIcon({ filled, size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? T.gold : 'none'}
      stroke={filled ? T.gold : T.inkMuted}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function GuestWall({ onSignUp }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(44,24,16,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)', padding: 24 }}>
      <div style={{ background: T.ink, borderRadius: 24, padding: '44px 32px', maxWidth: 400, width: '100%', textAlign: 'center', border: '1px solid rgba(196,129,58,0.3)', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}>
        <svg width="28" height="28" viewBox="0 0 28 28" style={{ marginBottom: 22 }}>
          <line x1="14" y1="0" x2="14" y2="28" stroke="#C4813A" strokeWidth="2"/>
          <line x1="0" y1="14" x2="28" y2="14" stroke="#C4813A" strokeWidth="2"/>
        </svg>
        <div style={{ fontFamily: T.display, fontSize: 30, fontWeight: 600, color: T.cream, letterSpacing: '-0.02em', lineHeight: 1.12, marginBottom: 14 }}>
          This conversation is worth keeping.
        </div>
        <div style={{ fontSize: 15, color: 'rgba(253,248,240,0.5)', lineHeight: 1.7, marginBottom: 32 }}>
          You've had 5 free exchanges. Create a free account to keep going, save your notes, and join the community.
        </div>
        <button onClick={onSignUp} style={{ background: T.gold, color: T.cream, border: 'none', borderRadius: 999, padding: '15px 0', fontSize: 15, fontWeight: 600, cursor: 'pointer', width: '100%', marginBottom: 12, boxShadow: '0 4px 20px rgba(196,129,58,0.4)' }}>
          Create a free account
        </button>
        <div style={{ fontSize: 12, color: 'rgba(253,248,240,0.28)' }}>No credit card needed.</div>
      </div>
    </div>
  );
}

function formatConversation(messages, title) {
  const parts = title ? [title, ''] : [];
  messages.forEach((m) => {
    if (m.role === 'user') parts.push(`You: ${m.content}`);
    else if (m.role === 'assistant' && m.content) parts.push(`The Way:\n${m.content}`);
    parts.push('');
  });
  return parts.join('\n').trim();
}

function ChatShareSheet({ text, label, rawMessages, convTitle, session, profile, userGroup, onClose }) {
  const [copied, setCopied] = useState(false);
  const [posted, setPosted] = useState(false);
  const [groupShared, setGroupShared] = useState(false);
  const [messengerNote, setMessengerNote] = useState(false);
  const [heading, setHeading] = useState('');
  const [headingLoading, setHeadingLoading] = useState(true);
  const [shareUrl, setShareUrl] = useState('');
  const [contacts, setContacts] = useState([]);
  const [sentTo, setSentTo] = useState(null);
  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;
  const isMobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

  useEffect(() => {
    async function createShareLink() {
      const id = Math.random().toString(36).slice(2, 9);
      const msgs = rawMessages ?? [{ role: 'assistant', content: text }];
      const { error } = await supabase.from('shared_conversations').insert({
        id,
        title: convTitle ?? 'A response from The Way',
        messages: msgs,
        person_type: profile?.person_type ?? 'curious',
      });
      if (!error) setShareUrl(`${window.location.origin}?s=${id}`);
    }
    createShareLink();
  }, []);

  useEffect(() => {
    if (!session) return;
    async function loadContacts() {
      const [{ data: following }, { data: followers }] = await Promise.all([
        supabase
          .from('follows')
          .select('following_id, created_at')
          .eq('follower_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(12),
        supabase
          .from('follows')
          .select('follower_id, created_at')
          .eq('following_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(12),
      ]);

      const seen = new Set();
      const ids = [];
      for (const r of [...(following ?? []), ...(followers ?? [])]) {
        const id = r.following_id ?? r.follower_id;
        if (id && !seen.has(id)) { seen.add(id); ids.push(id); }
      }
      if (!ids.length) return;

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_config')
        .in('id', ids.slice(0, 12));

      if (profiles?.length) setContacts(profiles);
    }
    loadContacts();
  }, [session]);

  useEffect(() => {
    async function generateHeading() {
      try {
        const res = await authedFetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system: 'You write short, intriguing headings for faith-based social posts. Return ONLY the heading — no quotes, no punctuation at the end, no explanation. Maximum 10 words.',
            messages: [{ role: 'user', content: `Write an intriguing heading for this post:\n\n${text.slice(0, 600)}` }],
            personType: 'curious',
          }),
        });
        if (!res.ok || !res.body) { setHeadingLoading(false); return; }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        let result = '';
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const events = buf.split('\n\n');
          buf = events.pop() ?? '';
          for (const raw of events) {
            const lines = raw.split('\n');
            const ev = lines.find((l) => l.startsWith('event: '))?.slice(7).trim();
            const data = lines.find((l) => l.startsWith('data: '))?.slice(6);
            if (ev === 'text' && data) {
              try { result += JSON.parse(data).delta; } catch {}
            }
          }
        }
        setHeading(result.trim());
      } catch {}
      setHeadingLoading(false);
    }
    generateHeading();
  }, []);

  function getBody() {
    const h = heading.trim();
    const body = h ? `${h}\n\n${text}` : text;
    return shareUrl ? `${body}\n\n${shareUrl}` : body;
  }

  async function handlePost() {
    if (!session) return;
    const { error } = await supabase.from('posts').insert({
      author_id: session.user.id,
      body: getBody().slice(0, 2000),
      person_type: profile?.person_type ?? null,
    });
    if (!error) { setPosted(true); setTimeout(onClose, 900); }
  }

  async function handleGroupShare() {
    if (!session || !userGroup) return;
    await supabase.from('group_posts').insert({
      group_id: userGroup.group.id,
      author_id: session.user.id,
      body: getBody().slice(0, 2000),
    });
    setGroupShared(true);
    setTimeout(onClose, 900);
  }

  async function handleNativeShare() {
    try {
      await navigator.share({ title: heading || 'The Way', text: getBody() });
      onClose();
    } catch (e) {
      if (e.name !== 'AbortError') {
        window.open(`mailto:?subject=${encodeURIComponent(heading || 'From The Way')}&body=${encodeURIComponent(getBody())}`);
      }
    }
  }

  function handleFacebook() {
    const u = encodeURIComponent(shareUrl || window.location.origin);
    const q = encodeURIComponent(getBody());
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${u}&quote=${q}`, '_blank', 'width=600,height=600');
    onClose();
  }

  async function handleMessenger() {
    try { await navigator.clipboard.writeText(getBody()); } catch {}
    setMessengerNote(true);
    setTimeout(() => {
      window.open('https://www.messenger.com/', '_blank');
      onClose();
    }, 900);
  }

  function handleWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(getBody())}`, '_blank');
    onClose();
  }

  function handleSMS() {
    window.location.href = `sms:?&body=${encodeURIComponent(getBody())}`;
    onClose();
  }

  function handleEmail() {
    window.open(`mailto:?subject=${encodeURIComponent(heading || 'From The Way')}&body=${encodeURIComponent(getBody())}`);
    onClose();
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(getBody());
      setCopied(true);
      setTimeout(onClose, 900);
    } catch {}
  }

  async function handleContactShare(contact) {
    setSentTo(contact.id);
    const body = getBody();
    try {
      if (canNativeShare) {
        await navigator.share({ title: heading || 'The Way', text: body });
      } else {
        window.open(`sms:?&body=${encodeURIComponent(body)}`);
      }
    } catch (e) {
      if (e?.name !== 'AbortError') {
        window.open(`sms:?&body=${encodeURIComponent(body)}`);
      }
    }
    setTimeout(() => setSentTo(null), 2000);
  }

  function getAvatarUrl(contact) {
    const cfg = contact.avatar_config;
    if (cfg) {
      const params = new URLSearchParams({ ...cfg, size: 48 });
      return `https://api.dicebear.com/7.x/${cfg.style ?? 'avataaars'}/svg?${params}`;
    }
    const seed = encodeURIComponent(contact.display_name || 'friend');
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&size=48&backgroundColor=fdf8f0`;
  }

  const items = [
    session && {
      icon: '↩', label: posted ? 'Posted ✓' : 'Post to community feed',
      sub: 'Share with the community', onClick: handlePost, done: posted,
    },
    session && userGroup && {
      icon: '⛪', label: groupShared ? 'Shared ✓' : `Share to ${userGroup.group.name}`,
      sub: 'Visible to group members only', onClick: handleGroupShare, done: groupShared,
    },
    {
      icon: '📘', label: 'Share to Facebook',
      sub: 'Post to your timeline or to a group', onClick: handleFacebook, done: false,
    },
    {
      icon: '💬', label: messengerNote ? 'Copied — paste in Messenger' : 'Send via Messenger',
      sub: 'Opens Messenger; text is copied to paste', onClick: handleMessenger, done: messengerNote,
    },
    {
      icon: '🟢', label: 'Send via WhatsApp',
      sub: 'Pick a contact, message is pre-filled', onClick: handleWhatsApp, done: false,
    },
    isMobile && {
      icon: '💌', label: 'Send via Text Message',
      sub: 'Opens your SMS app with pre-filled text', onClick: handleSMS, done: false,
    },
    canNativeShare && {
      icon: '📱', label: 'Send via…',
      sub: 'AirDrop, more apps, system share', onClick: handleNativeShare, done: false,
    },
    !canNativeShare && {
      icon: '✉️', label: 'Share via email',
      sub: 'Opens your email app', onClick: handleEmail, done: false,
    },
    {
      icon: copied ? '✅' : '📋', label: copied ? 'Copied!' : 'Copy link',
      sub: 'Copy text and link to clipboard', onClick: handleCopy, done: copied,
    },
  ].filter(Boolean);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(44,24,16,0.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: T.white, borderRadius: '20px 20px 0 0',
        width: '100%', maxWidth: 520, padding: '20px 20px 40px',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.15)', animation: 'slideUp 0.2s ease',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: T.line, margin: '0 auto 20px' }} />

        {contacts.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.inkMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
              Send to
            </div>
            <div
              style={{
                display: 'flex',
                gap: 16,
                overflowX: 'auto',
                paddingBottom: 8,
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
              className="hide-scroll"
            >
              {contacts.map((c) => {
                const isSent = sentTo === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => handleContactShare(c)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 6,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      flexShrink: 0,
                      padding: '4px 0',
                    }}
                  >
                    <div style={{ position: 'relative' }}>
                      <div style={{
                        width: 54,
                        height: 54,
                        borderRadius: '50%',
                        overflow: 'hidden',
                        border: `2px solid ${isSent ? T.gold : T.line}`,
                        transition: 'border-color 0.2s',
                        background: T.parchment,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {isSent ? (
                          <span style={{ fontSize: 22 }}>✓</span>
                        ) : (
                          <img
                            src={getAvatarUrl(c)}
                            alt={c.display_name}
                            width={54}
                            height={54}
                            style={{ borderRadius: '50%' }}
                          />
                        )}
                      </div>
                    </div>
                    <div style={{
                      fontSize: 11,
                      color: isSent ? T.goldDark : T.inkSoft,
                      fontWeight: isSent ? 600 : 400,
                      maxWidth: 58,
                      textAlign: 'center',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {isSent ? 'Sent!' : (c.display_name?.split(' ')[0] ?? 'Friend')}
                    </div>
                  </button>
                );
              })}
            </div>
            <div style={{ height: 1, background: T.line, marginTop: 4 }} />
          </div>
        )}

        <div style={{
          background: T.parchment, borderRadius: 16, padding: '18px 18px 14px',
          marginBottom: 18, border: `1px solid ${T.line}`,
        }}>
          <textarea
            value={heading}
            onChange={(e) => setHeading(e.target.value)}
            placeholder={headingLoading ? 'Crafting your title…' : 'Add a heading…'}
            disabled={headingLoading}
            rows={2}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'transparent', border: 'none', padding: 0,
              fontSize: 24, lineHeight: 1.18, letterSpacing: '-0.018em',
              fontFamily: T.display, fontWeight: 600,
              color: headingLoading ? T.inkMuted : T.ink,
              outline: 'none', resize: 'none',
            }}
          />
          <div style={{
            height: 2, width: 40, borderRadius: 1,
            background: headingLoading
              ? T.line
              : `linear-gradient(90deg, ${T.gold}, ${T.goldLight})`,
            margin: '8px 0 10px',
            transition: 'background 0.3s',
            animation: headingLoading ? 'goldPulse 1s ease infinite' : 'none',
          }} />
          <div style={{
            fontFamily: T.serif, fontSize: 14, color: T.inkSoft,
            lineHeight: 1.6, maxHeight: 60, overflow: 'hidden', position: 'relative',
          }}>
            {text.slice(0, 160)}{text.length > 160 ? '…' : ''}
            {text.length > 160 && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 28, background: `linear-gradient(transparent, ${T.parchment})` }} />}
          </div>
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 10, color: T.gold }}>✦</span>
              <span style={{ fontSize: 11, color: T.inkMuted }}>
                {headingLoading ? 'AI is writing a heading…' : 'AI suggested · tap to edit'}
              </span>
            </div>
            {shareUrl ? (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: 'rgba(196,129,58,0.10)', borderRadius: 6,
                padding: '3px 8px',
              }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={T.goldDark} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                <span style={{ fontSize: 11, color: T.goldDark, fontFamily: T.sans }}>link ready</span>
              </div>
            ) : (
              <span style={{ fontSize: 11, color: T.inkMuted }}>creating link…</span>
            )}
          </div>
        </div>

        <div style={{ fontSize: 12, color: T.inkMuted, fontWeight: 500, marginBottom: 10 }}>{label}</div>

        {items.map((item) => (
          <button key={item.label} onClick={item.onClick} disabled={item.done || headingLoading} style={{
            width: '100%', textAlign: 'left',
            background: item.done ? T.parchment : T.white,
            border: `1px solid ${item.done ? T.goldLight : T.line}`,
            borderRadius: 14, padding: '13px 16px', marginBottom: 10,
            cursor: item.done || headingLoading ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 14, transition: 'all 0.15s',
            opacity: headingLoading ? 0.5 : 1,
          }}
          onMouseEnter={(e) => { if (!item.done && !headingLoading) e.currentTarget.style.borderColor = T.gold; }}
          onMouseLeave={(e) => { if (!item.done && !headingLoading) e.currentTarget.style.borderColor = item.done ? T.goldLight : T.line; }}
          >
            <div style={{ fontSize: 20, width: 32, textAlign: 'center', flexShrink: 0 }}>{item.icon}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: item.done ? T.goldDark : T.ink }}>{item.label}</div>
              <div style={{ fontSize: 12, color: T.inkMuted }}>{item.sub}</div>
            </div>
          </button>
        ))}
        <button onClick={onClose} style={{ width: '100%', background: 'none', border: 'none', color: T.inkMuted, fontSize: 14, cursor: 'pointer', padding: '10px 0' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function Chat({
  personType,
  seekingContext,
  onOpenPremium,
  onChangeType,
  notes,
  onAddNote,
  onOpenBoard,
  onOpenCommunity,
  onOpenPrayer,
  onOpenJourneys,
  onShare,
  shareCopied,
  conversationTitle,
  onOpenHistory,
  prefilledInput,
  onConsumePrefill,
  autoSendPrompt,
  onConsumeAutoSend,
  profile,
  session,
  onSignUp,
  initialMessages,
  onMessagesChange,
  conversations,
  userGroup,
  panelMode,
  onClose,
  docked,
  canDock,
  onToggleDock,
  onNewConversation,
  onSetPersonType,
}) {
  const [messages, setMessages] = useState(initialMessages ?? []);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [savedIdx, setSavedIdx] = useState(() => new Set());
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [shareContent, setShareContent] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modePickerOpen, setModePickerOpen] = useState(false);
  const [activeStudySessionId, setActiveStudySessionId] = useState(null);
  const [sessionLink, setSessionLink] = useState(null);
  const [sessionLinkCopied, setSessionLinkCopied] = useState(false);
  const [guestCount, setGuestCount] = useState(() => {
    if (typeof window === 'undefined') return 0;
    return parseInt(localStorage.getItem(GUEST_COUNT_KEY) ?? '0', 10);
  });
  const showGuestWall = !session && guestCount >= 5;
  const [suggestions, setSuggestions] = useState([]);
  const listRef = useRef(null);
  const taRef = useRef(null);
  const userScrolledRef = useRef(false);
  const { listening: micListening, toggle: toggleMic, supported: micSupported } =
    useSpeechRecognition((t) => { setInput(t); taRef.current?.focus(); });
  const ttsVoice = profile?.tts_voice ?? 'onyx';
  const { speakingId, speak: speakMsg, stop: stopSpeech, supported: ttsSupported } = useTextToSpeech({ voice: ttsVoice });

  useEffect(() => {
    if (!busy && messages.length > 0) onMessagesChange?.(messages);
  }, [busy]);

  useEffect(() => {
    if (prefilledInput) {
      setInput(prefilledInput);
      onConsumePrefill?.();
      taRef.current?.focus();
    }
  }, [prefilledInput, onConsumePrefill]);

  useEffect(() => {
    if (autoSendPrompt && messages.length === 0) {
      onConsumeAutoSend?.();
      send(autoSendPrompt);
    }
  }, []);

  const FREE_MSG_LIMIT = 10;

  const totalMessages = useMemo(
    () => (conversations ?? []).reduce((sum, c) => sum + (c.messages?.length ?? 0), 0),
    [conversations]
  );
  const userMessageCount = useMemo(
    () => (conversations ?? []).reduce((sum, c) => sum + (c.messages ?? []).filter((m) => m.role === 'user').length, 0),
    [conversations]
  );
  const isPremium = profile?.is_premium === true;
  const atLimit = !isPremium && userMessageCount >= FREE_MSG_LIMIT;

  const system = useMemo(() => getSystemPrompt(personType, seekingContext, totalMessages), [personType, seekingContext, totalMessages]);
  const starters = useMemo(() => getStarters(personType, conversations ?? []), [personType, conversations]);
  const person = PERSON_TYPES.find((p) => p.id === personType);
  const trial = trialStatus(profile);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (!userScrolledRef.current) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, busy]);

  function resetScroll() {
    userScrolledRef.current = false;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }

  function handleListScroll() {
    const el = listRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    userScrolledRef.current = !nearBottom;
  }

  useEffect(() => {
    if (!taRef.current) return;
    taRef.current.style.height = 'auto';
    taRef.current.style.height = Math.min(taRef.current.scrollHeight, 200) + 'px';
  }, [input]);

  async function startStudySession() {
    if (!session) return;
    const id = crypto.randomUUID();
    const { error: err } = await supabase.from('study_sessions').insert({
      id,
      host_id: session.user.id,
      person_type: personType,
      messages: messages,
    });
    if (err) { console.error(err); return; }
    const link = `${window.location.origin}/?gs=${id}`;
    setActiveStudySessionId(id);
    setSessionLink(link);
  }

  async function endStudySession() {
    if (!activeStudySessionId) return;
    await supabase.from('study_sessions').update({ active: false }).eq('id', activeStudySessionId);
    setActiveStudySessionId(null);
    setSessionLink(null);
  }

  function copySessionLink() {
    if (!sessionLink) return;
    navigator.clipboard.writeText(sessionLink).catch(() => {});
    setSessionLinkCopied(true);
    setTimeout(() => setSessionLinkCopied(false), 1800);
  }

  async function fetchSuggestions(msgs) {
    if (msgs.length < 2) return;
    const lastPair = msgs.slice(-2);
    try {
      const res = await authedFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: 'You are a follow-up question suggester. Output ONLY a JSON array of exactly 3 short follow-up questions based on the conversation. Each question must be under 10 words, natural and curious. No explanation, no markdown — just the raw JSON array. Example: ["What happened next?","Why did God allow this?","How does this connect to Jesus?"]',
          messages: [{ role: 'user', content: lastPair.map((m) => `${m.role === 'user' ? 'Q' : 'A'}: ${m.content.slice(0, 300)}`).join('\n') + '\n\nSuggest 3 follow-up questions.' }],
          personType: 'curious',
        }),
      });
      if (!res.ok || !res.body) return;
      let full = '';
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split('\n\n');
        buf = parts.pop() ?? '';
        for (const part of parts) {
          const line = part.split('\n').find((l) => l.startsWith('data:'));
          if (!line) continue;
          try { const d = JSON.parse(line.slice(5)); if (d.delta) full += d.delta; } catch {}
        }
      }
      const match = full.match(/\[[\s\S]*?\]/);
      if (!match) return;
      const arr = JSON.parse(match[0]);
      if (Array.isArray(arr) && arr.length) setSuggestions(arr.slice(0, 3));
    } catch { /* fail silently — suggestions are bonus UI */ }
  }

  async function send(text) {
    const prompt = (text ?? input).trim();
    if (!prompt || busy) return;
    if (atLimit) { onOpenPremium(true); return; }
    resetScroll();
    setInput('');
    setError(null);
    setSuggestions([]);

    const next = [...messages, { role: 'user', content: prompt }];
    setMessages(next);
    setBusy(true);
    let assistantContent = '';

    try {
      const res = await authedFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system, messages: next, personType, seekingContext }),
      });

      if (!res.ok || !res.body) {
        const msg = await res.text().catch(() => 'Network error');
        throw new Error(msg || `HTTP ${res.status}`);
      }

      setMessages((m) => [...m, { role: 'assistant', content: '' }]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        const events = buf.split('\n\n');
        buf = events.pop() ?? '';

        for (const raw of events) {
          const lines = raw.split('\n');
          const ev = lines.find((l) => l.startsWith('event: '))?.slice(7).trim();
          const data = lines.find((l) => l.startsWith('data: '))?.slice(6);
          if (!ev || !data) continue;
          let payload;
          try {
            payload = JSON.parse(data);
          } catch {
            continue;
          }
          if (ev === 'text') {
            assistantContent += payload.delta;
            setMessages((m) => {
              const copy = m.slice();
              copy[copy.length - 1] = {
                role: 'assistant',
                content: copy[copy.length - 1].content + payload.delta,
              };
              return copy;
            });
          } else if (ev === 'error') {
            throw new Error(payload.message || 'stream error');
          }
        }
      }
    } catch (e) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setBusy(false);
      if (activeStudySessionId && assistantContent) {
        const finalMsgs = [...next, { role: 'assistant', content: assistantContent }];
        supabase.from('study_sessions').update({ messages: finalMsgs }).eq('id', activeStudySessionId);
      }
      if (!session) {
        setGuestCount((c) => {
          const next = c + 1;
          localStorage.setItem(GUEST_COUNT_KEY, String(next));
          return next;
        });
      }
      if (assistantContent) {
        const finalMsgs = [...next, { role: 'assistant', content: assistantContent }];
        fetchSuggestions(finalMsgs);
      }
    }
  }

  return (
    <div
      style={{
        height: panelMode ? 'calc(100vh - 62px)' : undefined,
        minHeight: panelMode ? undefined : '100vh',
        background: T.cream,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      <header
        style={{
          padding: '12px 16px',
          background: T.white,
          borderBottom: `1px solid ${T.line}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {panelMode && (
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.inkMuted, fontSize: 18, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>
              ×
            </button>
          )}
          {!panelMode && (
            <div style={{ fontFamily: T.display, fontSize: 22, fontWeight: 600, color: T.ink, letterSpacing: '-0.015em' }}>
              The Way
            </div>
          )}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setModePickerOpen((v) => !v)}
              style={{
                background: modePickerOpen ? 'rgba(196,129,58,0.1)' : T.parchment,
                border: `1px solid ${modePickerOpen ? T.gold : T.line}`,
                borderRadius: 999, padding: '4px 12px',
                fontSize: 12, color: modePickerOpen ? T.goldDark : T.inkSoft,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                transition: 'all 0.15s',
              }}
            >
              {person?.emoji} {person?.label}
              <span style={{ fontSize: 9, opacity: 0.6, marginLeft: 1 }}>▾</span>
            </button>
            {modePickerOpen && (
              <div
                onClick={() => setModePickerOpen(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 199 }}
              />
            )}
            {modePickerOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', left: 0,
                background: T.white, border: `1px solid ${T.line}`,
                borderRadius: 14, boxShadow: '0 8px 32px rgba(44,24,16,0.14)',
                overflow: 'hidden', minWidth: 220, zIndex: 200,
              }}>
                <div style={{ padding: '10px 14px 6px', fontSize: 10, letterSpacing: '0.07em', textTransform: 'uppercase', color: T.inkMuted, fontWeight: 700 }}>
                  Switch mode
                </div>
                {PERSON_TYPES.map((pt) => {
                  const active = pt.id === personType;
                  return (
                    <button
                      key={pt.id}
                      onClick={() => { setModePickerOpen(false); onSetPersonType?.(pt.id); }}
                      style={{
                        width: '100%', textAlign: 'left', background: active ? 'rgba(196,129,58,0.07)' : 'none',
                        border: 'none', borderTop: `1px solid ${T.line}`,
                        padding: '10px 16px', fontSize: 13, color: T.ink,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                        fontWeight: active ? 600 : 400,
                      }}
                    >
                      <span style={{ fontSize: 16, width: 22, textAlign: 'center' }}>{pt.emoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: active ? T.goldDark : T.ink, fontWeight: active ? 700 : 500 }}>{pt.label}</div>
                        <div style={{ fontSize: 11, color: T.inkMuted, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>{pt.description}</div>
                      </div>
                      {active && <span style={{ marginLeft: 'auto', color: T.gold, fontSize: 14 }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {trial.active && (
            <div style={{
              fontSize: 11, color: T.goldDark,
              border: `1px solid ${T.goldLight}`, borderRadius: 999,
              padding: '4px 10px', background: 'rgba(196,129,58,0.08)',
            }}>
              {trial.daysLeft}d free
            </div>
          )}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              style={{
                background: menuOpen ? T.parchment : 'transparent',
                border: `1px solid ${menuOpen ? T.gold : T.line}`,
                color: T.inkSoft, borderRadius: 999,
                padding: '6px 12px', fontSize: 16, cursor: 'pointer',
                lineHeight: 1,
              }}
            >
              ⋮
            </button>
            {menuOpen && (
              <div
                onClick={() => setMenuOpen(false)}
                style={{
                  position: 'fixed', inset: 0, zIndex: 199,
                }}
              />
            )}
            {menuOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                background: T.white, border: `1px solid ${T.line}`,
                borderRadius: 14, boxShadow: '0 8px 32px rgba(44,24,16,0.14)',
                overflow: 'hidden', minWidth: 200, zIndex: 200,
              }}>
                <button onClick={() => { setMenuOpen(false); onNewConversation?.(); }} style={{
                  width: '100%', textAlign: 'left', background: 'none',
                  border: 'none', borderBottom: `1px solid ${T.line}`,
                  padding: '12px 16px', fontSize: 14, color: T.ink,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ fontSize: 15 }}>✦</span><span style={{ fontWeight: 600 }}>New conversation</span>
                </button>
                <button onClick={() => { setMenuOpen(false); onChangeType(); }} style={{
                  width: '100%', textAlign: 'left', background: 'none',
                  border: 'none', borderBottom: `1px solid ${T.line}`,
                  padding: '12px 16px', fontSize: 14, color: T.ink,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ fontSize: 13 }}>⇄</span><span>Change mode</span>
                </button>
                <button onClick={() => { setMenuOpen(false); onOpenPrayer(); }} style={{
                  width: '100%', textAlign: 'left', background: 'none',
                  border: 'none', borderBottom: `1px solid ${T.line}`,
                  padding: '12px 16px', fontSize: 14, color: T.ink,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span>🕯️</span><span>Prayer</span>
                </button>
                {messages.length > 0 && (
                  <button onClick={() => { setMenuOpen(false); setShareContent({ text: formatConversation(messages, conversationTitle), label: 'Share conversation', rawMessages: messages, convTitle: conversationTitle }); }} style={{
                    width: '100%', textAlign: 'left', background: 'none',
                    border: 'none', borderBottom: `1px solid ${T.line}`,
                    padding: '12px 16px', fontSize: 14, color: T.ink,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <span style={{ fontSize: 13 }}>↗</span><span>Share conversation</span>
                  </button>
                )}
                <button onClick={() => { setMenuOpen(false); onOpenHistory(); }} style={{
                  width: '100%', textAlign: 'left', background: 'none',
                  border: 'none', padding: '12px 16px', fontSize: 14,
                  color: T.ink, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ fontSize: 13 }}>◷</span><span>Conversation history</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <AdStrip />

      <div
        ref={listRef}
        onScroll={handleListScroll}
        className="scroll"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: panelMode ? '20px 16px 24px' : '28px 20px 80px',
          minHeight: 0,
        }}
      >
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          {personType === 'group' && session && (
            activeStudySessionId ? (
              <div style={{ background: 'rgba(34,179,105,0.07)', border: '1px solid rgba(34,179,105,0.22)', borderRadius: 12, padding: '12px 16px', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22b369', animation: 'bounce 2s infinite ease-in-out' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>Live session active</span>
                  <button onClick={endStudySession} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: T.inkMuted, fontSize: 12, cursor: 'pointer', padding: 0 }}>End session</button>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ flex: 1, fontFamily: 'monospace', fontSize: 11, background: T.white, border: `1px solid ${T.line}`, borderRadius: 8, padding: '6px 10px', color: T.inkSoft, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {sessionLink}
                  </div>
                  <button onClick={copySessionLink} style={{ background: T.gold, color: T.cream, border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    {sessionLinkCopied ? 'Copied ✓' : 'Copy link'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ background: T.parchment, border: `1px solid ${T.line}`, borderRadius: 12, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 20 }}>👥</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>Group Study mode</div>
                  <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 2 }}>Start a live session your group can follow along</div>
                </div>
                <button onClick={startStudySession} style={{ background: T.gold, color: T.cream, border: 'none', borderRadius: 999, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Start session
                </button>
              </div>
            )
          )}

          {messages.length === 0 && (
            <div className="fade-up">
              <div style={{ fontFamily: T.serif, fontSize: 26, color: T.ink, marginBottom: 8, fontWeight: 500 }}>
                Take your time.
              </div>
              <div style={{ fontSize: 15, color: T.inkMuted, lineHeight: 1.6 }}>
                Ask anything — a question, a doubt, a verse you want to understand.
              </div>
            </div>
          )}

          {messages.map((m, i) => {
            const isAssistant = m.role === 'assistant';
            const isStreaming = isAssistant && m.content === '' && busy;
            const isLast = i === messages.length - 1;
            const canSave =
              isAssistant && !isStreaming && m.content.length > 0 && !(isLast && busy);
            const saved = savedIdx.has(i);
            const handleSave = () => {
              if (!canSave || saved) return;
              const prev = messages[i - 1];
              const question = prev?.role === 'user' ? prev.content : '(no question)';
              const personDef = PERSON_TYPES.find((p) => p.id === personType);
              onAddNote({
                question,
                answer: m.content,
                personType,
                personLabel: personDef ? `${personDef.emoji} ${personDef.label}` : '',
              });
              setSavedIdx((s) => new Set(s).add(i));
            };
            return (
              <div
                key={i}
                className="fade-up"
                style={{
                  marginBottom: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: m.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: m.role === 'user' ? '80%' : '100%',
                    background: m.role === 'user' ? T.gold : 'transparent',
                    color: m.role === 'user' ? T.cream : T.ink,
                    padding: m.role === 'user' ? '12px 18px' : '4px 0',
                    borderRadius: m.role === 'user' ? 18 : 0,
                    fontFamily: m.role === 'user' ? T.sans : T.serif,
                    fontSize: m.role === 'user' ? 15 : 17,
                    lineHeight: m.role === 'user' ? 1.5 : 1.7,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {isStreaming ? <TypingDots /> : <MsgText text={m.content} />}
                </div>
                {canSave && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
                    <button
                      onClick={handleSave}
                      title={saved ? 'Saved to your board' : 'Save to your board'}
                      disabled={saved}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        padding: '4px 8px',
                        cursor: saved ? 'default' : 'pointer',
                        color: saved ? T.gold : T.inkMuted,
                        fontSize: 12,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      <BookmarkIcon filled={saved} size={14} />
                      {saved ? 'Saved' : 'Save'}
                    </button>
                    <button
                      onClick={() => setShareContent({ text: m.content, label: 'Share this response', rawMessages: [{ role: 'assistant', content: m.content }] })}
                      title="Share this response"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        color: T.inkMuted,
                        fontSize: 12,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                      Share
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(m.content);
                          setCopiedIdx(i);
                          setTimeout(() => setCopiedIdx(null), 2000);
                        } catch {}
                      }}
                      title="Copy response"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        color: copiedIdx === i ? T.gold : T.inkMuted,
                        fontSize: 12,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        transition: 'color 0.2s',
                      }}
                    >
                      {copiedIdx === i ? (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      ) : (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      )}
                      {copiedIdx === i ? 'Copied' : 'Copy'}
                    </button>
                    {ttsSupported && (
                      <button
                        onClick={() => speakMsg(i, m.content)}
                        title={speakingId === i ? 'Stop reading' : 'Read aloud'}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          padding: '4px 8px',
                          cursor: 'pointer',
                          color: speakingId === i ? T.gold : T.inkMuted,
                          fontSize: 12,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                        }}
                      >
                        {speakingId === i ? (
                          <span style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 2, height: 14 }}>
                            {[1, 0.5, 0.8, 0.4].map((h, k) => (
                              <span key={k} style={{
                                width: 3, borderRadius: 2,
                                background: T.gold,
                                height: `${h * 100}%`,
                                animation: `micPulse 0.8s ease-in-out ${k * 0.15}s infinite alternate`,
                              }} />
                            ))}
                          </span>
                        ) : (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                            <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                          </svg>
                        )}
                        {speakingId === i ? 'Stop' : 'Listen'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {error && (
            <div
              style={{
                marginTop: 14,
                padding: 14,
                border: `1px solid ${T.line}`,
                background: '#fff4ea',
                borderRadius: 10,
                fontSize: 14,
                color: T.error,
              }}
            >
              {error}
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          borderTop: `1px solid ${T.line}`,
          background: T.white,
          padding: panelMode
            ? `12px 16px max(14px, env(safe-area-inset-bottom, 14px))`
            : '14px 20px 76px',
          flexShrink: 0,
        }}
      >
        {atLimit && (
          <div style={{ maxWidth: 720, margin: '0 auto 12px', background: 'rgba(196,129,58,0.08)', border: `1px solid rgba(196,129,58,0.3)`, borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ fontSize: 13, color: T.ink, lineHeight: 1.5 }}>
              <strong>You've used your 10 free messages.</strong><br />
              <span style={{ color: T.inkSoft }}>Billing opens soon — join the list to be first.</span>
            </div>
            <button
              onClick={() => onOpenPremium(true)}
              style={{ background: T.gold, color: T.cream, border: 'none', borderRadius: 999, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              Notify me →
            </button>
          </div>
        )}
        {!busy && !atLimit && !showGuestWall && (() => {
          const chips = suggestions.length > 0
            ? suggestions
            : messages.length === 0
              ? (STARTERS[personType] ?? STARTERS.curious).slice(0, 3)
              : [];
          if (chips.length === 0) return null;
          return (
            <div
              className="fade-up"
              style={{
                maxWidth: 720, margin: '0 auto 10px',
                display: 'flex', gap: 7, flexWrap: 'wrap',
              }}
            >
              {chips.map((s, i) => (
                <button
                  key={i}
                  onClick={() => send(s)}
                  style={{
                    minWidth: 0,
                    maxWidth: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    background: T.parchment,
                    border: `1px solid ${T.line}`,
                    borderRadius: 999,
                    padding: '7px 14px',
                    fontSize: 13,
                    color: T.inkSoft,
                    cursor: 'pointer',
                    transition: 'border-color 0.15s, color 0.15s, background 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = T.gold;
                    e.currentTarget.style.color = T.goldDark;
                    e.currentTarget.style.background = 'rgba(196,129,58,0.07)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = T.line;
                    e.currentTarget.style.color = T.inkSoft;
                    e.currentTarget.style.background = T.parchment;
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          );
        })()}
        <div
          style={{
            maxWidth: 720,
            margin: '0 auto',
            display: 'flex',
            gap: 10,
            alignItems: 'flex-end',
          }}
        >
          <textarea
            ref={taRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={atLimit ? 'Upgrade to keep the conversation going…' : 'Ask anything about faith, God, or the Bible…'}
            rows={1}
            disabled={busy || showGuestWall || atLimit}
            style={{
              flex: 1,
              resize: 'none',
              border: `1px solid ${T.line}`,
              borderRadius: 18,
              padding: '12px 16px',
              fontSize: 15,
              lineHeight: 1.5,
              background: T.cream,
              color: T.ink,
              outline: 'none',
              fontFamily: T.sans,
              maxHeight: 200,
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = T.gold)}
            onBlur={(e) => (e.currentTarget.style.borderColor = T.line)}
          />
          {micSupported && (
            <button
              onClick={toggleMic}
              title={micListening ? 'Stop listening' : 'Speak your question'}
              style={{
                background: micListening ? 'rgba(220,38,38,0.1)' : 'transparent',
                border: `1px solid ${micListening ? 'rgba(220,38,38,0.4)' : T.line}`,
                color: micListening ? '#dc2626' : T.inkMuted,
                borderRadius: 999, width: 42, height: 42, flexShrink: 0,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
                animation: micListening ? 'micPulse 1.2s ease-in-out infinite' : 'none',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4z"/>
                <path d="M19 10a7 7 0 0 1-14 0H3a9 9 0 0 0 8 8.94V22h2v-3.06A9 9 0 0 0 21 10z"/>
              </svg>
            </button>
          )}
          <button
            onClick={() => send()}
            disabled={busy || !input.trim()}
            style={{
              background: busy || !input.trim() ? T.line : `linear-gradient(135deg, ${T.gold} 0%, #c47020 100%)`,
              color: T.cream,
              border: 'none',
              borderRadius: 999,
              padding: '12px 22px',
              fontSize: 14,
              fontWeight: 600,
              cursor: busy || !input.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: busy || !input.trim() ? 'none' : '0 4px 14px rgba(196,129,58,0.35)',
            }}
          >
            Send
          </button>
        </div>
        {!panelMode && (
          <div
            style={{
              maxWidth: 720,
              margin: '8px auto 0',
              fontSize: 11,
              color: T.inkMuted,
              textAlign: 'center',
            }}
          >
            Every claim referenced. The Way won't always be right — but it will always show its work.
          </div>
        )}
      </div>
      {showGuestWall && <GuestWall onSignUp={onSignUp} />}
      {shareContent && (
        <ChatShareSheet
          text={shareContent.text}
          label={shareContent.label}
          rawMessages={shareContent.rawMessages}
          convTitle={shareContent.convTitle}
          session={session}
          profile={profile}
          userGroup={userGroup}
          onClose={() => setShareContent(null)}
        />
      )}
    </div>
  );
}
