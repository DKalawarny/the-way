import { useEffect, useMemo, useRef, useState } from 'react';
import { T, globalCss } from './theme.js';
import { PERSON_TYPES, STARTERS, DEEPER_STARTERS, PREMIUM_FEATURES, ADS } from './constants.js';

function getStarters(personType, conversations) {
  const totalMessages = conversations.reduce((sum, c) => sum + c.messages.length, 0);
  const pool = totalMessages >= 15
    ? (DEEPER_STARTERS[personType] ?? DEEPER_STARTERS.curious)
    : (STARTERS[personType] ?? STARTERS.curious);
  const offset = new Date().getDate() % pool.length;
  return [...pool.slice(offset), ...pool.slice(0, offset)].slice(0, 3);
}
import { getSystemPrompt } from './prompts.js';
import { supabase } from './supabase.js';
import Auth from './Auth.jsx';
import ProfileSetup from './Profile.jsx';
import ProfilePage, { Avatar } from './ProfilePage.jsx';
import Community from './Community.jsx';
import { trialStatus } from './trial.js';

const REF_REGEX =
  /(\([1-3]?\s?[A-Za-z][A-Za-z ]+\s\d+:\d+(?:[–\-]\d+)?(?:,\s*[A-Za-z]+)?\)|\[Extended Canon[^\]]*\]|\[Historical Text[^\]]*\])/g;

function MsgText({ text }) {
  const parts = useMemo(() => {
    const result = [];
    let last = 0;
    let m;
    const re = new RegExp(REF_REGEX.source, 'g');
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) result.push({ t: 'text', v: text.slice(last, m.index) });
      const v = m[0];
      let kind = 'ref-inline';
      if (v.startsWith('[Extended')) kind = 'ref-inline ref-extended';
      else if (v.startsWith('[Historical')) kind = 'ref-inline ref-historical';
      result.push({ t: 'ref', v, kind });
      last = m.index + v.length;
    }
    if (last < text.length) result.push({ t: 'text', v: text.slice(last) });
    return result;
  }, [text]);

  return (
    <>
      {parts.map((p, i) =>
        p.t === 'ref' ? (
          <span key={i} className={p.kind}>
            {p.v}
          </span>
        ) : (
          <span key={i}>{p.v}</span>
        )
      )}
    </>
  );
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

