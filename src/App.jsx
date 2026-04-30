import { useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react';
import { T, globalCss } from './theme.js';
import { PERSON_TYPES, STARTERS, DEEPER_STARTERS, PREMIUM_FEATURES, ADS } from './constants.js';

function ScreenLoader() {
  return (
    <div style={{ minHeight: '100vh', background: T.cream, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 28, height: 28, border: `2px solid ${T.line}`, borderTopColor: T.gold, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
import { getSystemPrompt } from './prompts.js';
import { useSpeechRecognition } from './useSpeechRecognition.js';
import { useTextToSpeech } from './useTextToSpeech.js';
import { supabase } from './supabase.js';
import Auth from './Auth.jsx';
import ProfileSetup from './Profile.jsx';
import ProfilePage, { Avatar } from './ProfilePage.jsx';
import Home from './Home.jsx';
import GuestQuestion from './GuestQuestion.jsx';

const Community         = lazy(() => import('./Community.jsx'));
const ChurchHub         = lazy(() => import('./ChurchHub.jsx'));
const Prayer            = lazy(() => import('./Prayer.jsx'));
const GroupSpace        = lazy(() => import('./GroupSpace.jsx'));
const GroupSetup        = lazy(() => import('./GroupSetup.jsx'));
const SeekingIntake     = lazy(() => import('./SeekingIntake.jsx'));
const Journeys          = lazy(() => import('./Journeys.jsx'));
const SharedView        = lazy(() => import('./SharedView.jsx'));
const StudySession      = lazy(() => import('./StudySession.jsx'));
const MePanel           = lazy(() => import('./MePanel.jsx'));
const UserProfile       = lazy(() => import('./UserProfile.jsx'));
const PeopleSearch      = lazy(() => import('./PeopleSearch.jsx'));
const BibleReader       = lazy(() => import('./BibleReader.jsx'));
const InviteFriends     = lazy(() => import('./InviteFriends.jsx'));
const PastorApply       = lazy(() => import('./PastorApply.jsx'));
const ChurchPage        = lazy(() => import('./ChurchPage.jsx'));
const ChurchDirectory   = lazy(() => import('./ChurchDirectory.jsx'));
const Walks             = lazy(() => import('./Walks.jsx'));
const TalkToSomeone     = lazy(() => import('./TalkToSomeone.jsx'));
const CareTeamInbox     = lazy(() => import('./CareTeamInbox.jsx'));
const CareTeamAdmin     = lazy(() => import('./CareTeamAdmin.jsx'));
const SermonComposer    = lazy(() => import('./SermonComposer.jsx'));
const PastorDashboard   = lazy(() => import('./PastorDashboard.jsx'));
const AnonymousWelcome  = lazy(() => import('./AnonymousWelcome.jsx'));
const ChurchEntry       = lazy(() => import('./ChurchEntry.jsx'));
const CareConversation  = lazy(() => import('./CareConversation.jsx'));
import { PERSON_TYPES as ALL_PERSON_TYPES } from './constants.js';
import { trialStatus } from './trial.js';
import { JOURNEYS, getJourneyProgress, advanceJourneyProgress } from './journeys.js';

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

function Landing({ onBegin, onSignIn, session, profile, onEditProfile, onPastorIntent }) {
  return (
    <div style={{ minHeight: '100vh', background: '#1A110A', display: 'flex', flexDirection: 'column', fontFamily: T.sans }}>

      {/* Nav */}
      <header style={{ padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: T.gold, fontSize: 15, lineHeight: 1 }}>✦</span>
          <span style={{ fontFamily: T.display, fontSize: 19, fontWeight: 600, color: T.cream, letterSpacing: '-0.005em' }}>The Way</span>
        </div>
        {session ? (
          <button onClick={onEditProfile} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
            <Avatar name={profile?.display_name} avatarConfig={profile?.avatar_config} size={34} />
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button onClick={onSignIn} style={{ background: 'none', border: 'none', color: 'rgba(253,248,240,0.55)', fontSize: 14, cursor: 'pointer', padding: '8px 4px', letterSpacing: '0.01em' }}>Sign in</button>
            <button
              onClick={onBegin}
              style={{ background: T.gold, color: T.cream, border: 'none', padding: '10px 22px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.02em', boxShadow: '0 4px 16px rgba(196,129,58,0.35)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#d4913f'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = T.gold; }}
            >Get started</button>
          </div>
        )}
      </header>

      {/* Hero */}
      <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '72px 24px 88px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, left: '50%', transform: 'translateX(-50%)', width: 800, height: 560, background: 'radial-gradient(ellipse at 50% 30%, rgba(196,129,58,0.16) 0%, rgba(196,129,58,0.05) 50%, transparent 72%)', pointerEvents: 'none' }} />

        <div style={{ fontSize: 11, letterSpacing: 6, textTransform: 'uppercase', color: 'rgba(253,248,240,0.5)', marginBottom: 44, fontWeight: 500, position: 'relative' }}>
          AI &nbsp;·&nbsp; Community &nbsp;·&nbsp; Prayer &nbsp;·&nbsp; Journeys
        </div>

        <h1 style={{ fontFamily: T.display, fontSize: 'clamp(42px, 7.5vw, 84px)', lineHeight: 1.04, margin: '0 0 28px', fontWeight: 600, letterSpacing: '-0.028em', color: T.cream, maxWidth: 760, width: '100%', position: 'relative' }}>
          A place to ask, listen,<br />and <em style={{ color: T.gold, fontStyle: 'italic', fontWeight: 500 }}>walk together.</em>
        </h1>

        <p style={{ fontFamily: T.serif, fontSize: 18.5, lineHeight: 1.7, color: 'rgba(253,248,240,0.66)', maxWidth: 560, width: '100%', margin: '0 0 60px', position: 'relative' }}>
          For believers, seekers, and the still-not-sure — an honest companion through scripture, prayer, and the people walking the same road.
        </p>

        <div style={{ position: 'relative', width: '100%', maxWidth: 640, margin: '0 auto' }}>
          <GuestQuestion onSignUp={onBegin} />
        </div>
      </main>

      {/* Section divider */}
      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)', margin: '0 40px 96px' }} />

      {/* What you get */}
      <section style={{ padding: '0 32px 96px', maxWidth: 1040, margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <div style={{ fontSize: 11, letterSpacing: 6, textTransform: 'uppercase', color: T.gold, opacity: 0.7, marginBottom: 14 }}>
            Where doubt becomes discovery
          </div>
          <h2 style={{ fontFamily: T.display, fontSize: 'clamp(28px, 3.6vw, 38px)', color: T.cream, fontWeight: 600, margin: 0, letterSpacing: '-0.018em', lineHeight: 1.15 }}>
            Everything you need in one place.
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14 }}>
          {[
            { num: '01', icon: '✦', gold: true, title: 'AI Companion', desc: "Ask anything. Get honest, scripture-grounded answers that don't dodge the hard parts." },
            { num: '02', icon: '👥', title: 'Real Community', desc: "Share what you're wrestling with. Find people at every stage — curious, skeptical, faithful." },
            { num: '03', icon: '🙏', title: 'Prayer Together', desc: "Post requests. Follow others' journeys. Watch what happens when people pray together." },
            { num: '04', icon: '🗺️', title: 'Guided Journeys', desc: 'Step-by-step paths through scripture — starting exactly where you are.' },
          ].map((f) => (
            <div
              key={f.title}
              style={{ padding: '32px 28px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 20, transition: 'all 0.2s ease', cursor: 'default' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.borderColor = 'rgba(196,129,58,0.35)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div style={{ fontSize: f.gold ? 22 : 30 }}>{f.icon}</div>
                <div style={{ fontFamily: T.serif, fontSize: 11, color: T.gold, opacity: 0.6, letterSpacing: 2 }}>{f.num}</div>
              </div>
              <div style={{ fontFamily: T.display, fontSize: 18, fontWeight: 600, color: T.cream, marginBottom: 10, lineHeight: 1.25, letterSpacing: '-0.01em' }}>{f.title}</div>
              <div style={{ fontSize: 13, color: 'rgba(253,248,240,0.55)', lineHeight: 1.8 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Section divider */}
      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)', margin: '0 40px 96px' }} />

      {/* Who it's for */}
      <section style={{ padding: '0 24px 96px', textAlign: 'center' }}>
        <div style={{ fontSize: 11, letterSpacing: 6, textTransform: 'uppercase', color: T.gold, opacity: 0.7, marginBottom: 16 }}>
          Wherever you are
        </div>
        <p style={{ fontFamily: T.serif, fontSize: 18, color: 'rgba(253,248,240,0.55)', marginBottom: 36, lineHeight: 1.6 }}>
          No prior knowledge required. No judgment. No pressure.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', maxWidth: 680, margin: '0 auto' }}>
          {[
            { e: '🤔', l: 'The curious' },
            { e: '🔍', l: 'The skeptic' },
            { e: '🙏', l: 'The seeker' },
            { e: '📖', l: 'The questioning faithful' },
            { e: '💭', l: 'The agnostic' },
            { e: '🌱', l: 'The new believer' },
          ].map((p) => (
            <div
              key={p.l}
              style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 999, fontSize: 14, color: 'rgba(253,248,240,0.7)', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(196,129,58,0.4)'; e.currentTarget.style.color = T.cream; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(253,248,240,0.7)'; }}
            >
              <span>{p.e}</span><span>{p.l}</span>
            </div>
          ))}
        </div>
      </section>

      {/* For pastors */}
      {onPastorIntent && !profile?.is_pastor && (
        <section style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '72px 24px 80px', textAlign: 'center', position: 'relative' }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <div style={{ fontSize: 11, letterSpacing: 6, textTransform: 'uppercase', color: T.gold, opacity: 0.7, marginBottom: 20 }}>
              For pastors & church leaders
            </div>
            <h2 style={{ fontFamily: T.display, fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 600, color: T.cream, lineHeight: 1.1, margin: '0 0 16px', letterSpacing: '-0.022em' }}>
              Bring your church<br />into the conversation.
            </h2>
            <p style={{ fontFamily: T.serif, fontSize: 16, color: 'rgba(253,248,240,0.55)', lineHeight: 1.7, margin: '0 0 32px' }}>
              A quiet, honest space your congregation can use between Sundays — for questions, prayer, and going deeper. We verify every church by hand.
            </p>
            <button
              onClick={onPastorIntent}
              style={{ background: 'transparent', color: T.gold, border: `1px solid ${T.gold}`, borderRadius: 999, padding: '13px 30px', fontSize: 14, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.02em' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(196,129,58,0.12)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              ✦ Apply to bring your church
            </button>
          </div>
        </section>
      )}

      {/* Bottom CTA */}
      <section style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '96px 24px 100px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 600, height: 400, background: 'radial-gradient(ellipse at 50% 0%, rgba(196,129,58,0.1) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 560, margin: '0 auto', position: 'relative' }}>
          <div style={{ fontSize: 11, letterSpacing: 6, textTransform: 'uppercase', color: T.gold, opacity: 0.7, marginBottom: 24 }}>
            Free · Forever · No judgment
          </div>
          <h2 style={{ fontFamily: T.display, fontSize: 'clamp(32px, 4.8vw, 54px)', fontWeight: 600, color: T.cream, lineHeight: 1.06, marginBottom: 20, letterSpacing: '-0.025em' }}>
            Bring the questions.<br />Find the people walking the same road.
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(253,248,240,0.52)', lineHeight: 1.75, marginBottom: 44, maxWidth: 420, margin: '0 auto 44px' }}>
            The conversation you've been looking for is already here.
          </p>
          <button
            onClick={onBegin}
            style={{ background: T.gold, color: T.cream, border: 'none', borderRadius: 999, padding: '17px 52px', fontSize: 16, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.03em', boxShadow: '0 8px 40px rgba(196,129,58,0.4)', display: 'inline-block' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#d4913f'; e.currentTarget.style.boxShadow = '0 12px 48px rgba(196,129,58,0.55)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = T.gold; e.currentTarget.style.boxShadow = '0 8px 40px rgba(196,129,58,0.4)'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            Begin your journey →
          </button>
          {!session && (
            <div style={{ marginTop: 20, fontSize: 13, color: 'rgba(253,248,240,0.35)' }}>
              Already a member?{' '}
              <button onClick={onSignIn} style={{ background: 'none', border: 'none', color: 'rgba(253,248,240,0.6)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>Sign in</button>
            </div>
          )}
        </div>
      </section>

      <footer style={{ padding: '20px 40px', textAlign: 'center', fontSize: 12, color: 'rgba(253,248,240,0.22)', borderTop: '1px solid rgba(255,255,255,0.05)', letterSpacing: '0.04em' }}>
        ✦ &nbsp;The Way &nbsp;·&nbsp; {new Date().getFullYear()} &nbsp;·&nbsp; Free to explore
      </footer>
    </div>
  );
}

function Onboarding({ onPick, onBack }) {
  return (
    <div style={{ minHeight: '100vh', background: T.ink, display: 'flex', flexDirection: 'column' }}>

      {/* Gold accent line */}
      <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${T.gold}, transparent)` }} />

      {/* Header */}
      <div style={{ padding: '22px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(253,248,240,0.45)', fontSize: 13, cursor: 'pointer', padding: 0, letterSpacing: '0.05em' }}>
          ← Back
        </button>
        <div style={{ fontFamily: T.display, fontSize: 16, fontWeight: 600, color: 'rgba(253,248,240,0.4)', letterSpacing: '-0.005em' }}>The Way</div>
        <div style={{ width: 48 }} />
      </div>

      {/* Hero text */}
      <div style={{ textAlign: 'center', padding: '40px 24px 48px' }}>
        <div style={{ fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', color: T.gold, marginBottom: 24, opacity: 0.8 }}>
          Before we begin
        </div>
        <h2 style={{ fontFamily: T.display, fontSize: 'clamp(34px, 5.2vw, 56px)', margin: '0 0 18px', color: T.cream, fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1.06 }}>
          Where are you, honestly?
        </h2>
        <p style={{ fontFamily: T.serif, fontSize: 17.5, color: 'rgba(253,248,240,0.6)', maxWidth: 480, margin: '0 auto', lineHeight: 1.65 }}>
          Pick whatever is closest. You can change your mind at any time — this just tunes the tone.
        </p>
      </div>

      {/* Cards */}
      <div style={{ flex: 1, padding: '0 24px 60px', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14, width: '100%', maxWidth: 820 }}>
          {PERSON_TYPES.map((p) => (
            <button
              key={p.id}
              onClick={() => onPick(p.id)}
              className="fade-up"
              style={{
                textAlign: 'left',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(196,129,58,0.2)',
                borderRadius: 16,
                padding: 24,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(196,129,58,0.1)';
                e.currentTarget.style.borderColor = T.gold;
                e.currentTarget.style.transform = 'translateY(-3px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                e.currentTarget.style.borderColor = 'rgba(196,129,58,0.2)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ fontSize: 26, marginBottom: 12 }}>{p.emoji}</div>
              <div style={{ fontFamily: T.display, fontSize: 19, fontWeight: 600, color: T.cream, marginBottom: 6, letterSpacing: '-0.012em', lineHeight: 1.2 }}>{p.label}</div>
              <div style={{ fontSize: 13, color: 'rgba(253,248,240,0.5)', lineHeight: 1.6 }}>{p.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function PremiumModal({ open, onClose, profile, email, hitLimit }) {
  const [joined, setJoined] = useState(false);
  if (!open) return null;

  async function joinList() {
    if (email) {
      await supabase.from('waitlist').upsert({ email, source: hitLimit ? 'limit' : 'upgrade' }, { onConflict: 'email' }).catch(() => {});
    }
    setJoined(true);
  }

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
        {joined ? (
          <>
            <div style={{ textAlign: 'center', padding: '12px 0 8px' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✦</div>
              <div style={{ fontFamily: T.display, fontSize: 26, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 10 }}>
                You're on the list
              </div>
              <div style={{ color: T.inkSoft, fontSize: 15, lineHeight: 1.7, marginBottom: 24 }}>
                We'll email <strong>{email}</strong> the moment billing opens — usually within a few days.
              </div>
              <button
                onClick={onClose}
                style={{ background: T.gold, color: T.cream, border: 'none', borderRadius: 999, padding: '13px 32px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                Keep reading
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', color: T.goldDark, marginBottom: 10 }}>
              The Way · Deeper
            </div>
            <div style={{ fontFamily: T.display, fontSize: 30, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em', lineHeight: 1.12, marginBottom: 8 }}>
              {hitLimit ? "You've used your 10 free messages" : <>$7.99<span style={{ fontSize: 15, color: T.inkMuted, fontWeight: 400 }}> CAD / month</span></>}
            </div>
            <div style={{ color: T.inkSoft, fontSize: 15, marginBottom: 18, lineHeight: 1.65 }}>
              {hitLimit
                ? 'Billing is launching soon. Join the list and we\'ll email you the moment it\'s open — then pick up right where you left off.'
                : 'The Extended Canon, historical texts, saved notes, and an ad-free experience. Less than a coffee a month.'}
            </div>
            <ul style={{ paddingLeft: 18, margin: '0 0 22px', color: T.inkSoft, lineHeight: 1.8 }}>
              {PREMIUM_FEATURES.map((f) => (
                <li key={f} style={{ fontSize: 14 }}>{f}</li>
              ))}
            </ul>
            {email && (
              <div style={{ background: 'rgba(196,129,58,0.08)', border: `1px solid ${T.goldLight}`, borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: T.inkSoft }}>
                We'll notify <strong style={{ color: T.ink }}>{email}</strong> when billing opens.
              </div>
            )}
            <button
              onClick={joinList}
              style={{ width: '100%', background: T.gold, color: T.cream, border: 'none', borderRadius: 999, padding: '14px 20px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
            >
              Notify me when billing opens →
            </button>
            <button
              onClick={onClose}
              style={{ width: '100%', background: 'transparent', color: T.inkMuted, border: 'none', marginTop: 10, fontSize: 13, cursor: 'pointer' }}
            >
              Maybe later
            </button>
          </>
        )}
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

const NOTES_KEY = 'theway:notes:v1';
const CONVS_KEY = 'theway:convs:v1';

function useConversations() {
  const [conversations, setConversations] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CONVS_KEY)) ?? []; }
    catch { return []; }
  });

  useEffect(() => {
    try { localStorage.setItem(CONVS_KEY, JSON.stringify(conversations.filter((c) => c.messages.length > 0))); }
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

function BottomNav({ stage, authStage, session, profile, chatOpen,
  onGoHome, onGoChurch, onGoRead, onGoPeople, onGoMe, onToggleChat,
}) {
  if (authStage === 'auth' || authStage === 'profile-setup') return null;
  if (!session) return null;
  if (stage === 'onboarding' || stage === 'intake') return null;

  // Map stages onto top-level tabs
  const tabFor = (s) => {
    if (s === 'home') return 'home';
    if (s === 'church-hub' || s === 'church' || s === 'churches' || s === 'church-entry' || s === 'feed' || s === 'groups' || s === 'prayer' || s === 'talk-to-someone' || s === 'care-conversation') return 'church';
    if (s === 'read') return 'read';
    if (s === 'me' || s === 'walks' || s === 'care-inbox' || s === 'pastor-dashboard') return 'me';
    return null;
  };
  const active = tabFor(stage);

  const tabStyle = (id) => ({
    flex: 1, background: 'none', border: 'none',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 3, cursor: 'pointer', padding: '8px 4px',
    color: active === id ? T.goldDark : T.inkMuted,
    transition: 'color 0.18s ease',
  });

  const labelStyle = (id) => ({
    fontSize: 10, fontWeight: active === id ? 600 : 400, letterSpacing: 0.3,
  });

  return (
    <>
      {/* ── Floating Ask FAB ───────────────────────────────── */}
      <button
        onClick={onToggleChat}
        aria-label="Ask anything"
        style={{
          position: 'fixed', right: 18, bottom: 78,
          width: 58, height: 58, borderRadius: '50%',
          background: chatOpen
            ? `linear-gradient(135deg, ${T.gold} 0%, #c47020 100%)`
            : `linear-gradient(135deg, ${T.ink} 0%, #1f1009 100%)`,
          border: `3px solid ${T.white}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: T.cream, fontSize: 22,
          cursor: 'pointer', zIndex: 101,
          boxShadow: '0 6px 20px rgba(196,129,58,0.30)',
          animation: chatOpen ? 'none' : 'askPulse 3.2s ease-in-out infinite',
          transition: 'background 0.2s, transform 0.18s',
        }}
        onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.94)'; }}
        onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        ✦
      </button>

      {/* ── Bottom tab bar ─────────────────────────────────── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        height: 62, background: T.white, borderTop: `1px solid ${T.line}`,
        display: 'flex', alignItems: 'center', zIndex: 100,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        <button onClick={onGoHome} style={tabStyle('home')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span style={labelStyle('home')}>Home</span>
        </button>

        <button onClick={onGoChurch} style={tabStyle('church')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <span style={labelStyle('church')}>Church</span>
        </button>

        <button onClick={onGoRead} style={tabStyle('read')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
          <span style={labelStyle('read')}>Bible</span>
        </button>

        <button onClick={onGoPeople} style={tabStyle('people')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7"/>
            <path d="M21 21l-4.3-4.3"/>
          </svg>
          <span style={labelStyle('people')}>People</span>
        </button>

        <button onClick={onGoMe} style={tabStyle('me')}>
          <Avatar
            name={profile?.display_name}
            avatarConfig={profile?.avatar_config}
            size={24}
            style={{ border: `2px solid ${active === 'me' ? T.gold : T.line}` }}
          />
          <span style={labelStyle('me')}>You</span>
        </button>
      </div>
    </>
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

function MemberHome({ profile, session, conversations, notes, onContinue, onNew, onOpenCommunity, onOpenBoard, onGoChat, onOpenPrayer, onOpenJourneys, journeyProgress, userGroup, onOpenGroup }) {
  const [communityPosts, setCommunityPosts] = useState([]);
  const [milestoneDismissed, setMilestoneDismissed] = useState(
    () => localStorage.getItem('theway:milestone_dismissed') === 'true'
  );
  const recent = conversations[0] ?? null;
  const verse = DAILY_VERSES[new Date().getDate() % DAILY_VERSES.length];

  const daysSinceJoined = profile?.created_at
    ? Math.floor((Date.now() - new Date(profile.created_at)) / 86400000) : 0;
  const showMilestoneCard = profile?.person_type === 'seeking'
    && daysSinceJoined >= 21
    && conversations.length >= 3
    && !milestoneDismissed;

  const dailyPool = STARTERS[profile?.person_type ?? 'curious'] ?? STARTERS.curious;
  const dailyQuestion = dailyPool[new Date().getDate() % dailyPool.length];

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
    <div style={{ minHeight: '100vh', background: T.cream, paddingBottom: 100 }}>

      {/* Gold accent line */}
      <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${T.gold}, transparent)` }} />

      {/* Hero */}
      <div style={{ background: T.ink, padding: '36px 24px 52px', position: 'relative', overflow: 'hidden' }}>
        {/* Dot grid */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.05, backgroundImage: 'radial-gradient(circle, #C4813A 1px, transparent 1px)', backgroundSize: '22px 22px', pointerEvents: 'none' }} />
        {/* Background ornament */}
        <svg style={{ position: 'absolute', right: -30, top: -30, opacity: 0.06 }} width="220" height="220" viewBox="0 0 220 220" fill="none">
          <circle cx="110" cy="110" r="100" stroke="#C4813A" strokeWidth="1"/>
          <circle cx="110" cy="110" r="68" stroke="#C4813A" strokeWidth="1"/>
          <circle cx="110" cy="110" r="36" stroke="#C4813A" strokeWidth="1"/>
          <line x1="110" y1="0" x2="110" y2="220" stroke="#C4813A" strokeWidth="0.5"/>
          <line x1="0" y1="110" x2="220" y2="110" stroke="#C4813A" strokeWidth="0.5"/>
        </svg>

        <div style={{ maxWidth: 680, margin: '0 auto', position: 'relative' }}>
          {/* Top row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: 4, textTransform: 'uppercase', color: T.gold, marginBottom: 14, opacity: 0.75 }}>The Way</div>
              <div style={{ fontFamily: T.serif, color: T.cream }}>
                <div style={{ fontSize: 15, opacity: 0.5, marginBottom: 2 }}>{greeting()},</div>
                <div style={{ fontSize: 44, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em' }}>{firstName}.</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
              <Avatar name={profile?.display_name} avatarConfig={profile?.avatar_config} size={58} style={{ border: '2px solid rgba(196,129,58,0.5)', boxShadow: '0 0 24px rgba(196,129,58,0.2)' }} />
              <button onClick={onGoChat} style={{ background: 'transparent', color: T.gold, border: '1px solid rgba(196,129,58,0.35)', borderRadius: 999, padding: '6px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer', letterSpacing: '0.05em' }}>
                Open chat →
              </button>
            </div>
          </div>

          {/* Daily verse — pull quote style */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ fontFamily: T.serif, fontStyle: 'italic', fontSize: 'clamp(17px, 3vw, 22px)', color: T.cream, lineHeight: 1.6, marginBottom: 14, opacity: 0.88 }}>
              "{verse.text}"
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ height: 1, width: 28, background: T.gold, opacity: 0.5 }} />
              <div style={{ fontSize: 11, color: T.gold, letterSpacing: 2, opacity: 0.75 }}>{verse.ref}</div>
            </div>
          </div>

          {/* Continue / start */}
          {recent && recent.messages.length > 0 ? (
            <div onClick={() => onContinue(recent)}
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(196,129,58,0.2)', borderRadius: 16, padding: '18px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16, transition: 'border-color 0.2s' }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(196,129,58,0.55)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(196,129,58,0.2)')}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, color: T.gold, textTransform: 'uppercase', letterSpacing: 2.5, marginBottom: 6 }}>Continue exploring</div>
                <div style={{ fontFamily: T.serif, fontSize: 16, color: T.cream, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{recent.title}</div>
                <div style={{ fontSize: 12, color: 'rgba(253,248,240,0.38)', marginTop: 4 }}>{person?.emoji} {person?.label} · {recent.messages.length} exchanges</div>
              </div>
              <div style={{ color: T.gold, fontSize: 22, flexShrink: 0 }}>→</div>
            </div>
          ) : (
            <button onClick={onNew} style={{ width: '100%', background: 'transparent', color: T.cream, border: '1px solid rgba(196,129,58,0.3)', borderRadius: 16, padding: '18px 20px', fontFamily: T.serif, fontSize: 17, cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Ask your first question</span>
              <span style={{ color: T.gold }}>→</span>
            </button>
          )}
        </div>
      </div>

      {/* Gold separator */}
      <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${T.gold}50, transparent)` }} />

      {/* Body */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 20px' }}>

        {/* Milestone check-in */}
        {showMilestoneCard && (
          <div style={{ background: T.ink, border: '1px solid rgba(196,129,58,0.3)', borderRadius: 20, padding: '28px 24px', marginBottom: 24 }}>
            <div style={{ fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: T.gold, marginBottom: 14, opacity: 0.7 }}>Three weeks on the road</div>
            <div style={{ fontFamily: T.display, fontSize: 22, color: T.cream, fontWeight: 600, lineHeight: 1.18, letterSpacing: '-0.018em', marginBottom: 12 }}>
              How are you feeling about all of this?
            </div>
            <div style={{ fontSize: 14, color: 'rgba(253,248,240,0.55)', lineHeight: 1.65, marginBottom: 22 }}>
              You've been exploring honestly for a while now. No pressure — just a genuine check-in. What's shifted, if anything?
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button onClick={onGoChat} style={{ background: T.gold, color: T.cream, border: 'none', borderRadius: 999, padding: '10px 22px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Let's talk →
              </button>
              <button
                onClick={() => { setMilestoneDismissed(true); localStorage.setItem('theway:milestone_dismissed', 'true'); }}
                style={{ background: 'transparent', color: 'rgba(253,248,240,0.38)', border: 'none', fontSize: 13, cursor: 'pointer', padding: 0 }}
              >
                Not yet
              </button>
            </div>
          </div>
        )}

        {/* Daily question */}
        <div style={{ background: T.parchment, border: `1px solid ${T.line}`, borderRadius: 16, padding: '20px 22px', marginBottom: 24, cursor: 'pointer' }}
          onClick={onGoChat}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.gold; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.line; }}
        >
          <div style={{ fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: T.goldDark, marginBottom: 10, opacity: 0.8 }}>Today's question</div>
          <div style={{ fontFamily: T.serif, fontSize: 16, color: T.ink, lineHeight: 1.55, marginBottom: 10 }}>{dailyQuestion}</div>
          <div style={{ fontSize: 12, color: T.inkMuted }}>Tap to explore →</div>
        </div>

        {/* Quick actions */}
        <div style={{ fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: T.inkMuted, marginBottom: 16 }}>Quick access</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 36 }}>
          {[
            { label: 'New question', sub: 'Start fresh', icon: '✦', onClick: onNew },
            { label: 'Your board', sub: `${notes.length} saved`, icon: '⊞', onClick: onOpenBoard },
            { label: 'Community', sub: "See what's shared", icon: '◎', onClick: onOpenCommunity },
            { label: 'Prayer', sub: 'Pray with others', icon: '✝', onClick: onOpenPrayer },
          ].map((item) => (
            <button key={item.label} onClick={item.onClick}
              style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 16, padding: '22px 16px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', boxShadow: '0 2px 10px rgba(44,24,16,0.05)' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.gold; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(44,24,16,0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.line; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(44,24,16,0.05)'; }}
            >
              <div style={{ fontFamily: T.serif, fontSize: 24, color: T.goldDark, marginBottom: 12, lineHeight: 1 }}>{item.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 3, letterSpacing: '0.01em' }}>{item.label}</div>
              <div style={{ fontSize: 11, color: T.inkMuted }}>{item.sub}</div>
            </button>
          ))}
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
          <div style={{ flex: 1, height: 1, background: T.line }} />
          <svg width="12" height="12" viewBox="0 0 12 12"><line x1="6" y1="0" x2="6" y2="12" stroke={T.gold} strokeWidth="1.5"/><line x1="0" y1="6" x2="12" y2="6" stroke={T.gold} strokeWidth="1.5"/></svg>
          <div style={{ flex: 1, height: 1, background: T.line }} />
        </div>

        {/* Group */}
        <div style={{ marginBottom: 28 }}>
          {userGroup ? (
            <div onClick={onOpenGroup} style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 18, padding: '18px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, transition: 'all 0.2s', boxShadow: '0 2px 10px rgba(44,24,16,0.05)' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.gold; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.line; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: T.parchment, border: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>⛪</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 2 }}>{userGroup.group.name}</div>
                <div style={{ fontSize: 11, color: T.inkMuted }}>{userGroup.role === 'pastor' ? 'You lead this group' : 'Member'}{userGroup.group.tradition ? ` · ${userGroup.group.tradition}` : ''}</div>
              </div>
              <div style={{ color: T.goldDark, fontSize: 18 }}>→</div>
            </div>
          ) : (
            <button onClick={onOpenGroup} style={{ width: '100%', textAlign: 'left', background: T.white, border: `1px solid ${T.line}`, borderRadius: 18, padding: '18px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, transition: 'all 0.2s', boxShadow: '0 2px 10px rgba(44,24,16,0.05)' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.gold; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.line; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: T.parchment, border: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>⛪</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 2 }}>Join or start a group</div>
                <div style={{ fontSize: 11, color: T.inkMuted }}>Church, small group, or home study</div>
              </div>
            </button>
          )}
        </div>

        {/* Guided Paths */}
        {(() => {
          const inProgress = JOURNEYS.find((j) => {
            const done = journeyProgress?.[j.id] ?? 0;
            return done > 0 && done < j.steps.length;
          });
          const journey = inProgress ?? null;
          const stepsDone = journey ? (journeyProgress?.[journey.id] ?? 0) : 0;
          const nextStep = journey?.steps[stepsDone];

          return (
            <div style={{ marginBottom: 36 }}>
              <div style={{ fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: T.inkMuted, marginBottom: 16 }}>Guided paths</div>
              {journey && nextStep ? (
                <div
                  onClick={onOpenJourneys}
                  style={{ background: T.ink, border: '1px solid rgba(196,129,58,0.28)', borderRadius: 18, padding: '20px 22px', cursor: 'pointer', transition: 'border-color 0.2s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(196,129,58,0.6)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(196,129,58,0.28)')}
                >
                  <div style={{ fontSize: 10, letterSpacing: 2.5, color: T.gold, textTransform: 'uppercase', marginBottom: 8, opacity: 0.7 }}>
                    Continue · {journey.title}
                  </div>
                  <div style={{ fontFamily: T.display, fontSize: 18, color: T.cream, fontWeight: 600, letterSpacing: '-0.012em', marginBottom: 6 }}>{nextStep.title}</div>
                  <div style={{ fontSize: 12, color: 'rgba(253,248,240,0.38)', marginBottom: 14 }}>{nextStep.subtitle}</div>
                  <div style={{ height: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(stepsDone / journey.steps.length) * 100}%`, background: T.gold, opacity: 0.6 }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(253,248,240,0.3)', marginTop: 8 }}>{stepsDone} of {journey.steps.length} explored</div>
                </div>
              ) : (
                <button
                  onClick={onOpenJourneys}
                  style={{ width: '100%', textAlign: 'left', background: T.white, border: `1px solid ${T.line}`, borderRadius: 18, padding: '20px 22px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 10px rgba(44,24,16,0.05)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.gold; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.line; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <div style={{ fontFamily: T.serif, fontSize: 22, color: T.goldDark, marginBottom: 10 }}>◈</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 4 }}>Begin a guided path</div>
                  <div style={{ fontSize: 12, color: T.inkMuted, lineHeight: 1.55 }}>
                    Four structured journeys — The Seeker's Path, The Skeptic's Path, and more. Five conversations each, building toward something.
                  </div>
                </button>
              )}
            </div>
          );
        })()}

        {/* Community preview */}
        <div style={{ fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: T.inkMuted, marginBottom: 18 }}>From the community</div>

        {communityPosts.length === 0 && (
          <div style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 16, padding: '40px 24px', textAlign: 'center' }}>
            <div style={{ fontFamily: T.serif, fontSize: 20, color: T.inkSoft, marginBottom: 8 }}>The conversation is just beginning.</div>
            <div style={{ fontSize: 13, color: T.inkMuted }}>Share a note from your board to be the first voice.</div>
          </div>
        )}

        {communityPosts.map((p) => {
          const postPerson = PERSON_TYPES.find((pt) => pt.id === p.profiles?.person_type);
          const reactionCount = p.reactions?.length ?? 0;
          const replyCount = p.replies?.length ?? 0;
          return (
            <div key={p.id} onClick={onOpenCommunity}
              style={{ background: T.white, borderRadius: 16, border: `1px solid ${T.line}`, marginBottom: 12, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 10px rgba(44,24,16,0.04)' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.goldLight; e.currentTarget.style.boxShadow = '0 6px 20px rgba(44,24,16,0.09)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.line; e.currentTarget.style.boxShadow = '0 2px 10px rgba(44,24,16,0.04)'; }}
            >
              <div style={{ padding: '18px 20px 14px' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                  <Avatar name={p.profiles?.display_name} avatarConfig={p.profiles?.avatar_config} size={34} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{p.profiles?.display_name ?? 'Anonymous'}</div>
                    <div style={{ fontSize: 11, color: T.inkMuted }}>{postPerson?.emoji} {postPerson?.label}{p.profiles?.tradition ? ` · ${p.profiles.tradition}` : ''}</div>
                  </div>
                </div>
                <div style={{ fontFamily: T.serif, fontSize: 14, color: T.ink, lineHeight: 1.7, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                  {p.body}
                </div>
              </div>
              {(reactionCount > 0 || replyCount > 0) && (
                <div style={{ padding: '9px 20px', borderTop: `1px solid ${T.line}`, background: T.parchment, fontSize: 12, color: T.inkMuted, display: 'flex', gap: 14 }}>
                  {reactionCount > 0 && <span style={{ color: T.goldDark }}>✦ {reactionCount}</span>}
                  {replyCount > 0 && <span>💬 {replyCount}</span>}
                </div>
              )}
            </div>
          );
        })}

        {communityPosts.length > 0 && (
          <button onClick={onOpenCommunity} style={{ background: 'none', border: 'none', color: T.goldDark, fontSize: 14, cursor: 'pointer', padding: '10px 0', fontFamily: T.serif, fontStyle: 'italic' }}>
            See all in community →
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
            <div style={{ fontFamily: T.display, fontSize: 22, fontWeight: 600, color: T.ink, letterSpacing: '-0.015em' }}>Conversations</div>
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

        {conversations.filter((c) => c.messages.length > 0).length === 0 && (
          <div style={{ padding: '48px 32px', textAlign: 'center', color: T.inkMuted, fontFamily: T.serif, fontSize: 16, lineHeight: 1.6 }}>
            No conversations yet.
            <br />Start asking — your history will appear here.
          </div>
        )}

        {conversations.filter((c) => c.messages.length > 0).map((c) => {
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
            <div style={{ fontFamily: T.display, fontSize: 24, color: T.ink, fontWeight: 600, letterSpacing: '-0.018em', lineHeight: 1.18 }}>
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
                {copiedAll ? 'Copied ✓' : 'Copy all notes'}
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

const GUEST_COUNT_KEY = 'theway:guest_count';

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

  // Load recent connections (people the user follows + followers) for the contacts row
  useEffect(() => {
    if (!session) return;
    async function loadContacts() {
      // Merge following + followers, deduplicate, sort by most recent activity
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

      // Collect unique ids preserving recency order
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
        const res = await fetch('/api/chat', {
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
        // Fallback: open SMS with pre-filled body
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

        {/* Contacts row — recent connections */}
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
                /* Hide scrollbar but keep it scrollable */
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

        {/* Post preview card — heading is the hero */}
        <div style={{
          background: T.parchment, borderRadius: 16, padding: '18px 18px 14px',
          marginBottom: 18, border: `1px solid ${T.line}`,
        }}>
          {/* Heading input */}
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
          {/* Gold accent under heading */}
          <div style={{
            height: 2, width: 40, borderRadius: 1,
            background: headingLoading
              ? T.line
              : `linear-gradient(90deg, ${T.gold}, ${T.goldLight})`,
            margin: '8px 0 10px',
            transition: 'background 0.3s',
            animation: headingLoading ? 'goldPulse 1s ease infinite' : 'none',
          }} />
          {/* Content preview */}
          <div style={{
            fontFamily: T.serif, fontSize: 14, color: T.inkSoft,
            lineHeight: 1.6, maxHeight: 60, overflow: 'hidden', position: 'relative',
          }}>
            {text.slice(0, 160)}{text.length > 160 ? '…' : ''}
            {text.length > 160 && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 28, background: `linear-gradient(transparent, ${T.parchment})` }} />}
          </div>
          {/* Link + AI badge row */}
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

function Chat({
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
  const [shareContent, setShareContent] = useState(null); // { text, label }
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

  // Auto-scroll: only follow if user hasn't scrolled up
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (!userScrolledRef.current) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, busy]);

  // Reset "user scrolled up" flag when a new message send starts
  // (so the response auto-scrolls from the bottom again)
  function resetScroll() {
    userScrolledRef.current = false;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }

  function handleListScroll() {
    const el = listRef.current;
    if (!el) return;
    // If within 80px of the bottom, re-enable auto-scroll
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
      const res = await fetch('/api/chat', {
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
      const res = await fetch('/api/chat', {
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
      // Generate contextual follow-up suggestions after each response
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
          {/* Mode pill — click to switch mode inline */}
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
          {/* ⋮ overflow menu */}
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
          {/* Live group study session banner */}
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
                          // Animated sound-wave bars when playing
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
        {/* Suggestion chips */}
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

export default function App() {
  const [stage, setStage] = useState('landing');
  const [readHomeKey, setReadHomeKey] = useState(0);
  const [personType, setPersonType] = useState(null);
  const [seekingContext, setSeekingContext] = useState(null);
  const [premium, setPremium] = useState(false);
  const [premiumHitLimit, setPremiumHitLimit] = useState(false);
  const [peopleSearchOpen, setPeopleSearchOpen] = useState(false);
  const [boardOpen, setBoardOpen] = useState(false);
  const [chatPanelOpen, setChatPanelOpen] = useState(false);
  const [viewingUserId, setViewingUserId] = useState(null);
  const [viewingChurchId, setViewingChurchId] = useState(null);
  const [winW, setWinW] = useState(() => window.innerWidth);
  const [journeysOpen, setJourneysOpen] = useState(false);
  const [journeyProgress, setJourneyProgress] = useState(() => getJourneyProgress());
  const [autoSendPrompt, setAutoSendPrompt] = useState(null);
  const [userGroup, setUserGroup] = useState(null);   // { group, role }
  const [shareId] = useState(() => new URLSearchParams(window.location.search).get('s'));
  const [studySessionId] = useState(() => new URLSearchParams(window.location.search).get('gs'));
  const [initialChurchId] = useState(() => new URLSearchParams(window.location.search).get('church'));
  const [initialAnonChurchId] = useState(() => new URLSearchParams(window.location.search).get('anon'));
  const [careTeamRecord, setCareTeamRecord] = useState(null);
  const [pastorChurchId, setPastorChurchId] = useState(null);
  const [activeCareConv, setActiveCareConv] = useState(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [currentConvId, setCurrentConvId] = useState(null);
  const [prefilledInput, setPrefilledInput] = useState('');
  const { notes, addNote, removeNote } = useNotes();
  const { conversations, create: createConv, update: updateConv, remove: removeConv } = useConversations();

  useEffect(() => {
    const h = () => setWinW(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  const canDock = winW >= 768;
  const [chatPanelWidth, setChatPanelWidth] = useState(() => {
    const stored = parseInt(localStorage.getItem('chat_panel_width') ?? '0', 10);
    return stored >= 320 ? stored : 460;
  });
  const isResizingRef = useRef(false);
  const isDocked = canDock && chatPanelOpen;

  // Auth + profile state
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authStage, setAuthStage] = useState('idle'); // idle | auth | profile-setup | profile-view
  const [profileEditOrigin, setProfileEditOrigin] = useState('idle'); // where edit profile was opened from
  const [pendingPastorApply, setPendingPastorApply] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      if (data.session) {
        loadProfile(data.session.user.id);
        if (initialAnonChurchId) { setViewingChurchId(initialAnonChurchId); setStage('church-entry'); }
        else if (initialChurchId) { setViewingChurchId(initialChurchId); setStage('church'); }
        else { setStage('home'); setChatPanelOpen(true); }
      } else if (initialAnonChurchId) {
        setViewingChurchId(initialAnonChurchId);
        setStage('church-entry');
      } else if (initialChurchId) {
        setViewingChurchId(initialChurchId);
        setStage('church');
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s) {
        loadProfile(s.user.id);
        if (initialAnonChurchId) { setViewingChurchId(initialAnonChurchId); setStage('church-entry'); }
        else if (initialChurchId) { setViewingChurchId(initialChurchId); setStage('church'); }
        else { setStage('home'); setChatPanelOpen(true); }
      }
      else {
        setProfile(null);
        setCareTeamRecord(null);
        setPastorChurchId(null);
        setStage(initialAnonChurchId ? 'church-entry' : initialChurchId ? 'church' : 'landing');
      }
    });
    return () => listener.subscription.unsubscribe();
  }, [initialChurchId, initialAnonChurchId]);

  async function loadProfile(userId) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setProfile(data ?? null);
    loadGroup(userId);
    loadChurchRoles(userId);
  }

  async function loadChurchRoles(userId) {
    const [{ data: care }, { data: pastoredChurch }] = await Promise.all([
      supabase
        .from('care_team_members')
        .select('id, church_id, role_label, is_active, accepted_covenant_at')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle(),
      supabase
        .from('churches')
        .select('id')
        .eq('pastor_id', userId)
        .maybeSingle(),
    ]);
    setCareTeamRecord(care ?? null);
    setPastorChurchId(pastoredChurch?.id ?? null);
  }

  async function loadGroup(userId) {
    const { data } = await supabase
      .from('group_members')
      .select('role, church_groups(*)')
      .eq('member_id', userId)
      .limit(1)
      .single();
    if (data?.church_groups) setUserGroup({ group: data.church_groups, role: data.role });
  }

  const currentConv = conversations.find((c) => c.id === currentConvId) ?? null;

  function openChat(pType) {
    const pt = pType ?? profile?.person_type ?? personType ?? 'curious';
    if (!currentConvId || (pType && pType !== personType)) {
      const conv = createConv(pt);
      setCurrentConvId(conv.id);
      setPersonType(pt);
    }
    setChatPanelOpen(true);
  }

  function newConversation(pType) {
    const pt = pType ?? personType ?? profile?.person_type ?? 'curious';
    const personDef = ALL_PERSON_TYPES.find((p) => p.id === pt);
    if (!session) {
      setPersonType(pt);
      setAuthStage('auth');
      return;
    }
    if (personDef?.hasIntake) {
      setPersonType(pt);
      setStage('intake');
      return;
    }
    const conv = createConv(pt);
    setCurrentConvId(conv.id);
    setPersonType(pt);
    if (stage === 'onboarding' || stage === 'intake') setStage('home');
    setChatPanelOpen(true);
  }

  function startNewConversation(pType, context = null) {
    const pt = pType ?? personType;
    const personDef = ALL_PERSON_TYPES.find((p) => p.id === pt);
    if (!session) {
      setPersonType(pt);
      setAuthStage('auth');
      return;
    }
    if (personDef?.hasIntake && context === null) {
      setPersonType(pt);
      setStage('intake');
      return;
    }
    setSeekingContext(context);
    const conv = createConv(pt);
    setCurrentConvId(conv.id);
    setPersonType(pt);
    if (stage === 'onboarding' || stage === 'intake') setStage('home');
    setChatPanelOpen(true);
  }

  function startChatFromProfile() {
    const pt = profile?.person_type ?? personType;
    if (!pt) { setStage('onboarding'); return; }
    const conv = createConv(pt);
    setCurrentConvId(conv.id);
    setPersonType(pt);
    setChatPanelOpen(true);
  }

  function startJourneyStep(journey, stepIndex, prompt) {
    const newProgress = advanceJourneyProgress(journey.id, stepIndex);
    setJourneyProgress(newProgress);
    setJourneysOpen(false);
    const pt = journey.personType;
    setPersonType(pt);
    setSeekingContext(null);
    const conv = createConv(pt);
    setCurrentConvId(conv.id);
    setAutoSendPrompt(prompt);
    setChatPanelOpen(true);
  }

  async function handleShare(messages, title) {
    if (!messages?.length) return;
    const id = Math.random().toString(36).slice(2, 9);
    await supabase.from('shared_conversations').insert({
      id,
      title: title ?? 'A conversation from The Way',
      messages,
      person_type: personType,
    });
    const url = `${window.location.origin}?s=${id}`;
    try { await navigator.clipboard.writeText(url); } catch {}
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2500);
  }

  function loadConversation(conv) {
    setCurrentConvId(conv.id);
    setPersonType(conv.personType);
    setHistoryOpen(false);
    setChatPanelOpen(true);
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
    setStage('feed');
  }

  function closeChatPanel() {
    // Delete the conversation if user never sent a message
    if (currentConvId) {
      const conv = conversations.find((c) => c.id === currentConvId);
      if (conv && conv.messages.length === 0) {
        removeConv(currentConvId);
        setCurrentConvId(null);
      }
    }
    setChatPanelOpen(false);
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
          onSave={(p) => {
            setProfile(p);
            setAuthStage('idle');
            if (pendingPastorApply) { setPendingPastorApply(false); setStage('pastor-apply'); }
            else setStage(profileEditOrigin === 'me' ? 'me' : 'feed');
          }}
          onCancel={() => {
            if (pendingPastorApply && profile) { setPendingPastorApply(false); setAuthStage('idle'); setStage('pastor-apply'); return; }
            if (profileEditOrigin === 'me') { setAuthStage('idle'); setStage('me'); } else { setAuthStage(profile ? 'profile-view' : 'idle'); }
          }}
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
          onEdit={() => { setProfileEditOrigin('profile-view'); setAuthStage('profile-setup'); }}
          onSignOut={() => { setSession(null); setProfile(null); setAuthStage('idle'); }}
          onClose={() => setAuthStage('idle')}
          onProfileUpdate={(p) => setProfile(p)}
          onSetPersonType={(pt) => setPersonType(pt)}
        />
      </>
    );
  }

  if (shareId) {
    return (
      <>
        <style>{globalCss}</style>
        <Suspense fallback={<ScreenLoader />}>
          <SharedView shareId={shareId} onBegin={() => { window.history.replaceState({}, '', '/'); window.location.reload(); }} />
        </Suspense>
      </>
    );
  }

  if (studySessionId) {
    return (
      <>
        <style>{globalCss}</style>
        <Suspense fallback={<ScreenLoader />}>
          <StudySession sessionId={studySessionId} onBegin={() => { window.history.replaceState({}, '', '/'); window.location.reload(); }} />
        </Suspense>
      </>
    );
  }

  const showNav = session && stage !== 'onboarding' && stage !== 'intake' && authStage === 'idle';
  return (
    <>
      <style>{globalCss}</style>

      {/* ── Main stage ─────────────────────────────────────────────── */}
      <Suspense fallback={<ScreenLoader />}>
      <div style={{ paddingRight: isDocked ? chatPanelWidth : 0, transition: isResizingRef.current ? 'none' : 'padding-right 0.28s ease' }}>
      {stage === 'landing' && (
        <Landing
          onBegin={() => setStage('onboarding')}
          onSignIn={() => setAuthStage('auth')}
          session={session}
          profile={profile}
          onEditProfile={() => setAuthStage('profile-view')}
          onPastorIntent={() => {
            if (session && profile) { setStage('pastor-apply'); }
            else { setPendingPastorApply(true); setAuthStage('auth'); }
          }}
        />
      )}
      {stage === 'church-hub' && session && (
        <ChurchHub
          session={session}
          profile={profile}
          onOpenChurchPage={() => {
            if (profile?.church_id) { setViewingChurchId(profile.church_id); setStage('church'); }
            else setStage('churches');
          }}
          onOpenFeed={() => setStage('feed')}
          onOpenPrayer={() => setStage('prayer')}
          onOpenTalkToSomeone={() => {
            if (profile?.church_id) { setViewingChurchId(profile.church_id); setStage('talk-to-someone'); }
          }}
          onOpenCareInbox={careTeamRecord ? () => setStage('care-inbox') : undefined}
          onOpenPastorDashboard={pastorChurchId ? () => setStage('pastor-dashboard') : undefined}
          onFindChurches={() => setStage('churches')}
        />
      )}
      {stage === 'home' && session && (
        <Home
          session={session}
          profile={profile}
          onOpenFeed={() => setStage('feed')}
          onOpenPrayer={() => setStage('prayer')}
          onOpenRead={() => setStage('read')}
          onOpenChurch={() => setStage('church-hub')}
          onOpenChurches={() => setStage('churches')}
          onOpenMe={() => setStage('me')}
          onOpenAsk={() => { if (!currentConvId) startChatFromProfile(); setChatPanelOpen(true); }}
          onFindPeople={() => setPeopleSearchOpen(true)}
        />
      )}
      {stage === 'feed' && session && (
        <Community
          session={session}
          profile={profile}
          userGroup={userGroup}
          onClose={() => setStage('home')}
          onOpenChat={(q) => { if (!currentConvId) startChatFromProfile(); if (q) setPrefilledInput(q); setChatPanelOpen(true); }}
          onViewProfile={(uid) => uid === session.user.id ? setStage('me') : setViewingUserId(uid)}
          onFindPeople={() => setPeopleSearchOpen(true)}
          onInviteFriends={() => setStage('invite')}
        />
      )}
      {stage === 'prayer' && session && (
        <Prayer
          session={session}
          profile={profile}
          onClose={() => setStage('feed')}
          userGroup={userGroup}
        />
      )}
      {stage === 'groups' && session && (
        userGroup
          ? <GroupSpace
              group={userGroup.group}
              role={userGroup.role}
              session={session}
              profile={profile}
              onClose={() => setStage('feed')}
              onLeave={async () => {
                await supabase.from('group_members').delete().eq('member_id', session.user.id).eq('group_id', userGroup.group.id);
                setUserGroup(null);
                setStage('feed');
              }}
            />
          : <GroupSetup
              session={session}
              onJoined={(g) => { setUserGroup(g); setStage('feed'); }}
              onClose={() => setStage('feed')}
            />
      )}
      {stage === 'me' && session && (
        <MePanel
          session={session}
          profile={profile}
          notes={notes}
          conversations={conversations}
          onClose={() => setStage('feed')}
          onOpenBoard={() => { setStage('feed'); setBoardOpen(true); }}
          onOpenHistory={() => { setStage('feed'); setHistoryOpen(true); }}
          onEditProfile={() => { setProfileEditOrigin('me'); setAuthStage('profile-setup'); }}
          onSignOut={() => { supabase.auth.signOut(); setSession(null); setProfile(null); setStage('landing'); }}
          onProfileUpdate={(p) => setProfile(p)}
          onViewProfile={(uid) => setViewingUserId(uid)}
          onOpenChat={(q) => { if (!currentConvId) startChatFromProfile(); if (q) setPrefilledInput(q); setChatPanelOpen(true); }}
          onFindPeople={() => setPeopleSearchOpen(true)}
          onInviteFriends={() => setStage('invite')}
          onFindChurches={() => setStage('churches')}
          onApplyAsPastor={() => setStage('pastor-apply')}
          onOpenChurch={(id) => { setViewingChurchId(id); setStage('church'); }}
          onOpenWalks={() => setStage('walks')}
          onOpenTalkToSomeone={profile?.church_id ? () => { setViewingChurchId(profile.church_id); setStage('talk-to-someone'); } : undefined}
          onOpenCareInbox={careTeamRecord ? () => setStage('care-inbox') : undefined}
          onOpenPastorDashboard={pastorChurchId ? () => setStage('pastor-dashboard') : undefined}
          hasCareTeamRole={!!careTeamRecord}
          hasPastoredChurch={!!pastorChurchId}
        />
      )}
      {stage === 'read' && session && (
        <BibleReader
          session={session}
          profile={profile}
          homeKey={readHomeKey}
          onClose={() => setStage('feed')}
          onOpenChat={(q) => { if (!currentConvId) startChatFromProfile(); if (q) setPrefilledInput(q); setChatPanelOpen(true); }}
        />
      )}
      {stage === 'invite' && (
        <InviteFriends onClose={() => setStage(session ? 'feed' : 'landing')} />
      )}
      {stage === 'pastor-apply' && session && (
        <PastorApply
          session={session}
          profile={profile}
          onClose={() => setStage('me')}
        />
      )}
      {stage === 'churches' && (
        <ChurchDirectory
          session={session}
          profile={profile}
          onBack={() => setStage(session ? 'feed' : 'landing')}
          onOpenChurch={(id) => { setViewingChurchId(id); setStage('church'); }}
          onApply={() => {
            if (session && profile) { setStage('pastor-apply'); }
            else { setPendingPastorApply(true); setAuthStage('auth'); }
          }}
        />
      )}
      {stage === 'church' && viewingChurchId && (
        <ChurchPage
          session={session}
          profile={profile}
          churchId={viewingChurchId}
          onBack={() => {
            if (initialChurchId) {
              window.history.replaceState({}, '', '/');
              setViewingChurchId(null);
              setStage(session ? 'feed' : 'landing');
            } else {
              setViewingChurchId(null);
              setStage('churches');
            }
          }}
          onProfileUpdate={(p) => setProfile(p)}
          onViewProfile={(uid) => setViewingUserId(uid)}
          onOpenTalkToSomeone={() => setStage('talk-to-someone')}
          onOpenAnonAsk={() => setStage('anon-welcome')}
          onOpenPastorDashboard={pastorChurchId === viewingChurchId ? () => setStage('pastor-dashboard') : undefined}
          onOpenSermons={pastorChurchId === viewingChurchId ? () => setStage('sermon-composer') : undefined}
          onOpenCareAdmin={pastorChurchId === viewingChurchId ? () => setStage('care-admin') : undefined}
        />
      )}
      {stage === 'church-entry' && viewingChurchId && (
        <ChurchEntry
          churchId={viewingChurchId}
          session={session}
          onAskAI={() => setStage('anon-welcome')}
          onAskSomeone={() => setStage('talk-to-someone')}
          onSignUp={() => setAuthStage('auth')}
          onClose={() => { window.history.replaceState({}, '', '/'); setStage(session ? 'feed' : 'landing'); }}
        />
      )}
      {stage === 'anon-welcome' && (
        <AnonymousWelcome
          churchId={initialAnonChurchId ?? viewingChurchId ?? null}
          churchName={null}
          onSignUp={() => { window.history.replaceState({}, '', '/'); setStage('landing'); }}
          onTalkToSomeone={() => {
            if (!session) { window.history.replaceState({}, '', '/'); setStage('landing'); return; }
            if (initialAnonChurchId) { setViewingChurchId(initialAnonChurchId); setStage('talk-to-someone'); }
            else setStage('churches');
          }}
          onClose={() => {
            if (viewingChurchId) setStage('church-entry');
            else { window.history.replaceState({}, '', '/'); setStage(session ? 'feed' : 'landing'); }
          }}
        />
      )}
      {stage === 'walks' && session && (
        <Walks
          session={session}
          onClose={() => setStage('me')}
        />
      )}
      {stage === 'talk-to-someone' && session && viewingChurchId && (
        <TalkToSomeone
          session={session}
          profile={profile}
          churchId={viewingChurchId}
          onBack={() => setStage(initialAnonChurchId ? 'church-entry' : 'church')}
          onOpenConversation={(convId) => { setActiveCareConv({ id: convId, viewerRole: 'requester' }); setStage('care-conversation'); }}
        />
      )}
      {stage === 'care-conversation' && session && activeCareConv && (
        <CareConversation
          session={session}
          profile={profile}
          conversationId={activeCareConv.id}
          viewerRole={activeCareConv.viewerRole}
          onBack={() => { const wasCareMember = activeCareConv.viewerRole !== 'requester'; setActiveCareConv(null); setStage(wasCareMember ? 'care-inbox' : 'me'); }}
          onClaimed={() => setActiveCareConv((c) => c ? { ...c, viewerRole: 'care_member' } : c)}
        />
      )}
      {stage === 'care-inbox' && session && careTeamRecord && (
        <CareTeamInbox
          session={session}
          profile={profile}
          churchId={careTeamRecord.church_id}
          onBack={() => setStage('me')}
        />
      )}
      {stage === 'care-admin' && session && pastorChurchId && (
        <CareTeamAdmin
          session={session}
          profile={profile}
          churchId={pastorChurchId}
          onBack={() => setStage('pastor-dashboard')}
        />
      )}
      {stage === 'sermon-composer' && session && pastorChurchId && (
        <SermonComposer
          session={session}
          profile={profile}
          churchId={pastorChurchId}
          onBack={() => setStage('pastor-dashboard')}
        />
      )}
      {stage === 'pastor-dashboard' && session && pastorChurchId && (
        <PastorDashboard
          session={session}
          profile={profile}
          churchId={pastorChurchId}
          onBack={() => setStage('me')}
          onOpenComposer={() => setStage('sermon-composer')}
          onOpenCareAdmin={() => setStage('care-admin')}
          onOpenChurchPage={() => { setViewingChurchId(pastorChurchId); setStage('church'); }}
        />
      )}
      {stage === 'onboarding' && (
        <Onboarding
          onPick={(id) => newConversation(id)}
          onBack={() => setStage(session ? 'feed' : 'landing')}
        />
      )}
      {stage === 'intake' && personType && (
        <SeekingIntake
          personType={personType}
          onComplete={(context) => startNewConversation(personType, context ?? '')}
          onBack={() => setStage('onboarding')}
        />
      )}
      </div>{/* end paddingRight wrapper */}

      {/* ── User profile overlay ─────────────────────────────────── */}
      {viewingUserId && session && (
        <UserProfile
          userId={viewingUserId}
          session={session}
          onClose={() => setViewingUserId(null)}
          onViewProfile={(uid) => setViewingUserId(uid)}
          onStartChat={(q) => { if (!currentConvId) startChatFromProfile(); setPrefilledInput(q); setChatPanelOpen(true); setViewingUserId(null); }}
        />
      )}

      {/* ── Chat panel (always mounted when session, slides in/out) ── */}
      {session && (
        <>
          {chatPanelOpen && !isDocked && (
            <div
              onClick={closeChatPanel}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 149 }}
            />
          )}
          <div style={{
            position: 'fixed', top: 0, right: 0,
            height: 'calc(100vh - 62px)',
            width: Math.min(chatPanelWidth, winW),
            zIndex: isDocked ? 101 : 150,
            transform: chatPanelOpen ? 'translateX(0)' : 'translateX(100%)',
            transition: isResizingRef.current ? 'none' : 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: chatPanelOpen ? (isDocked ? '-4px 0 20px rgba(0,0,0,0.08)' : '-12px 0 48px rgba(0,0,0,0.18)') : 'none',
            borderLeft: isDocked ? `1px solid ${T.line}` : 'none',
          }}>
            {/* ── Drag-to-resize handle ── */}
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                isResizingRef.current = true;
                const startX = e.clientX;
                const startW = chatPanelWidth;
                const onMove = (ev) => {
                  const newW = Math.max(320, Math.min(startW + (startX - ev.clientX), winW - 40));
                  setChatPanelWidth(newW);
                };
                const onUp = (ev) => {
                  const newW = Math.max(320, Math.min(startW + (startX - ev.clientX), winW - 40));
                  localStorage.setItem('chat_panel_width', String(newW));
                  isResizingRef.current = false;
                  document.removeEventListener('mousemove', onMove);
                  document.removeEventListener('mouseup', onUp);
                };
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
              }}
              style={{
                position: 'absolute', left: 0, top: 0, bottom: 0, width: 6,
                cursor: 'col-resize', zIndex: 10,
                background: 'transparent',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(196,129,58,0.18)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            />
            <Chat
              key={currentConvId}
              panelMode
              docked={isDocked}
              canDock={false}
              onToggleDock={() => {}}
              onClose={closeChatPanel}
              personType={personType ?? profile?.person_type ?? 'curious'}
              seekingContext={seekingContext}
              onOpenPremium={(hitLimit) => { setPremiumHitLimit(!!hitLimit); setPremium(true); }}
              onChangeType={() => { closeChatPanel(); setStage('onboarding'); }}
              onSetPersonType={(pt) => setPersonType(pt)}
              onNewConversation={() => newConversation(personType ?? profile?.person_type ?? 'curious')}
              notes={notes}
              onAddNote={addNote}
              onOpenBoard={() => setBoardOpen(true)}
              onOpenCommunity={() => { setChatPanelOpen(false); setStage('feed'); }}
              onOpenPrayer={() => { setChatPanelOpen(false); setStage('prayer'); }}
              onOpenJourneys={() => setJourneysOpen(true)}
              onShare={handleShare}
              shareCopied={shareCopied}
              conversationTitle={currentConv?.title}
              onOpenHistory={() => setHistoryOpen(true)}
              prefilledInput={prefilledInput}
              onConsumePrefill={() => setPrefilledInput('')}
              autoSendPrompt={autoSendPrompt}
              onConsumeAutoSend={() => setAutoSendPrompt(null)}
              profile={profile}
              session={session}
              userGroup={userGroup}
              onSignUp={() => setAuthStage('auth')}
              initialMessages={currentConv?.messages ?? []}
              onMessagesChange={(msgs) => currentConvId && updateConv(currentConvId, msgs)}
              conversations={conversations}
            />
          </div>
        </>
      )}

      {journeysOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
          <Journeys
            onClose={() => setJourneysOpen(false)}
            onStartStep={startJourneyStep}
            progress={journeyProgress}
          />
        </div>
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
      <PremiumModal open={premium} onClose={() => setPremium(false)} profile={profile} email={session?.user?.email} hitLimit={premiumHitLimit} />
      {peopleSearchOpen && (
        <PeopleSearch
          session={session}
          onClose={() => setPeopleSearchOpen(false)}
          onViewProfile={(uid) => { setPeopleSearchOpen(false); setViewingUserId(uid); }}
        />
      )}
      </Suspense>
      <BottomNav
        stage={stage}
        authStage={authStage}
        session={session}
        profile={profile}
        chatOpen={chatPanelOpen}
        onGoHome={() => setStage('home')}
        onGoChurch={() => setStage('church-hub')}
        onGoRead={() => { if (stage === 'read') setReadHomeKey((k) => k + 1); else setStage('read'); }}
        onGoPeople={() => setPeopleSearchOpen(true)}
        onGoMe={() => setStage('me')}
        onToggleChat={() => chatPanelOpen ? closeChatPanel() : (currentConvId ? setChatPanelOpen(true) : (startChatFromProfile(), setChatPanelOpen(true)))}
      />
    </>
  );
}
