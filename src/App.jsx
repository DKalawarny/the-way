import { useEffect, useMemo, useRef, useState, lazy, Suspense, Component } from 'react';
import { T, globalCss } from './theme.js';
import { PERSON_TYPES } from './constants.js';
import { KinwoveWordmark } from './components/brand/KinwoveWordmark.jsx';
import { KinwoveStar } from './components/brand/KinwoveStar.jsx';

function ScreenLoader() {
  return (
    <div style={{ minHeight: '100vh', background: T.cream, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <KinwoveWordmark size={22} textColor={T.ink} starColor={T.honey} />
      </div>
      <div style={{ width: 24, height: 24, border: `2px solid ${T.line}`, borderTopColor: T.gold, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

class PageErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const isChunkError = /failed to fetch dynamically imported module|loading chunk|loading css chunk/i.test(error.message ?? '');
    return (
      <div style={{ minHeight: '100vh', background: T.cream, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
        <KinwoveWordmark size={22} textColor={T.ink} starColor={T.honey} />
        <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 600, color: T.ink }}>
          {isChunkError ? 'New version available' : 'Something went wrong'}
        </div>
        <div style={{ fontSize: 14, color: T.inkSoft, textAlign: 'center', maxWidth: 320, lineHeight: 1.6 }}>
          {isChunkError
            ? 'A new version of kinwove was deployed. Reload the page to get it.'
            : error.message}
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{ background: T.ink, color: T.cream, border: 'none', borderRadius: 999, padding: '12px 28px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
        >
          Reload
        </button>
        {!isChunkError && (
          <button
            onClick={() => this.setState({ error: null })}
            style={{ background: 'none', border: 'none', color: T.inkMuted, fontSize: 13, cursor: 'pointer', padding: '4px 8px' }}
          >
            Try again
          </button>
        )}
      </div>
    );
  }
}

// Lighter error boundary for individual lazy-loaded routes.
// If one route crashes, only that screen shows the error — the rest of the
// app (nav, other tabs) stays intact.
class RouteErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const isChunkError = /failed to fetch dynamically imported module|loading chunk/i.test(error.message ?? '');
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 12, padding: 40, textAlign: 'center',
      }}>
        <div style={{ fontFamily: T.serif, fontSize: 18, fontWeight: 600, color: T.ink }}>
          {isChunkError ? 'New version — reload to continue' : 'This screen hit an error'}
        </div>
        <div style={{ fontSize: 13, color: T.inkSoft, maxWidth: 300, lineHeight: 1.6 }}>
          {isChunkError ? 'A new build was deployed.' : 'Try going back or reloading.'}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => this.setState({ error: null })}
            style={{ background: 'none', border: `1px solid ${T.line}`, borderRadius: 999, padding: '8px 16px', fontSize: 13, color: T.inkSoft, cursor: 'pointer' }}
          >Try again</button>
          <button
            onClick={() => window.location.reload()}
            style={{ background: T.ink, color: T.cream, border: 'none', borderRadius: 999, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >Reload</button>
        </div>
      </div>
    );
  }
}

import { supabase, authedFetch } from './supabase.js';
import { getDailyVerse } from './dailyVerse.js';
import {
  LayoutGrid, Clock, UserPlus, Phone, Inbox, Building2,
  Star, ShieldCheck, Flag, Megaphone, UserCog, LogOut, Trash2, Settings as SettingsIcon,
  HelpCircle,
} from 'lucide-react';
import SwipeableSheet from './SwipeableSheet.jsx';
import MsgText from './MsgText.jsx';
import Auth from './Auth.jsx';
import ProfileSetup from './Profile.jsx';
import ProfilePage, { Avatar } from './ProfilePage.jsx';
import GuestQuestion from './GuestQuestion.jsx';
import TopRightMenu from './TopRightMenu.jsx';
import NotificationsBell from './NotificationsBell.jsx';
import MessagesButton from './MessagesButton.jsx';
import FindButton from './FindButton.jsx';
import ChurchModeShell from './ChurchModeShell.jsx';
import { useChurchPlanReadOnly } from './usePlan.js';
import InstallPrompt from './InstallPrompt.jsx';

const Community         = lazy(() => import('./Community.jsx'));
const ConnectScreen     = lazy(() => import('./ConnectScreen.jsx'));
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
const PastorAdminQueue  = lazy(() => import('./PastorAdminQueue.jsx'));
const ChurchDisputesQueue = lazy(() => import('./ChurchDisputesQueue.jsx'));
const ChurchPage        = lazy(() => import('./ChurchPage.jsx'));
const ChurchDirectory   = lazy(() => import('./ChurchDirectory.jsx'));
const Walks             = lazy(() => import('./Walks.jsx'));
const TalkToSomeone     = lazy(() => import('./TalkToSomeone.jsx'));
const CareTeamInbox     = lazy(() => import('./CareTeamInbox.jsx'));
const MessagesInbox     = lazy(() => import('./MessagesInbox.jsx'));
const DMConversation    = lazy(() => import('./DMConversation.jsx'));
const CareTeamAdmin     = lazy(() => import('./CareTeamAdmin.jsx'));
const SermonComposer    = lazy(() => import('./SermonComposer.jsx'));
const ChurchAdmin       = lazy(() => import('./ChurchAdmin.jsx'));
const SermonView        = lazy(() => import('./SermonView.jsx'));
const AnonymousWelcome  = lazy(() => import('./AnonymousWelcome.jsx'));
const ChurchEntry       = lazy(() => import('./ChurchEntry.jsx'));
const CareConversation  = lazy(() => import('./CareConversation.jsx'));
const Chat              = lazy(() => import('./Chat.jsx'));
const AdminPage         = lazy(() => import('./AdminPage.jsx'));
const HelpPage          = lazy(() => import('./HelpPage.jsx'));
const UpgradeModal      = lazy(() => import('./UpgradeModal.jsx'));
const GuestPostView     = lazy(() => import('./GuestPostView.jsx'));
import { getJourneyProgress, advanceJourneyProgress } from './journeys.js';
import FeatureTour, { isTourDone } from './FeatureTour.jsx';
import CoachMark, { incrementLoginCount } from './CoachMark.jsx';
import DailyVerseCard, { shouldShowDailyVerse, markVerseAsSeen } from './DailyVerseCard.jsx';

// ── AI exchange preview (landing page social proof) ──────────────────────────
function CommunityPreview({ onBegin }) {
  const DIM   = 'rgba(253,248,240,0.55)';
  const DIMLO = 'rgba(253,248,240,0.35)';

  return (
    <section style={{ padding: '88px 32px 92px', maxWidth: 720, margin: '0 auto', width: '100%' }}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{ fontSize: 10, letterSpacing: 5, textTransform: 'uppercase', color: T.gold, opacity: 0.7, marginBottom: 16 }}>
          See it in action
        </div>
        <h2 style={{ fontFamily: T.serif, fontSize: 'clamp(24px, 3.2vw, 36px)', color: T.cream, fontWeight: 600, margin: 0, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
          Real questions. Honest answers.
        </h2>
      </div>

      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(184,115,58,0.16)',
        borderRadius: 20, padding: '32px 32px 0', position: 'relative', overflow: 'hidden',
      }}>
        {/* Question bubble */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
          <div style={{
            background: T.gold, color: T.cream,
            borderRadius: '18px 18px 4px 18px',
            padding: '13px 18px', maxWidth: '75%',
            fontSize: 15, fontFamily: T.sans, lineHeight: 1.5,
          }}>
            Is it okay to have doubts about God?
          </div>
        </div>

        {/* AI response */}
        <div style={{
          fontFamily: T.serif, fontSize: 16, lineHeight: 1.8,
          color: DIM, marginBottom: 0,
        }}>
          <p style={{ margin: '0 0 16px' }}>
            Yes — and the Bible is unusually honest about this. The Psalms, which were Israel's own prayer book, are full of doubt. "My God, my God, why have you forsaken me?" Jeremiah called God a deceptive brook. John the Baptist, in prison, sent word asking Jesus: "Are you the one, or should we expect someone else?"
          </p>
          <p style={{ margin: '0 0 16px' }}>
            Doubt shows up at the centre of faith, not at its edges. After the resurrection, all four Gospels record the disciples struggling — Thomas gets singled out, but he wasn't alone. What changed them wasn't the removal of doubt but an encounter that made trust possible.
          </p>
          <p style={{ margin: 0, color: DIMLO }}>
            Faith was never meant to be certainty. It's more like trust in the middle of uncertainty. Which means your doubt isn't a sign something has gone wrong — it might be the most honest…
          </p>
        </div>

        {/* Fade + CTA */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: 140,
          background: 'linear-gradient(to bottom, transparent, #1A110A)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          paddingBottom: 32,
        }}>
          <button
            onClick={onBegin}
            style={{
              background: T.gold, color: T.cream, border: 'none',
              borderRadius: 999, padding: '13px 32px',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(184,115,58,0.4)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = T.goldLight)}
            onMouseLeave={(e) => (e.currentTarget.style.background = T.gold)}
          >
            Read the full answer — free →
          </button>
        </div>

        {/* Spacer so the fade has room */}
        <div style={{ height: 100 }} />
      </div>

      <div style={{ textAlign: 'center', marginTop: 14, fontSize: 12, color: DIMLO }}>
        No account needed to ask your first question.
      </div>
    </section>
  );
}