function Landing({ onBegin, onSignIn, session, profile, onEditProfile }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${T.cream} 0%, ${T.parchment} 100%)`,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <header
        style={{
          padding: '28px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: 1100,
          width: '100%',
          margin: '0 auto',
        }}
      >
        <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 600, color: T.ink }}>
          The Way
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {session ? (
            <button
              onClick={onEditProfile}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Avatar name={profile?.display_name} avatarConfig={profile?.avatar_config} size={34} />
              <span style={{ fontSize: 14, color: T.inkSoft }}>{profile?.display_name ?? 'Profile'}</span>
            </button>
          ) : (
            <button
              onClick={onSignIn}
              style={{ background: 'transparent', color: T.goldDark, border: `1px solid ${T.line}`, padding: '8px 18px', borderRadius: 999, fontSize: 14, fontWeight: 500 }}
            >
              Sign in
            </button>
          )}
          <button
            onClick={onBegin}
            style={{ background: 'transparent', color: T.goldDark, border: `1px solid ${T.line}`, padding: '8px 18px', borderRadius: 999, fontSize: 14, fontWeight: 500 }}
          >
            Begin
          </button>
        </div>
      </header>

      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '48px 24px',
          maxWidth: 760,
          margin: '0 auto',
        }}
      >
        <div
          style={{
            fontSize: 13,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: T.goldDark,
            marginBottom: 20,
          }}
        >
          Scripture · Explored · With Grace
        </div>
        <h1
          style={{
            fontFamily: T.serif,
            fontSize: 'clamp(40px, 6vw, 64px)',
            lineHeight: 1.1,
            margin: '0 0 20px',
            color: T.ink,
            fontWeight: 600,
          }}
        >
          The Bible, for
          <br />
          <em style={{ color: T.gold }}>anyone honest enough to ask.</em>
        </h1>
        <p
          style={{
            fontFamily: T.serif,
            fontSize: 19,
            lineHeight: 1.6,
            color: T.inkSoft,
            maxWidth: 580,
            margin: '0 0 40px',
          }}
        >
          A warm, unhurried companion for exploring scripture — whether you're curious, skeptical,
          or somewhere you don't quite have a word for yet. Every claim referenced. No sermons.
        </p>

        <button
          onClick={onBegin}
          className="fade-up"
          style={{
            background: T.gold,
            color: T.cream,
            border: 'none',
            padding: '16px 40px',
            borderRadius: 999,
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: 0.3,
            boxShadow: '0 6px 24px rgba(196, 129, 58, 0.3)',
            transition: 'transform 0.15s ease',
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          Start exploring
        </button>

        <div
          style={{
            marginTop: 56,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 20,
            width: '100%',
            maxWidth: 680,
          }}
        >
          {[
            { t: 'Every claim referenced', d: 'Inline, in the circle it comes from.' },
            { t: 'Three-circle framework', d: 'Canon · Extended · Historical.' },
            { t: 'Grace before theology', d: 'Meeting you where you actually are.' },
          ].map((f) => (
            <div
              key={f.t}
              style={{
                background: 'rgba(255,255,255,0.5)',
                border: `1px solid ${T.line}`,
                borderRadius: 12,
                padding: 20,
                textAlign: 'left',
              }}
            >
              <div style={{ fontFamily: T.serif, fontWeight: 600, color: T.ink, marginBottom: 6 }}>
                {f.t}
              </div>
              <div style={{ fontSize: 14, color: T.inkMuted, lineHeight: 1.5 }}>{f.d}</div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 72,
            padding: 24,
            background: T.white,
            border: `1px solid ${T.line}`,
            borderRadius: 16,
            width: '100%',
            maxWidth: 520,
          }}
        >
          <div style={{ fontFamily: T.serif, fontSize: 18, color: T.ink, marginBottom: 6 }}>
            Notes from the road
          </div>
          <div style={{ fontSize: 14, color: T.inkMuted, marginBottom: 14 }}>
            Occasional, honest letters. No spam — and no performance.
          </div>
          {sent ? (
            <div style={{ color: T.goldDark, fontSize: 14 }}>Thank you. We'll be in touch.</div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (email.includes('@')) setSent(true);
              }}
              style={{ display: 'flex', gap: 8 }}
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@somewhere.com"
                style={{
                  flex: 1,
                  border: `1px solid ${T.line}`,
                  borderRadius: 999,
                  padding: '10px 16px',
                  fontSize: 14,
                  background: T.cream,
                  color: T.ink,
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                style={{
                  background: T.ink,
                  color: T.cream,
                  border: 'none',
                  borderRadius: 999,
                  padding: '10px 20px',
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                Join
              </button>
            </form>
          )}
        </div>
      </main>

      <footer
        style={{
          padding: '32px 24px',
          textAlign: 'center',
          fontSize: 13,
          color: T.inkMuted,
        }}
      >
        Built with care · The Way · {new Date().getFullYear()}
      </footer>
    </div>
  );
}

function Onboarding({ onPick, onBack }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: T.cream,
        padding: '64px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: T.goldDark, fontSize: 14, cursor: 'pointer', padding: '0 0 0 8px', marginBottom: 16, display: 'block' }}>
        ← Back
      </button>
      <div
        style={{
          fontFamily: T.serif,
          fontSize: 13,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: T.goldDark,
          marginBottom: 16,
        }}
      >
        Before we begin
      </div>
      <h2
        style={{
          fontFamily: T.serif,
          fontSize: 'clamp(28px, 4vw, 40px)',
          margin: '0 0 12px',
          color: T.ink,
          textAlign: 'center',
          fontWeight: 600,
        }}
      >
        Where are you, honestly?
      </h2>
      <p
        style={{
          fontFamily: T.serif,
          fontSize: 17,
          color: T.inkSoft,
          maxWidth: 520,
          textAlign: 'center',
          margin: '0 0 40px',
          lineHeight: 1.5,
        }}
      >
        Pick whatever is closest. You can change your mind at any time — this just tunes the tone.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 16,
          width: '100%',
          maxWidth: 820,
        }}
      >
        {PERSON_TYPES.map((p) => (
          <button
            key={p.id}
            onClick={() => onPick(p.id)}
            className="fade-up"
            style={{
              textAlign: 'left',
              background: T.white,
              border: `1px solid ${T.line}`,
              borderRadius: 14,
              padding: 22,
              cursor: 'pointer',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = T.gold;
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(44,24,16,0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = T.line;
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 10 }}>{p.emoji}</div>
            <div
              style={{
                fontFamily: T.serif,
                fontSize: 19,
                fontWeight: 600,
                color: T.ink,
                marginBottom: 6,
              }}
            >
              {p.label}
            </div>
            <div style={{ fontSize: 14, color: T.inkMuted, lineHeight: 1.5 }}>{p.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function PremiumModal({ open, onClose, profile }) {
  if (!open) return null;
  const trial = trialStatus(profile);
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(44,24,16,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: 20,
        animation: 'fadeIn 0.15s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="fade-up"
        style={{
          background: T.cream,
          borderRadius: 18,
          maxWidth: 460,
          width: '100%',
          padding: 32,
          border: `1px solid ${T.line}`,
        }}
      >
        <div
          style={{
            fontSize: 13,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: T.goldDark,
            marginBottom: 10,
          }}
        >
          The Way · Deeper
        </div>
        <div
          style={{
            fontFamily: T.serif,
            fontSize: 30,
            fontWeight: 600,
            color: T.ink,
            marginBottom: 10,
          }}
        >
          {trial.active ? (
            <span style={{ color: T.goldDark }}>Free trial — {trial.daysLeft} day{trial.daysLeft !== 1 ? 's' : ''} left</span>
          ) : (
            <>$7.99<span style={{ fontSize: 15, color: T.inkMuted, fontWeight: 400 }}> CAD / month</span></>
          )}
        </div>
        <div style={{ color: T.inkSoft, fontSize: 15, marginBottom: 18 }}>
          {trial.active
            ? `You have ${trial.daysLeft} day${trial.daysLeft !== 1 ? 's' : ''} of free access. After that it's $7.99 CAD/month — less than a coffee.`
            : 'For readers who want to go further — the Extended Canon, historical texts, and the quieter, ad-free companion. Less than a coffee a month.'}
        </div>
        <ul style={{ paddingLeft: 18, margin: '0 0 22px', color: T.inkSoft, lineHeight: 1.8 }}>
          {PREMIUM_FEATURES.map((f) => (
            <li key={f} style={{ fontSize: 14 }}>
              {f}
            </li>
          ))}
        </ul>
        <button
          onClick={onClose}
          style={{
            width: '100%',
            background: T.gold,
            color: T.cream,
            border: 'none',
            borderRadius: 999,
            padding: '14px 20px',
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          Coming soon — join the list
        </button>
        <button
          onClick={onClose}
          style={{
            width: '100%',
            background: 'transparent',
            color: T.inkMuted,
            border: 'none',
            marginTop: 10,
            fontSize: 13,
          }}
        >
          Maybe later
        </button>
      </div>
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
        borderTop: `1px solid ${T.line}`,
        borderBottom: `1px solid ${T.line}`,
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontSize: 13,
        color: T.inkSoft,
      }}
    >
      <span
        style={{
          fontSize: 10,
          letterSpacing: 1,
          textTransform: 'uppercase',
          color: T.inkMuted,
          border: `1px solid ${T.line}`,
          padding: '2px 6px',
          borderRadius: 4,
        }}
      >
        {ad.tag}
      </span>
      <span style={{ fontStyle: 'italic' }}>{ad.text}</span>
    </div>
  );
}

