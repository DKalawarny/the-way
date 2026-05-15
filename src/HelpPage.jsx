import { useEffect, useState } from 'react';
import { Compass, Users, Heart, BookOpen, Building2, UserCheck, Shield, Search, Sparkles } from 'lucide-react';
import { T } from './theme.js';

// ─── Content ────────────────────────────────────────────────────────────────

const SECTIONS = [
  {
    id: 'start',
    Icon: Compass,
    title: 'Getting started',
    items: [
      {
        q: 'What is kinwove?',
        a: 'kinwove is a faith community for people at every stage of their spiritual journey — from the curious to the committed. You can share posts, pray together, study the Bible, find a church, and connect with others walking the same road.',
      },
      {
        q: 'How do I set up my profile?',
        a: 'Tap your avatar in the bottom nav (or "You" in the sidebar on desktop) to open your profile. From there you can upload a photo or build a custom avatar, set your banner colour, write a bio, and choose what you\'re looking for on your journey.',
      },
      {
        q: 'Who can see my posts?',
        a: 'When you write a post you choose the audience — Public (anyone on kinwove), Church (your church family only), or Only me. You can change this at any time from the ⋯ menu on the post.',
      },
      {
        q: 'What does ✦ Ask do?',
        a: 'Ask is kinwove\'s AI — powered by Claude. It answers Scripture questions, explores theology, helps you work through doubt, and never judges where you are in your journey. Tap ✦ Ask in the sidebar or the ⋮ menu on mobile to open it.',
      },
    ],
  },
  {
    id: 'community',
    Icon: Users,
    title: 'Community & posting',
    items: [
      {
        q: 'How do I make a post?',
        a: 'Tap the compose area at the top of the Community tab or your profile. Type your thought, attach up to 4 photos, choose your audience, and tap Post. You can also mark a post as a ✶ Journey Milestone to log spiritual milestones over time.',
      },
      {
        q: 'How do I save a post to read later?',
        a: 'Tap the bookmark icon at the bottom-right of any post. Your saved posts are collected under the Saved tab on your profile — tap the bookmark again, or tap Unsave, to remove it.',
      },
      {
        q: 'How do I react to a post?',
        a: 'Use the Amen, Praying, or Love buttons below each post. Tap again to remove your reaction.',
      },
      {
        q: 'How do I comment?',
        a: 'Tap the comment button at the bottom of any post to open the reply thread. Comments are visible to whoever can see the original post.',
      },
      {
        q: 'What is the ⋯ menu on a post?',
        a: 'On your own posts: edit content, change the audience, or delete it. On other people\'s posts: report content that violates community standards.',
      },
      {
        q: 'How do I report a post?',
        a: 'Tap ⋯ on a post you didn\'t write, then choose Report post. Select a reason — spam, harmful content, offensive material, misinformation, or other — then tap Submit. Reports are confidential and reviewed by our team.',
      },
      {
        q: 'Can I post anonymously?',
        a: 'Yes. When composing in the Community tab, toggle the Anonymous option. Your name and avatar won\'t appear on the post.',
      },
    ],
  },
  {
    id: 'prayer',
    Icon: Heart,
    title: 'Prayer',
    items: [
      {
        q: 'How do I add a prayer request?',
        a: 'Open the Prayer tab and tap the compose area. Prayers are private by default — tap the visibility toggle to share a request with the community if you\'d like others praying alongside you.',
      },
      {
        q: 'How do I mark a prayer as answered?',
        a: 'Find the prayer in your Prayer tab and tap Answered. You can write a praise report to share what happened — these are an encouragement for the whole community.',
      },
      {
        q: 'Can I pray for someone else\'s request?',
        a: 'Yes — on any public prayer request, tap Pray for this. The person receives a quiet notification that someone is praying for them. One tap, and it genuinely means the world.',
      },
      {
        q: 'What is the Community Prayer Wall?',
        a: 'The Prayer section in the Community tab shows public prayer requests from people in the feed. You can pray for them, leave encouragements, or add requests to your own private prayer list.',
      },
    ],
  },
  {
    id: 'bible',
    Icon: BookOpen,
    title: 'Bible & study',
    items: [
      {
        q: 'How does the Bible reader work?',
        a: 'Open the Bible tab to read Scripture with a built-in study interface. The Daily Verse shown in the header is tappable — it opens the reader directly to that passage.',
      },
      {
        q: 'How do I open a passage from a post?',
        a: 'Scripture references shown in gold text inside posts are tappable and jump directly to that passage in the Bible reader.',
      },
      {
        q: 'What can the AI help me with in Bible study?',
        a: 'Tap ✦ Ask and ask anything — explanation of a passage, word study, historical background, theological questions, or just working through doubt. The AI draws on multiple translations and always responds with grace.',
      },
      {
        q: 'What are Walks?',
        a: 'Walks are guided multi-day journeys through a theme or book of the Bible. Open the Bible tab and find Walks to start one at your own pace.',
      },
    ],
  },
  {
    id: 'ai',
    Icon: Sparkles,
    title: 'AI & scripture accuracy',
    items: [
      {
        q: 'How does kinwove make sure the AI gets scripture right?',
        a: 'Every scripture reference the AI produces is automatically checked against the King James Bible in real time. If a reference is confirmed, a small ✓ appears next to it. If it cannot be verified, a ⚠ appears instead. The AI is also built with a strict rule: it must never invent a verse number, misquote a passage, or present a paraphrase as a direct quote.',
      },
      {
        q: 'What do the ✓ and ⚠ symbols next to a scripture reference mean?',
        a: '✓ means the reference was looked up against the Bible and confirmed — the book, chapter, and verse all exist. ⚠ means the lookup could not be verified — this might mean the reference is wrong, or it may be a formatting edge case. Either way, treat ⚠ as a prompt to check your Bible before sharing or acting on that reference.',
      },
      {
        q: 'Can I tap on a scripture reference in the AI\'s response?',
        a: 'Yes. Any scripture reference shown in gold text is tappable. Tap it to see the actual verse text from the King James Version, pulled directly from the Bible. You can then dismiss the card and continue your conversation.',
      },
      {
        q: 'Why does the AI sometimes show a quote in a different style with a line down the side?',
        a: 'When the AI is paraphrasing rather than quoting directly, it marks it as a paraphrase — and kinwove displays it with a gold left-border and slight italic style so you can see at a glance that it\'s a summary, not the exact words of the text. This helps you know when to go check the original wording yourself.',
      },
      {
        q: 'Does the AI know about commonly misquoted "Bible verses"?',
        a: 'Yes — it is specifically programmed to recognise phrases that people often treat as scripture but that do not appear in the Bible. These include "God helps those who help themselves," "This too shall pass," "Everything happens for a reason," and "Money is the root of all evil" (the actual text is "the love of money is a root of all kinds of evil," 1 Timothy 6:10). The AI will never present these as biblical quotes.',
      },
      {
        q: 'What if I think the AI got something wrong?',
        a: 'Tap the flag icon (the small ⚑ button next to Share and Copy on any AI response) and we\'ll be notified. The response is logged for manual review by our team. The AI will not be perfect — no AI is — but flagging helps us find patterns and improve over time.',
      },
      {
        q: 'Is the AI meant to replace reading the Bible itself?',
        a: 'No — and that is intentional. The disclaimer at the bottom of every AI response says it directly: "Built to honour scripture, not replace it." The AI is a companion for study, not an authority. It is there to help you engage with the text more deeply, ask better questions, and find your way to the passages themselves.',
      },
    ],
  },
  {
    id: 'church',
    Icon: Building2,
    title: 'Church',
    items: [
      {
        q: 'How do I find a church?',
        a: 'Tap Church in the bottom nav or sidebar. Browse the directory or search by name. Each church page shows the pastor, location, and this week\'s sermon.',
      },
      {
        q: 'How do I join a church?',
        a: 'Open the church page and tap Join. Membership is approved by the pastor or admin — once approved, you\'ll see church-only posts in your community feed.',
      },
      {
        q: 'I\'m a pastor — how do I register my church?',
        a: 'Open Settings and tap Apply as pastor. Fill in your details and church information. Applications are manually reviewed (usually within 24 hours) to keep the directory trustworthy. You\'ll be notified when approved.',
      },
      {
        q: 'What are church-only posts?',
        a: 'When you set a post audience to Church, only members of your church on kinwove can see it. It\'s a space for your congregation to share within the family.',
      },
    ],
  },
  {
    id: 'friends',
    Icon: UserCheck,
    title: 'Friends & connections',
    items: [
      {
        q: 'What\'s the difference between Following and Friends?',
        a: 'Following is one-way — you see their public posts in your feed. Friends is mutual — you both accepted the connection, enabling direct messages and friends-only content.',
      },
      {
        q: 'How do I send a friend request?',
        a: 'Open someone\'s profile and tap + Friend. They\'ll receive a notification. Accept or decline incoming requests in your profile under the Friends tab.',
      },
      {
        q: 'How do I block someone?',
        a: 'Open their profile and tap the block button in the action row. Their posts are hidden from your feeds and they can\'t see yours. Unblock at any time from their profile or from your Friends tab.',
      },
      {
        q: 'How do I send a direct message?',
        a: 'Open someone\'s profile and tap Message, or tap the messages icon in the top-right corner. Conversations are private between you and the other person.',
      },
    ],
  },
  {
    id: 'privacy',
    Icon: Shield,
    title: 'Privacy & safety',
    items: [
      {
        q: 'Who can see my profile?',
        a: 'Your name, avatar, and person type are visible to all logged-in users. Your posts follow the audience you chose when writing them. Your church membership and friends list are only visible to relevant parties.',
      },
      {
        q: 'Can I turn off friend requests?',
        a: 'Yes — in Settings → Edit profile, toggle off Allow friend requests. People can still follow you but won\'t be able to send a request.',
      },
      {
        q: 'Are my conversations with the AI private?',
        a: 'Yes. Conversations with ✦ Ask are stored to support your ongoing study (viewable in Chat history) but are never shared with other users or visible on your profile.',
      },
      {
        q: 'How do I delete my account?',
        a: 'Go to your profile → Settings → Delete account. This permanently removes all your data — posts, prayers, messages, and profile. This action cannot be undone.',
      },
    ],
  },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function QuestionRow({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: `1px solid ${T.line}` }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%', textAlign: 'left', background: 'none', border: 'none',
          padding: '17px 0', cursor: 'pointer', outline: 'none',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20,
        }}
      >
        <span style={{
          fontSize: 14.5, fontWeight: 600, color: T.ink, lineHeight: 1.45, flex: 1,
          fontFamily: 'inherit',
        }}>{q}</span>
        <span style={{
          fontSize: 20, color: open ? T.goldDark : T.inkMuted, flexShrink: 0,
          lineHeight: 1, fontWeight: 300, marginTop: 1,
          transition: 'color 0.15s',
        }}>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div style={{
          paddingBottom: 18,
          fontFamily: "'Lora', Georgia, serif",
          fontSize: 14.5, color: T.inkSoft, lineHeight: 1.8,
        }}>
          {a}
        </div>
      )}
    </div>
  );
}