function Landing({ onBegin, onSignIn, session, profile, onEditProfile, onPastorIntent, pastorChurchId, referralRef }) {
  const initialQuestion = useMemo(() => {
    try {
      const raw = new URLSearchParams(window.location.search).get('q');
      return raw ? decodeURIComponent(raw) : null;
    } catch { return null; }
  }, []);

  const DIM   = 'rgba(253,248,240,0.55)';
  const DIMLO = 'rgba(253,248,240,0.38)';
  const RULE  = 'rgba(255,255,255,0.06)';

  const trustPoints = [
    'Strictly rooted in scripture — no invented theological positions',
    'Every claim referenced back to the actual text, book and verse',
    'Honest when scholars genuinely disagree — it tells you that',
    'No denominational bias — you\'ll hear where traditions differ',
    'Designed to guide people toward Jesus, never to push an agenda',
  ];

  const whoCards = [
    { emoji: '🤔', label: 'The curious',      body: 'You\'ve heard about Jesus. Something keeps pulling you toward the question. You want honest answers, not a sales pitch.' },
    { emoji: '🤨', label: 'The skeptic',       body: 'You\'re not sure any of this is true. You have real doubts and you want them taken seriously, not papered over.' },
    { emoji: '💭', label: 'The searching',     body: 'Something in your life cracked open. You\'re not sure what you believe anymore — or maybe for the first time, you want to know.' },
    { emoji: '🙏', label: 'The believer',      body: 'Your faith is real. You want to go deeper, understand more, and find people who take it as seriously as you do.' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#1A110A', display: 'flex', flexDirection: 'column', fontFamily: T.sans }}>

      {/* ── Nav ── */}
      <header style={{ padding: '18px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${RULE}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <KinwoveWordmark size={26} textColor={T.cream} starColor={T.honey} />
        </div>
        {session ? (
          <button onClick={onEditProfile} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
            <Avatar name={profile?.display_name} avatarConfig={profile?.avatar_config} photoUrl={profile?.avatar_url} size={32} />
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={onSignIn} style={{ background: 'none', border: 'none', color: DIMLO, fontSize: 14, cursor: 'pointer', padding: '8px 4px' }}>Sign in</button>
            <button onClick={onBegin} style={{ background: T.gold, color: T.cream, border: 'none', padding: '9px 20px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 16px rgba(184,115,58,0.35)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = T.goldLight)}
              onMouseLeave={(e) => (e.currentTarget.style.background = T.gold)}
            >Get started</button>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '80px 24px 80px', position: 'relative', overflow: 'hidden' }}>
        {/* Ambient glow */}
        <div style={{ position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)', width: 900, height: 600, background: 'radial-gradient(ellipse at 50% 30%, rgba(184,115,58,0.14) 0%, rgba(184,115,58,0.04) 50%, transparent 72%)', pointerEvents: 'none' }} />

        {/* Wordmark — the arrival moment */}
        <div style={{ marginBottom: 24, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Focused glow behind the wordmark */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 560, height: 180, background: 'radial-gradient(ellipse at 50% 50%, rgba(212,162,74,0.13) 0%, rgba(168,85,48,0.07) 45%, transparent 70%)', pointerEvents: 'none' }} />
          <KinwoveWordmark size={88} textColor={T.cream} starColor={T.honey} />
        </div>

        {/* Honey star — punctuation between brand and message */}
        <div style={{ marginBottom: 40 }}>
          <KinwoveStar size={9} color="rgba(212,162,74,0.5)" />
        </div>

        {referralRef && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(184,115,58,0.12)', border: '1px solid rgba(184,115,58,0.25)', borderRadius: 999, padding: '7px 16px', marginBottom: 28, fontSize: 13, color: DIM, animation: 'fadeIn 0.5s ease both' }}>
            <KinwoveStar size={11} color={T.gold} />
            Someone who knows you thought you'd find this worthwhile.
          </div>
        )}

        <h1 style={{ fontFamily: T.serif, fontSize: 'clamp(38px, 7vw, 80px)', lineHeight: 1.05, margin: '0 0 22px', fontWeight: 600, letterSpacing: '-0.028em', color: T.cream, maxWidth: 820, position: 'relative' }}>
          You don't have to have it<br />figured out to <em style={{ color: T.gold, fontStyle: 'italic', fontWeight: 500 }}>belong here.</em>
        </h1>

        <p style={{ fontFamily: T.serif, fontSize: 18, lineHeight: 1.72, color: DIM, maxWidth: 520, margin: '0 0 48px', position: 'relative' }}>
          AI that stays in scripture. Real people at every stage. Tools for your church between Sundays.
        </p>

        <div style={{ width: '100%', maxWidth: 680, margin: '0 auto', position: 'relative' }}>
          <GuestQuestion onSignUp={onBegin} initialQuestion={initialQuestion} landingMode />
        </div>
      </main>

      {/* ── Section rule ── */}
      <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${RULE}, transparent)`, margin: '0 40px' }} />

      {/* ── Community ── */}
      <section style={{ padding: '88px 32px 92px', maxWidth: 900, margin: '0 auto', width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 10, letterSpacing: 5, textTransform: 'uppercase', color: T.gold, opacity: 0.7, marginBottom: 18 }}>Real community</div>
        <h2 style={{ fontFamily: T.serif, fontSize: 'clamp(26px, 3.6vw, 40px)', color: T.cream, fontWeight: 600, margin: '0 0 20px', letterSpacing: '-0.022em', lineHeight: 1.12 }}>
          You're not just talking to an AI.<br />
          <em style={{ color: T.gold, fontStyle: 'italic', fontWeight: 500 }}>You're joining people.</em>
        </h2>
        <p style={{ fontFamily: T.serif, fontSize: 17, color: DIM, maxWidth: 480, margin: '0 auto 52px', lineHeight: 1.75 }}>
          The loneliest part of seeking is doing it alone. Real people, every background, every stage.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 14, maxWidth: 780, margin: '0 auto' }}>
          {[
            { icon: '💬', title: 'Post & discuss', body: 'Share thoughts, ask questions. Your community responds — not an algorithm.' },
            { icon: '🙏', title: 'Pray together', body: 'Post a request. People pray for you. You\'ll know when they do.' },
            { icon: '📖', title: 'Study scripture', body: 'Read any chapter. Tap any verse for instant AI insight, right in the margin.' },
            { icon: '⛪', title: 'Find your church', body: 'Connect with your congregation or discover a community near you.' },
          ].map((f) => (
            <div key={f.title} style={{ flex: '1 1 200px', maxWidth: 240, padding: '24px 20px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, textAlign: 'left' }}>
              <div style={{ fontSize: 22, marginBottom: 12 }}>{f.icon}</div>
              <div style={{ fontFamily: T.display, fontSize: 15, fontWeight: 600, color: T.cream, marginBottom: 6, letterSpacing: '-0.008em' }}>{f.title}</div>
              <div style={{ fontSize: 13, color: DIMLO, lineHeight: 1.65 }}>{f.body}</div>
            </div>
          ))}
        </div>
      </section>

      <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${RULE}, transparent)`, margin: '0 40px' }} />

      {/* ── AI trust ── */}
      <section style={{ padding: '88px 32px 92px', maxWidth: 900, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 10, letterSpacing: 5, textTransform: 'uppercase', color: T.gold, opacity: 0.7, marginBottom: 18 }}>AI built differently</div>
          <h2 style={{ fontFamily: T.serif, fontSize: 'clamp(26px, 3.6vw, 40px)', color: T.cream, fontWeight: 600, margin: '0 0 20px', letterSpacing: '-0.022em', lineHeight: 1.12, maxWidth: 640 }}>
            We know you might not trust AI<br />with something this important.
          </h2>
          <p style={{ fontFamily: T.serif, fontSize: 17, color: DIM, maxWidth: 540, lineHeight: 1.75, margin: 0 }}>
            Most AI makes things up. For a question about God, scripture, and faith — that's not acceptable.
            kinwove's AI was built with one rule at its core: if it's not in the text, we don't say it.
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12, maxWidth: 800, margin: '0 auto' }}>
          {trustPoints.map((t) => (
            <div key={t} style={{ flex: '1 1 240px', maxWidth: 258, display: 'flex', alignItems: 'flex-start', gap: 12, padding: '16px 18px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(184,115,58,0.14)', borderRadius: 12, textAlign: 'left' }}>
              <KinwoveStar size={11} color={T.gold} style={{ flexShrink: 0, marginTop: 2 }} />
              <span style={{ fontSize: 13.5, color: DIM, lineHeight: 1.6 }}>{t}</span>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 36 }}>
          <p style={{ fontFamily: T.serif, fontSize: 15, color: DIMLO, fontStyle: 'italic', lineHeight: 1.7, maxWidth: 500, margin: '0 auto' }}>
            "When we don't know, we say so. When scholars genuinely disagree, we tell you that too.
            You deserve honesty more than you deserve comfortable answers."
          </p>
        </div>
      </section>

      <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${RULE}, transparent)`, margin: '0 40px' }} />

      {/* ── Why not Google / ChatGPT ── */}
      <section style={{ padding: '88px 32px 92px', maxWidth: 900, margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <div style={{ fontSize: 10, letterSpacing: 5, textTransform: 'uppercase', color: T.gold, opacity: 0.7, marginBottom: 18 }}>Why not Google or ChatGPT?</div>
          <h2 style={{ fontFamily: T.serif, fontSize: 'clamp(26px, 3.6vw, 40px)', color: T.cream, fontWeight: 600, margin: '0 auto 20px', letterSpacing: '-0.022em', lineHeight: 1.12, maxWidth: 660 }}>
            Google gives you a list.<br />ChatGPT gives you an answer.<br /><em style={{ color: T.gold, fontStyle: 'italic', fontWeight: 500 }}>kinwove gives you a conversation.</em>
          </h2>
          <p style={{ fontFamily: T.serif, fontSize: 17, color: DIM, maxWidth: 480, margin: '0 auto', lineHeight: 1.75 }}>
            One that knows what it's talking about — and knows why you're really asking.
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, maxWidth: 820, margin: '0 auto', justifyContent: 'center' }}>
          <div style={{ flex: '1 1 280px', maxWidth: 380, padding: '32px 28px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(184,115,58,0.18)', borderRadius: 20 }}>
            <div style={{ fontFamily: T.display, fontSize: 15, fontWeight: 600, color: T.gold, marginBottom: 12, letterSpacing: '-0.005em' }}>No judgment. No pressure.</div>
            <p style={{ fontFamily: T.serif, fontSize: 15.5, color: DIM, lineHeight: 1.75, margin: '0 0 18px' }}>
              Some questions you'd never say out loud to a pastor or a friend.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
              {[
                'Is God even real?',
                'Why do I feel nothing when I pray?',
                'I want to believe — I just don\'t know if I do.',
              ].map((q) => (
                <div key={q} style={{ fontFamily: T.serif, fontStyle: 'italic', fontSize: 14.5, color: T.cream, opacity: 0.72, paddingLeft: 14, borderLeft: '2px solid rgba(184,115,58,0.35)' }}>{q}</div>
              ))}
            </div>
            <p style={{ fontFamily: T.serif, fontSize: 15.5, color: DIM, lineHeight: 1.75, margin: 0 }}>
              Ask anything here. Nobody flinches. Just an honest conversation, at whatever pace feels right.
            </p>
          </div>
          <div style={{ flex: '1 1 280px', maxWidth: 380, padding: '32px 28px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(184,115,58,0.18)', borderRadius: 20 }}>
            <div style={{ fontFamily: T.display, fontSize: 15, fontWeight: 600, color: T.gold, marginBottom: 12, letterSpacing: '-0.005em' }}>Built for this conversation.</div>
            <p style={{ fontFamily: T.serif, fontSize: 15.5, color: DIM, lineHeight: 1.75, margin: '0 0 18px' }}>
              General AI tools weren't trained to sit with scripture. kinwove was.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { icon: '📖', label: 'Stays in the text' },
                { icon: '🤝', label: 'Honest when scholars disagree' },
                { icon: '🧭', label: 'Points toward Jesus, not itself' },
              ].map((p) => (
                <div key={p.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16 }}>{p.icon}</span>
                  <span style={{ fontFamily: T.sans, fontSize: 13.5, color: DIM, lineHeight: 1.5 }}>{p.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${RULE}, transparent)`, margin: '0 40px' }} />

      {/* ── Social proof — live community activity ── */}
      <CommunityPreview onBegin={onBegin} />

      <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${RULE}, transparent)`, margin: '0 40px' }} />

      {/* ── Who it's for ── */}
      <section style={{ padding: '88px 32px 92px', maxWidth: 1040, margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <div style={{ fontSize: 10, letterSpacing: 5, textTransform: 'uppercase', color: T.gold, opacity: 0.7, marginBottom: 14 }}>Whoever you are</div>
          <h2 style={{ fontFamily: T.serif, fontSize: 'clamp(26px, 3.4vw, 38px)', color: T.cream, fontWeight: 600, margin: '0 0 16px', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
            There's a place for you here.
          </h2>
          <p style={{ fontFamily: T.serif, fontSize: 16, color: DIM, maxWidth: 440, margin: '0 auto', lineHeight: 1.7 }}>
            Not for people who have all the answers. For people honest enough to keep asking.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          {whoCards.map((c) => (
            <button key={c.label} onClick={onBegin}
              style={{ textAlign: 'left', padding: '28px 24px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(184,115,58,0.18)', borderRadius: 20, cursor: 'pointer', transition: 'all 0.2s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(184,115,58,0.1)'; e.currentTarget.style.borderColor = T.gold; e.currentTarget.style.transform = 'translateY(-3px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(184,115,58,0.18)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ fontSize: 28, marginBottom: 14, height: 40, display: 'flex', alignItems: 'flex-end' }}>{c.emoji}</div>
              <div style={{ fontFamily: T.display, fontSize: 17, fontWeight: 600, color: T.cream, marginBottom: 8, letterSpacing: '-0.01em' }}>{c.label}</div>
              <div style={{ fontSize: 13, color: DIMLO, lineHeight: 1.7 }}>{c.body}</div>
            </button>
          ))}
        </div>
      </section>

      <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${RULE}, transparent)`, margin: '0 40px' }} />

      {/* ── For pastors ── */}
      {onPastorIntent && !pastorChurchId && (
        <section style={{ padding: '88px 32px 92px', maxWidth: 900, margin: '0 auto', width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 10, letterSpacing: 5, textTransform: 'uppercase', color: T.gold, opacity: 0.7, marginBottom: 18 }}>For pastors & church leaders</div>
          <h2 style={{ fontFamily: T.serif, fontSize: 'clamp(26px, 3.6vw, 40px)', color: T.cream, fontWeight: 600, margin: '0 0 20px', letterSpacing: '-0.022em', lineHeight: 1.12 }}>
            Your congregation<br />needs a home between Sundays.
          </h2>
          <p style={{ fontFamily: T.serif, fontSize: 17, color: DIM, maxWidth: 540, margin: '0 auto 40px', lineHeight: 1.75 }}>
            Sunday is one hour. kinwove is the other six days —
            where your members keep wrestling with what was preached, ask the questions they won't raise in the lobby, and pray for each other by name.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 14, maxWidth: 780, margin: '0 auto 40px' }}>
            {[
              { icon: '📖', t: 'A page for every Sunday', d: 'Sermon content, scripture, daily verses, kids version — all in one place.' },
              { icon: '💬', t: 'Real discussion, not dead chat', d: 'Threaded conversations under each sermon. Members reply, wrestle, and come back to Sunday more ready.' },
              { icon: '🙏', t: 'Prayer that stays personal', d: 'Requests anchored to the people in your congregation — not a feed of strangers.' },
              { icon: '🛡', t: 'Your church profile — free', d: 'Get your church on kinwove at no cost. The tools that genuinely replace your time cost money. The presence doesn\'t.' },
            ].map((f) => (
              <div key={f.t} style={{ flex: '1 1 200px', maxWidth: 240, padding: '20px 18px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, textAlign: 'left' }}>
                <div style={{ fontSize: 17, marginBottom: 10 }}>{f.icon}</div>
                <div style={{ fontFamily: T.display, fontSize: 15, fontWeight: 600, color: T.cream, marginBottom: 6, letterSpacing: '-0.005em' }}>{f.t}</div>
                <div style={{ fontSize: 13, color: DIMLO, lineHeight: 1.65 }}>{f.d}</div>
              </div>
            ))}
          </div>
          <button onClick={onPastorIntent}
            style={{ background: 'transparent', color: T.gold, border: `1px solid ${T.gold}`, borderRadius: 999, padding: '13px 32px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(184,115,58,0.12)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >Bring your church — it's free</button>
          <div style={{ marginTop: 12, fontSize: 12, color: DIMLO }}>Instant when your email matches your church domain. Others reviewed by hand.</div>
        </section>
      )}

      <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${RULE}, transparent)`, margin: '0 40px' }} />

      {/* ── Bottom CTA ── */}
      <section style={{ padding: '96px 24px 108px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 700, height: 500, background: 'radial-gradient(ellipse at 50% 0%, rgba(184,115,58,0.09) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 600, margin: '0 auto', position: 'relative' }}>
          <div style={{ fontSize: 10, letterSpacing: 5, textTransform: 'uppercase', color: T.gold, opacity: 0.7, marginBottom: 22 }}>Begin</div>
          <h2 style={{ fontFamily: T.serif, fontSize: 'clamp(30px, 5vw, 58px)', fontWeight: 600, color: T.cream, lineHeight: 1.05, marginBottom: 20, letterSpacing: '-0.026em' }}>
            Start asking.<br />We'll meet you there.
          </h2>
          <p style={{ fontFamily: T.serif, fontSize: 17, color: DIM, lineHeight: 1.72, maxWidth: 400, margin: '0 auto 48px' }}>
            No right beliefs required. No background check. Free to explore wherever you are.
          </p>
          <button onClick={onBegin}
            style={{ background: T.gold, color: T.cream, border: 'none', borderRadius: 999, padding: '16px 44px', fontSize: 16, fontWeight: 600, cursor: 'pointer', boxShadow: '0 6px 24px rgba(184,115,58,0.4)', letterSpacing: '-0.01em', fontFamily: T.sans }}
            onMouseEnter={(e) => (e.currentTarget.style.background = T.goldLight)}
            onMouseLeave={(e) => (e.currentTarget.style.background = T.gold)}
          >
            Get started free →
          </button>
          <div style={{ marginTop: 16, fontSize: 12, color: DIMLO }}>No credit card · Takes 30 seconds</div>
          {!session && (
            <div style={{ marginTop: 20, fontSize: 13, color: DIMLO }}>
              Already here?{' '}
              <button onClick={onSignIn} style={{ background: 'none', border: 'none', color: DIM, fontSize: 13, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>Sign in</button>
            </div>
          )}
        </div>
      </section>

      <footer style={{ padding: '20px 40px', textAlign: 'center', fontSize: 12, color: 'rgba(253,248,240,0.2)', borderTop: `1px solid ${RULE}`, letterSpacing: '0.04em' }}>
        <KinwoveWordmark size={13} textColor="rgba(253,248,240,0.3)" starColor="rgba(212,162,74,0.35)" /> &nbsp;·&nbsp; {new Date().getFullYear()} &nbsp;·&nbsp; Free to explore
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
        <div style={{ fontFamily: T.display, fontSize: 18, fontWeight: 500, color: 'rgba(253,248,240,0.4)', letterSpacing: '-0.02em' }}>kinwove</div>
        <div style={{ width: 48 }} />
      </div>

      {/* Hero text */}
      <div style={{ textAlign: 'center', padding: '40px 24px 48px' }}>
        <div style={{ fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', color: T.gold, marginBottom: 24, opacity: 0.8 }}>
          Before we begin
        </div>
        <h2 style={{ fontFamily: T.serif, fontSize: 'clamp(34px, 5.2vw, 56px)', margin: '0 0 18px', color: T.cream, fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1.06 }}>
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
                border: '1px solid rgba(184,115,58,0.2)',
                borderRadius: 16,
                padding: 24,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(184,115,58,0.1)';
                e.currentTarget.style.borderColor = T.gold;
                e.currentTarget.style.transform = 'translateY(-3px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                e.currentTarget.style.borderColor = 'rgba(184,115,58,0.2)';
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

function DeleteAccountModal({ open, onClose, onDeleted }) {
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  if (!open) return null;
  const canDelete = confirm.trim().toUpperCase() === 'DELETE' && !busy;

  async function doDelete() {
    if (!canDelete) return;
    setBusy(true);
    setError(null);
    try {
      const res = await authedFetch('/api/account', { method: 'DELETE' });
      if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `delete failed (${res.status})`);
      }
      await supabase.auth.signOut().catch(() => {});
      onDeleted();
    } catch (err) {
      setBusy(false);
      setError(err.message || 'delete failed');
    }
  }

  return (
    <div
      onClick={busy ? undefined : onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(44,24,16,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 60, padding: 20, animation: 'fadeIn 0.15s ease',
      }}
    >
      <SwipeableSheet
        className="fade-up"
        canDismiss={!busy}
        onDismiss={onClose}
        style={{
          background: T.cream, borderRadius: 18, maxWidth: 440, width: '100%',
          padding: 32, border: `1px solid ${T.line}`,
        }}
      >
        <div style={{ fontFamily: T.serif, fontSize: 26, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 10 }}>
          Delete your account?
        </div>
        <div style={{ color: T.inkSoft, fontSize: 15, lineHeight: 1.65, marginBottom: 18 }}>
          This permanently removes your profile, posts, prayers, conversations, and follows. This can't be undone.
        </div>
        <label style={{ display: 'block', fontSize: 13, color: T.inkSoft, marginBottom: 6 }}>
          Type <strong style={{ color: T.ink }}>DELETE</strong> to confirm
        </label>
        <input
          autoFocus
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          disabled={busy}
          style={{
            width: '100%', boxSizing: 'border-box',
            border: `1px solid ${T.line}`, borderRadius: 10,
            padding: '11px 14px', fontSize: 15, background: T.white, color: T.ink,
            outline: 'none', fontFamily: 'inherit', marginBottom: 14,
          }}
        />
        {error && (
          <div style={{ color: T.error, fontSize: 13, marginBottom: 12 }}>{error}</div>
        )}
        <button
          onClick={doDelete}
          disabled={!canDelete}
          style={{
            width: '100%', background: canDelete ? T.error : 'rgba(165,63,43,0.4)',
            color: T.cream, border: 'none', borderRadius: 999,
            padding: '14px 20px', fontSize: 15, fontWeight: 600,
            cursor: canDelete ? 'pointer' : 'not-allowed',
          }}
        >
          {busy ? 'Deleting…' : 'Permanently delete my account'}
        </button>
        <button
          onClick={onClose}
          disabled={busy}
          style={{ width: '100%', background: 'transparent', color: T.inkMuted, border: 'none', marginTop: 10, fontSize: 13, cursor: busy ? 'not-allowed' : 'pointer' }}
        >
          Cancel
        </button>
      </SwipeableSheet>
    </div>
  );
}

function PastorPrompt({ open, onApply, onClose }) {
  if (!open) return null;
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
      <SwipeableSheet
        className="fade-up"
        onDismiss={onClose}
        style={{
          background: T.cream,
          borderRadius: 18,
          maxWidth: 420,
          width: '100%',
          padding: 32,
          border: `1px solid ${T.line}`,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 12 }}><KinwoveStar size={32} /></div>
        <div style={{ fontFamily: T.serif, fontSize: 26, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 10 }}>
          Are you a pastor?
        </div>
        <div style={{ color: T.inkSoft, fontSize: 15, lineHeight: 1.65, marginBottom: 24 }}>
          If you shepherd a church, you can apply for a verified pastor account — share weekly focus, post sermons, and connect with your congregation here.
        </div>
        <button
          onClick={onApply}
          style={{ width: '100%', background: T.gold, color: T.cream, border: 'none', borderRadius: 999, padding: '14px 20px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
        >
          Yes — apply as a pastor
        </button>
        <button
          onClick={onClose}
          style={{ width: '100%', background: 'transparent', color: T.inkMuted, border: 'none', marginTop: 10, fontSize: 13, cursor: 'pointer' }}
        >
          No
        </button>
      </SwipeableSheet>
    </div>
  );
}

const NOTES_KEY = 'kinwove:notes:v1';
const CONVS_KEY = 'kinwove:convs:v1';

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
    if (s === 'home' || s === 'feed') return 'home';
    if (s === 'church' || s === 'churches' || s === 'church-entry' || s === 'groups' || s === 'prayer' || s === 'talk-to-someone' || s === 'care-conversation' || s === 'church-admin' || s === 'pastor-dashboard' || s === 'sermon-composer' || s === 'care-admin' || s === 'sermon-view' || s === 'connect') return 'church';
    if (s === 'read') return 'read';
    if (s === 'me' || s === 'walks' || s === 'care-inbox' || s === 'messages' || s === 'dm-conversation' || s === 'app-admin') return 'me';
    return null;
  };
  const active = tabFor(stage);

  // Each section has its own colour identity
  const SECTION_COLORS = {
    home:   '#B8733A', // amber gold   — Feed
    church: '#6b2438', // burgundy     — Church
    read:   '#4a1542', // plum         — Bible
    me:     '#1a3050', // deep navy    — Personal
  };
  const sectionColor = (id) => SECTION_COLORS[id] ?? T.goldDark;

  const tabStyle = (id) => ({
    flex: 1, background: 'none', border: 'none', outline: 'none',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 3, cursor: 'pointer', padding: '8px 4px',
    position: 'relative',
    color: active === id ? sectionColor(id) : T.inkMuted,
    transition: 'color 0.18s ease',
  });

  const labelStyle = (id) => ({
    fontSize: 11, fontWeight: active === id ? 600 : 500, letterSpacing: 0.25, fontFamily: T.serif,
  });

  // Accent rail at top edge of active tab, coloured per section
  const activeRail = (id) => (active === id ? (
    <span aria-hidden style={{
      position: 'absolute', top: 0, left: '20%', right: '20%', height: 2,
      background: sectionColor(id), borderRadius: 2,
      transition: 'opacity 0.18s ease',
    }}/>
  ) : null);

  // Active icons scale up a hair so the active tab feels grounded.
  const iconWrap = (id) => ({
    transform: active === id ? 'scale(1.06)' : 'scale(1)',
    transition: 'transform 0.18s ease',
    display: 'inline-flex',
  });

  return (
    <>
      {/* ── Bottom tab bar ─────────────────────────────────── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: T.white, borderTop: `1px solid ${T.line}`,
        boxShadow: '0 -2px 12px rgba(44,24,16,0.05)',
        display: 'flex', alignItems: 'center', zIndex: 100,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        minHeight: 62,
      }}>
        <button data-tour-id="feed" onClick={onGoHome} style={tabStyle('home')}>
          {activeRail('home')}
          <span style={iconWrap('home')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </span>
          <span style={labelStyle('home')}>Feed</span>
        </button>

        <button data-tour-id="church" onClick={onGoChurch} style={tabStyle('church')}>
          {activeRail('church')}
          <span style={iconWrap('church')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </span>
          <span style={labelStyle('church')}>Church</span>
        </button>

        {/* Ask — center slot, slightly elevated with a soft gold halo so it
            reads as the app's signature action without taking up FAB-sized
            real estate. Same action (toggleChat); the halo intensifies when
            chat is open so it doubles as the active-tab indicator. */}
        <button data-tour-id="ask" onClick={onToggleChat} style={tabStyle('ask')} aria-label="Ask anything">
          <span style={{
            position: 'relative',
            width: 36, height: 36, borderRadius: '50%',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: chatOpen
              ? 'radial-gradient(circle, rgba(184,115,58,0.22) 0%, rgba(184,115,58,0.06) 70%, transparent 100%)'
              : 'radial-gradient(circle, rgba(184,115,58,0.12) 0%, rgba(184,115,58,0.03) 70%, transparent 100%)',
            transition: 'background 0.18s ease',
          }}>
            <KinwoveStar size={20} color={chatOpen ? T.goldDark : T.gold} style={{ filter: chatOpen ? 'drop-shadow(0 0 8px rgba(168,85,48,0.65))' : 'drop-shadow(0 0 5px rgba(168,85,48,0.40))', transition: 'color 0.18s ease' }} />
          </span>
          <span style={{
            ...labelStyle('ask'),
            color: chatOpen ? T.goldDark : T.inkMuted,
            fontWeight: chatOpen ? 600 : 500,
          }}>Ask</span>
        </button>

        <button data-tour-id="bible" onClick={onGoRead} style={tabStyle('read')}>
          {activeRail('read')}
          <span style={iconWrap('read')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
          </span>
          <span style={labelStyle('read')}>Bible</span>
        </button>

        <button data-tour-id="you" onClick={onGoMe} style={tabStyle('me')}>
          {activeRail('me')}
          <span style={iconWrap('me')}>
            <Avatar
              name={profile?.display_name}
              avatarConfig={profile?.avatar_config} photoUrl={profile?.avatar_url}
              size={24}
              style={{ border: `2px solid ${active === 'me' ? T.gold : T.line}` }}
            />
          </span>
          <span style={labelStyle('me')}>You</span>
        </button>
      </div>
    </>
  );
}

function ConversationHistory({ open, onClose, conversations, onLoad, onDelete, onNew, rightOffset = 0 }) {
  // Escape closes — matches the Board modal pattern. Without this the only way
  // out was the Close button or a backdrop click, which didn't read like a
  // modal you could dismiss the usual way.
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        // When the chat panel is docked it sits at z=101; the modal used to
        // center across the *whole* viewport, so its right edge slid behind
        // the chat. Reserving rightOffset keeps the dim + the dialog inside
        // the visible work area instead of fighting the chat panel.
        position: 'fixed', top: 0, left: 0, bottom: 0, right: rightOffset,
        background: 'rgba(44,24,16,0.55)',
        zIndex: 160, display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
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
            <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 600, color: T.ink, letterSpacing: '-0.015em' }}>Conversations</div>
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

function formatNoteDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function buildExportText(notes) {
  if (notes.length === 0) return '';
  const head = 'Notes from kinwove\n\n';
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

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

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

  const sidebarW = typeof window !== 'undefined' && window.innerWidth >= 1024 ? 240 : 0;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0, bottom: 0, right: 0,
        left: sidebarW,
        background: 'rgba(44,24,16,0.55)',
        zIndex: 160,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '20px 16px',
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
          maxWidth: 680,
          width: '100%',
          margin: '40px 0',
          border: `1px solid ${T.line}`,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '18px 20px',
            borderBottom: `1px solid ${T.line}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            background: T.cream,
          }}
        >
          <div>
            <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: T.goldDark, marginBottom: 3 }}>
              Your Board
            </div>
            <div style={{ fontFamily: T.serif, fontSize: 22, color: T.ink, fontWeight: 600, letterSpacing: '-0.018em', lineHeight: 1.18 }}>
              {notes.length === 0 ? 'Nothing saved yet' : `${notes.length} ${notes.length === 1 ? 'note' : 'notes'}`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            {notes.length > 0 && (
              <button
                onClick={() => copy(buildExportText(notes), '__all__')}
                style={{
                  background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
                  padding: '8px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                }}
              >
                {copiedAll ? 'Copied ✓' : 'Copy all'}
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                background: 'transparent', border: `1px solid ${T.line}`, borderRadius: '50%',
                width: 34, height: 34, fontSize: 18, lineHeight: '1',
                color: T.inkMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              ×
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
                  {n.convId ? 'Resume chat' : 'Ask more on this'}
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


// ── Global app header (desktop only) ────────────────────────────────────────
// Full-width dark bar pinned to the very top of the viewport. Left segment
// (240px, aligned with sidebar) holds the wordmark; right segment holds the
// daily verse. The sidebar starts BELOW this bar at top:56px.
function AppHeader({ onOpenBible, onVerseClick }) {
  const verse = getDailyVerse();
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      height: 56, zIndex: 110,
      background: '#1e1208',
      borderBottom: 'none',
      boxShadow: '0 1px 0 rgba(255,255,255,0.04)',
      display: 'flex', alignItems: 'center',
    }}>
      {/* Brand segment — sits exactly over the sidebar column */}
      <div style={{
        width: 240, flexShrink: 0, padding: '0 20px',
        display: 'flex', alignItems: 'center', gap: 9,
        borderRight: '1px solid rgba(232,181,99,0.22)',
      }}>
        <KinwoveWordmark size={32} textColor="#f4e9d4" starColor={T.honey} />
      </div>
      {/* Verse segment */}
      <button
        onClick={() => onVerseClick ? onVerseClick() : onOpenBible?.(verse.ref)}
        title="Today's verse — tap to reflect"
        style={{
          flex: 1, minWidth: 0, padding: '0 12px 0 14px',
          display: 'flex', alignItems: 'baseline', gap: 8,
          background: 'none', border: 'none',
          cursor: 'pointer',
          textAlign: 'left', overflow: 'hidden',
        }}
      >
        <span style={{
          fontFamily: T.serif, fontStyle: 'italic', fontSize: 13.5,
          color: '#e8dcc2', whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis',
          flex: 1, textShadow: '0 1px 0 rgba(0,0,0,0.3)',
        }}>&ldquo;{verse.text}&rdquo;</span>
        <span style={{
          fontSize: 11, fontWeight: 700, color: T.honey,
          letterSpacing: '0.06em', flexShrink: 0,
          textShadow: '0 1px 0 rgba(0,0,0,0.4)',
        }}>{verse.ref} ↗</span>
      </button>
      {/* Reserved right gutter for the 3 FABs (3×44 + 2×8 gaps + 12px edge = 160px + 4px buffer) */}
      <div style={{ width: 164, flexShrink: 0 }} aria-hidden="true" />
    </div>
  );
}

// ── Mobile global top header ────────────────────────────────────────────────
// Mirrors AppHeader but for mobile — same dark walnut bar, ✦ kinwove, daily
// verse. Shown on every page when logged in so the brand is always anchored.
function MobileHeader({ onOpenBible, onVerseClick }) {
  const verse = getDailyVerse();
  return (
    <div style={{
      position: 'fixed',
      top: 'env(safe-area-inset-top, 0px)',
      left: 0, right: 0,
      height: 56, zIndex: 110,
      background: '#1e1208',
      borderBottom: 'none',
      boxShadow: '0 1px 0 rgba(255,255,255,0.04)',
      display: 'flex', alignItems: 'center',
      padding: '0 164px 0 16px', // right: room for 3 FABs (3×44 + 2×8 gaps + 12px edge)
      gap: 12,
    }}>
      <div style={{ flexShrink: 0 }}>
        <KinwoveWordmark size={32} textColor="#f4e9d4" starColor={T.honey} />
      </div>
      <button
        onClick={() => onVerseClick ? onVerseClick() : onOpenBible?.(verse.ref)}
        title="Today's verse — tap to reflect"
        style={{
          flex: 1, minWidth: 0,
          display: 'flex', alignItems: 'baseline', gap: 7,
          background: 'none', border: 'none',
          paddingLeft: 12,
          borderLeft: '1px solid rgba(232,181,99,0.22)',
          cursor: 'pointer',
          textAlign: 'left', overflow: 'hidden',
        }}
      >
        <span style={{
          fontFamily: T.serif, fontStyle: 'italic', fontSize: 12.5, color: '#e8dcc2',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          minWidth: 0, flex: 1,
        }}>
          &ldquo;{verse.text}&rdquo;
        </span>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: T.honey, letterSpacing: '0.06em', flexShrink: 0 }}>
          {verse.ref} ↗
        </span>
      </button>
    </div>
  );
}