const NOTES_KEY = 'theway:notes:v1';
const CONVS_KEY = 'theway:convs:v1';

function useConversations() {
  const [conversations, setConversations] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CONVS_KEY)) ?? []; }
    catch { return []; }
  });

  useEffect(() => {
    try { localStorage.setItem(CONVS_KEY, JSON.stringify(conversations)); }
    catch {}
  }, [conversations]);

  const create = (pType) => {
    const conv = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: 'New conversation',
      personType: pType,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setConversations((prev) => [conv, ...prev]);
    return conv;
  };

  const update = (id, messages) => {
    setConversations((prev) => prev.map((c) => {
      if (c.id !== id) return c;
      const firstMsg = messages.find((m) => m.role === 'user')?.content ?? '';
      const title = firstMsg
        ? firstMsg.slice(0, 65) + (firstMsg.length > 65 ? '…' : '')
        : c.title;
      return { ...c, messages, title, updatedAt: Date.now() };
    }));
  };

  const remove = (id) => setConversations((prev) => prev.filter((c) => c.id !== id));

  return { conversations, create, update, remove };
}

function BottomNav({ stage, authStage, session, profile, notes, boardOpen, onGoHome, onGoCommunity, onOpenBoard, onGoProfile }) {
  if (authStage === 'auth' || authStage === 'profile-setup') return null;

  const active = authStage === 'profile-view' ? 'profile'
    : stage === 'community' ? 'community'
    : stage === 'landing' ? 'home'
    : '';

  const tabStyle = (id) => ({
    flex: 1,
    background: 'none',
    border: 'none',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    cursor: 'pointer',
    padding: '8px 4px',
    color: active === id ? T.goldDark : T.inkMuted,
  });

  const labelStyle = (id) => ({
    fontSize: 10,
    fontWeight: active === id ? 600 : 400,
    letterSpacing: 0.3,
  });

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      height: 62,
      background: T.white,
      borderTop: `1px solid ${T.line}`,
      display: 'flex',
      zIndex: 100,
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      <button onClick={onGoHome} style={tabStyle('home')}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <span style={labelStyle('home')}>Home</span>
      </button>

      <button onClick={onGoCommunity} style={tabStyle('community')}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="17" cy="8" r="3"/><circle cx="7" cy="14" r="3"/>
          <path d="M14 8.5c0 2-4 3-4 7"/><path d="M10 13.5c0-2 4-3 4-7"/>
        </svg>
        <span style={labelStyle('community')}>Community</span>
      </button>

      <button onClick={onOpenBoard} style={tabStyle('board')}>
        <div style={{ position: 'relative' }}>
          <BookmarkIcon size={20} filled={boardOpen} />
          {notes.length > 0 && (
            <span style={{
              position: 'absolute', top: -5, right: -8,
              background: T.gold, color: T.cream,
              borderRadius: 999, fontSize: 9, fontWeight: 700,
              padding: '1px 5px', lineHeight: 1.4,
            }}>
              {notes.length}
            </span>
          )}
        </div>
        <span style={labelStyle('board')}>Board</span>
      </button>

      <button onClick={onGoProfile} style={tabStyle('profile')}>
        {session ? (
          <Avatar
            name={profile?.display_name}
            avatarConfig={profile?.avatar_config}
            size={26}
            style={{ border: `2px solid ${active === 'profile' ? T.gold : T.line}` }}
          />
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
        )}
        <span style={labelStyle('profile')}>{session ? 'Profile' : 'Sign in'}</span>
      </button>
    </div>
  );
}

const DAILY_VERSES = [
  { text: 'Ask and it will be given to you; seek and you will find; knock and the door will be opened.', ref: 'Matthew 7:7' },
  { text: 'Be still, and know that I am God.', ref: 'Psalm 46:10' },
  { text: 'The truth will set you free.', ref: 'John 8:32' },
  { text: 'For I know the plans I have for you — plans to give you hope and a future.', ref: 'Jeremiah 29:11' },
  { text: 'Come to me, all you who are weary and burdened, and I will give you rest.', ref: 'Matthew 11:28' },
  { text: 'In the beginning was the Word, and the Word was with God.', ref: 'John 1:1' },
  { text: 'Where can I go from your Spirit? Where can I flee from your presence?', ref: 'Psalm 139:7' },
];