function SearchResultRow({ item }) {
  const [open, setOpen] = useState(false);
  const Icon = item.SectionIcon;
  return (
    <div style={{ borderBottom: `1px solid ${T.line}` }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%', textAlign: 'left', background: 'none', border: 'none',
          padding: '16px 0', cursor: 'pointer', outline: 'none',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20,
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
            <Icon size={12} strokeWidth={1.75} color={T.goldDark} />
            <span style={{ fontSize: 11, fontWeight: 600, color: T.goldDark, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
              {item.sectionTitle}
            </span>
          </div>
          <span style={{ fontSize: 14.5, fontWeight: 600, color: T.ink, lineHeight: 1.4 }}>{item.q}</span>
        </div>
        <span style={{ fontSize: 20, color: open ? T.goldDark : T.inkMuted, flexShrink: 0, fontWeight: 300, marginTop: 18, lineHeight: 1 }}>
          {open ? '−' : '+'}
        </span>
      </button>
      {open && (
        <div style={{ paddingBottom: 18, fontFamily: "'Lora', Georgia, serif", fontSize: 14.5, color: T.inkSoft, lineHeight: 1.8 }}>
          {item.a}
        </div>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function HelpPage({ onClose, onOpenTour }) {
  const [activeId, setActiveId] = useState('start');
  const [searchQuery, setSearchQuery] = useState('');
  const [isWide, setIsWide] = useState(() => window.innerWidth >= 800);

  useEffect(() => {
    const handle = () => setIsWide(window.innerWidth >= 800);
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

  const query = searchQuery.trim().toLowerCase();
  const allItems = SECTIONS.flatMap((s) =>
    s.items.map((item) => ({ ...item, sectionTitle: s.title, SectionIcon: s.Icon }))
  );
  const searchResults = query.length >= 2
    ? allItems.filter((item) => item.q.toLowerCase().includes(query) || item.a.toLowerCase().includes(query))
    : null;

  const activeSection = SECTIONS.find((s) => s.id === activeId);

  return (
    <div className="scene" style={{ minHeight: '100vh', background: T.cream }}>

      {/* ── Walnut header ─────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'linear-gradient(180deg, #2a1a14 0%, #1f1410 100%)',
        borderBottom: '1px solid #3a261d',
        boxShadow: '0 4px 14px rgba(20,10,6,0.35), inset 0 -1px 0 rgba(184,115,58,0.18)',
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}><div style={{ height: 56, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={onClose}
          style={{
            background: 'transparent', border: 'none', color: '#e8b563',
            fontSize: 20, cursor: 'pointer', width: 36, height: 36, borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s', outline: 'none', flexShrink: 0,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(232,181,99,0.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          aria-label="Back"
        >←</button>

        {/* Search inside header */}
        <div style={{ flex: 1, position: 'relative', maxWidth: 480, margin: '0 auto' }}>
          <Search size={14} style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            color: 'rgba(232,181,99,0.55)', pointerEvents: 'none',
          }} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search help topics…"
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '8px 32px 8px 34px',
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(232,181,99,0.22)',
              borderRadius: 8,
              fontFamily: 'inherit', fontSize: 13.5,
              color: '#f4e9d4', outline: 'none',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'rgba(232,181,99,0.55)')}
            onBlur={(e) => (e.target.style.borderColor = 'rgba(232,181,99,0.22)')}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(244,233,212,0.5)', fontSize: 15, lineHeight: 1, padding: 2,
              }}
            >×</button>
          )}
        </div>
        <div style={{ width: 36, flexShrink: 0 }} aria-hidden="true" />
      </div></div>

      {/* ── Body ──────────────────────────────────────────────────── */}
      {isWide ? (
        /* ── Desktop: two-column ──────────────────────────────────── */
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', minHeight: 'calc(100vh - 56px)' }}>

          {/* Left nav */}
          <nav style={{
            width: 220, flexShrink: 0, padding: '28px 0',
            borderRight: `1px solid ${T.line}`,
            background: T.white,
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: T.inkMuted,
              padding: '0 20px', marginBottom: 10,
            }}>Topics</div>
            {SECTIONS.map((s) => {
              const Icon = s.Icon;
              const active = s.id === activeId && !searchResults;
              return (
                <button
                  key={s.id}
                  onClick={() => { setActiveId(s.id); setSearchQuery(''); }}
                  style={{
                    width: '100%', textAlign: 'left', border: 'none',
                    padding: '9px 20px', cursor: 'pointer', outline: 'none',
                    display: 'flex', alignItems: 'center', gap: 10,
                    borderLeft: `3px solid ${active ? '#B8733A' : 'transparent'}`,
                    background: active ? 'rgba(184,115,58,0.06)' : 'transparent',
                    color: active ? '#8a5a20' : T.inkSoft,
                    fontWeight: active ? 600 : 400,
                    fontSize: 13.5,
                    transition: 'all 0.12s',
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(44,24,16,0.03)'; }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                >
                  <Icon size={14} strokeWidth={active ? 2 : 1.75} style={{ flexShrink: 0, opacity: active ? 1 : 0.6 }} />
                  {s.title}
                </button>
              );
            })}

            {/* Footer help link */}
            <div style={{
              marginTop: 32, padding: '16px 20px',
              borderTop: `1px solid ${T.line}`,
            }}>
              {onOpenTour && (
                <button
                  onClick={onOpenTour}
                  style={{
                    width: '100%', marginBottom: 14,
                    background: 'rgba(184,115,58,0.08)',
                    border: '1px solid rgba(184,115,58,0.25)',
                    borderRadius: 10, padding: '9px 12px',
                    fontSize: 12.5, fontWeight: 600,
                    color: '#8a5a20', cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(184,115,58,0.14)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(184,115,58,0.08)')}
                >
                  ✦ Take the tour again
                </button>
              )}
              <div style={{ fontSize: 12, color: T.inkMuted, lineHeight: 1.6 }}>
                Still need help?
              </div>
              <a
                href="mailto:support@theway.app"
                style={{ fontSize: 12.5, color: '#B8733A', fontWeight: 600, textDecoration: 'none' }}
              >
                support@theway.app
              </a>
            </div>
          </nav>

          {/* Right content */}
          <div style={{ flex: 1, padding: '36px 48px', minWidth: 0, background: T.cream }}>
            {searchResults !== null ? (
              /* Search results */
              <>
                <div style={{ marginBottom: 28 }}>
                  <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 22, fontWeight: 600, color: T.ink, margin: '0 0 4px' }}>
                    Search results
                  </h2>
                  <p style={{ fontSize: 13, color: T.inkMuted, margin: 0 }}>
                    {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
                  </p>
                </div>
                {searchResults.length === 0 ? (
                  <div style={{ padding: '40px 0', textAlign: 'center', color: T.inkMuted }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>🤔</div>
                    <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 17, color: T.ink, marginBottom: 6 }}>No results found</div>
                    <div style={{ fontSize: 13.5 }}>Try a different search, or tap ✦ Ask for a live answer.</div>
                  </div>
                ) : searchResults.map((item, i) => (
                  <SearchResultRow key={i} item={item} />
                ))}
              </>
            ) : activeSection ? (
              /* Section content */
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
                  <activeSection.Icon size={22} strokeWidth={1.5} color="#B8733A" />
                  <h2 style={{
                    fontFamily: "'Fraunces', Georgia, serif",
                    fontSize: 24, fontWeight: 600, color: T.ink, margin: 0, letterSpacing: '-0.02em',
                  }}>{activeSection.title}</h2>
                </div>
                {activeSection.items.map((item, i) => (
                  <QuestionRow key={i} q={item.q} a={item.a} />
                ))}
              </>
            ) : null}
          </div>
        </div>
      ) : (
        /* ── Mobile: stacked sections ─────────────────────────────── */
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '16px 14px 80px' }}>
          {onOpenTour && !searchResults && (
            <button
              onClick={onOpenTour}
              style={{
                width: '100%', marginBottom: 14,
                background: 'rgba(184,115,58,0.07)',
                border: '1px solid rgba(184,115,58,0.22)',
                borderRadius: 12, padding: '12px 16px',
                fontSize: 14, fontWeight: 600,
                color: '#8a5a20', cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              ✦ Take the feature tour
            </button>
          )}
          {searchResults !== null ? (
            <>
              {searchResults.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 20px', color: T.inkMuted }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>🤔</div>
                  <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 16, color: T.ink, marginBottom: 6 }}>No results found</div>
                  <div style={{ fontSize: 13.5 }}>Try a different search or tap ✦ Ask.</div>
                </div>
              ) : searchResults.map((item, i) => <SearchResultRow key={i} item={item} />)}
            </>
          ) : (
            SECTIONS.map((s) => <MobileSection key={s.id} section={s} />)
          )}
        </div>
      )}
    </div>
  );
}

function MobileSection({ section }) {
  const [open, setOpen] = useState(false);
  const Icon = section.Icon;
  return (
    <div style={{
      background: T.white, border: `1px solid ${T.line}`,
      borderRadius: 12, marginBottom: 8, overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%', textAlign: 'left', background: 'none', border: 'none',
          padding: '14px 16px', cursor: 'pointer', outline: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon size={15} strokeWidth={1.75} color={open ? '#B8733A' : T.inkSoft} style={{ flexShrink: 0 }} />
          <span style={{
            fontFamily: "'Fraunces', Georgia, serif",
            fontSize: 15, fontWeight: 600,
            color: open ? T.ink : T.inkSoft,
          }}>{section.title}</span>
        </div>
        <span style={{ fontSize: 18, color: open ? '#B8733A' : T.inkMuted, fontWeight: 300, lineHeight: 1 }}>
          {open ? '−' : '+'}
        </span>
      </button>
      {open && (
        <div style={{ padding: '0 16px', borderTop: `1px solid ${T.line}` }}>
          {section.items.map((item, i) => <QuestionRow key={i} q={item.q} a={item.a} />)}
        </div>
      )}
    </div>
  );
}
