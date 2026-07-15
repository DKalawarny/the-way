import { useEffect, useMemo, useRef, useState } from 'react';
import { T } from './theme.js';
import { isNativeApp, openMailto } from './native.js';
import { markEngaged } from './streak.js';
import { KinwoveWordmark } from './components/brand/KinwoveWordmark.jsx';
import { KinwoveStar } from './components/brand/KinwoveStar.jsx';
import { PERSON_TYPES, STARTERS, DEEPER_STARTERS, ADS } from './constants.js';
import { getSystemPrompt } from './prompts.js';
import { useSpeechRecognition } from './useSpeechRecognition.js';
import { useTextToSpeech } from './useTextToSpeech.js';
import { supabase, authedFetch } from './supabase.js';
import MsgText from './MsgText.jsx';
import { useImageDrafts, ImageDraftGrid, ImageAttachButton } from './imageAttach.jsx';
import { getDailyVerse } from './dailyVerse.js';
import { useAiUsage } from './useAiUsage.js';
import AiLimitWall, { AiUsageWarning } from './AiLimitWall.jsx';
import { track } from './analytics.js';
import Tip from './Tip.jsx';
import { extractRefs, parseRef, toApiVerseId, VALIDATION_BIBLE_ID } from './bibleRefUtils.js';
import { cleanText } from './moderation.js';

const GUEST_COUNT_KEY = 'kinwove:guest_count';

// ── Chat contextual topic illustrations ──────────────────────────────────────
// Topic detection: match user question keywords → symbolic thematic accent.
// Symbols are intentionally abstract (no figurative biblical scenes)
// so they can't be theologically inaccurate.

const TOPIC_RULES = [
  { topic: 'prayer',       keywords: ['pray','prayer','intercession','petition','ask god','talk to god','communicate with'] },
  { topic: 'creation',     keywords: ['creation','created','universe','earth','big bang','evolution','genesis','how did the world'] },
  { topic: 'suffering',    keywords: ['suffer','pain','grief','loss','died','death','cancer','tragedy','why does god allow'] },
  { topic: 'forgiveness',  keywords: ['forgiv','grace','mercy','repent','sin','guilt','shame','confess'] },
  { topic: 'resurrection', keywords: ['resurrect','risen','easter','alive again','raised','empty tomb','death and life'] },
  { topic: 'scripture',    keywords: ['bible','verse','scripture','word of god','passage','old testament','new testament','book of'] },
  { topic: 'salvation',    keywords: ['saved','salvation','eternal life','heaven','born again','accept jesus','gospel'] },
  { topic: 'doubt',        keywords: ['doubt','skeptic','proof','evidence','believe','trust god','where is god','is god real','atheist'] },
  { topic: 'peace',        keywords: ['anxiety','worry','fear','peace','calm','stress','overwhelm','rest','weary'] },
  { topic: 'love',         keywords: ['love','marriage','relationship','family','loneliness','belong','community'] },
  { topic: 'purpose',      keywords: ['purpose','calling','mission','why am i here','meaning','direction','vocation'] },
  { topic: 'worship',      keywords: ['worship','praise','sing','church','hymn','devotion','grateful','thankful'] },
];

function detectTopic(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const rule of TOPIC_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) return rule.topic;
  }
  return null;
}