function Divider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '28px 0' }}>
      <div style={{ flex: 1, height: 1, background: T.line }} />
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M9 0v18M0 9h18" stroke={T.goldDark} strokeWidth="1" opacity="0.5"/>
        <circle cx="9" cy="9" r="2.5" fill={T.goldDark} opacity="0.4"/>
      </svg>
      <div style={{ flex: 1, height: 1, background: T.line }} />
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  if (h >= 17 && h < 21) return 'Good evening';
  return 'Still up';
}

function MemberHome({ profile, session, conversations, notes, onContinue, onNew, onOpenCommunity, onOpenBoard, onGoChat }) {
  const [communityPosts, setCommunityPosts] = useState([]);
  const recent = conversations[0] ?? null;
  const verse = DAILY_VERSES[new Date().getDate() % DAILY_VERSES.length];

  useEffect(() => {
    supabase
      .from('posts')
      .select('*, profiles(display_name, avatar_config, tradition, person_type), reactions(kind), replies(id)')
      .order('created_at', { ascending: false })
      .limit(4)
      .then(({ data }) => setCommunityPosts(data ?? []));
  }, []);

  const firstName = profile?.display_name?.split(' ')[0] ?? 'friend';
  const person = recent ? PERSON_TYPES.find((p) => p.id === recent.personType) : null;

  return (
    <div style={{ minHeight: '100vh', background: T.cream, paddingBottom: 80 }}>

      {/* Dark ink hero header */}
      <div style={{
        background: T.ink,
        padding: '40px 24px 36px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Subtle dot-grid texture overlay */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.06,
          backgroundImage: 'radial-gradient(circle, #C4813A 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          pointerEvents: 'none',
        }} />
        {/* Gold corner ornament */}
        <svg style={{ position: 'absolute', top: 20, right: 20, opacity: 0.15 }} width="60" height="60" viewBox="0 0 60 60" fill="none">
          <path d="M30 2 L58 30 L30 58 L2 30 Z" stroke="#C4813A" strokeWidth="1"/>
          <path d="M30 10 L50 30 L30 50 L10 30 Z" stroke="#C4813A" strokeWidth="1"/>
          <circle cx="30" cy="30" r="4" fill="#C4813A"/>
        </svg>

        <div style={{ maxWidth: 680, margin: '0 auto', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: T.goldDark, marginBottom: 10, opacity: 0.8 }}>
                The Way · Home
              </div>
              <div style={{ fontFamily: T.serif, color: T.cream, lineHeight: 1.15 }}>
                <span style={{ fontSize: 18, opacity: 0.7 }}>{greeting()},</span>
                <br />
                <span style={{ fontSize: 36, fontWeight: 700 }}>{firstName}.</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
              <Avatar
                name={profile?.display_name}
                avatarConfig={profile?.avatar_config}
                size={64}
                style={{ border: `3px solid rgba(196,129,58,0.6)`, boxShadow: '0 0 0 1px rgba(196,129,58,0.2)' }}
              />
              <button
                onClick={onGoChat}
                style={{
                  background: T.gold,
                  color: T.cream,
                  border: 'none',
                  borderRadius: 999,
                  padding: '7px 16px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  letterSpacing: 0.3,
                }}
              >
                💬 Open chat
              </button>
            </div>
          </div>

          {/* Daily verse */}
          <div style={{
            borderLeft: `3px solid ${T.goldDark}`,
            paddingLeft: 16,
            marginBottom: 28,
          }}>
            <div style={{ fontFamily: T.serif, fontStyle: 'italic', fontSize: 16, color: 'rgba(253,248,240,0.85)', lineHeight: 1.6, marginBottom: 6 }}>
              "{verse.text}"
            </div>
            <div style={{ fontSize: 12, color: T.goldDark, letterSpacing: 1 }}>— {verse.ref}</div>
          </div>

          {/* Continue card */}
          {recent && recent.messages.length > 0 ? (
            <div
              onClick={() => onContinue(recent)}
              className="card-raised"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: `1px solid rgba(196,129,58,0.3)`,
                borderRadius: 14,
                padding: '16px 18px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, color: T.goldDark, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 5 }}>
                  Continue exploring
                </div>
                <div style={{ fontFamily: T.serif, fontSize: 15, color: T.cream, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {recent.title}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(253,248,240,0.5)', marginTop: 4 }}>
                  {person?.emoji} {person?.label} · {recent.messages.length} messages
                </div>
              </div>
              <div style={{ color: T.gold, fontSize: 22, flexShrink: 0, animation: 'goldPulse 2s ease infinite' }}>→</div>
            </div>
          ) : (
            <button
              onClick={onNew}
              style={{
                width: '100%',
                background: 'transparent',
                color: T.cream,
                border: `1px solid rgba(196,129,58,0.4)`,
                borderRadius: 14,
                padding: '16px 20px',
                fontFamily: T.serif,
                fontSize: 16,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>
                {profile?.created_at && (Date.now() - new Date(profile.created_at)) > 7 * 86400000
                  ? 'Start a new conversation'
                  : 'Begin your first question'}
              </span>
              <span style={{ color: T.gold }}>→</span>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '28px 20px' }}>

        {/* Quick actions */}
        <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: T.inkMuted, marginBottom: 14 }}>
          Quick access
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 8 }}>
          {[
            { label: 'New question', sub: 'Start fresh', icon: '✦', onClick: onNew },
            { label: 'Your board', sub: `${notes.length} saved`, icon: '⊞', onClick: onOpenBoard },
            { label: 'Community', sub: 'See what\'s shared', icon: '◎', onClick: onOpenCommunity },
          ].map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className="card-raised"
              style={{
                background: T.white,
                border: `1px solid ${T.line}`,
                borderRadius: 14,
                padding: '18px 14px',
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = T.gold)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = T.line)}
            >
              <div style={{ fontFamily: T.serif, fontSize: 22, color: T.goldDark, marginBottom: 8, lineHeight: 1 }}>{item.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 3 }}>{item.label}</div>
              <div style={{ fontSize: 11, color: T.inkMuted }}>{item.sub}</div>
            </button>
          ))}
        </div>

        <Divider />

        {/* Community feed preview */}
        <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: T.inkMuted, marginBottom: 16 }}>
          From the community
        </div>

        {communityPosts.length === 0 && (
          <div style={{
            background: T.white,
            border: `1px solid ${T.line}`,
            borderRadius: 14,
            padding: '32px 20px',
            textAlign: 'center',
          }}>
            <div style={{ fontFamily: T.serif, fontSize: 18, color: T.inkSoft, marginBottom: 6 }}>The conversation is just beginning.</div>
            <div style={{ fontSize: 13, color: T.inkMuted }}>Share a note from your board to be the first voice.</div>
          </div>
        )}

        {communityPosts.map((p) => {
          const postPerson = PERSON_TYPES.find((pt) => pt.id === p.profiles?.person_type);
          const reactionCount = p.reactions?.length ?? 0;
          const replyCount = p.replies?.length ?? 0;
          return (
            <div
              key={p.id}
              onClick={onOpenCommunity}
              className="card-raised"
              style={{
                background: T.white,
                borderRadius: 14,
                border: `1px solid ${T.line}`,
                marginBottom: 12,
                overflow: 'hidden',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = T.goldLight)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = T.line)}
            >
              <div style={{ padding: '16px 18px 12px' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                  <Avatar name={p.profiles?.display_name} avatarConfig={p.profiles?.avatar_config} size={32} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{p.profiles?.display_name ?? 'Anonymous'}</div>
                    <div style={{ fontSize: 11, color: T.inkMuted }}>
                      {postPerson?.emoji} {postPerson?.label}
                      {p.profiles?.tradition ? ` · ${p.profiles.tradition}` : ''}
                    </div>
                  </div>
                </div>
                <div style={{ fontFamily: T.serif, fontStyle: 'italic', fontSize: 13, color: T.inkSoft, marginBottom: 8, lineHeight: 1.6, borderLeft: `2px solid ${T.line}`, paddingLeft: 10 }}>
                  {p.question}
                </div>
                <div style={{
                  fontFamily: T.serif, fontSize: 14, color: T.ink, lineHeight: 1.65,
                  overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}>
                  {p.body}
                </div>
              </div>
              {(reactionCount > 0 || replyCount > 0) && (
                <div style={{ padding: '8px 18px', borderTop: `1px solid ${T.line}`, background: T.parchment, fontSize: 12, color: T.inkMuted, display: 'flex', gap: 14 }}>
                  {reactionCount > 0 && <span style={{ color: T.goldDark }}>✦ {reactionCount}</span>}
                  {replyCount > 0 && <span>💬 {replyCount}</span>}
                </div>
              )}
            </div>
          );
        })}

        {communityPosts.length > 0 && (
          <button
            onClick={onOpenCommunity}
            style={{ background: 'none', border: 'none', color: T.goldDark, fontSize: 14, cursor: 'pointer', padding: '8px 0', fontFamily: T.serif, fontStyle: 'italic' }}
          >
            See all posts →
          </button>
        )}
      </div>
    </div>
  );
}