// ── Desktop sidebar nav ─────────────────────────────────────────────────────
// Mirrors BottomNav's 5 tabs but rendered vertically on screens ≥1024px.
// Includes a Settings item at the bottom that replaces the ⋮ FAB.
// NOTE: The sidebar starts at top:56px — below the global AppHeader.
function SidebarNav({ stage, session, profile, chatOpen,
  onGoHome, onGoChurch, onGoRead, onGoMe, onToggleChat,
  // Settings / more-actions (same callbacks as TopRightMenu)
  hasCareTeamRole, hasPastoredChurch,
  onFindPeople, onOpenBoard, onOpenHistory, onInviteFriends,
  onOpenTalkToSomeone, onOpenCareInbox, onOpenPastorDashboard,
  onFindChurches, onApplyAsPastor, onOpenPastorAdminQueue,
  onOpenChurchDisputesQueue, onOpenSponsorAdmin,
  onEditProfile, onSignOut, onDeleteAccount, onOpenHelp,
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const popoverRef = useRef(null);

  // Close on outside click / Escape
  useEffect(() => {
    if (!settingsOpen) return;
    const onDown = (e) => {
      if (!popoverRef.current?.contains(e.target)) setSettingsOpen(false);
    };
    const onEsc  = (e) => { if (e.key === 'Escape') setSettingsOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown, { passive: true });
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onEsc);
    };
  }, [settingsOpen]);

  if (!session) return null;
  if (stage === 'landing' || stage === 'onboarding' || stage === 'intake') return null;

  const tabFor = (s) => {
    if (s === 'home' || s === 'feed') return 'home';
    if (['church', 'churches', 'church-entry', 'groups', 'prayer',
         'talk-to-someone', 'care-conversation', 'church-admin', 'pastor-dashboard',
         'sermon-composer', 'care-admin', 'sermon-view', 'connect'].includes(s)) return 'church';
    if (s === 'read') return 'read';
    if (['me', 'walks', 'care-inbox', 'messages', 'dm-conversation', 'app-admin'].includes(s)) return 'me';
    return null;
  };
  const active = tabFor(stage);

  const SECTION_COLORS = {
    home:   '#B8733A',
    church: '#6b2438',
    read:   '#4a1542',
    me:     '#1a3050',
  };
  const sc = (id) => SECTION_COLORS[id] ?? T.goldDark;

  const itemSt = (id) => ({
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 14px',
    cursor: 'pointer', background: 'none', border: 'none', width: '100%',
    textAlign: 'left', fontFamily: T.serif, outline: 'none',
    color: active === id ? T.ink : T.inkSoft,
    borderLeft: 'none',
    backgroundColor: active === id ? T.white : 'transparent',
    transition: 'color 0.15s, background-color 0.15s',
    borderRadius: 10,
    marginRight: 8, marginLeft: 8,
    boxShadow: active === id ? '0 1px 4px rgba(26,17,8,0.08)' : 'none',
  });

  const labelSt = (id) => ({
    fontSize: 13.5, fontWeight: active === id ? 600 : 450, letterSpacing: 0.05,
  });

  // Muted non-active item (Settings, etc.)
  const mutedItemSt = {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 14px',
    cursor: 'pointer', background: 'none', border: 'none', width: '100%',
    textAlign: 'left', fontFamily: T.serif, outline: 'none',
    color: T.inkMuted, borderLeft: 'none',
    transition: 'color 0.15s, background-color 0.15s',
    borderRadius: 10, marginRight: 8, marginLeft: 8,
  };

  // Settings menu items — mirrors TopRightMenu but lives in sidebar
  // Find people / Find a church moved to dedicated FindButton FAB
  const settingsItems = [
    onOpenBoard       && { Icon: LayoutGrid,    label: 'Your board',          onClick: onOpenBoard },
    onOpenHistory     && { Icon: Clock,         label: 'Chat history',        onClick: onOpenHistory },
    onInviteFriends   && { Icon: UserPlus,      label: 'Invite friends',      onClick: onInviteFriends },
    profile?.church_id && onOpenTalkToSomeone && { Icon: Phone, label: 'Ask someone', onClick: onOpenTalkToSomeone },
    hasCareTeamRole   && onOpenCareInbox     && { Icon: Inbox,  label: 'Conversations', onClick: onOpenCareInbox },
    hasPastoredChurch && onOpenPastorDashboard && { Icon: Building2, label: 'Manage your church', onClick: onOpenPastorDashboard },
    onApplyAsPastor && !profile?.is_pastor && { Icon: Star, label: 'Apply as a pastor', onClick: onApplyAsPastor },
    onOpenPastorAdminQueue    && { Icon: ShieldCheck, label: 'Pastor applications', onClick: onOpenPastorAdminQueue },
    onOpenChurchDisputesQueue && { Icon: Flag,        label: 'Listing disputes',    onClick: onOpenChurchDisputesQueue },
    onOpenSponsorAdmin        && { Icon: Megaphone,   label: 'Sponsor admin',       onClick: onOpenSponsorAdmin },
    onOpenHelp     && { Icon: HelpCircle, label: 'Help & guide', onClick: onOpenHelp },
    onEditProfile  && { Icon: UserCog, label: 'Edit profile',  onClick: onEditProfile },
    onSignOut      && { Icon: LogOut,  label: 'Sign out',      onClick: onSignOut,      danger: true },
    onDeleteAccount && { Icon: Trash2, label: 'Delete account', onClick: onDeleteAccount, danger: true },
  ].filter(Boolean);

  return (
    <div style={{
      position: 'fixed', top: 56, left: 0, bottom: 0, width: 240,
      background: T.cream, borderRight: `1px solid ${T.line}`,
      display: 'flex', flexDirection: 'column', zIndex: 100,
      boxShadow: '1px 0 12px rgba(44,24,16,0.05)',
    }}>

      {/* Primary nav items — no logo here; AppHeader owns the brand */}
      <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>

        {/* Ask — top of sidebar */}
        <button data-tour-id="ask" onClick={onToggleChat} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 14px',
          cursor: 'pointer', background: 'none', border: 'none', width: '100%',
          textAlign: 'left', fontFamily: T.serif, outline: 'none',
          color: chatOpen ? T.ink : T.inkSoft,
          borderLeft: 'none',
          backgroundColor: chatOpen ? T.white : 'transparent',
          transition: 'color 0.15s, background-color 0.15s',
          borderRadius: 10,
          marginRight: 8, marginLeft: 8,
          boxShadow: chatOpen ? '0 1px 4px rgba(26,17,8,0.08)' : 'none',
        }}>
          <KinwoveStar size={14} color="currentColor" style={{ flexShrink: 0, width: 20 }} />
          <span style={{ fontSize: 13.5, fontWeight: chatOpen ? 600 : 450 }}>Ask</span>
        </button>

        {/* Feed */}
        <button data-tour-id="feed" onClick={onGoHome} style={itemSt('home')}>
          <span style={{ fontSize: 17, flexShrink: 0, width: 20, textAlign: 'center', lineHeight: 1 }}>🏠</span>
          <span style={labelSt('home')}>Feed</span>
        </button>

        {/* Church */}
        <button data-tour-id="church" onClick={onGoChurch} style={itemSt('church')}>
          <span style={{ fontSize: 17, flexShrink: 0, width: 20, textAlign: 'center', lineHeight: 1 }}>👥</span>
          <span style={labelSt('church')}>Church</span>
        </button>

        {/* Bible */}
        <button data-tour-id="bible" onClick={onGoRead} style={itemSt('read')}>
          <span style={{ fontSize: 17, flexShrink: 0, width: 20, textAlign: 'center', lineHeight: 1 }}>📖</span>
          <span style={labelSt('read')}>Bible</span>
        </button>

        {/* You */}
        <button data-tour-id="you" onClick={onGoMe} style={itemSt('me')}>
          <span style={{ flexShrink: 0 }}>
            <Avatar
              name={profile?.display_name}
              avatarConfig={profile?.avatar_config}
              photoUrl={profile?.avatar_url}
              size={20}
              style={{ border: `2px solid ${active === 'me' ? T.gold : T.line}` }}
            />
          </span>
          <span style={labelSt('me')}>You</span>
        </button>
      </nav>

      {/* ── Bottom strip: Settings ───────────────────────────── */}
      <div style={{ borderTop: `1px solid ${T.line}`, padding: '6px 0', marginBottom: 'env(safe-area-inset-bottom, 8px)' }}>
        <button
          onClick={() => setSettingsOpen((v) => !v)}
          style={{
            ...mutedItemSt,
            color: settingsOpen ? T.ink : T.inkMuted,
            backgroundColor: settingsOpen ? T.white : 'transparent',
            boxShadow: settingsOpen ? '0 1px 4px rgba(26,17,8,0.08)' : 'none',
          }}
        >
          <span style={{ fontSize: 16, flexShrink: 0, width: 20, textAlign: 'center', lineHeight: 1 }}>⚙</span>
          <span style={{ fontSize: 13.5, fontWeight: settingsOpen ? 600 : 450, letterSpacing: 0.05 }}>Settings</span>
        </button>
      </div>

      {/* Settings popover — opens to the right of the sidebar */}
      {settingsOpen && (
        <div
          ref={popoverRef}
          style={{
            position: 'fixed',
            left: 248,
            bottom: 16,
            background: T.white,
            borderRadius: 14,
            border: `1px solid ${T.line}`,
            boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
            overflow: 'hidden',
            minWidth: 220,
            maxWidth: 'calc(100vw - 264px)',
            maxHeight: 'min(80vh, 520px)',
            overflowY: 'auto',
            zIndex: 300,
          }}
        >
          {settingsItems.map((item, i, arr) => (
            <button
              key={item.label}
              onClick={() => { setSettingsOpen(false); item.onClick(); }}
              style={{
                width: '100%', textAlign: 'left', background: 'none', border: 'none',
                padding: '13px 18px', fontSize: 14,
                color: item.danger ? T.error : T.ink, cursor: 'pointer',
                borderBottom: i < arr.length - 1 ? `1px solid ${T.line}` : 'none',
                display: 'flex', alignItems: 'center', gap: 12,
              }}
            >
              <item.Icon size={16} strokeWidth={1.75} style={{ flexShrink: 0, opacity: item.danger ? 1 : 0.6 }} />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [stage, setStage] = useState('landing');
  const [readHomeKey, setReadHomeKey] = useState(0);
  const [bibleJumpRef, setBibleJumpRef] = useState(null);
  const [personType, setPersonType] = useState(null);
  const [seekingContext, setSeekingContext] = useState(null);
  const [peopleSearchOpen, setPeopleSearchOpen] = useState(false);
  const [boardOpen, setBoardOpen] = useState(false);
  const [chatPanelOpen, setChatPanelOpen] = useState(false);
  const [viewingUserId, setViewingUserId] = useState(null);
  const [viewingChurchId, setViewingChurchId] = useState(null);
  const [winW, setWinW] = useState(() => window.innerWidth);
  const [journeysOpen, setJourneysOpen] = useState(false);
  const [journeyProgress, setJourneyProgress] = useState(() => getJourneyProgress());
  const [autoSendPrompt, setAutoSendPrompt] = useState(null);
  const [installTrigger, setInstallTrigger] = useState(false);
  const [userGroup, setUserGroup] = useState(null);   // { group, role }
  const [shareId] = useState(() => new URLSearchParams(window.location.search).get('s'));
  const [deepLinkPostId] = useState(() => new URLSearchParams(window.location.search).get('post'));
  const [guestPost, setGuestPost] = useState(null);
  const [studySessionId] = useState(() => new URLSearchParams(window.location.search).get('gs'));
  const [initialChurchId] = useState(() => new URLSearchParams(window.location.search).get('church'));
  const [referralRef] = useState(() => new URLSearchParams(window.location.search).get('ref'));
  const [initialAnonChurchId] = useState(() => new URLSearchParams(window.location.search).get('anon'));
  const [initialJoinCode, setInitialJoinCode] = useState(() => new URLSearchParams(window.location.search).get('join'));
  const [stripeSuccess] = useState(() => new URLSearchParams(window.location.search).get('stripe_success') === '1');
  const [showUpgrade, setShowUpgrade] = useState(() => new URLSearchParams(window.location.search).get('upgrade') === '1');
  const [joinResult, setJoinResult] = useState(null); // { ok: bool, message: string, churchName? }
  const [careTeamRecord, setCareTeamRecord] = useState(null);
  const [pastorChurchId, setPastorChurchId] = useState(null);
  // Used by ChurchModeShell on wrapped sub-pages so the header shows the
  // pastor's own church name even before the page-specific data loads.
  const [pastorChurch,   setPastorChurch]   = useState(null);
  // Set when a pastor lands on a sermon-view: tracks which church the sermon
  // belongs to so we only wrap their *own* sermons in ChurchModeShell.
  const [sermonChurchId, setSermonChurchId] = useState(null);
  // Which tab ChurchAdmin should land on when entered. Set by ChurchPage's
  // "Edit in Pastor settings" deep-link, consumed by the ChurchAdmin mount.
  const [pastorAdminInitialTab, setPastorAdminInitialTab] = useState('overview');
  // Which tab ChurchPage should open on. Set when returning from sermon-view
  // so the user lands back on Sermons, not Feed. Cleared one tick after mount.
  const [churchReturnTab, setChurchReturnTab] = useState(null);
  // QR-scan -> Join: when a signed-out visitor lands on /?church=<id> and
  // taps "Sign up & join", we stash the church id here, send them through
  // auth, and auto-attach them as a member once their profile is set up.
  // Distinct from initialJoinCode because that path uses an invite *code*
  // (admin-rotatable), whereas QR-scan lands on the church *id* directly.
  const [pendingChurchJoin, setPendingChurchJoin] = useState(null);
  const [activeCareConv, setActiveCareConv] = useState(null);
  const [activeDmConv, setActiveDmConv] = useState(null); // { id, otherProfile }
  const [openCommentPostId, setOpenCommentPostId] = useState(() => deepLinkPostId ?? null);
  const [pendingShareUrl, setPendingShareUrl] = useState(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [currentConvId, setCurrentConvId] = useState(null);
  const [chatScrollToMsg, setChatScrollToMsg] = useState(null);
  const [chatSeededFromNote, setChatSeededFromNote] = useState(false);
  const [prefilledInput, setPrefilledInput] = useState('');
  const { notes, addNote, removeNote } = useNotes();
  const { conversations, create: createConv, update: updateConv, remove: removeConv } = useConversations();
  const [showTour, setShowTour] = useState(false);
  const [showVerseCard, setShowVerseCard] = useState(false);
  const stageSaveTimerRef = useRef(null);
  const sessionRef = useRef(null);

  useEffect(() => {
    const h = () => setWinW(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  const canDock = winW >= 768;
  const isDesktop = winW >= 1024;
  const SIDEBAR_W = 240;
  const [chatPanelWidth, setChatPanelWidth] = useState(() => {
    const stored = parseInt(localStorage.getItem('chat_panel_width') ?? '0', 10);
    return stored >= 320 ? stored : 460;
  });
  const isResizingRef = useRef(false);
  const isDocked = canDock && chatPanelOpen;

  // Auth + profile state
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  // Keep a ref so stage-save effect can access the current session without
  // needing session in its dependency array (would cause double-saves).
  const _setSession = (s) => { sessionRef.current = s; setSession(s); };
  // pastorChurchId from church_roles; falls back to profile.church_id when
  // the church_roles RLS lookup fails (e.g. schema not migrated yet).
  const effectiveChurchId = pastorChurchId || (profile?.church_id ?? null);
  const churchPlan = useChurchPlanReadOnly(effectiveChurchId);

  // UI is in English — always keep <html lang="en"> so browsers correctly
  // detect the page language and offer their native auto-translate to users
  // whose browser is in another language. The AI preferred_language is separate.
  useEffect(() => { document.documentElement.lang = 'en'; }, []);

  // On first profile load: if the user still has the default 'en' but their
  // browser is in another language, silently adopt the browser language so AI
  // features and the lang attribute both reflect where they actually are.
  useEffect(() => {
    if (!profile?.id || !session?.user?.id) return;
    const detected = navigator.language?.split('-')[0] ?? 'en';
    if (profile.preferred_language === 'en' && detected !== 'en') {
      supabase.from('profiles')
        .update({ preferred_language: detected })
        .eq('id', session.user.id)
        .then(() => setProfile((p) => p ? { ...p, preferred_language: detected } : p));
    }
  }, [profile?.id]);
  const [authStage, setAuthStage] = useState('idle'); // idle | auth | profile-setup | profile-view
  const [authInitialMode, setAuthInitialMode] = useState('signin');
  const [profileEditOrigin, setProfileEditOrigin] = useState('idle'); // where edit profile was opened from
  const [pendingPastorApply, setPendingPastorApply] = useState(false);
  const [showPastorPrompt, setShowPastorPrompt] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [composerSermonId, setComposerSermonId] = useState(null);
  const [viewingSermonId, setViewingSermonId] = useState(null);

  // ── Navigation history ───────────────────────────────────────────
  // Every screen-level transition pushes a snapshot here so the back
  // button on any screen returns the user to where they actually came
  // from — not a hardcoded fallback like 'home'. Each snapshot captures
  // the stage AND its paired view-state (viewingChurchId, viewingSermonId,
  // composerSermonId, activeCareConv) so we restore the exact screen.
  //
  // Why a snapshot effect rather than wrapping setStage? React batches
  // state updates inside event handlers, so an effect watching `stage`
  // sees all paired changes (e.g. setViewingChurchId + setStage) at once.
  // We push the *previous* snapshot, then update lastNavRef to the current.
  // skipPushRef short-circuits the push when goBack itself triggered the
  // change — otherwise back-then-back-then-forward would loop.
  const navHistoryRef = useRef([]);
  const lastNavRef    = useRef(null);
  const skipPushRef   = useRef(false);

  useEffect(() => {
    const snap = {
      stage,
      viewingChurchId,
      viewingUserId,
      viewingSermonId,
      composerSermonId,
      activeCareConv,
    };
    if (skipPushRef.current) {
      skipPushRef.current = false;
    } else if (lastNavRef.current && lastNavRef.current.stage !== stage) {
      navHistoryRef.current.push(lastNavRef.current);
      // Cap depth so a marathon session doesn't grow this forever.
      if (navHistoryRef.current.length > 30) navHistoryRef.current.shift();
    }
    lastNavRef.current = snap;
  }, [stage, viewingChurchId, viewingUserId, viewingSermonId, composerSermonId, activeCareConv]);

  // Update the browser tab title as the user navigates so bookmarks,
  // history, and analytics event labels are descriptive rather than static.
  useEffect(() => {
    const TITLES = {
      landing:           'kinwove — AI Bible Study, Church Community & Faith Questions',
      home:              'Feed · kinwove',
      feed:              'Community · kinwove',
      church:            'Churches · kinwove',
      churches:          'Church Directory · kinwove',
      'church-entry':    'Find Your Church · kinwove',
      read:              'Bible · kinwove',
      prayer:            'Prayer · kinwove',
      walks:             'Walks · kinwove',
      groups:            'Groups · kinwove',
      me:                'You · kinwove',
      messages:          'Messages · kinwove',
      'dm-conversation': 'Messages · kinwove',
      'care-inbox':      'Care Inbox · kinwove',
      'sermon-view':     'Sermon · kinwove',
      'pastor-dashboard':'Pastor Dashboard · kinwove',
      'church-admin':    'Church Admin · kinwove',
      'app-admin':       'Admin · kinwove',
    };
    document.title = TITLES[stage] ?? 'kinwove';
    // Persist nav position so tab-suspend / mobile reload returns user to same screen.
    // localStorage: fast, same-browser. DB last_stage: cross-browser/device fallback (debounced).
    const PERSIST = new Set(['home','feed','read','church','me','messages','groups','prayer','walks','care-inbox','journal','connect']);
    if (PERSIST.has(stage)) {
      localStorage.setItem('kw:stage', stage);
      // Reduced from 2000ms → 300ms so DB is updated before user leaves the tab
      clearTimeout(stageSaveTimerRef.current);
      stageSaveTimerRef.current = setTimeout(() => {
        const uid = sessionRef.current?.user?.id;
        if (uid) supabase.from('profiles').update({ last_stage: stage }).eq('id', uid).then(null, () => {});
      }, 300);
    }
  }, [stage]);

  // Flush last_stage to DB immediately when tab is hidden (mobile Safari recycles
  // tabs aggressively — the debounce above often doesn't fire before the page unloads).
  useEffect(() => {
    const PERSIST = new Set(['home','feed','read','church','me','messages','groups','prayer','walks','care-inbox','journal','connect']);
    const flush = () => {
      const uid = sessionRef.current?.user?.id;
      if (uid && PERSIST.has(stage)) {
        // Use sendBeacon if available (survives page unload); fall back to fetch.
        const body = JSON.stringify({ last_stage: stage });
        supabase.from('profiles').update({ last_stage: stage }).eq('id', uid).then(null, () => {});
      }
    };
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', flush);
      window.removeEventListener('pagehide', flush);
    };
  }, [stage]);

  // Enrich the tab title with the actual church or sermon name once loaded.
  // These run after the stage title is set, so they only refine it.
  useEffect(() => {
    if (!viewingChurchId) return;
    let cancelled = false;
    supabase.from('churches').select('name').eq('id', viewingChurchId).maybeSingle()
      .then(({ data }) => { if (!cancelled && data?.name) document.title = `${data.name} · kinwove`; });
    return () => { cancelled = true; };
  }, [viewingChurchId]);

  useEffect(() => {
    if (!viewingSermonId) return;
    let cancelled = false;
    supabase.from('sermons').select('title').eq('id', viewingSermonId).maybeSingle()
      .then(({ data }) => { if (!cancelled && data?.title) document.title = `${data.title} · kinwove`; });
    return () => { cancelled = true; };
  }, [viewingSermonId]);

  // Pre-fetch the sermon's church_id so a pastor landing on sermon-view gets
  // the ChurchModeShell wrapper only when it's their own sermon. Without this
  // we'd either always-wrap (showing the pastor's church name on someone
  // else's sermon — confusing) or never-wrap (losing the bar on sermons,
  // which is the whole point of going wide).
  useEffect(() => {
    if (stage !== 'sermon-view' || !viewingSermonId) { setSermonChurchId(null); return; }
    let cancelled = false;
    supabase
      .from('sermons')
      .select('church_id')
      .eq('id', viewingSermonId)
      .maybeSingle()
      .then(({ data }) => { if (!cancelled) setSermonChurchId(data?.church_id ?? null); });
    return () => { cancelled = true; };
  }, [stage, viewingSermonId]);

  // Pop one entry off history and restore the screen + its paired state.
  // Falls back to a sensible root when the stack is empty (first screen
  // of the session, deep links, etc.).
  function goBack(fallback = 'home') {
    const prev = navHistoryRef.current.pop();
    if (!prev) {
      setStage(fallback);
      return;
    }
    skipPushRef.current = true;
    setStage(prev.stage);
    setViewingChurchId(prev.viewingChurchId);
    setViewingUserId(prev.viewingUserId);
    setViewingSermonId(prev.viewingSermonId);
    setComposerSermonId(prev.composerSermonId);
    setActiveCareConv(prev.activeCareConv);
  }

  // Clear churchReturnTab one tick after ChurchPage mounts so subsequent
  // church navigations use ChurchPage's own default tab logic.
  useEffect(() => {
    if (stage === 'church' && churchReturnTab !== null) {
      const t = setTimeout(() => setChurchReturnTab(null), 0);
      return () => clearTimeout(t);
    }
  }, [stage, churchReturnTab]);

  const STAGE_SAFE = new Set(['home','feed','read','church','me','messages','groups','prayer','walks','care-inbox','journal','connect']);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      _setSession(data.session ?? null);
      if (data.session) {
        if (deepLinkPostId) { localStorage.removeItem('kw:stage'); setStage('feed'); loadProfile(data.session.user.id); window.history.replaceState({}, '', window.location.pathname); }
        else if (initialAnonChurchId) { setViewingChurchId(initialAnonChurchId); setStage('church-entry'); loadProfile(data.session.user.id); }
        else if (initialChurchId) { setViewingChurchId(initialChurchId); setStage('church'); loadProfile(data.session.user.id); }
        else {
          const local = localStorage.getItem('kw:stage');
          if (local && STAGE_SAFE.has(local)) { setStage(local); loadProfile(data.session.user.id); }
          else {
            loadProfile(data.session.user.id).then((prof) => {
              const local2 = localStorage.getItem('kw:stage');
              if (!local2 && prof?.last_stage && STAGE_SAFE.has(prof.last_stage)) setStage(prof.last_stage);
              else if (!local2) setStage('home');
            });
          }
        }
        if (shouldShowDailyVerse()) setShowVerseCard(true);
      } else if (deepLinkPostId) {
        // No session + deep link → fetch the post for a read-only guest preview
        fetch(`/api/post/${encodeURIComponent(deepLinkPostId)}`)
          .then((r) => r.ok ? r.json() : null)
          .then((data) => { if (data?.post) setGuestPost(data.post); })
          .catch(() => {});
        window.history.replaceState({}, '', window.location.pathname);
      } else if (initialAnonChurchId) {
        setViewingChurchId(initialAnonChurchId);
        setStage('church-entry');
      } else if (initialChurchId) {
        setViewingChurchId(initialChurchId);
        setStage('church');
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, s) => {
      _setSession(s);
      if (s) {
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') incrementLoginCount();
        // Only restore saved stage on initial load or fresh sign-in.
        // TOKEN_REFRESHED fires silently while the user is navigating — restoring
        // here would yank them back to the saved screen mid-session.
        const isInitialLoad = event === 'SIGNED_IN' || event === 'INITIAL_SESSION';
        if (isInitialLoad) {
          // Deep link always wins — never let localStorage override it
          if (deepLinkPostId) { setStage('feed'); loadProfile(s.user.id); window.history.replaceState({}, '', window.location.pathname); }
          else if (initialAnonChurchId) { setViewingChurchId(initialAnonChurchId); setStage('church-entry'); }
          else if (initialChurchId) { setViewingChurchId(initialChurchId); setStage('church'); }
          else {
            const local = localStorage.getItem('kw:stage');
            if (local && STAGE_SAFE.has(local)) {
              setStage(local);
              loadProfile(s.user.id);
            } else {
              loadProfile(s.user.id).then((prof) => {
                // New user arriving via email confirmation link — no profile yet.
                // Show the wizard instead of sending them to the feed.
                if (!prof && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
                  setAuthStage('profile-setup');
                  return;
                }
                const local2 = localStorage.getItem('kw:stage');
                if (!local2 && prof?.last_stage && STAGE_SAFE.has(prof.last_stage)) {
                  setStage(prof.last_stage);
                } else if (!local2) {
                  setStage('home');
                }
              });
            }
          }
        } else {
          // TOKEN_REFRESHED, USER_UPDATED, etc. — refresh profile silently, don't touch stage.
          loadProfile(s.user.id);
        }
        // Import guest Q+A saved before sign-up
        if (event === 'SIGNED_IN') {
          try {
            const raw = localStorage.getItem('kinwove:pendingConv');
            if (raw) {
              const { q, a } = JSON.parse(raw);
              if (q && a) {
                const conv = createConv('curious');
                updateConv(conv.id, [
                  { role: 'user', content: q },
                  { role: 'assistant', content: a },
                ]);
                setCurrentConvId(conv.id);
                setChatPanelOpen(true);
              }
              localStorage.removeItem('kinwove:pendingConv');
            }
          } catch {}
        }
        // Show daily verse card once per day
        if (shouldShowDailyVerse()) setShowVerseCard(true);
      }
      else {
        setProfile(null);
        setCareTeamRecord(null);
        setPastorChurchId(null);
        setPastorChurch(null);
        // Only wipe saved stage on explicit sign-out. TOKEN_REFRESHED can fire
        // with s=null briefly — don't treat that as signed-out.
        if (event === 'SIGNED_OUT') {
          localStorage.removeItem('kw:stage');
          const uid = sessionRef.current?.user?.id;
          if (uid) supabase.from('profiles').update({ last_stage: null }).eq('id', uid).then(null, () => {});
        }
        setStage(initialAnonChurchId ? 'church-entry' : initialChurchId ? 'church' : 'landing');
      }
    });
    return () => listener.subscription.unsubscribe();
  }, [initialChurchId, initialAnonChurchId]);

  // ?stripe_success=1 — poll for profile update after returning from Stripe.
  // Webhook can take 2-8s to process; try at 2s, 5s, and 10s.
  // If the plan is a church plan, navigate to groups so the user sees their group.
  useEffect(() => {
    if (!stripeSuccess || !session?.user?.id) return;
    window.history.replaceState({}, '', window.location.pathname);
    const uid = session.user.id;
    const checkAndNavigate = async () => {
      await loadProfile(uid);
      // If user has a group, send them there
      const { data } = await supabase.from('group_members').select('role, church_groups(*)').eq('member_id', uid).limit(1).maybeSingle();
      if (data?.church_groups) setStage('groups');
    };
    const t1 = setTimeout(() => loadProfile(uid), 2000);
    const t2 = setTimeout(() => loadProfile(uid), 5000);
    const t3 = setTimeout(checkAndNavigate, 10000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [stripeSuccess, session?.user?.id]);

  // ?join=CODE deep link: auto-attempt the join once session + complete profile is ready.
  useEffect(() => {
    const code = initialJoinCode?.trim().toUpperCase();
    if (!code) return;
    if (!session?.user?.id) return;
    if (!profile?.display_name) return;     // wait until profile is set up
    if (profile.church_id) {                 // already in a church — tell them, don't override
      // Look up invited church name async, then show message
      fetch(`/api/church/by-invite-code?code=${encodeURIComponent(code)}`)
        .then((r) => r.ok ? r.json() : {})
        .then(({ church: invited }) => {
          setJoinResult({
            ok: false,
            message: invited
              ? `You're already part of a church. To join ${invited.name}, leave your current church first.`
              : `You're already part of a church on kinwove.`,
          });
        })
        .catch(() => {
          setJoinResult({ ok: false, message: `You're already part of a church on kinwove.` });
        });
      setInitialJoinCode(null);
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    let cancelled = false;
    (async () => {
      const inviteRes = await fetch(`/api/church/by-invite-code?code=${encodeURIComponent(code)}`);
      const { church: ch } = await inviteRes.json();
      const lookupErr = !inviteRes.ok ? true : null;

      if (cancelled) return;

      if (lookupErr || !ch) {
        setJoinResult({ ok: false, message: `That invite code didn't match any church. Ask whoever sent it for a new one.` });
        setInitialJoinCode(null);
        window.history.replaceState({}, '', window.location.pathname);
        return;
      }

      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ church_id: ch.id })
        .eq('id', session.user.id);

      if (cancelled) return;

      if (updateErr) {
        const blocked = (updateErr.message || '').toLowerCase().includes('rejoin');
        setJoinResult({
          ok: false,
          message: blocked
            ? `You can no longer rejoin ${ch.name}. Reach out to the pastor if this is a mistake.`
            : `Couldn't join ${ch.name}: ${updateErr.message}`,
        });
      } else {
        await loadProfile(session.user.id);
        setJoinResult({ ok: true, churchName: ch.name, message: `Welcome to ${ch.name}.` });
        setViewingChurchId(ch.id);
        setStage('church');
      }

      setInitialJoinCode(null);
      window.history.replaceState({}, '', window.location.pathname);
    })();

    return () => { cancelled = true; };
  }, [initialJoinCode, session?.user?.id, profile?.display_name, profile?.church_id]);

  // Pending QR-scan join — fires once a signed-out visitor who tapped
  // "Sign up & join this church" finishes auth + onboarding and has a
  // display_name. We attach them, surface the success banner, and land
  // them on the congregation hub (where the conversation actually happens).
  useEffect(() => {
    if (!pendingChurchJoin) return;
    if (!session?.user?.id) return;
    if (!profile?.display_name) return;
    if (profile.church_id === pendingChurchJoin) {
      // Already a member (e.g. they signed back in). Nothing to do.
      setPendingChurchJoin(null);
      return;
    }
    if (profile.church_id) {
      // Already in a different church — don't override silently.
      setPendingChurchJoin(null);
      return;
    }

    let cancelled = false;
    (async () => {
      const { data: ch } = await supabase
        .from('churches')
        .select('id, name')
        .eq('id', pendingChurchJoin)
        .maybeSingle();
      if (cancelled) return;
      if (!ch) {
        setJoinResult({ ok: false, message: `That church doesn't exist anymore.` });
        setPendingChurchJoin(null);
        return;
      }
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ church_id: ch.id })
        .eq('id', session.user.id);
      if (cancelled) return;
      if (updateErr) {
        const blocked = (updateErr.message || '').toLowerCase().includes('rejoin');
        setJoinResult({
          ok: false,
          message: blocked
            ? `You can no longer rejoin ${ch.name}. Reach out to the pastor if this is a mistake.`
            : `Couldn't join ${ch.name}: ${updateErr.message}`,
        });
      } else {
        await loadProfile(session.user.id);
        setJoinResult({ ok: true, churchName: ch.name, message: `Welcome to ${ch.name}.` });
        setViewingChurchId(ch.id);
        setStage('church');
      }
      setPendingChurchJoin(null);
    })();
    return () => { cancelled = true; };
  }, [pendingChurchJoin, session?.user?.id, profile?.display_name, profile?.church_id]);

  // Realtime: when a pastor application is approved/rejected, refresh roles immediately
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    const channel = supabase
      .channel(`pastor-app-${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pastor_applications', filter: `user_id=eq.${userId}` },
        () => { loadProfile(userId); },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.user?.id]);

  async function startDM(otherUserId) {
    if (!session?.user?.id) return;
    const uid = session.user.id;
    // Normalize participant order so find-or-create is deterministic
    const sorted = [uid, otherUserId].sort();
    // Find existing conversation
    const { data: existing } = await supabase
      .from('dm_conversations')
      .select('id')
      .contains('participant_ids', sorted)
      .maybeSingle();
    let convId = existing?.id;
    if (!convId) {
      const { data: created } = await supabase
        .from('dm_conversations')
        .insert({ participant_ids: sorted })
        .select('id')
        .single();
      convId = created?.id;
    }
    if (!convId) return;
    const { data: otherProfile } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_config, avatar_url')
      .eq('id', otherUserId)
      .single();
    setViewingUserId(null);
    setActiveDmConv({ id: convId, otherProfile: otherProfile ?? null });
    setStage('dm-conversation');
  }

  async function loadProfile(userId) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setProfile(data ?? null);
    if (!isTourDone()) setShowTour(true);
    await Promise.all([loadGroup(userId), loadChurchRoles(userId)]);
    return data ?? null;
  }

  async function loadChurchRoles(userId) {
    const [{ data: care }, { data: ownerRole }] = await Promise.all([
      supabase
        .from('care_team_members')
        .select('id, church_id, role_label, is_active, accepted_covenant_at')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle(),
      supabase
        .from('church_roles')
        .select('church_id, churches(id, name, city, region)')
        .eq('user_id', userId)
        .eq('is_owner', true)
        .maybeSingle(),
    ]);
    setCareTeamRecord(care ?? null);
    let church = ownerRole?.churches ?? null;

    // Fallback: if church_roles lookup returned nothing (RLS issue or missing
    // is_owner column), check churches.pastor_id directly.
    if (!church) {
      const { data: pastorChurch } = await supabase
        .from('churches')
        .select('id, name, city, region')
        .eq('pastor_id', userId)
        .maybeSingle();
      church = pastorChurch ?? null;
    }

    // Final fallback: ask the server (service role — bypasses all client RLS).
    if (!church) {
      try {
        const r = await authedFetch('/api/me/pastor-church');
        const b = await r.json();
        church = b.church ?? null;
      } catch { /* non-fatal */ }
    }

    setPastorChurchId(church?.id ?? null);
    setPastorChurch(church ?? null);
  }


  async function loadGroup(userId) {
    const { data } = await supabase
      .from('group_members')
      .select('role, church_groups(*)')
      .eq('member_id', userId)
      .limit(1)
      .maybeSingle();
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
    const personDef = PERSON_TYPES.find((p) => p.id === pt);
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
    const personDef = PERSON_TYPES.find((p) => p.id === pt);
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
      title: title ?? 'A conversation from kinwove',
      messages,
      person_type: personType,
    });
    const url = `${window.location.origin}?s=${id}`;
    try { await navigator.clipboard.writeText(url); } catch {}
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2500);
  }

  function loadConversation(conv) {
    setChatSeededFromNote(false);
    setCurrentConvId(conv.id);
    setPersonType(conv.personType);
    setHistoryOpen(false);
    setChatPanelOpen(true);
  }

  const goDeeper = (note) => {
    setBoardOpen(false);
    setChatScrollToMsg(null);

    if (note.convId) {
      const conv = conversations.find((c) => c.id === note.convId);
      if (conv) {
        // Resume the exact saved conversation and scroll to the saved message
        setChatSeededFromNote(false);
        setCurrentConvId(conv.id);
        setPersonType(conv.personType ?? note.personType ?? personType);
        if (note.msgIdx != null) setChatScrollToMsg(note.msgIdx);
        setChatPanelOpen(true);
        return;
      }
    }

    // No convId (old note) or conversation was cleared — rebuild from saved Q&A
    const pt = note.personType ?? personType ?? profile?.person_type ?? 'curious';
    const conv = createConv(pt);
    const seeded = [];
    if (note.question && note.question !== '(no question)') {
      seeded.push({ role: 'user', content: note.question });
    }
    if (note.answer) {
      seeded.push({ role: 'assistant', content: note.answer });
    }
    setChatSeededFromNote(true);
    setCurrentConvId(conv.id);
    setPersonType(pt);
    if (seeded.length > 0) {
      updateConv(conv.id, seeded);
      setChatScrollToMsg(seeded.length - 1); // scroll to the AI answer
    }
    setChatPanelOpen(true);
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
        {initialJoinCode && (
          <div style={{
            background: T.ink, color: T.cream,
            padding: '12px 20px', textAlign: 'center',
            fontSize: 14, fontFamily: T.sans, lineHeight: 1.4,
          }}>
            ✶ You've been invited to join a church on kinwove — sign in or create an account to accept.
          </div>
        )}
        <Auth
          onAuth={async (s) => {
            setSession(s);
            // Profile-setup should only run on the very first sign-up (no
            // profiles row yet). Returning users — even ones with a partially
            // filled profile — skip it; they can edit from the Me page.
            const { data: existing } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', s.user.id)
              .maybeSingle();
            if (existing) {
              setProfile(existing);
              loadProfile(s.user.id);
              setAuthStage('idle');
              if (pendingPastorApply) { setPendingPastorApply(false); setStage('pastor-apply'); }
              else { setStage('home'); }
            } else {
              setAuthStage('profile-setup');
            }
          }}
          onBack={() => setAuthStage('idle')}
          initialMode={authInitialMode}
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
            const isFirstTime = profileEditOrigin === 'idle' && !pendingPastorApply && !profile?.is_pastor;
            setProfile(p);
            setAuthStage('idle');
            if (pendingPastorApply) { setPendingPastorApply(false); setStage('pastor-apply'); }
            else {
              setStage(profileEditOrigin === 'me' ? 'me' : 'feed');
              if (isFirstTime) {
                setShowPastorPrompt(true);
                // Show tour + daily verse for brand new users (may not have been
                // triggered via loadProfile() if they came through the Auth form path)
                if (!isTourDone()) setShowTour(true);
                if (shouldShowDailyVerse()) setShowVerseCard(true);
                // Fire-and-forget: send welcome DM from "kinwove" system account
                authedFetch('/api/welcome-dm', { method: 'POST' }).catch(() => {});
              }
            }
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
        <RouteErrorBoundary>
          <Suspense fallback={<ScreenLoader />}>
            <SharedView shareId={shareId} onBegin={() => { window.history.replaceState({}, '', '/'); window.location.reload(); }} />
          </Suspense>
        </RouteErrorBoundary>
      </>
    );
  }

  if (studySessionId) {
    return (
      <>
        <style>{globalCss}</style>
        <RouteErrorBoundary>
          <Suspense fallback={<ScreenLoader />}>
            <StudySession sessionId={studySessionId} onBegin={() => { window.history.replaceState({}, '', '/'); window.location.reload(); }} />
          </Suspense>
        </RouteErrorBoundary>
      </>
    );
  }

  const showNav = session && stage !== 'onboarding' && stage !== 'intake' && authStage === 'idle';
  // Hide on full-screen flows that have no header room at all.
  const showTopRight = showNav && !['onboarding', 'intake', 'anon-welcome', 'church-entry'].includes(stage);

  const HEADER_H = 56; // global app header height on desktop

  return (
    <>
      <style>{globalCss}</style>

      {/* ── Global dark header (all devices when logged in) ─────────── */}
      {showNav && (
        isDesktop
          ? <AppHeader onOpenBible={(ref) => { setBibleJumpRef(ref); setStage('read'); }} onVerseClick={() => setShowVerseCard(true)} />
          : <MobileHeader onOpenBible={(ref) => { setBibleJumpRef(ref); setStage('read'); }} onVerseClick={() => setShowVerseCard(true)} />
      )}

      {/* ── Main stage ─────────────────────────────────────────────── */}
      <PageErrorBoundary>
      <Suspense fallback={<ScreenLoader />}>
      <div style={{
        paddingRight: isDocked ? chatPanelWidth : 0,
        marginLeft: isDesktop && showNav ? SIDEBAR_W : 0,
        paddingTop: showNav ? (isDesktop ? HEADER_H : `calc(${HEADER_H}px + env(safe-area-inset-top, 0px))`) : 0,
        paddingBottom: !isDesktop && showNav ? 'calc(62px + env(safe-area-inset-bottom, 0px))' : 0,
        transition: isResizingRef.current ? 'none' : 'padding-right 0.28s ease, margin-left 0.28s ease',
        '--global-header-h': showNav ? `${HEADER_H}px` : '0px',
      }}>
      {stage === 'landing' && guestPost && (
        <GuestPostView
          post={guestPost}
          onSignUp={() => { setAuthInitialMode('signup'); setAuthStage('auth'); }}
          onSignIn={() => { setAuthInitialMode('signin'); setAuthStage('auth'); }}
          onBack={() => setGuestPost(null)}
        />
      )}
      {stage === 'landing' && !guestPost && (
        <Landing
          onBegin={() => { setAuthInitialMode('signup'); setAuthStage('auth'); }}
          onSignIn={() => { setAuthInitialMode('signin'); setAuthStage('auth'); }}
          session={session}
          profile={profile}
          onEditProfile={() => setAuthStage('profile-view')}
          pastorChurchId={pastorChurchId}
          referralRef={referralRef}
          onPastorIntent={() => {
            if (session && profile) { setStage('pastor-apply'); }
            else { setPendingPastorApply(true); setAuthStage('auth'); }
          }}
        />
      )}
      {stage === 'home' && session && (
        <Community
          session={session}
          profile={profile}
          userGroup={userGroup}
          hideHeader={showNav}
          onClose={() => goBack('home')}
          onOpenChat={(q) => { if (!currentConvId) startChatFromProfile(); if (q) setPrefilledInput(q); setChatPanelOpen(true); }}
          onViewProfile={(uid) => uid === session.user.id ? setStage('me') : setViewingUserId(uid)}
          onFindPeople={() => setPeopleSearchOpen(true)}
          onInviteFriends={() => setStage('invite')}
          onOpenPrayer={() => setStage('prayer')}
          onOpenRead={() => setStage('read')}
          onOpenBible={(ref) => { setBibleJumpRef(ref); setStage('read'); }}
          onVerseClick={() => setShowVerseCard(true)}
          onOpenChurch={() => {
            if (profile?.church_id) { setViewingChurchId(profile.church_id); setStage('church'); }
            else setStage('churches');
          }}
          onOpenSermon={(id) => { setViewingSermonId(id); setStage('sermon-view'); }}
          onSendDM={(url) => { setPendingShareUrl(url); setStage('messages'); }}
        />
      )}
      {stage === 'sermon-view' && session && viewingSermonId && (() => {
        const isOwnSermon = pastorChurchId && sermonChurchId && pastorChurchId === sermonChurchId;
        const handleSermonBack = () => { setChurchReturnTab('sermons'); goBack('home'); };
        const view = (
          <SermonView
            session={session}
            profile={profile}
            sermonId={viewingSermonId}
            onBack={handleSermonBack}
            onChangeSermon={(id) => setViewingSermonId(id)}
            chromeless={isOwnSermon}
          />
        );
        if (isOwnSermon) {
          return (
            <ChurchModeShell
              church={pastorChurch}
              tab={null}
              onTabChange={(t) => { setPastorAdminInitialTab(t); setStage('church-admin'); }}
              onBack={() => goBack('me')}
              onOpenChurchPage={() => { setChurchReturnTab('sermons'); setViewingChurchId(pastorChurchId); setStage('church'); }}
            >
              {view}
            </ChurchModeShell>
          );
        }
        return view;
      })()}
      {stage === 'feed' && session && (
        <Community
          session={session}
          profile={profile}
          userGroup={userGroup}
          accentColor="#6b2438"
          hideHeader={showNav}
          openCommentPostId={openCommentPostId}
          onClose={() => goBack('home')}
          onOpenChat={(q) => { if (!currentConvId) startChatFromProfile(); if (q) setPrefilledInput(q); setChatPanelOpen(true); }}
          onViewProfile={(uid) => uid === session.user.id ? setStage('me') : setViewingUserId(uid)}
          onFindPeople={() => setPeopleSearchOpen(true)}
          onInviteFriends={() => setStage('invite')}
          onOpenPrayer={() => setStage('prayer')}
          onOpenRead={() => setStage('read')}
          onVerseClick={() => setShowVerseCard(true)}
          onOpenChurch={() => {
            if (profile?.church_id) { setViewingChurchId(profile.church_id); setStage('church'); }
            else setStage('churches');
          }}
          onOpenSermon={(id) => { setViewingSermonId(id); setStage('sermon-view'); }}
          onOpenConnect={() => setStage('connect')}
          onOpenGroups={() => setStage('groups')}
          onSendDM={(url) => { setPendingShareUrl(url); setStage('messages'); }}
        />
      )}
      {stage === 'prayer' && session && (
        <Prayer
          session={session}
          profile={profile}
          onClose={() => goBack('feed')}
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
              onClose={() => goBack('feed')}
              onLeave={async () => {
                await supabase.from('group_members').delete().eq('member_id', session.user.id).eq('group_id', userGroup.group.id);
                setUserGroup(null);
                setStage('feed');
              }}
            />
          : <GroupSetup
              session={session}
              onJoined={(g) => { setUserGroup(g); setStage('feed'); }}
              onClose={() => goBack('feed')}
            />
      )}
      {stage === 'connect' && session && (
        <ConnectScreen
          session={session}
          profile={profile}
          onClose={() => goBack('feed')}
          onStartDM={startDM}
        />
      )}
      {stage === 'me' && session && (
        <MePanel
          session={session}
          profile={profile}
          onClose={() => goBack('feed')}
          onOpenBoard={() => { setStage('feed'); setBoardOpen(true); }}
          onOpenHistory={() => { setStage('feed'); setHistoryOpen(true); }}
          onEditProfile={() => { setProfileEditOrigin('me'); setAuthStage('profile-setup'); }}
          onSignOut={() => { supabase.auth.signOut(); setSession(null); setProfile(null); setStage('landing'); }}
          onDeleteAccount={() => setShowDeleteAccount(true)}
          onProfileUpdate={(p) => setProfile(p)}
          onViewProfile={(uid) => setViewingUserId(uid)}
          onOpenChat={(q) => { if (!currentConvId) startChatFromProfile(); if (q) setPrefilledInput(q); setChatPanelOpen(true); }}
          onFindPeople={() => setPeopleSearchOpen(true)}
          onInviteFriends={() => setStage('invite')}
          onFindChurches={() => setStage('churches')}
          onApplyAsPastor={() => setStage('pastor-apply')}
          onOpenPastorAdminQueue={profile?.is_admin ? () => setStage('pastor-admin-queue') : undefined}
          onOpenChurchDisputesQueue={profile?.is_admin ? () => setStage('church-disputes-queue') : undefined}
          onOpenChurch={(id) => { setViewingChurchId(id); setStage('church'); }}
          onOpenSermon={(id) => { setViewingSermonId(id); setStage('sermon-view'); }}
          onOpenWalks={() => setStage('walks')}
          onOpenTalkToSomeone={profile?.church_id ? () => { setViewingChurchId(profile.church_id); setStage('talk-to-someone'); } : undefined}
          onOpenCareInbox={careTeamRecord ? () => setStage('care-inbox') : undefined}
          onOpenMessages={() => setStage('messages')}
          onOpenConnect={() => setStage('connect')}
          onOpenPastorDashboard={pastorChurchId ? () => setStage('church-admin') : undefined}
          hasCareTeamRole={!!careTeamRecord}
          hasPastoredChurch={!!pastorChurchId}
          onUpgrade={() => setShowUpgrade(true)}
        />
      )}
      {stage === 'read' && session && (
        <BibleReader
          session={session}
          profile={profile}
          homeKey={readHomeKey}
          jumpRef={bibleJumpRef}
          onClose={() => goBack('feed')}
          onOpenChat={(q) => { if (!currentConvId) startChatFromProfile(); if (q) setPrefilledInput(q); setChatPanelOpen(true); }}
        />
      )}
      {stage === 'invite' && (
        <InviteFriends onClose={() => goBack(session ? 'feed' : 'landing')} profile={profile} />
      )}
      {stage === 'help' && (
        <Suspense fallback={<ScreenLoader />}>
          <HelpPage onClose={() => goBack('home')} onOpenTour={() => { goBack('home'); setShowTour(true); }} />
        </Suspense>
      )}
      {stage === 'pastor-admin-queue' && session && profile?.is_admin && (
        <PastorAdminQueue
          session={session}
          profile={profile}
          onClose={() => goBack('me')}
        />
      )}
      {stage === 'church-disputes-queue' && session && profile?.is_admin && (
        <ChurchDisputesQueue
          session={session}
          profile={profile}
          onClose={() => goBack('me')}
          onOpenChurch={(id) => { setViewingChurchId(id); setStage('church'); }}
        />
      )}
      {stage === 'pastor-apply' && session && (
        <PastorApply
          session={session}
          profile={profile}
          onClose={() => goBack('me')}
          onBecamePastor={async () => {
            await loadProfile(session.user.id);
            // Land directly on the dashboard so the setup checklist is the first
            // thing they see — turns "you're approved" into "here's your ramp."
            // Falls back to 'me' if the church row hasn't propagated yet.
            setStage('church-admin');
          }}
        />
      )}
      {stage === 'churches' && (
        <ChurchDirectory
          session={session}
          profile={profile}
          onBack={() => goBack(session ? 'feed' : 'landing')}
          onOpenChurch={(id) => { setViewingChurchId(id); setStage('church'); }}
          onApply={() => {
            if (session && profile) { setStage('pastor-apply'); }
            else { setPendingPastorApply(true); setAuthStage('auth'); }
          }}
        />
      )}
      {stage === 'church' && viewingChurchId && (() => {
        const isOwnChurch = (pastorChurchId != null && pastorChurchId === viewingChurchId)
          || (profile?.is_pastor && profile?.church_id === viewingChurchId);
        const page = (
          <ChurchPage
            session={session}
            profile={profile}
            churchId={viewingChurchId}
            pastorChurchId={pastorChurchId}
            chromeless={isOwnChurch}
            initialTab={churchReturnTab}
            onBack={() => {
              if (initialChurchId) {
                window.history.replaceState({}, '', '/');
                setViewingChurchId(null);
                setStage(session ? 'feed' : 'landing');
              } else {
                goBack('churches');
              }
            }}
            onProfileUpdate={(p) => setProfile(p)}
            onViewProfile={(uid) => setViewingUserId(uid)}
            onOpenSermon={(id) => { setViewingSermonId(id); setStage('sermon-view'); }}
            onOpenAdmin={pastorChurchId
              ? (tab) => { setPastorAdminInitialTab(tab ?? 'overview'); setStage('church-admin'); }
              : undefined}
            onNewSermon={isOwnChurch
              ? () => { setPastorAdminInitialTab('sermons'); setStage('church-admin'); }
              : undefined}
            onOpenFeed={() => setStage('feed')}
            onOpenPrayer={() => setStage('prayer')}
            onOpenTalkToSomeone={(profile?.church_id === viewingChurchId || pastorChurchId === viewingChurchId)
              ? () => setStage('talk-to-someone')
              : undefined}
            onOpenCareInbox={careTeamRecord ? () => setStage('care-inbox') : undefined}
            onOpenWalks={() => setStage('walks')}
            onFindChurches={() => setStage('churches')}
            onRequestJoin={!session
              ? () => { setPendingChurchJoin(viewingChurchId); setAuthStage('auth'); }
              : undefined}
          />
        );
        if (isOwnChurch) {
          return (
            <ChurchModeShell
              church={pastorChurch}
              tab={null}
              currentSubpage="public"
              onTabChange={(t) => { setPastorAdminInitialTab(t); setStage('church-admin'); }}
              onBack={() => setStage('me')}
              onOpenChurchHub={() => setStage('church-admin')}
            >
              {page}
            </ChurchModeShell>
          );
        }
        return page;
      })()}
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
          onClose={() => goBack('me')}
        />
      )}
      {stage === 'talk-to-someone' && session && viewingChurchId && (
        <TalkToSomeone
          session={session}
          profile={profile}
          churchId={viewingChurchId}
          onBack={() => goBack(initialAnonChurchId ? 'church-entry' : 'church')}
        />
      )}
      {stage === 'care-conversation' && session && activeCareConv && (
        <CareConversation
          session={session}
          profile={profile}
          conversationId={activeCareConv.id}
          viewerRole={activeCareConv.viewerRole}
          onBack={() => goBack(activeCareConv.viewerRole !== 'requester' ? 'care-inbox' : 'me')}
          onClaimed={() => setActiveCareConv((c) => c ? { ...c, viewerRole: 'care_member' } : c)}
        />
      )}
      {stage === 'care-inbox' && session && (careTeamRecord || profile?.church_id) && (
        <CareTeamInbox
          session={session}
          profile={profile}
          churchId={careTeamRecord?.church_id ?? profile?.church_id}
          onBack={() => goBack('me')}
        />
      )}
      {stage === 'messages' && session && (
        <MessagesInbox
          session={session}
          profile={profile}
          onBack={() => goBack('me')}
          pendingShareUrl={pendingShareUrl}
          onShareSent={() => setPendingShareUrl(null)}
          onOpenPost={(postId) => { setOpenCommentPostId(postId); setStage('feed'); }}
        />
      )}
      {stage === 'dm-conversation' && session && activeDmConv && (
        <DMConversation
          session={session}
          profile={profile}
          conversationId={activeDmConv.id}
          otherProfile={activeDmConv.otherProfile}
          onBack={() => goBack('messages')}
          onOpenPost={(postId) => { setOpenCommentPostId(postId); setStage('feed'); }}
        />
      )}
      {stage === 'care-admin' && session && pastorChurchId && (
        <CareTeamAdmin
          session={session}
          churchId={pastorChurchId}
          onBack={() => goBack('church-admin')}
        />
      )}
      {stage === 'sermon-composer' && session && pastorChurchId && (() => {
        // Redirect to church-admin sermons tab so sidebar stays visible
        setPastorAdminInitialTab('sermons');
        setStage('church-admin');
        return null;
      })()}
      {(stage === 'pastor-dashboard') && session && pastorChurchId && (
        <ChurchAdmin
          session={session}
          profile={profile}
          churchId={pastorChurchId}
          onBack={() => goBack('me')}
          onOpenChurchPage={() => { setViewingChurchId(pastorChurchId); setStage('church'); }}
          onOpenSermon={(id) => { setViewingSermonId(id); setStage('sermon-view'); }}
        />
      )}
      {stage === 'church-admin' && session && (pastorChurchId || (profile?.is_pastor && profile?.church_id)) && (
        <ChurchAdmin
          session={session}
          profile={profile}
          churchId={pastorChurchId || profile.church_id}
          initialTab={pastorAdminInitialTab}
          onBack={() => goBack('me')}
          onOpenChurchPage={() => { setViewingChurchId(effectiveChurchId || profile?.church_id); setStage('church'); }}
          onOpenChurchHub={() => { setViewingChurchId(pastorChurchId || profile?.church_id); setStage('church'); }}
          onOpenSermon={(id) => { setViewingSermonId(id); setStage('sermon-view'); }}
        />
      )}
      {stage === 'onboarding' && (
        <Onboarding
          onPick={(id) => newConversation(id)}
          onBack={() => goBack(session ? 'feed' : 'landing')}
        />
      )}
      {stage === 'intake' && personType && (
        <SeekingIntake
          personType={personType}
          onComplete={(context) => startNewConversation(personType, context ?? '')}
          onBack={() => goBack('onboarding')}
        />
      )}
      {stage === 'app-admin' && session && profile?.is_admin && (
        <AdminPage
          onBack={() => goBack('me')}
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
          onOpenChurch={(churchId) => { setViewingUserId(null); setViewingChurchId(churchId); setStage('church'); }}
          onOpenSermon={(id) => { setViewingUserId(null); setViewingSermonId(id); setStage('sermon-view'); }}
          onStartChat={(q) => { if (!currentConvId) startChatFromProfile(); setPrefilledInput(q); setChatPanelOpen(true); setViewingUserId(null); }}
          onStartDM={(uid) => startDM(uid)}
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
            position: 'fixed',
            top: isDesktop && showNav ? HEADER_H : 0,
            right: 0,
            height: isDesktop && showNav ? `calc(100vh - ${HEADER_H}px)` : 'calc(100vh - 62px)',
            width: Math.min(chatPanelWidth, winW - (isDesktop && showNav ? SIDEBAR_W : 0)),
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
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(184,115,58,0.18)'; }}
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
              onChangeType={() => { closeChatPanel(); setStage('onboarding'); }}
              onSetPersonType={(pt) => setPersonType(pt)}
              onNewConversation={() => { setChatSeededFromNote(false); newConversation(personType ?? profile?.person_type ?? 'curious'); }}
              seededFromNote={chatSeededFromNote}
              notes={notes}
              onAddNote={(n) => addNote({ ...n, convId: currentConvId })}
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
              onMessagesChange={(msgs) => {
                currentConvId && updateConv(currentConvId, msgs);
                // Trigger install prompt after the user gets their first real reply
                if (!installTrigger && msgs.length >= 2) setInstallTrigger(true);
              }}
              scrollToMsg={chatScrollToMsg}
              onConsumeScrollToMsg={() => setChatScrollToMsg(null)}
              conversations={conversations}
              preferredLanguage={profile?.preferred_language ?? 'en'}
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
        rightOffset={isDocked ? chatPanelWidth : 0}
      />
      <InstallPrompt triggerNow={installTrigger} />
      <PastorPrompt
        open={showPastorPrompt}
        onApply={() => { setShowPastorPrompt(false); setStage('pastor-apply'); }}
        onClose={() => setShowPastorPrompt(false)}
      />
      <DeleteAccountModal
        open={showDeleteAccount}
        onClose={() => setShowDeleteAccount(false)}
        onDeleted={() => { setShowDeleteAccount(false); setSession(null); setProfile(null); setStage('landing'); }}
      />
      {peopleSearchOpen && (
        <PeopleSearch
          session={session}
          profile={profile}
          onClose={() => setPeopleSearchOpen(false)}
          onViewProfile={(uid) => { setPeopleSearchOpen(false); setViewingUserId(uid); }}
          onOpenChurch={(id) => { setPeopleSearchOpen(false); setViewingChurchId(id); setStage('church'); }}
          onApplyAsPastor={() => {
            setPeopleSearchOpen(false);
            if (session && profile) setStage('pastor-apply');
            else { setPendingPastorApply(true); setAuthStage('auth'); }
          }}
        />
      )}
      </Suspense>
      </PageErrorBoundary>
      {joinResult && (
        <div
          onClick={() => setJoinResult(null)}
          style={{
            position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
            zIndex: 200, maxWidth: 'calc(100vw - 32px)', cursor: 'pointer',
            background: joinResult.ok ? T.ink : T.error,
            color: T.cream, borderRadius: 999, padding: '11px 20px',
            fontSize: 14, fontWeight: 500, fontFamily: T.sans,
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}
        >
          <span style={{ fontSize: 16 }}>{joinResult.ok ? <KinwoveStar size={16} /> : '!'}</span>
          <span>{joinResult.message}</span>
          <span style={{ marginLeft: 6, opacity: 0.6, fontSize: 16 }}>×</span>
        </div>
      )}
      {/* ── Nav: sidebar on desktop, bottom tab bar on mobile/tablet ── */}
      {isDesktop ? (
        showNav && (
          <SidebarNav
            stage={stage}
            session={session}
            profile={profile}
            chatOpen={chatPanelOpen}
            hasCareTeamRole={!!careTeamRecord}
            hasPastoredChurch={!!pastorChurchId}
            onGoHome={() => { setViewingUserId(null); setStage('home'); }}
            onGoChurch={() => {
              setViewingUserId(null);
              if (pastorChurchId || profile?.is_pastor) { setStage('church-admin'); return; }
              if (profile?.church_id) { setViewingChurchId(profile.church_id); setStage('church'); return; }
              setStage('churches');
            }}
            onGoRead={() => { setViewingUserId(null); if (stage === 'read') setReadHomeKey((k) => k + 1); else setStage('read'); }}
            onGoMe={() => { setViewingUserId(null); setStage('me'); }}
            onToggleChat={() => chatPanelOpen ? closeChatPanel() : (currentConvId ? setChatPanelOpen(true) : (startChatFromProfile(), setChatPanelOpen(true)))}
            onFindPeople={() => { setViewingUserId(null); setPeopleSearchOpen(true); }}
            onOpenBoard={() => { setViewingUserId(null); setStage('feed'); setBoardOpen(true); }}
            onOpenHistory={() => { setViewingUserId(null); setStage('feed'); setHistoryOpen(true); }}
            onInviteFriends={() => { setViewingUserId(null); setStage('invite'); }}
            onOpenTalkToSomeone={profile?.church_id ? () => { setViewingUserId(null); setViewingChurchId(profile.church_id); setStage('talk-to-someone'); } : undefined}
            onOpenCareInbox={careTeamRecord ? () => { setViewingUserId(null); setStage('care-inbox'); } : undefined}
            onOpenPastorDashboard={pastorChurchId ? () => { setViewingUserId(null); setStage('church-admin'); } : undefined}
            onFindChurches={() => { setViewingUserId(null); setStage('churches'); }}
            onApplyAsPastor={() => { setViewingUserId(null); setStage('pastor-apply'); }}
            onOpenPastorAdminQueue={profile?.is_admin ? () => { setViewingUserId(null); setStage('pastor-admin-queue'); } : undefined}
            onOpenChurchDisputesQueue={profile?.is_admin ? () => { setViewingUserId(null); setStage('church-disputes-queue'); } : undefined}
            onOpenSponsorAdmin={profile?.is_admin ? () => { setViewingUserId(null); setStage('app-admin'); } : undefined}
            onOpenHelp={() => { setViewingUserId(null); setStage('help'); }}
            onEditProfile={() => { setViewingUserId(null); setProfileEditOrigin('me'); setAuthStage('profile-setup'); }}
            onSignOut={() => { supabase.auth.signOut(); setSession(null); setProfile(null); setStage('landing'); }}
            onDeleteAccount={() => setShowDeleteAccount(true)}
          />
        )
      ) : (
        <>
          {showNav && !chatPanelOpen && <CoachMark />}
          <BottomNav
            stage={stage}
            authStage={authStage}
            session={session}
            profile={profile}
            chatOpen={chatPanelOpen}
          onGoHome={() => { setViewingUserId(null); setStage('home'); }}
          onGoChurch={() => {
            setViewingUserId(null);
            if (pastorChurchId) { setStage('church-admin'); return; }
            if (profile?.church_id) { setViewingChurchId(profile.church_id); setStage('church'); return; }
            setStage('churches');
          }}
          onGoRead={() => { setViewingUserId(null); if (stage === 'read') setReadHomeKey((k) => k + 1); else setStage('read'); }}
          onGoPeople={() => setPeopleSearchOpen(true)}
          onGoMe={() => { setViewingUserId(null); setStage('me'); }}
          onToggleChat={() => chatPanelOpen ? closeChatPanel() : (currentConvId ? setChatPanelOpen(true) : (startChatFromProfile(), setChatPanelOpen(true)))}
        />
        </>
      )}
      {showTopRight && (
        <TopRightMenu
          profile={profile}
          hasCareTeamRole={!!careTeamRecord}
          hasPastoredChurch={!!pastorChurchId}
          isDesktop={isDesktop}
          rightOffset={isDocked ? chatPanelWidth : 0}
          onOpenBoard={() => { setStage('feed'); setBoardOpen(true); }}
          onOpenHistory={() => { setStage('feed'); setHistoryOpen(true); }}
          onFindPeople={() => setPeopleSearchOpen(true)}
          onInviteFriends={() => setStage('invite')}
          onOpenTalkToSomeone={profile?.church_id ? () => { setViewingChurchId(profile.church_id); setStage('talk-to-someone'); } : undefined}
          onOpenCareInbox={careTeamRecord ? () => setStage('care-inbox') : undefined}
          onOpenPastorDashboard={pastorChurchId ? () => setStage('church-admin') : undefined}
          onFindChurches={() => setStage('churches')}
          onApplyAsPastor={() => setStage('pastor-apply')}
          onOpenPastorAdminQueue={profile?.is_admin ? () => setStage('pastor-admin-queue') : undefined}
          onOpenChurchDisputesQueue={profile?.is_admin ? () => setStage('church-disputes-queue') : undefined}
          onOpenSponsorAdmin={profile?.is_admin ? () => setStage('app-admin') : undefined}
          onOpenHelp={() => setStage('help')}
          onEditProfile={() => { setProfileEditOrigin('me'); setAuthStage('profile-setup'); }}
          onSignOut={() => { supabase.auth.signOut(); setSession(null); setProfile(null); setStage('landing'); }}
          onDeleteAccount={() => setShowDeleteAccount(true)}
        />
      )}
      {showTopRight && session && (
        <FindButton
          isDesktop={isDesktop}
          rightOffset={isDocked ? chatPanelWidth : 0}
          onFindPeople={() => setPeopleSearchOpen(true)}
          onFindChurches={() => { setViewingUserId(null); setStage('churches'); }}
        />
      )}
      {showTopRight && session && (
        <MessagesButton
          session={session}
          isDesktop={isDesktop}
          rightOffset={isDocked ? chatPanelWidth : 0}
          onClick={() => setStage('messages')}
        />
      )}
      {showTopRight && session && (
        <NotificationsBell
          session={session}
          isDesktop={isDesktop}
          rightOffset={isDocked ? chatPanelWidth : 0}
          onNavigate={async (n) => {
            if (n.target_type === 'post' || n.type === 'post_comment' || n.type === 'post_comment_reply') {
              setOpenCommentPostId(n.target_id);
              setStage('feed');
            }
            else if (n.target_type === 'prayer')    { setStage('feed'); }
            else if (n.target_type === 'sermon')    { setViewingSermonId(n.target_id); setStage('sermon-view'); }
            else if (n.target_type === 'friend_request') { setViewingUserId(n.actor_id); }
            else if (n.kind === 'follow') { setViewingUserId(n.actor_id); }
            else if (n.kind === 'dm_message' || n.target_type === 'dm_conversation') {
              const convId = n.data?.conversation_id ?? n.target_id;
              if (convId && n.actor_id) {
                const { data: otherProf } = await supabase
                  .from('profiles')
                  .select('id, display_name, avatar_config, avatar_url')
                  .eq('id', n.actor_id)
                  .maybeSingle();
                setActiveDmConv({ id: convId, otherProfile: otherProf ?? null });
                setStage('dm-conversation');
              } else {
                setStage('messages');
              }
            }
            else if (n.target_type === 'church' || n.kind === 'role_assigned') {
              const cId = n.data?.church_id ?? n.target_id;
              if (n.data?.role_key === 'care') {
                // Care team: reload roles first so careTeamRecord is populated,
                // then drop them straight into the care inbox (not the church page)
                await loadChurchRoles(session?.user?.id);
                setStage('care-inbox');
              } else {
                // All other roles: go to church page where their badge is visible
                if (cId) { setViewingChurchId(cId); setStage('church'); }
              }
            }
          }}
        />
      )}

      {/* ── Upgrade modal ── */}
      {showUpgrade && session && (
        <Suspense fallback={null}>
          <UpgradeModal session={session} onClose={() => setShowUpgrade(false)} />
        </Suspense>
      )}

      {/* ── Feature tour — shown once to new users, re-openable from Help ── */}
      {showTour && session && (
        <FeatureTour onClose={() => setShowTour(false)} />
      )}

      {/* ── Daily verse card — shown once per day on app open ── */}
      {showVerseCard && session && (
        <DailyVerseCard
          onReflect={(verse) => {
            if (!currentConvId) startChatFromProfile();
            setAutoSendPrompt(`Help me reflect on today's verse — ${verse.ref}: "${verse.text}"`);
            setChatPanelOpen(true);
          }}
          onOpenBible={(ref) => { setBibleJumpRef(ref); setStage('read'); }}
          onClose={() => setShowVerseCard(false)}
        />
      )}
    </>
  );
}