// Small inline SVG accent for each topic (36×36 viewBox, rendered at 28px)
function TopicIcon({ topic, size = 28 }) {
  const c = T.gold;
  const icons = {
    prayer: (
      <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden>
        {/* Dove */}
        <path d="M18 22 Q10 18 7 11 Q15 9 21 14" fill={c} opacity="0.8"/>
        <path d="M18 22 Q12 26 7 27 Q11 22 18 22" fill={c} opacity="0.5"/>
        <ellipse cx="21" cy="20" rx="7" ry="4.5" fill={c} opacity="0.85"/>
        <path d="M26 17 Q31 13 33 9 Q31 15 27 19" fill={c} opacity="0.75"/>
        <circle cx="24" cy="18" r="1.1" fill="rgba(30,10,0,0.35)"/>
      </svg>
    ),
    creation: (
      <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden>
        {/* Sunrise */}
        <path d="M6 22 Q18 12 30 22" stroke={c} strokeWidth="1.8" strokeLinecap="round" fill="none"/>
        <circle cx="18" cy="22" r="6" fill="none" stroke={c} strokeWidth="1.8"/>
        {['0','45','90','135','180','225','270','315'].map((deg, i) => {
          const r = parseFloat(deg) * Math.PI / 180;
          const x1 = 18 + 9 * Math.cos(r), y1 = 22 + 9 * Math.sin(r);
          const x2 = 18 + 12 * Math.cos(r), y2 = 22 + 12 * Math.sin(r);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeWidth="1.4" strokeLinecap="round" opacity={y1 < 22 ? 0.85 : 0.35}/>;
        })}
      </svg>
    ),
    suffering: (
      <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden>
        {/* Candle with gentle flame */}
        <rect x="15" y="20" width="6" height="12" rx="2" fill="none" stroke={c} strokeWidth="1.8"/>
        <path d="M18 20 Q14 15 16 8 Q18 13 18 17 Q18 13 20 8 Q22 15 18 20" fill={c} opacity="0.8"/>
        <path d="M18 18 Q17 14 17.5 11 Q18 13 18 16 Q18 13 18.5 11 Q19 14 18 18" fill="rgba(255,220,100,0.5)"/>
        <line x1="10" y1="32" x2="26" y2="32" stroke={c} strokeWidth="1.8" strokeLinecap="round" opacity="0.5"/>
      </svg>
    ),
    forgiveness: (
      <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden>
        {/* Open hands, palms up */}
        <path d="M6 20 Q6 14 10 13 Q13 12 14 16 L14 24" stroke={c} strokeWidth="1.8" fill="none" strokeLinecap="round"/>
        <path d="M30 20 Q30 14 26 13 Q23 12 22 16 L22 24" stroke={c} strokeWidth="1.8" fill="none" strokeLinecap="round"/>
        <path d="M8 24 Q8 28 18 28 Q28 28 28 24" stroke={c} strokeWidth="1.8" fill="none" strokeLinecap="round"/>
        <path d="M14 24 L22 24" stroke={c} strokeWidth="1.4" strokeLinecap="round" opacity="0.6"/>
        {/* Small descending sparkle above */}
        <circle cx="18" cy="9" r="1.5" fill={c} opacity="0.7"/>
        <line x1="18" y1="11" x2="18" y2="13" stroke={c} strokeWidth="1.2" strokeLinecap="round" opacity="0.5"/>
      </svg>
    ),
    resurrection: (
      <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden>
        {/* Simple cross with sunrise rays — empty tomb sunrise */}
        <line x1="18" y1="6" x2="18" y2="26" stroke={c} strokeWidth="2.2" strokeLinecap="round"/>
        <line x1="10" y1="13" x2="26" y2="13" stroke={c} strokeWidth="2.2" strokeLinecap="round"/>
        {/* Subtle rays */}
        {[-45, 0, 45].map((deg, i) => {
          const r = deg * Math.PI / 180;
          return <line key={i} x1={18 + 14 * Math.sin(r)} y1={28 - 14 * Math.cos(r)} x2={18 + 18 * Math.sin(r)} y2={28 - 18 * Math.cos(r)} stroke={c} strokeWidth="1.2" strokeLinecap="round" opacity="0.45"/>;
        })}
        <path d="M4 28 Q18 20 32 28" stroke={c} strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.4"/>
      </svg>
    ),
    scripture: (
      <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden>
        {/* Open scroll */}
        <path d="M7 8 Q7 5 11 5 L25 5 Q29 5 29 8 L29 28 Q29 31 25 31 L11 31 Q7 31 7 28 Z" fill="none" stroke={c} strokeWidth="1.8"/>
        <path d="M7 8 Q3 8 3 11 Q3 14 7 14" stroke={c} strokeWidth="1.5" fill="none"/>
        <path d="M7 28 Q3 28 3 25 Q3 22 7 22" stroke={c} strokeWidth="1.5" fill="none"/>
        <line x1="12" y1="13" x2="24" y2="13" stroke={c} strokeWidth="1.3" opacity="0.65"/>
        <line x1="12" y1="18" x2="24" y2="18" stroke={c} strokeWidth="1.3" opacity="0.65"/>
        <line x1="12" y1="23" x2="20" y2="23" stroke={c} strokeWidth="1.3" opacity="0.65"/>
      </svg>
    ),
    salvation: (
      <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden>
        {/* Eight-pointed star */}
        <path d="M18 4 L20 14 L29 7 L22 16 L32 18 L22 20 L29 29 L20 22 L18 32 L16 22 L7 29 L14 20 L4 18 L14 16 L7 7 L16 14 Z" fill={c} opacity="0.85"/>
        <circle cx="18" cy="18" r="3.5" fill="rgba(255,220,100,0.45)"/>
      </svg>
    ),
    doubt: (
      <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden>
        {/* Magnifying glass with question mark */}
        <circle cx="16" cy="16" r="9" fill="none" stroke={c} strokeWidth="1.8"/>
        <line x1="22" y1="22" x2="30" y2="30" stroke={c} strokeWidth="2" strokeLinecap="round"/>
        <path d="M13 12 Q13 10 16 10 Q19 10 19 13 Q19 15 16 16" stroke={c} strokeWidth="1.6" fill="none" strokeLinecap="round"/>
        <circle cx="16" cy="19" r="1.2" fill={c}/>
      </svg>
    ),
    peace: (
      <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden>
        {/* Olive branch — two small leaves on a stem */}
        <path d="M18 30 Q14 22 12 16 Q16 14 18 18" stroke={c} strokeWidth="1.6" fill="none" strokeLinecap="round"/>
        <path d="M12 16 Q8 12 10 8 Q14 10 12 16" fill={c} opacity="0.7"/>
        <path d="M14 20 Q10 18 11 14 Q15 15 14 20" fill={c} opacity="0.55"/>
        <path d="M18 18 Q22 14 20 10 Q16 12 18 18" fill={c} opacity="0.7"/>
        <path d="M18 24 Q22 22 22 17 Q18 18 18 24" fill={c} opacity="0.55"/>
      </svg>
    ),
    love: (
      <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden>
        {/* Two connected circles (community) */}
        <circle cx="13" cy="18" r="7" fill="none" stroke={c} strokeWidth="1.8"/>
        <circle cx="23" cy="18" r="7" fill="none" stroke={c} strokeWidth="1.8"/>
        <path d="M18 12 Q21 10 24 12" stroke={c} strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.5"/>
      </svg>
    ),
    purpose: (
      <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden>
        {/* Compass rose */}
        <circle cx="18" cy="18" r="12" fill="none" stroke={c} strokeWidth="1.6" opacity="0.5"/>
        <polygon points="18,6 20,16 18,18 16,16" fill={c} opacity="0.9"/>
        <polygon points="18,30 20,20 18,18 16,20" fill={c} opacity="0.45"/>
        <polygon points="6,18 16,16 18,18 16,20" fill={c} opacity="0.45"/>
        <polygon points="30,18 20,20 18,18 20,16" fill={c} opacity="0.45"/>
        <circle cx="18" cy="18" r="2.5" fill={c}/>
      </svg>
    ),
    worship: (
      <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden>
        {/* Lyre */}
        <path d="M11 30 Q7 20 11 10 Q18 4 25 10 Q29 20 25 30" stroke={c} strokeWidth="1.8" fill="none" strokeLinecap="round"/>
        <line x1="11" y1="30" x2="25" y2="30" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="15" y1="30" x2="15" y2="14" stroke={c} strokeWidth="1.2" opacity="0.7"/>
        <line x1="18" y1="30" x2="18" y2="11" stroke={c} strokeWidth="1.2" opacity="0.7"/>
        <line x1="21" y1="30" x2="21" y2="14" stroke={c} strokeWidth="1.2" opacity="0.7"/>
        <line x1="9" y1="19" x2="27" y2="19" stroke={c} strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  };
  return icons[topic] ? (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      {icons[topic]}
    </span>
  ) : null;
}

// PersonType welcome illustration — shows above starter questions
function PersonTypeWelcome({ personType }) {
  // Keys MUST match the real PERSON_TYPES ids in constants.js — otherwise every
  // type falls back to "Curious" and the app misidentifies who it's talking to.
  const config = {
    curious:       { icon: 'doubt',    label: 'Curious',       desc: 'Every honest question is a door worth opening.' },
    seeking:       { icon: 'peace',    label: 'Seeking',       desc: 'Whatever brought you here matters.' },
    skeptic:       { icon: 'doubt',    label: 'Skeptical',     desc: 'Doubt deserves honest answers, not deflection.' },
    'heard-things':{ icon: 'suffering',label: 'Heard things',  desc: 'Let\'s look at what\'s true and what isn\'t.' },
    'new-faith':   { icon: 'creation', label: 'New to faith',  desc: 'Welcome. There\'s no wrong place to begin.' },
    deeper:        { icon: 'scripture',label: 'Going deeper',  desc: 'Go further into what you already hold as true.' },
    'inter-faith': { icon: 'peace',    label: 'Comparing faiths', desc: 'Honest questions across traditions, no pressure.' },
    kids:          { icon: 'creation', label: 'For kids',      desc: 'Big questions, made simple and kind.' },
    relationships: { icon: 'peace',    label: 'Relationships', desc: 'Real people, real situations — through a faith lens.' },
    life:          { icon: 'scripture',label: 'Life Questions',desc: 'Real life, grounded in scripture.' },
  };
  const c = config[personType] ?? config.curious;
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      marginBottom: 24,
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        background: 'rgba(184,115,58,0.10)',
        border: `1px solid rgba(184,115,58,0.22)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 10,
      }}>
        <TopicIcon topic={c.icon} size={32} />
      </div>
      <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: T.goldDark, marginBottom: 4, opacity: 0.8 }}>
        {c.label}
      </div>
      <div style={{ fontSize: 13, color: T.inkMuted, fontFamily: T.serif, fontStyle: 'italic', lineHeight: 1.5 }}>
        {c.desc}
      </div>
    </div>
  );
}

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
      <KinwoveStar size={9} color={T.gold} />
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
      <div style={{ background: T.ink, borderRadius: 24, padding: '44px 32px', maxWidth: 400, width: '100%', textAlign: 'center', border: '1px solid rgba(184,115,58,0.3)', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}>
        <svg width="28" height="28" viewBox="0 0 28 28" style={{ marginBottom: 22 }}>
          <line x1="14" y1="0" x2="14" y2="28" stroke="#A85530" strokeWidth="2"/>
          <line x1="0" y1="14" x2="28" y2="14" stroke="#A85530" strokeWidth="2"/>
        </svg>
        <div style={{ fontFamily: T.serif, fontSize: 30, fontWeight: 600, color: T.cream, letterSpacing: '-0.02em', lineHeight: 1.12, marginBottom: 14 }}>
          This conversation is worth keeping.
        </div>
        <div style={{ fontSize: 15, color: 'rgba(253,248,240,0.5)', lineHeight: 1.7, marginBottom: 32 }}>
          You've had 3 free exchanges. Create a free account to keep going, save your notes, and join the community.
        </div>
        <button onClick={onSignUp} style={{ background: T.gold, color: T.cream, border: 'none', borderRadius: 999, padding: '15px 0', fontSize: 15, fontWeight: 600, cursor: 'pointer', width: '100%', marginBottom: 12, boxShadow: '0 4px 20px rgba(184,115,58,0.4)' }}>
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
    else if (m.role === 'assistant' && m.content) parts.push(`kinwove:\n${m.content}`);
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
  const imageDrafts = useImageDrafts(4);

  useEffect(() => {
    async function createShareLink() {
      const id = Math.random().toString(36).slice(2, 9);
      const msgs = rawMessages ?? [{ role: 'assistant', content: text }];
      const { error } = await supabase.from('shared_conversations').insert({
        id,
        title: convTitle ?? 'A response from kinwove',
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
            internal: true,
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
    const image_urls = await imageDrafts.uploadAll(session.user.id);
    const body_data = image_urls.length ? { image_urls } : {};
    const { error } = await supabase.from('posts').insert({
      author_id: session.user.id,
      body: getBody().slice(0, 2000),
      body_data,
      scope: 'me',
      visibility: 'public',
      kind: 'text',
      person_type: profile?.person_type ?? null,
    });
    if (!error) {
      imageDrafts.clear();
      setPosted(true); setTimeout(onClose, 900);
    }
  }

  async function handleGroupShare() {
    if (!session || !userGroup) return;
    const image_urls = await imageDrafts.uploadAll(session.user.id);
    await supabase.from('group_posts').insert({
      group_id: userGroup.group.id,
      author_id: session.user.id,
      body: getBody().slice(0, 2000),
      image_urls,
    });
    imageDrafts.clear();
    setGroupShared(true);
    setTimeout(onClose, 900);
  }

  async function handleNativeShare() {
    try {
      await navigator.share({ title: heading || 'kinwove', text: getBody() });
      onClose();
    } catch (e) {
      if (e.name !== 'AbortError') {
        openMailto(`mailto:?subject=${encodeURIComponent(heading || 'From kinwove')}&body=${encodeURIComponent(getBody())}`);
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
    window.open(`mailto:?subject=${encodeURIComponent(heading || 'From kinwove')}&body=${encodeURIComponent(getBody())}`);
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
    try {
      const uid = session.user.id;
      const sorted = [uid, contact.id].sort();
      const { data: existing } = await supabase
        .from('dm_conversations').select('id')
        .contains('participant_ids', sorted).maybeSingle();
      let convId = existing?.id;
      if (!convId) {
        const { data: created } = await supabase
          .from('dm_conversations').insert({ participant_ids: sorted })
          .select('id').single();
        convId = created?.id;
      }
      if (convId) {
        await supabase.from('dm_messages').insert({
          conversation_id: convId,
          sender_id: uid,
          body: getBody(),
        });
      }
      setTimeout(onClose, 1500);
    } catch {
      setSentTo(null);
    }
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
    // Web-intent items use window.open, which returns null inside the native
    // webview — there "Send via…" (system share) covers these apps instead.
    !isNativeApp && {
      icon: '📘', label: 'Share to Facebook',
      sub: 'Post to your timeline or to a group', onClick: handleFacebook, done: false,
    },
    !isNativeApp && {
      icon: '💬', label: messengerNote ? 'Copied — paste in Messenger' : 'Send via Messenger',
      sub: 'Opens Messenger; text is copied to paste', onClick: handleMessenger, done: messengerNote,
    },
    !isNativeApp && {
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: T.line, margin: '0 auto', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }} />
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{
            background: T.parchment, border: 'none', borderRadius: 999,
            cursor: 'pointer', color: T.ink, fontSize: 13, fontWeight: 600,
            padding: '5px 14px', fontFamily: T.sans,
          }}>Close</button>
        </div>

        {session && (
          <div style={{ marginBottom: 16 }}>
            <ImageDraftGrid drafts={imageDrafts.drafts} onRemove={imageDrafts.remove} />
            <div style={{ marginTop: imageDrafts.drafts.length ? 8 : 0 }}>
              <ImageAttachButton
                drafts={imageDrafts.drafts} max={imageDrafts.max}
                fileInputRef={imageDrafts.fileInputRef} onPick={imageDrafts.pick}
                label={imageDrafts.drafts.length ? '📷 Add another' : '📷 Attach a photo'}
              />
            </div>
          </div>
        )}

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
              <KinwoveStar size={10} color={T.gold} />
              <span style={{ fontSize: 11, color: T.inkMuted }}>
                {headingLoading ? 'AI is writing a heading…' : 'AI suggested · tap to edit'}
              </span>
            </div>
            {shareUrl ? (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: 'rgba(184,115,58,0.10)', borderRadius: 6,
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

// ── Capability hint strip near the camera / attach button ────────────────────
const IMG_HINTS = [
  { icon: '📷', text: 'Attach a photo — Bible pages, handwritten notes, journal entries' },
  { icon: '📜', text: 'Photo a Hebrew scroll or Greek manuscript — kinwove can read it' },
  { icon: '🔤', text: 'Ask about the original Hebrew or Greek word behind any translation' },
  { icon: '✍️', text: 'Snap a handwritten question or note and ask about it' },
];

function _ImgHint({ C }) {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setInterval(() => {
      setVisible(false);
      setTimeout(() => { setIdx((i) => (i + 1) % IMG_HINTS.length); setVisible(true); }, 280);
    }, 5000);
    return () => clearInterval(t);
  }, []);
  const h = IMG_HINTS[idx];
  return (
    <div style={{ maxWidth: 720, margin: '0 auto 6px', display: 'flex', alignItems: 'center', gap: 6, minHeight: 18 }}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.45, flexShrink: 0 }}>
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
        <circle cx="12" cy="13" r="4"/>
      </svg>
      <span
        style={{
          fontSize: 11, color: C.muted, letterSpacing: '0.01em',
          opacity: visible ? 0.6 : 0,
          transition: 'opacity 0.25s ease',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}
      >
        {h.icon} {h.text}
      </span>
    </div>
  );
}

const CHAT_LIGHT = {
  bg: '#FDF8F0', text: T.ink, muted: T.inkMuted, textSoft: T.inkSoft,
  border: T.line, headerBg: '#FFFFFF', footerBg: '#FFFFFF',
  card: '#F5ECD9', inputBg: '#FDF8F0',
};
const CHAT_DARK = {
  bg: '#0E0906', text: 'rgba(253,248,240,0.92)', muted: 'rgba(253,248,240,0.45)',
  textSoft: 'rgba(253,248,240,0.6)', border: 'rgba(184,115,58,0.2)',
  headerBg: '#1A0E07', footerBg: '#120A05',
  card: 'rgba(255,255,255,0.06)', inputBg: 'rgba(255,255,255,0.07)',
};

export default function Chat({
  personType,
  seekingContext,
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
  onUpgrade,
  profile,
  session,
  onSignUp,
  preferredLanguage,
  initialMessages,
  onMessagesChange,
  conversations,
  userGroup,
  panelMode,
  scrollToMsg,
  onClose,
  docked,
  canDock,
  onToggleDock,
  onNewConversation,
  onDeleteConversation,
  onSetPersonType,
  seededFromNote,
}) {
  const aiPlan = profile?.plan ?? 'free';
  const [dark, setDark] = useState(() => localStorage.getItem('chat_dark') === '1');
  const C = dark ? CHAT_DARK : CHAT_LIGHT;
  function toggleDark() { setDark((d) => { localStorage.setItem('chat_dark', d ? '0' : '1'); return !d; }); }

  const [messages, setMessages] = useState(initialMessages ?? []);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  // When a send fails before any answer arrived, holds {prompt, img} so the
  // error banner's Retry can replay the exact same question.
  const [retryPayload, setRetryPayload] = useState(null);
  const [savedIdx, setSavedIdx] = useState(() => new Set());
  const [copiedIdx, setCopiedIdx] = useState(null);
  // ── Scripture verification + flag state ──────────────────────────────────
  const [refStatusMap,  setRefStatusMap]  = useState({}); // { [msgIdx]: Map<refRaw, 'ok'|'invalid'|'loading'> }
  const [flaggedMsgs,   setFlaggedMsgs]   = useState(new Set());
  const [flagToast,     setFlagToast]     = useState(false);
  const [versePopover,  setVersePopover]  = useState(null); // { refRaw, verseId, text } | null
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
  const showGuestWall = !session && guestCount >= 3;
  const [suggestions, setSuggestions] = useState([]);
  const listRef = useRef(null);
  const taRef = useRef(null);
  const userScrolledRef = useRef(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const { listening: micListening, toggle: toggleMic, supported: micSupported } =
    useSpeechRecognition((t) => { setInput(t); taRef.current?.focus(); });

  // ── Image attachment (vision) ──────────────────────────────────────────────
  const [attachedImg, setAttachedImg] = useState(null); // { base64, mediaType, previewUrl }
  const imgInputRef = useRef(null);

  function pickImage() { imgInputRef.current?.click(); }

  function onImagePicked(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) { alert('Please attach a JPEG, PNG, GIF, or WebP image.'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5 MB.'); return; }
    const previewUrl = URL.createObjectURL(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      // dataUrl = "data:image/jpeg;base64,/9j/..."
      const base64 = dataUrl.split(',')[1];
      setAttachedImg({ base64, mediaType: file.type, previewUrl });
    };
    reader.readAsDataURL(file);
  }

  const ttsVoice = profile?.tts_voice ?? 'onyx';
  const { speakingId, paused: ttsPaused, speak: speakMsg, stop: stopSpeech, pause: pauseSpeech, resume: resumeSpeech, rewind: rewindSpeech, forward: forwardSpeech, supported: ttsSupported } = useTextToSpeech({ voice: ttsVoice });

  // ── AI usage limits ────────────────────────────────────────────────────────
  const aiUsage = useAiUsage(session?.user?.id, aiPlan);

  // ── Upgrade nudge — shown once/day when user asks 3+ deep questions ────────
  const NUDGE_KEY = 'kinwove:last_nudge_date';
  const DEEP_RE = /\b(free will|theodicy|suffering|evil|trinity|predestination|salvation|atonement|resurrection|eschatology|hermeneutic|reconcil|contradict|hypocri|doubt|deconstruct|faith crisis|why would god|how can god)\b/i;
  const [deepCount, setDeepCount] = useState(0);
  const [showNudge, setShowNudge] = useState(false);

  function maybeShowNudge(userMsg) {
    const plan = aiPlan;
    if (plan === 'premium_plus') return; // Pro users don't need nudge
    const isDeepMsg = DEEP_RE.test(userMsg) || userMsg.length > 200;
    if (!isDeepMsg) return;
    const today = new Date().toISOString().slice(0, 10);
    const lastNudge = localStorage.getItem(NUDGE_KEY);
    if (lastNudge === today) return; // already showed today
    setDeepCount((c) => {
      const next = c + 1;
      if (next >= 3) {
        setShowNudge(true);
        localStorage.setItem(NUDGE_KEY, today);
      }
      return next;
    });
  }

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

  const totalMessages = useMemo(
    () => (conversations ?? []).reduce((sum, c) => sum + (c.messages?.length ?? 0), 0),
    [conversations]
  );

  const system = useMemo(() => {
    const base = getSystemPrompt(personType, seekingContext, totalMessages);
    const lang = preferredLanguage ?? 'en';
    const LANG_NAMES = {
      es: 'Spanish', fr: 'French', pt: 'Portuguese', de: 'German',
      it: 'Italian', pl: 'Polish', ro: 'Romanian', nl: 'Dutch',
      ru: 'Russian', uk: 'Ukrainian', ja: 'Japanese', ko: 'Korean',
      zh: 'Simplified Chinese (Mandarin)', 'zh-TW': 'Traditional Chinese (Mandarin)',
      yue: 'Cantonese', hi: 'Hindi', id: 'Indonesian', tl: 'Tagalog',
      vi: 'Vietnamese', ar: 'Arabic', am: 'Amharic', sw: 'Swahili',
      yo: 'Yorùbá', ig: 'Igbo', ha: 'Hausa',
    };
    const langName = LANG_NAMES[lang] ?? lang;
    return lang !== 'en' ? `${base}\n\nRespond in ${langName}. Use the script and conventions native speakers expect.` : base;
  }, [personType, seekingContext, totalMessages, preferredLanguage]);
  const starters = useMemo(() => {
    const base = getStarters(personType, conversations ?? []);
    const verse = getDailyVerse();
    const versePrompt = `Help me understand ${verse.ref} — "${verse.text}"`;
    return [versePrompt, ...base.slice(0, 2)];
  }, [personType, conversations]);
  const person = PERSON_TYPES.find((p) => p.id === personType);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (!userScrolledRef.current) {
      // Use instant during streaming so the animation doesn't fight user scroll
      el.scrollTo({ top: el.scrollHeight, behavior: busy ? 'instant' : 'smooth' });
    }
  }, [messages, busy]);

  // On mount: if a specific message index was requested (from Go Deeper),
  // scroll to it and briefly highlight it instead of going to the bottom.
  useEffect(() => {
    if (scrollToMsg == null) return;
    const timeout = setTimeout(() => {
      const el = listRef.current?.querySelector(`[data-msg-idx="${scrollToMsg}"]`);
      if (el) {
        userScrolledRef.current = true; // prevent auto-scroll-to-bottom overriding us
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.transition = 'background 0.3s';
        el.style.background = 'rgba(184,115,58,0.12)';
        setTimeout(() => { if (el) el.style.background = ''; }, 2500);
      }
    }, 150);
    return () => clearTimeout(timeout);
  }, []); // intentionally runs once on mount only

  function resetScroll() {
    userScrolledRef.current = false;
    setShowScrollBtn(false);
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }

  function handleListScroll() {
    const el = listRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    userScrolledRef.current = !nearBottom;
    setShowScrollBtn(!nearBottom);
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

  // ── Validate scripture refs against Bible API (background, after stream) ──
  async function validateRefsForMsg(msgIdx, fullText) {
    const refs = extractRefs(fullText);
    if (refs.size === 0) return;
    // Mark all refs as loading
    setRefStatusMap((prev) => ({
      ...prev,
      [msgIdx]: new Map([...refs.keys()].map((r) => [r, 'loading'])),
    }));
    const results = new Map();
    await Promise.all(
      [...refs.entries()].map(async ([raw, verseId]) => {
        try {
          const res = await fetch(`/api/bible/${VALIDATION_BIBLE_ID}/verses/${verseId}`);
          results.set(raw, res.ok ? 'ok' : 'invalid');
        } catch {
          results.set(raw, 'invalid');
        }
      })
    );
    setRefStatusMap((prev) => ({ ...prev, [msgIdx]: results }));
  }

  async function handleFlag(msgIdx, msgText) {
    setFlaggedMsgs((prev) => new Set([...prev, msgIdx]));
    setFlagToast(true);
    setTimeout(() => setFlagToast(false), 3000);
    try {
      await authedFetch('/api/ai-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_text: msgText?.slice(0, 4000) }),
      });
    } catch { /* fire-and-forget */ }
  }

  async function handleRefClick(refRaw) {
    const parsed = parseRef(refRaw);
    if (!parsed) return;
    const verseId = toApiVerseId(parsed);
    setVersePopover({ refRaw, verseId, text: null });
    try {
      const res = await fetch(`/api/bible/${VALIDATION_BIBLE_ID}/verses/${verseId}`);
      if (res.ok) {
        const json = await res.json();
        const verseText = json?.data?.content ?? null;
        setVersePopover({ refRaw, verseId, text: verseText });
      } else {
        setVersePopover(null);
      }
    } catch {
      setVersePopover(null);
    }
  }

  async function fetchSuggestions(msgs) {
    if (msgs.length < 2) return;
    const lastPair = msgs.slice(-2);
    try {
      const res = await authedFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: 'You suggest what the USER might want to ask next — not what the AI would ask the user. Output ONLY a JSON array of exactly 3 short questions written from the user\'s perspective, as if they are typing their next message. Each must be under 10 words, feel natural and curious, and make sense as something a person seeking faith answers would genuinely type. No explanation, no markdown — just the raw JSON array. Example: ["Why did God allow this?","How does this connect to Jesus?","What does the original Hebrew say?"]',
          messages: [{ role: 'user', content: lastPair.map((m) => `${m.role === 'user' ? 'Q' : 'A'}: ${m.content.slice(0, 300)}`).join('\n') + '\n\nSuggest 3 questions the user might type next.' }],
          personType: 'curious',
          internal: true,
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

  async function send(text, imgOverride) {
    const prompt = (text ?? input).trim();
    // imgOverride carries the image through a Retry, where attachedImg is already cleared
    const img = imgOverride ?? attachedImg;
    if (!prompt && !img) return;
    if (busy) return;
    if (aiUsage.atLimit) return; // hard gate — UI should prevent this anyway
    markEngaged();
    resetScroll();
    setInput('');
    setError(null);
    setRetryPayload(null);
    setSuggestions([]);
    setTimeout(() => taRef.current?.focus(), 0);

    if (attachedImg) setAttachedImg(null);

    // Display message: profanity-cleaned for the visible chat bubble.
    // The raw prompt is kept for the API message so Claude still understands
    // the question — e.g. someone quoting offensive language they've encountered.
    const displayMsg = { role: 'user', content: cleanText(prompt) || '(image)', _imagePreview: img?.previewUrl };

    // API message: multimodal content if image attached, plain string otherwise
    const apiMsg = img
      ? {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: img.mediaType, data: img.base64 } },
            ...(prompt ? [{ type: 'text', text: prompt }] : []),
          ],
        }
      : { role: 'user', content: prompt };

    // UI messages (for display) — history uses plain string content
    const next = [...messages, displayMsg];
    setMessages(next);
    setBusy(true);
    let assistantContent = '';

    // API messages — previous turns use plain text; only this turn can be multimodal
    const apiMessages = [
      ...messages.map((m) => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : (m._apiContent ?? m.content),
      })),
      apiMsg,
    ];

    // Watchdog: if no bytes arrive for 45s (including time-to-first-byte), abort
    // the stream so `busy` never locks the composer forever on a hung connection.
    const controller = new AbortController();
    let watchdog = null;
    const armWatchdog = () => {
      clearTimeout(watchdog);
      watchdog = setTimeout(() => controller.abort(), 45000);
    };

    try {
      armWatchdog();
      const res = await authedFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // groundCommentary: when the question names a passage, the server pulls
        // real public-domain commentary text so citations are quoted, not
        // recalled. No-op (and no cost) for non-passage questions.
        body: JSON.stringify({ system, messages: apiMessages, personType, seekingContext, plan: aiPlan, groundCommentary: true }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        let detail = '';
        try { detail = JSON.parse(await res.text())?.message ?? ''; } catch {}
        const err = new Error(detail || `HTTP ${res.status}`);
        err.status = res.status;
        throw err;
      }

      setMessages((m) => [...m, { role: 'assistant', content: '' }]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        armWatchdog();
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
      console.error('[kinwove] chat error:', e);
      if (!assistantContent) {
        // Nothing arrived — roll the failed turn back so Retry replays it cleanly.
        // (No Retry on 429: replaying a limit error would just fail again.)
        setMessages(messages);
        if (e?.status !== 429) setRetryPayload({ prompt, img });
      } else {
        // A partial answer is on screen — keep it, just drop an empty tail bubble.
        setMessages((m) => (m.at(-1)?.role === 'assistant' && m.at(-1).content === '' ? m.slice(0, -1) : m));
      }
      if (e?.status === 429) {
        setError(e.message || 'You’ve reached your questions for now.');
      } else if (assistantContent) {
        setError('That answer got cut off partway — sorry about that. Ask again and it’ll pick the thought back up.');
      } else if (e?.name === 'AbortError') {
        setError('That answer took too long to arrive — it happens sometimes. Tap Retry and we’ll try again.');
      } else {
        setError('That one didn’t come through — a hiccup on our end, not yours. Your question is safe; tap Retry.');
      }
    } finally {
      clearTimeout(watchdog);
      setBusy(false);
      if (assistantContent && session) { aiUsage.increment(); track('ai_question', { plan: aiPlan }); }
      // Validate refs in the background — does not block UI
      if (assistantContent) {
        const lastAssistantIdx = next.length; // next = messages + user msg; assistant msg is appended after
        validateRefsForMsg(lastAssistantIdx, assistantContent).catch(() => {});
      }
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
        const lastUser = next.filter((m) => m.role === 'user').at(-1)?.content ?? '';
        maybeShowNudge(typeof lastUser === 'string' ? lastUser : prompt);
      }
    }
  }

  return (
    <div
      style={{
        height: panelMode ? '100%' : undefined,
        minHeight: panelMode ? undefined : '100vh',
        background: C.bg,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflowX: 'hidden',
        width: '100%',
      }}
    >
      <header
        style={{
          padding: '12px 16px',
          background: panelMode ? '#1e1208' : C.headerBg,
          borderBottom: panelMode ? 'none' : `1px solid ${C.border}`,
          boxShadow: 'none',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {panelMode && (
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: 'rgba(253,248,240,0.7)', fontSize: 16, cursor: 'pointer', padding: '4px 8px', lineHeight: 1, borderRadius: 8 }}>
              ×
            </button>
          )}
          {!panelMode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
              <KinwoveWordmark size={26} textColor={C.text} starColor={T.honey} />
            </div>
          )}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setModePickerOpen((v) => !v)}
              style={{
                background: modePickerOpen
                  ? 'rgba(184,115,58,0.22)'
                  : (panelMode ? 'rgba(255,255,255,0.08)' : C.card),
                border: `1px solid ${modePickerOpen ? T.gold : (panelMode ? 'rgba(184,115,58,0.35)' : C.border)}`,
                borderRadius: 999, padding: '4px 12px',
                fontSize: 12, color: panelMode ? '#e8b563' : (modePickerOpen ? T.goldDark : C.textSoft),
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
                position: 'fixed', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                background: T.white, border: `1px solid ${T.line}`,
                borderRadius: 16, boxShadow: '0 12px 48px rgba(44,24,16,0.18)',
                padding: 10, zIndex: 200,
                width: 'min(calc(100vw - 32px), 420px)',
                maxHeight: '85vh', overflowY: 'auto',
              }}>
                <div style={{ padding: '2px 4px 8px', fontSize: 10, letterSpacing: '0.07em', textTransform: 'uppercase', color: T.inkMuted, fontWeight: 700 }}>
                  Switch mode
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {PERSON_TYPES.map((pt) => {
                    const active = pt.id === personType;
                    return (
                      <button
                        key={pt.id}
                        onClick={() => { setModePickerOpen(false); onSetPersonType?.(pt.id); }}
                        onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(184,115,58,0.06)'; }}
                        onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = T.parchment; }}
                        style={{
                          textAlign: 'left', cursor: 'pointer',
                          background: active ? 'rgba(184,115,58,0.10)' : T.parchment,
                          border: `1.5px solid ${active ? T.gold : 'transparent'}`,
                          borderRadius: 12, padding: '10px 10px',
                          transition: 'background 0.12s',
                          position: 'relative',
                        }}
                      >
                        {active && (
                          <span style={{
                            position: 'absolute', top: 7, right: 9,
                            fontSize: 10, color: T.goldDark, fontWeight: 700,
                          }}>✓</span>
                        )}
                        <div style={{ fontSize: 20, marginBottom: 5, lineHeight: 1 }}>{pt.emoji}</div>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: active ? T.goldDark : T.ink, marginBottom: 3 }}>{pt.label}</div>
                        <div style={{ fontSize: 10.5, color: T.inkMuted, lineHeight: 1.45 }}>{pt.description}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              style={{
                background: menuOpen ? 'rgba(184,115,58,0.18)' : (panelMode ? 'rgba(255,255,255,0.08)' : 'transparent'),
                border: `1px solid ${menuOpen ? T.gold : (panelMode ? 'rgba(184,115,58,0.35)' : C.border)}`,
                color: panelMode ? 'rgba(253,248,240,0.75)' : C.textSoft, borderRadius: 999,
                padding: '6px 12px', fontSize: 16, cursor: 'pointer',
                lineHeight: 1,
              }}
            >
              ⋮
            </button>
            {menuOpen && (
              <div
                onClick={() => setMenuOpen(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 199 }}
              />
            )}
            {menuOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                background: C.headerBg, border: `1px solid ${C.border}`,
                borderRadius: 14, boxShadow: '0 8px 32px rgba(44,24,16,0.18)',
                overflow: 'hidden', minWidth: 200, zIndex: 200,
              }}>
                <button onClick={() => { setMenuOpen(false); onNewConversation?.(); }} style={{
                  width: '100%', textAlign: 'left', background: 'none',
                  border: 'none', borderBottom: `1px solid ${C.border}`,
                  padding: '12px 16px', fontSize: 14, color: C.text,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <KinwoveStar size={15} style={{ flexShrink: 0 }} /><span style={{ fontWeight: 600 }}>New conversation</span>
                </button>
                <button onClick={() => { toggleDark(); setMenuOpen(false); }} style={{
                  width: '100%', textAlign: 'left', background: 'none',
                  border: 'none', borderBottom: `1px solid ${C.border}`,
                  padding: '12px 16px', fontSize: 14, color: C.text,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 15 }}>{dark ? '☀' : '🌙'}</span>
                    <span>{dark ? 'Light mode' : 'Dark mode'}</span>
                  </span>
                </button>
                {onOpenHistory && (
                  <button onClick={() => { setMenuOpen(false); onOpenHistory(); }} style={{
                    width: '100%', textAlign: 'left', background: 'none',
                    border: 'none', borderBottom: `1px solid ${C.border}`,
                    padding: '12px 16px', fontSize: 14, color: C.text,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <span style={{ fontSize: 13 }}>◷</span><span>Conversation history</span>
                  </button>
                )}
                {messages.length > 0 && (
                  <button onClick={() => { setMenuOpen(false); setShareContent({ text: formatConversation(messages, conversationTitle), label: 'Share conversation', rawMessages: messages, convTitle: conversationTitle }); }} style={{
                    width: '100%', textAlign: 'left', background: 'none',
                    border: 'none', borderBottom: `1px solid ${C.border}`,
                    padding: '12px 16px', fontSize: 14, color: C.text,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <span style={{ fontSize: 13 }}>↗</span><span>Share conversation</span>
                  </button>
                )}
                {messages.length > 0 && onDeleteConversation && (
                  <button onClick={() => { setMenuOpen(false); onDeleteConversation(); }} style={{
                    width: '100%', textAlign: 'left', background: 'none',
                    border: 'none', padding: '12px 16px', fontSize: 14,
                    color: '#c0392b', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <span style={{ fontSize: 13 }}>🗑</span><span>Delete conversation</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {seededFromNote && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: '5px 16px',
          background: panelMode ? 'rgba(184,115,58,0.08)' : 'rgba(184,115,58,0.05)',
          borderBottom: `1px solid rgba(184,115,58,0.15)`,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 11, color: T.goldDark, opacity: 0.8 }}>◷</span>
          <span style={{ fontSize: 11, color: T.inkMuted, letterSpacing: '0.01em' }}>
            Continuing from a saved note · history unavailable
          </span>
        </div>
      )}

      {/* Scroll-to-bottom button — appears when user has scrolled up */}
      {showScrollBtn && (
        <button
          onClick={resetScroll}
          style={{
            position: 'absolute',
            bottom: panelMode ? 80 : 100,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 50,
            background: T.ink,
            color: T.cream,
            border: 'none',
            borderRadius: 999,
            padding: '7px 16px',
            fontSize: 12.5,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 4px 16px rgba(44,24,16,0.25)',
            whiteSpace: 'nowrap',
          }}
        >
          ↓ {busy ? 'Still loading — scroll down' : 'Scroll to bottom'}
        </button>
      )}

      <div
        ref={listRef}
        onScroll={handleListScroll}
        className="scroll"
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: panelMode ? '20px 16px 24px' : '28px 20px 80px',
          minHeight: 0,
          boxSizing: 'border-box',
        }}
      >
        <div style={{ maxWidth: 720, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
          {personType === 'group' && session && (
            activeStudySessionId ? (
              <div style={{ background: 'rgba(34,179,105,0.07)', border: '1px solid rgba(34,179,105,0.22)', borderRadius: 12, padding: '12px 16px', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#6B8758', animation: 'bounce 2s infinite ease-in-out' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>Live session active</span>
                  <button onClick={endStudySession} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: T.inkMuted, fontSize: 12, cursor: 'pointer', padding: 0 }}>End session</button>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ flex: 1, fontFamily: 'monospace', fontSize: 11, background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 10px', color: C.textSoft, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {sessionLink}
                  </div>
                  <button onClick={copySessionLink} style={{ background: T.gold, color: T.cream, border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    {sessionLinkCopied ? 'Copied ✓' : 'Copy link'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 20 }}>👥</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Group Study mode</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Start a live session your group can follow along</div>
                </div>
                <button onClick={startStudySession} style={{ background: T.gold, color: T.cream, border: 'none', borderRadius: 999, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Start session
                </button>
              </div>
            )
          )}

          {messages.length === 0 && (
            <div
              className="fade-up"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                padding: '20px 12px 0',
              }}
            >
              <PersonTypeWelcome personType={personType} />
              <div style={{ fontFamily: T.serif, fontSize: 26, color: C.text, marginBottom: 8, fontWeight: 500, letterSpacing: '-0.01em' }}>
                Take your time.
              </div>
              <div style={{ fontSize: 14.5, color: C.muted, lineHeight: 1.55, maxWidth: 360, marginBottom: 22 }}>
                Ask anything — a question, a doubt, a verse you want to understand.
              </div>
              <div style={{
                fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase',
                color: C.muted, fontWeight: 700, marginBottom: 10,
              }}>
                Or start here
              </div>
              <div style={{
                display: 'flex', flexDirection: 'column', gap: 8,
                width: '100%', maxWidth: 440,
              }}>
                {starters.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => send(s)}
                    style={{
                      width: '100%', textAlign: 'left',
                      background: C.card, border: `1px solid ${C.border}`,
                      borderRadius: 14, padding: '13px 16px',
                      fontSize: 14, color: C.text, fontFamily: T.serif,
                      cursor: 'pointer', lineHeight: 1.45,
                      transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = T.gold;
                      e.currentTarget.style.background = 'rgba(184,115,58,0.12)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(44,24,16,0.06)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = C.border;
                      e.currentTarget.style.background = C.card;
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <KinwoveStar size={11} color={T.gold} style={{ flexShrink: 0, marginTop: 3 }} />
                    <span style={{ flex: 1 }}>{s}</span>
                  </button>
                ))}
              </div>

              <Tip
                tipId="chat_save_note"
                icon="📌"
                text="Save any answer as a note — tap the bookmark icon on a response to keep it on your board."
                style={{ marginTop: 20, width: '100%', maxWidth: 440, textAlign: 'left' }}
              />
            </div>
          )}

          {messages.map((m, i) => {
            const isAssistant = m.role === 'assistant';
            const isStreaming = isAssistant && m.content === '' && busy;
            const isLast = i === messages.length - 1;
            const canSave =
              isAssistant && !isStreaming && m.content.length > 0 && !(isLast && busy);
            const saved = savedIdx.has(i);
            const handleSave = async () => {
              if (!canSave || saved || !session?.user?.id) return;
              const prev = messages[i - 1];
              const question = prev?.role === 'user' ? prev.content : '';
              const verseMatch = question.match(/^Tell me about (.+? \d+:\d+)/);
              const title = verseMatch ? verseMatch[1] : (question.slice(0, 70) || m.content.slice(0, 70));
              const body = question ? `Q: ${question}\n\n${m.content}` : m.content;
              const { error } = await supabase.from('user_notes').insert({
                user_id: session.user.id, title, body, source: 'ask',
              });
              if (!error) setSavedIdx((s) => new Set(s).add(i));
            };
            // Topic accent: detect from the preceding user question (first AI response only per topic)
            const precedingUserMsg = isAssistant && i > 0 && messages[i - 1]?.role === 'user'
              ? messages[i - 1].content : null;
            const topicForAccent = isAssistant && i <= 2 ? detectTopic(precedingUserMsg) : null;
            return (
              <div
                key={i}
                data-msg-idx={i}
                className="fade-up"
                style={{
                  marginBottom: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: m.role === 'user' ? 'flex-end' : 'flex-start',
                  borderRadius: 8,
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              >
                {/* Subtle topic accent before first assistant response */}
                {topicForAccent && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    marginBottom: 10, opacity: 0.7,
                  }}>
                    <TopicIcon topic={topicForAccent} size={20} />
                    <div style={{ height: 1, flex: 1, background: `linear-gradient(90deg, rgba(184,115,58,0.3), transparent)` }} />
                  </div>
                )}
                <div
                  style={{
                    maxWidth: m.role === 'user' ? '80%' : '100%',
                    background: m.role === 'user' ? T.gold : 'transparent',
                    color: m.role === 'user' ? T.cream : C.text,
                    padding: m.role === 'user' ? (m._imagePreview ? '10px 10px' : '12px 18px') : '4px 0',
                    borderRadius: m.role === 'user' ? 18 : 0,
                    fontFamily: m.role === 'user' ? T.sans : T.serif,
                    fontSize: m.role === 'user' ? 15 : 17,
                    lineHeight: m.role === 'user' ? 1.5 : 1.7,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                    overflow: 'hidden',
                  }}
                >
                  {/* Image thumbnail in user bubble */}
                  {m._imagePreview && (
                    <img
                      src={m._imagePreview}
                      alt="Attached"
                      style={{ display: 'block', width: '100%', maxWidth: 240, borderRadius: 10, marginBottom: m.content && m.content !== '(image)' ? 8 : 0, objectFit: 'cover' }}
                    />
                  )}
                  {isStreaming ? <TypingDots /> : (
                    m.content && m.content !== '(image)' ? (
                      <div style={{ padding: m._imagePreview ? '2px 8px 8px' : undefined }}>
                        <MsgText
                          text={m.content}
                          onRefClick={handleRefClick}
                          refStatus={refStatusMap[i]}
                        />
                      </div>
                    ) : !m._imagePreview ? (
                      <MsgText text={m.content} onRefClick={handleRefClick} refStatus={refStatusMap[i]} />
                    ) : null
                  )}
                </div>
                {canSave && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4, marginTop: 6 }}>
                    <button
                      onClick={handleSave}
                      title={saved ? 'Saved to Notes' : 'Save to Notes'}
                      disabled={saved}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        padding: '4px 8px',
                        cursor: saved ? 'default' : 'pointer',
                        color: saved ? T.gold : C.muted,
                        fontSize: 12,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      <BookmarkIcon filled={saved} size={14} />
                      {saved ? 'Noted' : 'Note'}
                    </button>
                    <button
                      onClick={() => setShareContent({ text: m.content, label: 'Share this response', rawMessages: [{ role: 'assistant', content: m.content }] })}
                      title="Share this response"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        color: C.muted,
                        fontSize: 12,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                      Share
                    </button>
                    {!flaggedMsgs.has(i) ? (
                      <button
                        onClick={() => handleFlag(i, m.content)}
                        title="Something seems off — flag this response"
                        style={{
                          background: 'transparent', border: 'none',
                          padding: '4px 8px', cursor: 'pointer',
                          color: C.muted, fontSize: 12,
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          transition: 'color 0.2s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#c05050'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = C.muted; }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
                        </svg>
                        Flag
                      </button>
                    ) : (
                      <span style={{ padding: '4px 8px', fontSize: 12, color: C.muted }}>Flagged</span>
                    )}
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
                        color: copiedIdx === i ? T.gold : C.muted,
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
                    {ttsSupported && speakingId !== i && (
                      <button
                        onClick={() => speakMsg(i, m.content)}
                        title="Read aloud"
                        style={{ background: 'transparent', border: 'none', padding: '4px 8px', cursor: 'pointer', color: C.muted, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                          <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                        </svg>
                        Listen
                      </button>
                    )}
                    {ttsSupported && speakingId === i && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                        {/* Waveform */}
                        <span style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 2, height: 14, marginRight: 4 }}>
                          {[1, 0.5, 0.8, 0.4].map((h, k) => (
                            <span key={k} style={{ width: 3, borderRadius: 2, background: T.gold, height: `${h * 100}%`, animation: ttsPaused ? 'none' : `micPulse 0.8s ease-in-out ${k * 0.15}s infinite alternate`, opacity: ttsPaused ? 0.4 : 1 }} />
                          ))}
                        </span>
                        {/* −10s */}
                        <button onClick={() => rewindSpeech(10)} title="Back 10s" style={{ background: 'transparent', border: 'none', padding: '4px 6px', cursor: 'pointer', color: C.muted, fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>
                          10
                        </button>
                        {/* Pause / Resume */}
                        <button onClick={() => ttsPaused ? resumeSpeech() : pauseSpeech()} title={ttsPaused ? 'Resume' : 'Pause'} style={{ background: 'transparent', border: 'none', padding: '4px 6px', cursor: 'pointer', color: T.gold, fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          {ttsPaused ? (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill={T.gold} stroke={T.gold} strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                          ) : (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="6" y1="4" x2="6" y2="20"/><line x1="18" y1="4" x2="18" y2="20"/></svg>
                          )}
                          {ttsPaused ? 'Resume' : 'Pause'}
                        </button>
                        {/* +10s */}
                        <button onClick={() => forwardSpeech(10)} title="Forward 10s" style={{ background: 'transparent', border: 'none', padding: '4px 6px', cursor: 'pointer', color: C.muted, fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.49-3.5"/></svg>
                          10
                        </button>
                        {/* Stop */}
                        <button onClick={stopSpeech} title="Stop" style={{ background: 'transparent', border: 'none', padding: '4px 6px', cursor: 'pointer', color: C.muted, fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                          Stop
                        </button>
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* AdStrip hidden until real sponsors are onboarded */}

          {showNudge && (
            <div style={{
              margin: '8px 0 12px',
              background: T.parchment,
              border: `1px solid ${T.goldLight}`,
              borderRadius: 12,
              padding: '12px 14px',
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.goldDark, marginBottom: 3 }}>
                  Unlock deeper answers
                </div>
                <div style={{ fontSize: 12.5, color: T.inkSoft, lineHeight: 1.5 }}>
                  {aiPlan === 'free'
                    ? 'Upgrade for longer responses and higher weekly limits — $6.99 CAD/mo.'
                    : 'Go further with priority responses and higher limits — $13.99 CAD/mo.'}
                </div>
                <div style={{ fontSize: 11.5, color: T.inkMuted, lineHeight: 1.5, marginTop: 5 }}>
                  Your plan helps keep kinwove free for those who can't afford it.
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                <button
                  onClick={() => { setShowNudge(false); onUpgrade?.(); }}
                  style={{
                    background: T.goldDark, color: T.cream, border: 'none',
                    borderRadius: 999, padding: '5px 12px',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                >
                  Learn more →
                </button>
                <button
                  onClick={() => setShowNudge(false)}
                  style={{
                    background: 'none', border: 'none', color: T.inkMuted,
                    fontSize: 11.5, cursor: 'pointer', padding: 0, textAlign: 'center',
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {error && (
            <div
              style={{
                marginTop: 14,
                padding: 14,
                border: `1px solid ${C.border}`,
                background: dark ? 'rgba(184,115,58,0.1)' : '#fff4ea',
                borderRadius: 10,
                fontSize: 14,
                color: T.error,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <span style={{ flex: 1, minWidth: 180 }}>{error}</span>
              {retryPayload && (
                <button
                  onClick={() => send(retryPayload.prompt, retryPayload.img)}
                  style={{
                    background: T.gold,
                    border: 'none',
                    borderRadius: 999,
                    padding: '8px 18px',
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: '#FDF8EE',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  Retry
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── AI limit wall — replaces composer when user is out of messages ── */}
      {aiUsage.atLimit && session && (
        <AiLimitWall plan={aiPlan} panelMode={panelMode} />
      )}

      {/* ── Low-messages warning strip ── */}
      {!aiUsage.atLimit && session && <AiUsageWarning remaining={aiUsage.remaining} limit={aiUsage.limit} plan={aiPlan} />}

      <div
        style={{
          borderTop: `1px solid ${C.border}`,
          background: C.footerBg,
          padding: panelMode
            ? `12px 16px max(14px, env(safe-area-inset-bottom, 14px))`
            : '14px 20px 76px',
          flexShrink: 0,
          boxSizing: 'border-box',
          display: aiUsage.atLimit && session ? 'none' : undefined,
        }}
      >
        {!busy && !showGuestWall && (() => {
          // When no messages exist the body already shows the large starter cards —
          // only render the footer chips once a conversation is underway.
          const chips = suggestions.length > 0 ? suggestions : (messages.length > 0 ? starters : []);
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
                    background: C.card,
                    border: `1px solid ${C.border}`,
                    borderRadius: 999,
                    padding: '7px 14px',
                    fontSize: 13,
                    color: C.textSoft,
                    cursor: 'pointer',
                    transition: 'border-color 0.15s, color 0.15s, background 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = T.gold;
                    e.currentTarget.style.color = T.goldDark;
                    e.currentTarget.style.background = 'rgba(184,115,58,0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = C.border;
                    e.currentTarget.style.color = C.textSoft;
                    e.currentTarget.style.background = C.card;
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          );
        })()}
        {/* Hidden image file input */}
        <input
          ref={imgInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          style={{ display: 'none' }}
          onChange={onImagePicked}
        />

        {/* Image preview strip (above input row) */}
        {attachedImg ? (
          <div style={{ maxWidth: 720, margin: '0 auto 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <img
                src={attachedImg.previewUrl}
                alt="Attached"
                style={{ height: 64, width: 64, objectFit: 'cover', borderRadius: 10, border: `2px solid ${T.gold}`, display: 'block' }}
              />
              <button
                onClick={() => setAttachedImg(null)}
                style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: T.ink, border: 'none', color: T.cream, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
              >
                ×
              </button>
            </div>
            <div style={{ fontSize: 12, color: C.muted, fontStyle: 'italic' }}>Image attached — ask a question about it</div>
          </div>
        ) : !showGuestWall && (
          /* Capability hint — rotates every 5 s to surface image features */
          <_ImgHint C={C} />
        )}

        <div
          style={{
            maxWidth: 720,
            width: '100%',
            margin: '0 auto',
            display: 'flex',
            gap: 8,
            alignItems: 'flex-end',
            boxSizing: 'border-box',
          }}
        >
          {/* Camera / image attach button */}
          <button
            onClick={pickImage}
            disabled={busy || showGuestWall || !!attachedImg}
            title={attachedImg ? 'Image attached' : 'Attach an image'}
            style={{
              background: attachedImg ? 'rgba(184,115,58,0.15)' : 'transparent',
              border: `1px solid ${attachedImg ? T.gold : C.border}`,
              color: attachedImg ? T.gold : C.muted,
              borderRadius: 999, width: 42, height: 42, flexShrink: 0,
              cursor: busy || showGuestWall ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s', opacity: busy || showGuestWall ? 0.4 : 1,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </button>

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
            placeholder={attachedImg ? 'Ask about this image…' : 'Ask anything about faith, God, or the Bible…'}
            rows={1}
            disabled={busy || showGuestWall}
            style={{
              flex: 1,
              resize: 'none',
              border: `1px solid ${C.border}`,
              borderRadius: 18,
              padding: '12px 16px',
              fontSize: 16,
              lineHeight: 1.5,
              background: C.inputBg,
              color: C.text,
              outline: 'none',
              fontFamily: T.sans,
              maxHeight: 200,
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = T.gold)}
            onBlur={(e) => (e.currentTarget.style.borderColor = C.border)}
          />
          {micSupported && (
            <button
              onClick={() => toggleMic(input)}
              title={micListening ? 'Stop listening' : 'Speak your question'}
              style={{
                background: micListening ? 'rgba(220,38,38,0.1)' : 'transparent',
                border: `1px solid ${micListening ? 'rgba(220,38,38,0.4)' : C.border}`,
                color: micListening ? '#dc2626' : C.muted,
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
            disabled={busy || (!input.trim() && !attachedImg)}
            style={{
              background: busy || (!input.trim() && !attachedImg) ? T.line : `linear-gradient(135deg, ${T.gold} 0%, #c47020 100%)`,
              color: T.cream,
              border: 'none',
              borderRadius: 999,
              padding: '12px 22px',
              fontSize: 14,
              fontWeight: 600,
              cursor: busy || (!input.trim() && !attachedImg) ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: busy || (!input.trim() && !attachedImg) ? 'none' : '0 4px 14px rgba(184,115,58,0.35)',
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
              color: C.muted,
              textAlign: 'center',
            }}
          >
            Built to honour scripture, not replace it. Always verify references in your own Bible.
          </div>
        )}
      </div>
      {/* ── Verse preview popover ── */}
      {versePopover && (
        <div
          style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
            background: 'rgba(44,24,16,0.55)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
          onClick={() => setVersePopover(null)}
        >
          <div
            style={{
              background: '#FDF8F0', borderRadius: '20px 20px 0 0',
              padding: '24px 24px 32px', width: '100%', maxWidth: 520,
              boxShadow: '0 -8px 40px rgba(44,24,16,0.25)',
              animation: 'fadeUp 0.22s ease both',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <span style={{
                fontSize: 12, fontWeight: 600, color: '#A85530',
                letterSpacing: 1.5, textTransform: 'uppercase',
              }}>
                {versePopover.refRaw.replace(/[()]/g, '')}
              </span>
              <button
                onClick={() => setVersePopover(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9C7B5E', fontSize: 18, lineHeight: 1, padding: '0 0 0 12px' }}
              >×</button>
            </div>
            {versePopover.text === null ? (
              <div style={{ fontSize: 15, color: '#9C7B5E', fontStyle: 'italic' }}>Loading…</div>
            ) : (
              <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 17, lineHeight: 1.75, color: '#2C1810', margin: '0 0 16px' }}>
                {versePopover.text}
              </p>
            )}
            <div style={{ fontSize: 11, color: '#9C7B5E', marginBottom: 12 }}>King James Version · api.bible</div>
          </div>
        </div>
      )}
      {/* ── Flag toast ── */}
      {flagToast && (
        <div style={{
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          background: '#2C1810', color: '#FDF8F0', borderRadius: 999,
          padding: '10px 20px', fontSize: 13, zIndex: 300,
          boxShadow: '0 4px 20px rgba(44,24,16,0.4)',
          animation: 'fadeIn 0.2s ease both',
        }}>
          Thanks — we'll take a look at this response.
        </div>
      )}
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