function ConversationHistory({ open, onClose, conversations, onLoad, onDelete, onNew }) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(44,24,16,0.55)',
        zIndex: 60, display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
        padding: 20, animation: 'fadeIn 0.15s ease', overflowY: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="fade-up"
        style={{
          background: T.parchment, borderRadius: 18, maxWidth: 680, width: '100%',
          margin: '40px 0', border: `1px solid ${T.line}`, overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{
          padding: '20px 24px', borderBottom: `1px solid ${T.line}`, background: T.cream,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: T.goldDark, marginBottom: 4 }}>Your history</div>
            <div style={{ fontFamily: T.serif, fontSize: 20, fontWeight: 600, color: T.ink }}>Conversations</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onNew}
              style={{ background: T.ink, color: T.cream, border: 'none', borderRadius: 999, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
            >
              + New
            </button>
            <button
              onClick={onClose}
              style={{ background: 'transparent', border: `1px solid ${T.line}`, borderRadius: 999, padding: '8px 14px', fontSize: 13, color: T.inkSoft, cursor: 'pointer' }}
            >
              Close
            </button>
          </div>
        </div>

        {conversations.length === 0 && (
          <div style={{ padding: '48px 32px', textAlign: 'center', color: T.inkMuted, fontFamily: T.serif, fontSize: 16, lineHeight: 1.6 }}>
            No conversations yet.
            <br />Start asking — your history will appear here.
          </div>
        )}

        {conversations.map((c) => {
          const person = PERSON_TYPES.find((p) => p.id === c.personType);
          return (
            <div
              key={c.id}
              onClick={() => onLoad(c)}
              style={{
                padding: '16px 24px', borderBottom: `1px solid ${T.line}`,
                cursor: 'pointer', display: 'flex', gap: 14, alignItems: 'center',
                background: T.white,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = T.parchment)}
              onMouseLeave={(e) => (e.currentTarget.style.background = T.white)}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: T.serif, fontSize: 15, color: T.ink, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.title}
                </div>
                <div style={{ fontSize: 12, color: T.inkMuted }}>
                  {person?.emoji} {person?.label} · {c.messages.length} messages · {formatNoteDate(c.updatedAt)}
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
                style={{ background: 'none', border: 'none', color: T.inkMuted, fontSize: 12, cursor: 'pointer', padding: '4px 8px', flexShrink: 0 }}
              >
                Delete
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function useNotes() {
  const [notes, setNotes] = useState(() => {
    try {
      const raw = localStorage.getItem(NOTES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    } catch {}
  }, [notes]);

  const addNote = (n) => {
    const note = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: Date.now(),
      ...n,
    };
    setNotes((arr) => [note, ...arr]);
    return note.id;
  };
  const removeNote = (id) => setNotes((arr) => arr.filter((n) => n.id !== id));
  const clearAll = () => setNotes([]);

  return { notes, addNote, removeNote, clearAll };
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

function formatNoteDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function buildExportText(notes) {
  if (notes.length === 0) return '';
  const head = 'Notes from The Way\n\n';
  return (
    head +
    notes
      .map((n) => {
        const when = new Date(n.createdAt).toLocaleString();
        return `— ${when}\nQuestion: ${n.question}\n\n${n.answer}\n`;
      })
      .join('\n────────\n\n')
  );
}

function Board({ open, onClose, notes, onRemove, onGoDeeper, onSharePublicly }) {
  const [copiedId, setCopiedId] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);

  if (!open) return null;

  const copy = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      if (id === '__all__') {
        setCopiedAll(true);
        setTimeout(() => setCopiedAll(false), 1400);
      } else {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 1400);
      }
    } catch {}
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(44,24,16,0.55)',
        zIndex: 60,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: 20,
        animation: 'fadeIn 0.15s ease',
        overflowY: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="fade-up"
        style={{
          background: T.parchment,
          borderRadius: 18,
          maxWidth: 720,
          width: '100%',
          margin: '40px 0',
          border: `1px solid ${T.line}`,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '22px 24px',
            borderBottom: `1px solid ${T.line}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14,
            background: T.cream,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                letterSpacing: 2,
                textTransform: 'uppercase',
                color: T.goldDark,
                marginBottom: 4,
              }}
            >
              Your Board
            </div>
            <div style={{ fontFamily: T.serif, fontSize: 22, color: T.ink, fontWeight: 600 }}>
              {notes.length === 0
                ? 'Nothing saved yet'
                : `${notes.length} ${notes.length === 1 ? 'note' : 'notes'}`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {notes.length > 0 && (
              <button
                onClick={() => copy(buildExportText(notes), '__all__')}
                style={{
                  background: T.ink,
                  color: T.cream,
                  border: 'none',
                  borderRadius: 999,
                  padding: '8px 14px',
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                {copiedAll ? 'Copied ✓' : 'Export for group'}
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: `1px solid ${T.line}`,
                borderRadius: 999,
                padding: '8px 14px',
                fontSize: 13,
                color: T.inkSoft,
              }}
            >
              Close
            </button>
          </div>
        </div>

        <div style={{ padding: '8px 0' }}>
          {notes.length === 0 && (
            <div
              style={{
                padding: '48px 32px',
                textAlign: 'center',
                color: T.inkMuted,
                fontFamily: T.serif,
                fontSize: 16,
                lineHeight: 1.6,
              }}
            >
              Tap the bookmark on any answer to save it here.
              <br />
              For later. For deeper. For sharing with a group.
            </div>
          )}

          {notes.map((n) => (
            <div
              key={n.id}
              style={{
                padding: '20px 24px',
                borderBottom: `1px solid ${T.line}`,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  color: T.inkMuted,
                  marginBottom: 8,
                }}
              >
                {formatNoteDate(n.createdAt)} · {n.personLabel ?? ''}
              </div>
              <div
                style={{
                  fontFamily: T.serif,
                  fontStyle: 'italic',
                  color: T.inkSoft,
                  fontSize: 15,
                  marginBottom: 12,
                  lineHeight: 1.5,
                }}
              >
                {n.question}
              </div>
              <div
                style={{
                  fontFamily: T.serif,
                  fontSize: 16,
                  color: T.ink,
                  lineHeight: 1.7,
                  whiteSpace: 'pre-wrap',
                  marginBottom: 14,
                }}
              >
                <MsgText text={n.answer} />
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={() => copy(`${n.question}\n\n${n.answer}`, n.id)}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${T.line}`,
                    borderRadius: 999,
                    padding: '6px 12px',
                    fontSize: 12,
                    color: T.inkSoft,
                  }}
                >
                  {copiedId === n.id ? 'Copied ✓' : 'Copy'}
                </button>
                <button
                  onClick={() => onGoDeeper(n)}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${T.gold}`,
                    borderRadius: 999,
                    padding: '6px 12px',
                    fontSize: 12,
                    color: T.goldDark,
                  }}
                >
                  Go deeper
                </button>
                <button
                  onClick={() => onSharePublicly?.(n)}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${T.line}`,
                    borderRadius: 999,
                    padding: '6px 12px',
                    fontSize: 12,
                    color: T.inkSoft,
                  }}
                >
                  Share publicly
                </button>
                <button
                  onClick={() => onRemove(n.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '6px 8px',
                    fontSize: 12,
                    color: T.inkMuted,
                    marginLeft: 'auto',
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Chat({
  personType,
  onOpenPremium,
  onChangeType,
  notes,
  onAddNote,
  onOpenBoard,
  onOpenCommunity,
  onOpenHistory,
  prefilledInput,
  onConsumePrefill,
  profile,
  initialMessages,
  onMessagesChange,
  conversations,
}) {
  const [messages, setMessages] = useState(initialMessages ?? []);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [savedIdx, setSavedIdx] = useState(() => new Set());
  const listRef = useRef(null);
  const taRef = useRef(null);

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

  const system = useMemo(() => getSystemPrompt(personType), [personType]);
  const starters = useMemo(() => getStarters(personType, conversations ?? []), [personType, conversations]);
  const person = PERSON_TYPES.find((p) => p.id === personType);
  const trial = trialStatus(profile);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  useEffect(() => {
    if (!taRef.current) return;
    taRef.current.style.height = 'auto';
    taRef.current.style.height = Math.min(taRef.current.scrollHeight, 200) + 'px';
  }, [input]);

  async function send(text) {
    const prompt = (text ?? input).trim();
    if (!prompt || busy) return;
    setInput('');
    setError(null);

    const next = [...messages, { role: 'user', content: prompt }];
    setMessages(next);
    setBusy(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system, messages: next, personType }),
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
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: T.cream,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <header
        style={{
          padding: '14px 20px',
          background: T.white,
          borderBottom: `1px solid ${T.line}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontFamily: T.serif, fontSize: 20, fontWeight: 600, color: T.ink }}>
            The Way
          </div>
          <button
            onClick={onChangeType}
            style={{
              background: T.parchment,
              border: `1px solid ${T.line}`,
              borderRadius: 999,
              padding: '4px 12px',
              fontSize: 12,
              color: T.inkSoft,
            }}
          >
            {person?.emoji} {person?.label} · change
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {trial.active && (
            <div style={{
              fontSize: 11,
              color: T.goldDark,
              border: `1px solid ${T.goldLight}`,
              borderRadius: 999,
              padding: '4px 10px',
              background: 'rgba(196,129,58,0.08)',
            }}>
              {trial.daysLeft}d free
            </div>
          )}
          <button
            onClick={onOpenHistory}
            style={{
              background: 'transparent',
              border: `1px solid ${T.line}`,
              color: T.inkSoft,
              borderRadius: 999,
              padding: '6px 12px',
              fontSize: 12,
            }}
          >
            History
          </button>
          <button
            onClick={onOpenPremium}
            style={{
              background: trial.expired ? T.error : T.gold,
              color: T.cream,
              border: 'none',
              borderRadius: 999,
              padding: '7px 14px',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {trial.expired ? 'Trial ended' : 'Deeper'}
          </button>
        </div>
      </header>

      <AdStrip />

      <div
        ref={listRef}
        className="scroll"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '28px 20px 80px',
        }}
      >
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          {messages.length === 0 && (
            <div className="fade-up">
              <div
                style={{
                  fontFamily: T.serif,
                  fontSize: 26,
                  color: T.ink,
                  marginBottom: 8,
                  fontWeight: 500,
                }}
              >
                Take your time.
              </div>
              <div style={{ fontSize: 15, color: T.inkMuted, marginBottom: 28, lineHeight: 1.6 }}>
                Ask anything. Or try one of these to get started:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {starters.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    style={{
                      textAlign: 'left',
                      background: T.white,
                      border: `1px solid ${T.line}`,
                      borderRadius: 12,
                      padding: '14px 18px',
                      fontFamily: T.serif,
                      fontSize: 16,
                      color: T.inkSoft,
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = T.gold;
                      e.currentTarget.style.color = T.ink;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = T.line;
                      e.currentTarget.style.color = T.inkSoft;
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div
                style={{
                  marginTop: 32,
                  fontSize: 12,
                  color: T.inkMuted,
                  display: 'flex',
                  gap: 14,
                  flexWrap: 'wrap',
                }}
              >
                <span>
                  <span className="ref-inline">(Genesis 1:1)</span> Canon
                </span>
                <span>
                  <span className="ref-inline ref-extended">[Extended Canon]</span> some traditions
                </span>
                <span>
                  <span className="ref-inline ref-historical">[Historical Text]</span> outside canon
                </span>
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
              const person = PERSON_TYPES.find((p) => p.id === personType);
              onAddNote({
                question,
                answer: m.content,
                personType,
                personLabel: person ? `${person.emoji} ${person.label}` : '',
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
                  <button
                    onClick={handleSave}
                    title={saved ? 'Saved to your board' : 'Save to your board'}
                    disabled={saved}
                    style={{
                      marginTop: 6,
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
          padding: '14px 20px',
        }}
      >
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
            placeholder="Ask anything about scripture…"
            rows={1}
            disabled={busy}
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
          <button
            onClick={() => send()}
            disabled={busy || !input.trim()}
            style={{
              background: busy || !input.trim() ? T.line : T.ink,
              color: T.cream,
              border: 'none',
              borderRadius: 999,
              padding: '12px 22px',
              fontSize: 14,
              fontWeight: 500,
              cursor: busy || !input.trim() ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s ease',
            }}
          >
            Send
          </button>
        </div>
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
      </div>
    </div>
  );
}

export default function App() {
  const [stage, setStage] = useState('landing');
  const [personType, setPersonType] = useState(null);
  const [premium, setPremium] = useState(false);
  const [boardOpen, setBoardOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [currentConvId, setCurrentConvId] = useState(null);
  const [prefilledInput, setPrefilledInput] = useState('');
  const { notes, addNote, removeNote } = useNotes();
  const { conversations, create: createConv, update: updateConv, remove: removeConv } = useConversations();

  // Auth + profile state
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authStage, setAuthStage] = useState('idle'); // idle | auth | profile-setup | profile-view

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      if (data.session) loadProfile(data.session.user.id);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s) loadProfile(s.user.id);
      else setProfile(null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadProfile(userId) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setProfile(data ?? null);
  }

  const currentConv = conversations.find((c) => c.id === currentConvId) ?? null;

  function startNewConversation(pType) {
    const conv = createConv(pType ?? personType);
    setCurrentConvId(conv.id);
    setPersonType(pType ?? personType);
    setStage('chat');
  }

  function loadConversation(conv) {
    setCurrentConvId(conv.id);
    setPersonType(conv.personType);
    setHistoryOpen(false);
    setStage('chat');
  }

  const goDeeper = (note) => {
    setBoardOpen(false);
    setPrefilledInput(`Going deeper on this: "${note.question}"\n\nWhat would you add or push back on?`);
  };

  async function sharePublicly(note) {
    if (!session) {
      setBoardOpen(false);
      setAuthStage('auth');
      return;
    }
    await supabase.from('posts').insert({
      author_id: session.user.id,
      body: note.answer,
      question: note.question,
      person_type: note.personType ?? null,
    });
    setBoardOpen(false);
    setStage('community');
  }

  // Auth gate: show auth screen if user tries to access profiles
  if (authStage === 'auth') {
    return (
      <>
        <style>{globalCss}</style>
        <Auth
          onAuth={(s) => { setSession(s); setAuthStage('profile-setup'); }}
          onBack={() => setAuthStage('idle')}
        />
      </>
    );
  }

  if (authStage === 'profile-setup' && session) {
    return (
      <>
        <style>{globalCss}</style>
        <ProfileSetup
          user={session.user}
          existing={profile}
          onSave={(p) => { setProfile(p); setAuthStage('idle'); }}
          onCancel={() => setAuthStage(profile ? 'profile-view' : 'idle')}
        />
      </>
    );
  }

  if (authStage === 'profile-view' && session) {
    return (
      <>
        <style>{globalCss}</style>
        <ProfilePage
          profile={profile}
          session={session}
          onEdit={() => setAuthStage('profile-setup')}
          onSignOut={() => { setSession(null); setProfile(null); setAuthStage('idle'); }}
          onClose={() => setAuthStage('idle')}
          onProfileUpdate={(p) => setProfile(p)}
        />
      </>
    );
  }

  return (
    <>
      <style>{globalCss}</style>
      {stage === 'landing' && !session && (
        <Landing
          onBegin={() => setStage('onboarding')}
          onSignIn={() => setAuthStage('auth')}
          session={session}
          profile={profile}
          onEditProfile={() => setAuthStage('profile-view')}
        />
      )}
      {stage === 'landing' && session && (
        <MemberHome
          profile={profile}
          session={session}
          conversations={conversations}
          notes={notes}
          onContinue={(conv) => loadConversation(conv)}
          onNew={() => setStage('onboarding')}
          onOpenCommunity={() => setStage('community')}
          onOpenBoard={() => setBoardOpen(true)}
          onGoChat={() => personType ? setStage('chat') : setStage('onboarding')}
        />
      )}
      {stage === 'onboarding' && (
        <Onboarding
          onPick={(id) => startNewConversation(id)}
          onBack={() => setStage('landing')}
        />
      )}
      {stage === 'chat' && personType && (
        <Chat
          key={currentConvId}
          personType={personType}
          onOpenPremium={() => setPremium(true)}
          onChangeType={() => setStage('onboarding')}
          notes={notes}
          onAddNote={addNote}
          onOpenBoard={() => setBoardOpen(true)}
          onOpenCommunity={() => setStage('community')}
          onOpenHistory={() => setHistoryOpen(true)}
          prefilledInput={prefilledInput}
          onConsumePrefill={() => setPrefilledInput('')}
          profile={profile}
          initialMessages={currentConv?.messages ?? []}
          onMessagesChange={(msgs) => currentConvId && updateConv(currentConvId, msgs)}
          conversations={conversations}
        />
      )}
      {stage === 'community' && (
        <Community
          session={session}
          profile={profile}
          onClose={() => setStage(personType ? 'chat' : 'landing')}
          onOpenChat={(question) => {
            setPrefilledInput(question);
            setStage('chat');
          }}
        />
      )}
      <Board
        open={boardOpen}
        onClose={() => setBoardOpen(false)}
        notes={notes}
        onRemove={removeNote}
        onGoDeeper={goDeeper}
        onSharePublicly={sharePublicly}
      />
      <ConversationHistory
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        conversations={conversations}
        onLoad={loadConversation}
        onDelete={removeConv}
        onNew={() => { setHistoryOpen(false); setStage('onboarding'); }}
      />
      <PremiumModal open={premium} onClose={() => setPremium(false)} profile={profile} />
      <BottomNav
        stage={stage}
        authStage={authStage}
        session={session}
        profile={profile}
        notes={notes}
        boardOpen={boardOpen}
        onGoHome={() => setStage('landing')}
        onGoCommunity={() => setStage('community')}
        onOpenBoard={() => setBoardOpen(true)}
        onGoProfile={() => {
          if (session) setAuthStage('profile-view');
          else setAuthStage('auth');
        }}
      />
    </>
  );
}
