import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase.js';
import { T } from './theme.js';
import SponsoredCard from './SponsoredCard.jsx';
import { ArrowLeft, Plus, Pencil, Trash2, X, RefreshCw } from 'lucide-react';
import { KinwoveStar } from './components/brand/KinwoveStar.jsx';

// ── Bar chart with value labels ───────────────────────────────────────────────
function BarChart({ data = [], color = T.gold, labelKey = 'week' }) {
  if (!data.length) return <EmptyNote>No data yet — will populate as the platform grows.</EmptyNote>;
  const counts = data.map((d) => Number(d.count ?? 0));
  const max = Math.max(...counts, 1);
  const total = counts.reduce((s, v) => s + v, 0);
  // Y-axis: pick 4 nice round ticks
  const rawStep = max / 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep || 1)));
  const step = Math.ceil(rawStep / magnitude) * magnitude || 1;
  const yMax = step * 4;
  const ticks = [step * 3, step * 2, step, 0];

  // Format x-axis label: "2026-05-12" → "May 12"
  function fmtLabel(raw) {
    if (!raw) return '';
    try {
      const d = new Date(raw + 'T00:00:00Z');
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    } catch { return raw.slice(5); }
  }

  const CHART_H = 140;
  const BAR_AREA = 100; // px available for bars (leaves room for value label above)

  return (
    <div>
      {/* Total */}
      <div style={{ fontSize: 11, color: T.inkMuted, marginBottom: 6, textAlign: 'right' }}>
        Total: <strong style={{ color: T.ink }}>{total.toLocaleString()}</strong>
      </div>
      <div style={{ display: 'flex', gap: 0 }}>
        {/* Y-axis */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end', paddingRight: 6, height: CHART_H, flexShrink: 0 }}>
          {ticks.map((t) => (
            <div key={t} style={{ fontSize: 9, color: T.inkMuted, lineHeight: 1 }}>
              {t >= 1000 ? `${(t / 1000).toFixed(1)}k` : t}
            </div>
          ))}
        </div>
        {/* Chart area */}
        <div style={{ flex: 1, position: 'relative' }}>
          {/* Grid lines */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none' }}>
            {ticks.map((t) => (
              <div key={t} style={{ borderTop: `1px dashed rgba(26,17,8,0.08)`, width: '100%' }} />
            ))}
          </div>
          {/* Bars */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: CHART_H, padding: '0 2px', position: 'relative' }}>
            {data.map((d, i) => {
              const val = Number(d.count ?? 0);
              const barH = Math.max((val / yMax) * BAR_AREA, val > 0 ? 3 : 0);
              return (
                <div key={i} title={`${d[labelKey] ?? ''}: ${val.toLocaleString()}`}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                  {val > 0 && (
                    <div style={{ fontSize: 9, color: color, fontWeight: 700, marginBottom: 2, lineHeight: 1 }}>
                      {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                    </div>
                  )}
                  <div style={{ width: '100%', background: color, borderRadius: '3px 3px 0 0', height: barH }} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {/* X-axis labels */}
      <div style={{ display: 'flex', gap: 3, paddingLeft: 28, marginTop: 5 }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, fontSize: 8.5, color: T.inkMuted, textAlign: 'center', lineHeight: 1.2, overflow: 'hidden' }}>
            {fmtLabel(d[labelKey])}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Horizontal bar ────────────────────────────────────────────────────────────
function HorizBar({ label, count, pct, color = T.gold }) {
  return (
    <div style={{ marginBottom: 11 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
        <span style={{ fontWeight: 600, color: T.ink }}>{label}</span>
        <span style={{ color: T.inkMuted }}>{Number(count ?? 0).toLocaleString()} · {pct ?? 0}%</span>
      </div>
      <div style={{ background: T.parchment, borderRadius: 999, height: 7, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(pct ?? 0, 100)}%`, height: '100%', background: color, borderRadius: 999, transition: 'width 0.4s' }} />
      </div>
    </div>
  );
}

// ── Big stat card ─────────────────────────────────────────────────────────────
function StatCard({ label, value, weekDelta, color, sub }) {
  return (
    <div style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 14, padding: '18px 20px' }}>
      <div style={{ fontSize: 30, fontWeight: 700, color: color ?? T.ink, fontFamily: T.display, letterSpacing: '-0.02em', lineHeight: 1 }}>
        {value != null ? (typeof value === 'string' ? value : Number(value).toLocaleString()) : '—'}
      </div>
      <div style={{ fontSize: 13, color: T.inkSoft, marginTop: 5 }}>{label}</div>
      {weekDelta != null && Number(weekDelta) > 0 && (
        <div style={{ fontSize: 12, color: '#2e7a48', marginTop: 4 }}>↑ {Number(weekDelta).toLocaleString()} this week</div>
      )}
      {sub && <div style={{ fontSize: 11, color: T.inkMuted, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

// ── Ratio card ────────────────────────────────────────────────────────────────
function RatioCard({ label, value, note, color }) {
  return (
    <div style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 14, padding: '16px 18px' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: color ?? T.ink, fontFamily: T.display, letterSpacing: '-0.02em' }}>{value ?? '—'}</div>
      <div style={{ fontSize: 12, color: T.inkSoft, marginTop: 4 }}>{label}</div>
      {note && <div style={{ fontSize: 11, color: T.inkMuted, marginTop: 2 }}>{note}</div>}
    </div>
  );
}

// ── Alert card ────────────────────────────────────────────────────────────────
function AlertCard({ children, level = 'warn' }) {
  const bg   = level === 'error' ? 'rgba(165,63,43,0.07)' : 'rgba(232,115,26,0.07)';
  const bdr  = level === 'error' ? 'rgba(165,63,43,0.25)' : 'rgba(232,115,26,0.3)';
  const col  = level === 'error' ? '#a53f2b' : '#c06010';
  return (
    <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 12, padding: '12px 16px', fontSize: 13, color: col, marginBottom: 10 }}>
      {children}
    </div>
  );
}

// ── Section title ─────────────────────────────────────────────────────────────
function SectionTitle({ children, style }) {
  return (
    <div style={{ fontSize: 11, letterSpacing: '0.10em', textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 14, ...style }}>
      {children}
    </div>
  );
}

function Card({ label, children }) {
  return (
    <div style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 14, padding: '16px 18px' }}>
      <div style={{ fontSize: 12, color: T.inkMuted, fontWeight: 600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      {children}
    </div>
  );
}

function EmptyNote({ children }) {
  return (
    <div style={{ color: T.inkMuted, fontStyle: 'italic', fontSize: 14, padding: '16px 0', fontFamily: T.serif }}>{children}</div>
  );
}

// ── Insight card ─────────────────────────────────────────────────────────────
function InsightCard({ type, msg }) {
  const cfg = {
    win:  { bg: 'rgba(46,122,72,0.07)',   border: 'rgba(46,122,72,0.22)',   color: '#2e7a48', prefix: '↑ ' },
    warn: { bg: 'rgba(232,115,26,0.07)',  border: 'rgba(232,115,26,0.25)',  color: '#c06010', prefix: '⚠ ' },
    tip:  { bg: 'rgba(184,115,58,0.06)',  border: 'rgba(184,115,58,0.18)',  color: T.goldDark, prefix: '→ ' },
  }[type] ?? { bg: T.parchment, border: T.line, color: T.inkSoft, prefix: '· ' };
  return (
    <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 10, padding: '11px 14px', marginBottom: 8, fontSize: 13, color: T.ink, lineHeight: 1.6 }}>
      <span style={{ color: cfg.color, fontWeight: 700 }}>{cfg.prefix}</span>{msg}
    </div>
  );
}

// ── Insights engine ───────────────────────────────────────────────────────────
function getInsights(tab, s, dash) {
  const add = (type, msg) => ({ type, msg });
  const out = [];
  const n = (v) => Number(v ?? 0);

  if (tab === 'overview') {
    const act = n(s.activation_rate);
    const users = n(s.total_users);
    const dead = n(s.dead_accounts);
    const wau = n(s.weekly_active_users);
    const follows = n(s.avg_follows);
    const wauPct = users > 0 ? Math.round(wau / users * 100) : 0;

    if (act < 40 && users > 1)
      out.push(add('warn', `${act}% of users have never touched the Ask tab — and Ask is your entire product. The fix isn't a nudge, it's the first screen: replace the empty state with a pre-filled question like "What does the Bible say about anxiety?" and a glowing Send button. Make the first hit instant. They won't come back to explore; they'll come back to feel what they felt the first time.`));
    else if (act >= 80)
      out.push(add('win', `${act}% activation — that's exceptional. Most faith apps lose 70% of new users before they ever engage with the core feature. You haven't. Now the job is keeping them. One habit-forming moment per week (a daily question, a weekly reflection prompt) will compound this into long-term retention.`));
    else if (act >= 50)
      out.push(add('tip', `${act}% activation is above average but there's real money left in closing the gap. The other ${100 - act}% signed up and never asked a question. Add 3 pre-written starter questions on the Ask screen — something faith-specific like "I have doubts, is that normal?", "What does the Bible actually say about hell?", "How do I pray when I don't believe it's working?" Removing the blank-page problem converts browsers into users.`));

    if (wauPct < 20 && users > 3)
      out.push(add('warn', `Only ${wauPct}% of users came back this week. Every dollar you spend on acquisition before fixing this is wasted — you're filling a bucket with a hole in it. Interview 3 users who signed up and went quiet. Their reason is worth more than any analytics dashboard.`));
    else if (wauPct >= 50)
      out.push(add('win', `${wauPct}% of your users came back this week. YouVersion, the most downloaded Bible app ever, built its retention on daily streaks and push notifications — and you're hitting comparable weekly numbers without any of that machinery. This metric is your pitch to pastors. Lead with it.`));

    if (dead > 2)
      out.push(add('tip', `${dead} users signed up and went completely silent. Send one personal email — not a template, a 3-sentence note from you: what kinwove is for, one question to try, and your direct reply address. Founders emailing personally is the one thing no big competitor can copy. Even a 10% re-activation rate on dead accounts is free growth.`));

    if (follows < 1.5 && users > 3)
      out.push(add('tip', `Avg ${follows} follows per user — your social graph is empty, and an empty social graph means no reason to come back tomorrow. Christians cluster by church and tradition. After someone's first AI answer, surface: "Here are 3 people from your tradition who are active on kinwove." That one prompt seeds the graph. Community is the moat — AI is the entry point.`));

    if (n(s.total_shared) > 10)
      out.push(add('win', `${n(s.total_shared)} conversations shared publicly — those links are your best acquisition asset and they cost nothing. Find the 5 most-shared threads. Screenshot them. Post them on Instagram Reels and TikTok with the caption: "Real questions people are asking God right now." No logo needed. Let the rawness of the questions do the work.`));
  }

  if (tab === 'ai') {
    const hits = n(s.cache_hits);
    const total = n(s.total_ai_events);
    const hitRate = total > 0 ? Math.round(hits / total * 100) : 0;
    const avgTurns = n(s.avg_ai_turns);
    const topics = dash?.topics ?? [];
    const topTopic = topics[0];

    if (hitRate < 15 && total > 30)
      out.push(add('tip', `Cache rate is ${hitRate}% — low but expected at this scale. Cache hit rate is a density metric: it rises naturally as user volume grows and questions repeat. At 500+ monthly active users you'll start seeing 25–35%. Nothing to optimize here yet; keep growing.`));
    else if (hitRate >= 35)
      out.push(add('win', `${hitRate}% cache hit rate means more than 1 in 3 questions is answered instantly for free. Export the top 20 cached questions — those are the exact topics your audience cares most about. Turn each into a YouTube Short titled exactly as the question. Christians searching "what does the Bible say about [topic]" will land on you organically.`));

    if (avgTurns < 1.8 && total > 20)
      out.push(add('warn', `Avg ${avgTurns} turns per conversation — users ask one thing, get an answer, and leave. That's a missed retention moment. The AI response itself should open a door, not close one. End every answer with a natural follow-up: "Want to go deeper on this?" or "There's a related passage that changes how most people read this — want to see it?" Curiosity is the retention engine.`));
    else if (avgTurns >= 3)
      out.push(add('win', `Avg ${avgTurns} turns per session — users are having real conversations, not just running searches. This is rare and it's your product's secret weapon. Grab 3 of the longest threads (with permission) and turn them into blog posts. Format: "Here's a 40-minute conversation one kinwove user had about [doubt / grief / forgiveness]." That kind of content ranks and converts.`));

    if (topTopic)
      out.push(add('tip', `"${topTopic.topic_slug}" is your most-asked topic with ${topTopic.count} questions. Go to r/Christianity, r/Reformed, or r/TrueChristian right now and find the top post on that topic. Answer it thoroughly — no promotion, just genuine insight. Put "founder of kinwove" in your username flair. The curious will find their way to you. This is the cheapest distribution channel that exists.`));
  }

  if (tab === 'geo') {
    const countries = (s.country_dist ?? []);
    if (countries.length === 0)
      out.push(add('tip', `No church location data yet. Pastors are your distribution channel — one pastor with 400 congregants is worth 400 individual signups and they onboard as a group. Find 3 pastors in your city on Instagram, engage their content genuinely for 2 weeks, then DM. Don't lead with the product. Lead with a real question about their church.`));
    else if (countries.length === 1)
      out.push(add('tip', `All your churches are in ${countries[0]?.country}. Before expanding internationally, go deeper at home — there are thousands of untouched churches in your own country. Target denominational Facebook groups (Baptist, Anglican, Pentecostal, etc.). Each denomination is a pre-built distribution network with shared language and trust. One post in the right group can unlock dozens of pastors.`));
    else
      out.push(add('tip', `You're in ${countries.length} countries. Resist the urge to spread marketing effort across all of them. Pick your single strongest market and go deep — host a free online event for pastors there, get 3 testimonials, build a case study. One country with 30 engaged churches is worth more than 5 countries with 2 each. Depth creates word-of-mouth; breadth creates silence.`));
  }

  if (tab === 'churches') {
    const zombies = n(s.zombie_churches);
    const total = n(s.total_churches);
    const pending = dash?.pendingApps?.length ?? 0;

    if (zombies > 0)
      out.push(add('warn', `${zombies} church${zombies > 1 ? 'es' : ''} registered with zero members. Email those pastors directly — subject line: "Quick question about your kinwove page." One sentence in the body offering to jump on a 10-minute call to walk them through the member invite flow. Pastors are busy and they respond to personal, not automated. Getting one zombie church active is worth more than signing up three new ones.`));
    if (total === 1)
      out.push(add('tip', `One church on the platform. Make that pastor a case study. Ask them for a 2-minute video — what they use kinwove for, what their congregation thinks. That testimonial is your entire pitch to the next 20 pastors. One happy pastor telling another pastor is worth 10,000 impressions of any ad you could run.`));
    if (pending > 0)
      out.push(add('warn', `${pending} pastor application${pending > 1 ? 's' : ''} waiting for review. Same-day approval is a real competitive advantage — most church software treats pastors like IT support tickets. Be the product that responded in hours. They'll remember that when they're recommending tools to other pastors in their network.`));
    if (total >= 5 && zombies === 0)
      out.push(add('win', `${total} active churches with no dead weight — clean, healthy growth. The next unlock is denominational networks. One email to a regional director or association leader can put you in front of 20–50 pastors at once. Ask your existing pastors which network or association they belong to — that's your warm introduction.`));
  }

  if (tab === 'content') {
    const shared = n(s.total_shared);
    const topQ = dash?.topQuestions?.[0];

    if (topQ)
      out.push(add('tip', `"${topQ.question_raw?.slice(0, 70)}…" has been asked ${topQ.hit_count}× by real users. That's not a content idea — that's confirmed demand. Post it as a Twitter/X thread, an Instagram carousel, and a YouTube Short this week. Same content, 3 formats, 3 hours of work. Title it exactly as the question — that's the search term. Your most-asked questions are your SEO strategy.`));
    if (shared > 5)
      out.push(add('win', `${shared} conversations shared publicly — those are ${shared} landing pages you didn't have to build, each one showing exactly what kinwove does in the most compelling way possible. Make sure every shared link loads fast, looks beautiful, and has a single prominent CTA: "Start your own conversation." That page is your best ad.`));
    if (shared === 0)
      out.push(add('tip', `Nobody has shared a conversation yet. The share moment needs to happen right after the AI finishes responding — that's the peak of satisfaction. Add a one-tap share prompt there: "Know someone wrestling with this question?" Don't bury it in a menu. The moment passes fast.`));
  }

  if (tab === 'operations') {
    const reports = dash?.userReports?.length ?? 0;
    const feedback = dash?.recentFeedback?.length ?? 0;
    if (reports > 0)
      out.push(add('warn', `${reports} open report${reports > 1 ? 's' : ''} in the queue. Reply to every single one personally within 24 hours — a founder reply turns a frustrated user into a loyal one. They'll screenshot it. They'll tell people. At this stage of the company, support isn't a cost center, it's your retention strategy and your PR.`));
    if (feedback > 3)
      out.push(add('warn', `${feedback} AI responses flagged as unhelpful. Don't fix the prompt blindly — read every flagged response first and look for the pattern. It's almost always one or two question types the system prompt doesn't handle well (doubt, grief, denominational edge cases). Fix those specifically in src/prompts.js rather than making the whole prompt more cautious.`));
    if (reports === 0 && feedback === 0)
      out.push(add('win', `No open reports, no AI flags. Either the product is working well or users haven't found the report button — worth checking engagement on the ⋮ menu. As usage grows, add a low-friction feedback prompt directly inside the AI conversation: a single thumbs-down tap after each response captures signal before users think to leave.`));
  }

  return out;
}

// ── Category badge ────────────────────────────────────────────────────────────
const REPORT_BADGE = {
  bug:        { label: 'Bug',          bg: 'rgba(165,63,43,0.10)', color: '#a53f2b' },
  ai:         { label: 'Wrong AI',     bg: 'rgba(232,115,26,0.10)', color: '#c06010' },
  complaint:  { label: 'Complaint',    bg: 'rgba(180,100,60,0.10)', color: '#7a4020' },
  suggestion: { label: 'Suggestion',  bg: 'rgba(46,122,72,0.10)', color: '#2e7a48' },
  other:      { label: 'Other',        bg: T.parchment, color: T.inkSoft },
};

// ── Label maps ────────────────────────────────────────────────────────────────
const TOPIC_LABELS = {
  prayer: 'Prayer', salvation: 'Salvation', jesus: 'Jesus Christ',
  bible: 'Bible', church: 'Church', 'faith-doubt': 'Faith & Doubt',
  grace: 'Grace', relationships: 'Relationships', 'eternal-life': 'Eternal Life',
  'holy-spirit': 'Holy Spirit', suffering: 'Suffering & Evil', creation: 'Creation',
  'end-times': 'End Times', 'mental-health': 'Mental Health', purpose: 'Purpose',
  money: 'Money & Giving', sacraments: 'Sacraments', scripture: 'Scripture',
};

const MODEL_LABELS = {
  'claude-opus-4-7': 'Opus (premium+)',
  'claude-sonnet-4-6': 'Sonnet (premium)',
  'claude-haiku-4-5-20251001': 'Haiku (free)',
  'claude-haiku-4-5': 'Haiku (free)',
  cache: 'Answered from cache',
};

const PERSON_LABELS = {
  believer: 'Believer', skeptic: 'Skeptic', seeker: 'Seeker',
  'new-faith': 'New to faith', deeper: 'Going deeper', guided: 'Guided journey',
  kids: 'For kids', relationships: 'Relationships', 'inter-faith': 'Inter-faith',
};

const TABS = [
  { id: 'overview',    label: 'Overview' },
  { id: 'ai',         label: 'AI & Topics' },
  { id: 'geo',        label: 'Geography' },
  { id: 'churches',   label: 'Churches' },
  { id: 'users',      label: 'Users' },
  { id: 'content',    label: 'Content' },
  { id: 'operations', label: 'Operations' },
  { id: 'sponsors',   label: 'Sponsors' },
  { id: 'voice',      label: '✦ Posts' },
];

const COMPABLE_PLANS = ['free', 'premium', 'premium_plus'];

// ── Users tab — search, comp a plan, suspend ─────────────────────────────────
function UsersPanel() {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState(null); // null = idle
  const [busy, setBusy]       = useState(null); // uid while acting
  const [searching, setSearching] = useState(false);

  async function runSearch() {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const r = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const json = await r.json();
      setResults(json.users ?? []);
    } catch { setResults([]); }
    setSearching(false);
  }

  async function act(uid, path, body, patch) {
    setBusy(uid);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const r = await fetch(`/api/admin/users/${uid}/${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (r.ok) setResults((rs) => rs.map((u) => u.id === uid ? { ...u, ...patch } : u));
    } finally { setBusy(null); }
  }

  const isBanned = (u) => u.banned_until && new Date(u.banned_until) > new Date();

  return (
    <div>
      <SectionTitle>Users</SectionTitle>
      <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 14 }}>
        Search by name. Comp a plan for friends and partners; suspend blocks sign-in entirely (existing sessions lapse within the hour).
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runSearch()}
          placeholder="Search users by name…"
          style={{ flex: 1, padding: '11px 14px', borderRadius: 10, border: `1px solid ${T.line}`, fontSize: 14, background: T.white, color: T.ink, outline: 'none' }}
        />
        <button onClick={runSearch} disabled={searching} style={{ background: T.ink, color: T.cream, border: 'none', borderRadius: 10, padding: '11px 20px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', opacity: searching ? 0.6 : 1 }}>
          {searching ? '…' : 'Search'}
        </button>
      </div>
      {results !== null && results.length === 0 && <EmptyNote>No users match "{query}".</EmptyNote>}
      {(results ?? []).map((u) => (
        <div key={u.id} style={{ background: T.white, border: `1px solid ${isBanned(u) ? 'rgba(165,63,43,0.4)' : T.line}`, borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>{u.display_name ?? 'No name'}</span>
            {u.is_pastor && <span style={{ fontSize: 10.5, fontWeight: 700, background: 'rgba(184,115,58,0.12)', color: T.goldDark, borderRadius: 999, padding: '2px 8px' }}>PASTOR</span>}
            {isBanned(u) && <span style={{ fontSize: 10.5, fontWeight: 700, background: 'rgba(165,63,43,0.12)', color: '#a53f2b', borderRadius: 999, padding: '2px 8px' }}>SUSPENDED</span>}
            <span style={{ marginLeft: 'auto', fontSize: 11.5, color: T.inkMuted }}>
              joined {u.created_at ? new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
            </span>
          </div>
          <div style={{ fontSize: 12.5, color: T.inkSoft, marginBottom: 10 }}>{u.email ?? 'email unavailable'}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <select
              value={u.plan ?? 'free'}
              onChange={(e) => act(u.id, 'plan', { plan: e.target.value }, { plan: e.target.value })}
              disabled={busy === u.id}
              style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${T.line}`, fontSize: 12.5, background: T.parchment, color: T.ink }}
            >
              {COMPABLE_PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <button
              onClick={() => {
                const banned = !isBanned(u);
                if (banned && !window.confirm(`Suspend ${u.display_name ?? 'this user'}? They won't be able to sign in until unsuspended.`)) return;
                act(u.id, 'ban', { banned }, { banned_until: banned ? new Date(Date.now() + 3.15e12).toISOString() : null });
              }}
              disabled={busy === u.id}
              style={{ background: isBanned(u) ? 'rgba(46,122,72,0.1)' : 'rgba(165,63,43,0.1)', color: isBanned(u) ? '#2e7a48' : '#a53f2b', border: `1px solid ${isBanned(u) ? 'rgba(46,122,72,0.25)' : 'rgba(165,63,43,0.25)'}`, borderRadius: 999, padding: '7px 16px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', opacity: busy === u.id ? 0.5 : 1 }}
            >
              {busy === u.id ? '…' : isBanned(u) ? 'Unsuspend' : 'Suspend'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

const EMPTY_FORM = {
  sponsor_name: '', title: '', body: '', cta_text: '', cta_url: '',
  emoji: '✦', is_active: false, sort_order: 0,
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function AdminPage({ onBack }) {
  const [tab, setTab] = useState('overview');
  const [verifyBusy, setVerifyBusy] = useState(null);
  const [approveBusy, setApproveBusy] = useState(null);
  const [reportBusy, setReportBusy] = useState(null);

  const [dash, setDash] = useState(null);
  const [dashLoading, setDashLoading] = useState(true);
  const [dashError, setDashError] = useState(null);

  const [sponsors, setSponsors] = useState([]);
  const [sponsorsLoading, setSponsorsLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [sponsorError, setSponsorError] = useState(null);

  const [voicePosts, setVoicePosts] = useState([]);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceDraft, setVoiceDraft] = useState('');
  const [voicePosting, setVoicePosting] = useState(false);
  const [voiceError, setVoiceError] = useState(null);
  const [voiceSuccess, setVoiceSuccess] = useState(false);

  const fetchDashboard = useCallback(async () => {
    setDashLoading(true);
    setDashError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');
      const r = await fetch('/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.status === 403) throw new Error('Admin access required');
      if (!r.ok) throw new Error(`Server error ${r.status}`);
      setDash(await r.json());
    } catch (e) {
      setDashError(e.message ?? 'Load failed');
    } finally {
      setDashLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);
  useEffect(() => { if (tab === 'sponsors') loadSponsors(); }, [tab]);
  useEffect(() => { if (tab === 'voice') loadVoicePosts(); }, [tab]);

  async function loadVoicePosts() {
    setVoiceLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const r = await fetch('/api/admin/kinwove-posts', { headers: { Authorization: `Bearer ${token}` } });
      const data = await r.json();
      setVoicePosts(data.posts ?? []);
    } catch { setVoicePosts([]); }
    setVoiceLoading(false);
  }

  async function postAsKinwove() {
    if (!voiceDraft.trim() || voicePosting) return;
    setVoicePosting(true);
    setVoiceError(null);
    setVoiceSuccess(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const r = await fetch('/api/admin/kinwove-post', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: voiceDraft.trim() }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? 'Failed');
      setVoiceDraft('');
      setVoiceSuccess(true);
      setTimeout(() => setVoiceSuccess(false), 3000);
      loadVoicePosts();
    } catch (e) { setVoiceError(e.message); }
    setVoicePosting(false);
  }

  async function deleteVoicePost(id) {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    await fetch(`/api/admin/kinwove-post/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setVoicePosts((prev) => prev.filter((p) => p.id !== id));
  }

  // ── Church verify ───────────────────────────────────────────────────────────
  async function toggleChurchVerify(churchId, currentStatus) {
    setVerifyBusy(churchId);
    const newStatus = currentStatus === 'verified' ? 'self_reported' : 'verified';
    const { error } = await supabase.from('churches').update({ verification_status: newStatus }).eq('id', churchId);
    if (!error) {
      setDash((prev) => ({
        ...prev,
        stats: {
          ...prev.stats,
          top_churches: (prev.stats?.top_churches ?? []).map((c) =>
            c.id === churchId ? { ...c, status: newStatus } : c
          ),
        },
      }));
    }
    setVerifyBusy(null);
  }

  // ── Pastor app ──────────────────────────────────────────────────────────────
  async function handlePastorApp(appId, approve) {
    setApproveBusy(appId);
    const { error } = await supabase
      .from('pastor_applications')
      .update({ status: approve ? 'approved' : 'declined', reviewed_at: new Date().toISOString() })
      .eq('id', appId);
    if (!error) setDash((prev) => ({ ...prev, pendingApps: prev.pendingApps.filter((a) => a.id !== appId) }));
    setApproveBusy(null);
  }

  // ── Reports ─────────────────────────────────────────────────────────────────
  async function handleReport(reportId, status) {
    setReportBusy(reportId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const r = await fetch(`/api/admin/reports/${reportId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (r.ok) setDash((prev) => ({ ...prev, userReports: (prev.userReports ?? []).filter((rp) => rp.id !== reportId) }));
    } finally {
      setReportBusy(null);
    }
  }

  // Post reports (community content flagged by members)
  async function handlePostReport(reportId, action) {
    if (action === 'remove_post' && !window.confirm('Remove this post for everyone? This cannot be undone.')) return;
    setReportBusy(reportId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const r = await fetch(`/api/admin/post-reports/${reportId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (r.ok) {
        const { removedPostId } = await r.json().catch(() => ({}));
        setDash((prev) => ({
          ...prev,
          postReports: (prev.postReports ?? []).filter((rp) =>
            removedPostId ? rp.post_id !== removedPostId : rp.id !== reportId),
        }));
      }
    } finally {
      setReportBusy(null);
    }
  }

  // ── Sponsors ────────────────────────────────────────────────────────────────
  async function loadSponsors() {
    setSponsorsLoading(true);
    const { data } = await supabase.from('sponsored_posts').select('*')
      .order('sort_order', { ascending: true }).order('created_at', { ascending: false });
    setSponsors(data ?? []);
    setSponsorsLoading(false);
  }

  async function toggleActive(id, current) {
    await supabase.from('sponsored_posts').update({ is_active: !current }).eq('id', id);
    setSponsors((s) => s.map((x) => x.id === id ? { ...x, is_active: !current } : x));
  }

  async function deleteSponsor(id, name) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    await supabase.from('sponsored_posts').delete().eq('id', id);
    setSponsors((s) => s.filter((x) => x.id !== id));
  }

  async function saveSponsor() {
    if (!form.sponsor_name.trim()) return;
    setSaving(true); setSponsorError(null);
    try {
      if (editingId) {
        const { error: err } = await supabase.from('sponsored_posts').update(form).eq('id', editingId);
        if (err) throw err;
        setSponsors((s) => s.map((x) => x.id === editingId ? { ...x, ...form } : x));
      } else {
        const { data, error: err } = await supabase.from('sponsored_posts').insert(form).select().single();
        if (err) throw err;
        if (data) setSponsors((s) => [...s, data]);
      }
      closeForm();
    } catch (e) { setSponsorError(e.message ?? 'Something went wrong.'); }
    finally { setSaving(false); }
  }

  function openNew() { setForm(EMPTY_FORM); setEditingId(null); setSponsorError(null); setFormOpen(true); }
  function openEdit(sp) {
    setForm({ sponsor_name: sp.sponsor_name ?? '', title: sp.title ?? '', body: sp.body ?? '', cta_text: sp.cta_text ?? '', cta_url: sp.cta_url ?? '', emoji: sp.emoji ?? '✦', is_active: sp.is_active ?? false, sort_order: sp.sort_order ?? 0 });
    setEditingId(sp.id); setSponsorError(null); setFormOpen(true);
  }
  function closeForm() { setFormOpen(false); setEditingId(null); setForm(EMPTY_FORM); setSponsorError(null); }

  // ── Derived data ────────────────────────────────────────────────────────────
  const s = dash?.stats ?? {};

  const topics = (dash?.topics ?? []).map((t) => ({ ...t, count: Number(t.count ?? 0) }));
  const topicTotal = topics.reduce((sum, t) => sum + t.count, 0);
  const topicsWithPct = topics.map((t) => ({ ...t, pct: topicTotal > 0 ? Math.round((t.count / topicTotal) * 100) : 0 }));

  const modelDist = (s.model_dist ?? []).map((m) => ({ ...m, count: Number(m.count ?? 0) }));
  const modelTotal = modelDist.reduce((sum, m) => sum + m.count, 0);

  const personTypeDist = (s.person_type_dist ?? []).map((p) => ({ ...p, count: Number(p.count ?? 0) }));
  const personTotal = personTypeDist.reduce((sum, p) => sum + p.count, 0);

  const traditionDist = (s.tradition_dist ?? []).map((t) => ({ ...t, count: Number(t.count ?? 0) }));
  const traditionTotal = traditionDist.reduce((sum, t) => sum + t.count, 0);

  const countryDist = (s.country_dist ?? []).map((c) => ({ ...c, count: Number(c.count ?? 0) }));
  const countryTotal = countryDist.reduce((sum, c) => sum + c.count, 0);

  const topChurches = s.top_churches ?? [];
  const userSignupsWeekly = s.user_signups_weekly ?? [];
  const aiEventsWeekly = s.ai_events_weekly ?? [];

  const cacheHitRate = Number(s.total_ai_events) > 0
    ? Math.round((Number(s.cache_hits) / Number(s.total_ai_events)) * 100) : 0;

  const avgPostsPerUser = Number(s.total_users) > 0
    ? (Number(s.total_posts) / Number(s.total_users)).toFixed(1) : '—';

  const thumbsDownRate = Number(s.total_ai_events) > 0
    ? ((Number(s.thumbs_down_count ?? 0) / Number(s.total_ai_events)) * 100).toFixed(2) : '0';

  const hasAlerts = Number(s.dead_accounts) > 0 || Number(s.zombie_churches) > 0 || Number(s.pending_apps) > 0;
  const openReports = dash?.userReports ?? [];
  const openPostReports = dash?.postReports ?? [];
  const operationsBadge = (dash?.pendingApps?.length ?? 0) + (dash?.recentFeedback?.length ?? 0) + openReports.length + openPostReports.length;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: T.cream, fontFamily: T.sans, paddingBottom: 80 }}>

      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: T.white, borderBottom: `1px solid ${T.line}`, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.inkSoft, padding: 0, display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
          <ArrowLeft size={16} /> Back
        </button>
        <div style={{ flex: 1, fontFamily: T.display, fontSize: 18, fontWeight: 600, color: T.ink, letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 6 }}>
          <KinwoveStar size={16} style={{ flexShrink: 0 }} /> kinwove — Platform Admin
        </div>
        {tab !== 'sponsors' && (
          <button onClick={fetchDashboard} disabled={dashLoading} title="Refresh data"
            style={{ background: 'none', border: 'none', cursor: dashLoading ? 'default' : 'pointer', color: T.inkSoft, padding: 4, display: 'flex', opacity: dashLoading ? 0.4 : 1 }}>
            <RefreshCw size={16} style={{ animation: dashLoading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${T.line}`, background: T.white, paddingLeft: 4, overflowX: 'auto' }}>
        {TABS.map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '12px 14px', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
            color: tab === id ? T.goldDark : T.inkSoft,
            borderBottom: tab === id ? `2px solid ${T.goldDark}` : '2px solid transparent',
            marginBottom: -1,
          }}>
            {label}
            {id === 'operations' && operationsBadge > 0 && (
              <span style={{ marginLeft: 5, background: T.gold, color: '#fff', borderRadius: 999, fontSize: 10, padding: '1px 5px', fontWeight: 700 }}>
                {operationsBadge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={{ padding: '24px 20px', maxWidth: 820, margin: '0 auto' }}>

        {/* Loading / error */}
        {tab !== 'sponsors' && dashLoading && (
          <div style={{ color: T.inkMuted, textAlign: 'center', padding: 60, fontFamily: T.serif, fontStyle: 'italic' }}>Loading platform data…</div>
        )}
        {tab !== 'sponsors' && !dashLoading && dashError && (
          <div style={{ background: 'rgba(165,63,43,0.08)', border: `1px solid rgba(165,63,43,0.2)`, borderRadius: 12, padding: '16px 20px', color: '#a53f2b', fontSize: 14 }}>
            {dashError}
            <button onClick={fetchDashboard} style={{ marginLeft: 12, background: 'none', border: 'none', color: T.goldDark, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Retry</button>
          </div>
        )}

        {/* ── OVERVIEW ──────────────────────────────────────────────────────── */}
        {tab === 'overview' && !dashLoading && !dashError && dash && (
          <div>
            {getInsights('overview', s, dash).length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <SectionTitle>Insights</SectionTitle>
                {getInsights('overview', s, dash).map((ins, i) => <InsightCard key={i} {...ins} />)}
              </div>
            )}

            {/* Health alerts */}
            {hasAlerts && (
              <div style={{ marginBottom: 24 }}>
                <SectionTitle>Needs attention</SectionTitle>
                {Number(s.pending_apps) > 0 && (
                  <AlertCard level="warn">{Number(s.pending_apps)} pastor application{Number(s.pending_apps) > 1 ? 's' : ''} waiting for review → go to Churches tab</AlertCard>
                )}
                {Number(s.dead_accounts) > 0 && (
                  <AlertCard level="warn">{Number(s.dead_accounts)} user{Number(s.dead_accounts) > 1 ? 's' : ''} signed up but never posted or used AI — onboarding may need work</AlertCard>
                )}
                {Number(s.zombie_churches) > 0 && (
                  <AlertCard level="warn">{Number(s.zombie_churches)} church{Number(s.zombie_churches) > 1 ? 'es' : ''} registered with 0 members — pastor may have dropped off after sign-up</AlertCard>
                )}
              </div>
            )}

            <SectionTitle>Platform overview</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 32 }}>
              <StatCard label="Total users" value={s.total_users} weekDelta={s.new_users_week} />
              <StatCard label="Weekly active" value={s.weekly_active_users} sub="used AI last 7 days" />
              <StatCard label="Activation rate" value={`${s.activation_rate ?? 0}%`} color={Number(s.activation_rate) >= 60 ? '#2e7a48' : Number(s.activation_rate) >= 30 ? T.goldDark : '#a53f2b'} sub="ever used AI" />
              <StatCard label="AI conversations" value={s.first_turn_events} />
              <StatCard label="Verified churches" value={s.verified_churches} color={T.goldDark} />
              <StatCard label="Community posts" value={s.total_posts} sub={`${s.posts_this_week ?? 0} this week`} />
              <StatCard label="Prayers" value={s.total_prayers} sub={`${s.prayers_this_week ?? 0} this week`} />
              <StatCard label="Shared conversations" value={s.total_shared} />
            </div>

            {dash.bibleApi && (() => {
              const b = dash.bibleApi;
              const throttled = b.throttled > 0;
              return (
                <>
                  <SectionTitle style={{ marginTop: 8 }}>System · Bible API (api.bible)</SectionTitle>
                  <div style={{
                    border: `1px solid ${throttled ? '#a53f2b' : T.line}`,
                    background: throttled ? 'rgba(165,63,43,0.06)' : T.white,
                    borderRadius: 12, padding: '14px 16px', marginBottom: 32,
                    display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 2 }}>Status</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: throttled ? '#a53f2b' : '#2e7a48' }}>
                        {throttled ? '⚠ Being rate-limited' : '✓ Healthy'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 2 }}>Calls since {new Date(b.since).toLocaleDateString()}</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>
                        {Number(b.calls).toLocaleString()}
                        <span style={{ fontSize: 12, color: T.inkMuted, fontWeight: 400 }}> / ~{Number(b.monthlyLimit).toLocaleString()} per month</span>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 2 }}>Narration listens</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>
                        {Number(b.audioListens ?? 0).toLocaleString()}
                        <span style={{ fontSize: 12, color: T.inkMuted, fontWeight: 400 }}> — at 150 you get the "revisit paid audio" email</span>
                      </div>
                    </div>
                    {throttled && (
                      <div>
                        <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 2 }}>Throttle events</div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: '#a53f2b' }}>
                          {b.throttled}
                          <span style={{ fontSize: 12, fontWeight: 400 }}> · last {b.lastThrottleAt ? new Date(b.lastThrottleAt).toLocaleString() : '—'}</span>
                        </div>
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: T.inkMuted, flexBasis: '100%', lineHeight: 1.55 }}>
                      {throttled
                        ? 'You are hitting your api.bible plan limit — time to upgrade the tier. Bible text/audio may be failing for users right now.'
                        : 'Counter resets on each deploy; the authoritative monthly total is on your api.bible dashboard. If Status turns red, bump your api.bible plan.'}
                    </div>
                    <a href="https://app.api.bible/" target="_blank" rel="noopener noreferrer" style={{ flexBasis: '100%', fontSize: 12.5, fontWeight: 600, color: T.gold, textDecoration: 'none' }}>Open api.bible dashboard →</a>
                  </div>
                </>
              );
            })()}

            {dash.services && (() => {
              const sv = dash.services;
              const email = sv.email || {}, ai = sv.ai || {}, tts = sv.tts || {};
              const emailNear = (email.sentToday ?? 0) >= (email.dailyLimit ?? 100) * 0.8;
              const ttsFailing = (tts.failed ?? 0) > 0;
              const aiCost = ((ai.inTokens ?? 0) / 1e6) * 3 + ((ai.outTokens ?? 0) / 1e6) * 15; // Sonnet 4.6 est
              const cell = (label, value, color) => (
                <div key={label}>
                  <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: color || T.ink }}>{value}</div>
                </div>
              );
              const box = (danger, extra) => ({ border: `1px solid ${danger ? '#a53f2b' : T.line}`, background: danger ? 'rgba(165,63,43,0.06)' : T.white, borderRadius: 12, padding: '14px 16px', display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center', marginBottom: extra || 12 });
              const link = (href, label) => <div style={{ flexBasis: '100%' }}><a href={href} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, fontWeight: 600, color: T.gold, textDecoration: 'none' }}>{label}</a></div>;
              return (
                <>
                  <SectionTitle style={{ marginTop: 8 }}>System · Other services</SectionTitle>
                  <div style={box(emailNear)}>
                    {cell('Email (Resend)', emailNear ? '⚠ Near daily limit' : '✓ Healthy', emailNear ? '#a53f2b' : '#2e7a48')}
                    {cell('Sent today', `${(email.sentToday ?? 0).toLocaleString()} / ${email.dailyLimit ?? 100}`)}
                    {cell('This month', (email.sentMonth ?? 0).toLocaleString())}
                    {link('https://resend.com/emails', 'Open Resend dashboard →')}
                  </div>
                  <div style={box(false)}>
                    {cell('AI (Claude)', '✓ Running', '#2e7a48')}
                    {cell('Chat requests', (ai.calls ?? 0).toLocaleString())}
                    {cell('Tokens in / out', `${((ai.inTokens ?? 0) / 1000).toFixed(0)}k / ${((ai.outTokens ?? 0) / 1000).toFixed(0)}k`)}
                    {cell('Est. spend', `~$${aiCost.toFixed(2)}`, T.goldDark)}
                    <div style={{ flexBasis: '100%', fontSize: 11, color: T.inkMuted, lineHeight: 1.55 }}>
                      Since {ai.since ? new Date(ai.since).toLocaleDateString() : '—'} · resets on deploy · main chat surfaces only.{' '}
                      <a href="https://console.anthropic.com/settings/usage" target="_blank" rel="noopener noreferrer" style={{ color: T.gold, textDecoration: 'none' }}>Open Anthropic usage →</a>
                    </div>
                  </div>
                  <div style={box(ttsFailing, 32)}>
                    {cell('Voice (ElevenLabs)', ttsFailing ? '⚠ Failing (quota?)' : '✓ Healthy', ttsFailing ? '#a53f2b' : '#2e7a48')}
                    {cell('TTS requests', (tts.calls ?? 0).toLocaleString())}
                    {ttsFailing && cell('Failures', `${tts.failed} · last ${tts.lastFailAt ? new Date(tts.lastFailAt).toLocaleString() : '—'}`, '#a53f2b')}
                    {link('https://elevenlabs.io/app/usage', 'Open ElevenLabs usage →')}
                  </div>
                </>
              );
            })()}

            <SectionTitle style={{ marginTop: 8 }}>Growth (last 10 weeks)</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 32 }}>
              <Card label="New users / week">
                <BarChart data={userSignupsWeekly} color={T.gold} labelKey="week" />
                {userSignupsWeekly.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: T.inkMuted }}>
                    <span>{userSignupsWeekly[0]?.week?.slice(0, 7) ?? ''}</span>
                    <span>{userSignupsWeekly[userSignupsWeekly.length - 1]?.week?.slice(0, 7) ?? ''}</span>
                  </div>
                )}
              </Card>
              <Card label="AI conversations / week">
                <BarChart data={aiEventsWeekly} color="#8E5528" labelKey="week" />
                {aiEventsWeekly.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: T.inkMuted }}>
                    <span>{aiEventsWeekly[0]?.week?.slice(0, 7) ?? ''}</span>
                    <span>{aiEventsWeekly[aiEventsWeekly.length - 1]?.week?.slice(0, 7) ?? ''}</span>
                  </div>
                )}
              </Card>
            </div>

            <SectionTitle>Engagement & health</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
              <RatioCard label="Profile completion" value={`${s.profile_completion_rate ?? 0}%`} note="tradition + type set" />
              <RatioCard label="Avg AI turns" value={s.avg_ai_turns ?? '—'} note="turns per conversation" />
              <RatioCard label="Cache hit rate" value={`${cacheHitRate}%`} note="answers from cache" />
              <RatioCard label="Avg posts/user" value={avgPostsPerUser} note="across all members" />
              <RatioCard label="Avg follows/user" value={s.avg_follows ?? '—'} note="social graph density" />
              <RatioCard label="New users (30d)" value={Number(s.new_users_month ?? 0).toLocaleString()} note="joined last 30 days" />
              <RatioCard label="Total churches" value={Number(s.total_churches ?? 0).toLocaleString()} note={`${s.verified_churches ?? 0} verified`} />
              <RatioCard label="AI feedback (30d)" value={s.thumbs_down_count ?? 0} note="thumbs-down flags" color={Number(s.thumbs_down_count) > 5 ? '#a53f2b' : T.ink} />
            </div>
          </div>
        )}

        {/* ── AI & TOPICS ───────────────────────────────────────────────────── */}
        {tab === 'ai' && !dashLoading && !dashError && dash && (
          <div>
            {getInsights('ai', s, dash).length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <SectionTitle>Insights</SectionTitle>
                {getInsights('ai', s, dash).map((ins, i) => <InsightCard key={i} {...ins} />)}
              </div>
            )}
            {/* AI quality stats */}
            <SectionTitle>AI quality</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
              <RatioCard label="Total conversations" value={Number(s.first_turn_events ?? 0).toLocaleString()} note="unique first turns" />
              <RatioCard label="Total AI turns" value={Number(s.total_ai_events ?? 0).toLocaleString()} note="questions answered" />
              <RatioCard label="Avg turns / convo" value={s.avg_ai_turns ?? '—'} note="depth of engagement" />
              <RatioCard label="Thumbs-down rate" value={`${thumbsDownRate}%`} note="last 30 days" color={parseFloat(thumbsDownRate) > 2 ? '#a53f2b' : T.ink} />
            </div>

            {/* Cache efficiency + cost savings */}
            {(() => {
              const hits = Number(s.cache_hits ?? 0);
              const total = Number(s.total_ai_events ?? 0);
              const live = total - hits;
              const hitPct = total > 0 ? Math.round((hits / total) * 100) : 0;
              const livePct = 100 - hitPct;
              // Cost estimate: ~$0.004 per avoided call (Haiku pricing, typical kinwove prompt ~2500 tok in / 600 tok out)
              const COST_PER_CALL = 0.004;
              const saved = (hits * COST_PER_CALL).toFixed(2);
              return (
                <div style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 14, padding: '18px 20px', marginBottom: 32 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cache efficiency</div>
                    <div style={{ fontSize: 12, color: T.inkMuted }}>
                      Est. <strong style={{ color: '#2e7a48', fontSize: 14 }}>${saved} saved</strong> by reusing cached answers
                      <span style={{ fontSize: 10, color: T.inkMuted, marginLeft: 4 }}>~$0.004/call</span>
                    </div>
                  </div>

                  {/* Split bar */}
                  <div style={{ height: 28, borderRadius: 8, overflow: 'hidden', display: 'flex', marginBottom: 10 }}>
                    {hitPct > 0 && (
                      <div style={{ width: `${hitPct}%`, background: T.gold, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {hitPct >= 12 && <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{hitPct}%</span>}
                      </div>
                    )}
                    {livePct > 0 && (
                      <div style={{ width: `${livePct}%`, background: '#8E5528', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {livePct >= 12 && <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{livePct}%</span>}
                      </div>
                    )}
                  </div>

                  {/* Legend */}
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 3, background: T.gold, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: T.ink, fontFamily: T.display }}>{hits.toLocaleString()}</div>
                        <div style={{ fontSize: 11, color: T.inkMuted }}>Served from cache — no API call</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 3, background: '#8E5528', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: T.ink, fontFamily: T.display }}>{live.toLocaleString()}</div>
                        <div style={{ fontSize: 11, color: T.inkMuted }}>Sent to Claude — billed to Anthropic</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            <SectionTitle>What people are asking about</SectionTitle>
            <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 16 }}>
              Keyword-classified from first questions. No question content stored — just category counts. Use this for content marketing.
            </div>
            {topicsWithPct.length === 0
              ? <EmptyNote>No topic data yet — starts filling as conversations happen.</EmptyNote>
              : topicsWithPct.map((t) => (
                  <HorizBar key={t.topic_slug} label={TOPIC_LABELS[t.topic_slug] ?? t.topic_slug}
                    count={t.count} pct={t.pct} color={T.gold} />
                ))
            }

            <div style={{ height: 32 }} />
            <SectionTitle>AI model usage</SectionTitle>
            <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 16 }}>Which Claude model answered — indicates plan mix and cost distribution.</div>
            {modelDist.length === 0
              ? <EmptyNote>No model data yet.</EmptyNote>
              : modelDist.map((m) => {
                  const pct = modelTotal > 0 ? Math.round((m.count / modelTotal) * 100) : 0;
                  return <HorizBar key={m.model} label={MODEL_LABELS[m.model] ?? m.model} count={m.count} pct={pct} color="#8E5528" />;
                })
            }

            <div style={{ height: 32 }} />
            <SectionTitle>Person types</SectionTitle>
            <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 16 }}>How users describe their faith journey — shapes messaging and onboarding.</div>
            {personTypeDist.length === 0
              ? <EmptyNote>No person type data yet.</EmptyNote>
              : personTypeDist.map((p) => {
                  const pct = personTotal > 0 ? Math.round((p.count / personTotal) * 100) : 0;
                  return <HorizBar key={p.type} label={PERSON_LABELS[p.type] ?? p.type} count={p.count} pct={pct} color="#6B5344" />;
                })
            }

            <div style={{ height: 32 }} />
            <SectionTitle>Traditions</SectionTitle>
            <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 16 }}>Which Christian traditions are on kinwove — informs which denominations to market toward.</div>
            {traditionDist.length === 0
              ? <EmptyNote>No tradition data yet — fills as users complete their profiles.</EmptyNote>
              : traditionDist.map((t) => {
                  const pct = traditionTotal > 0 ? Math.round((t.count / traditionTotal) * 100) : 0;
                  return <HorizBar key={t.type} label={t.type} count={t.count} pct={pct} color={T.gold} />;
                })
            }
          </div>
        )}

        {/* ── GEOGRAPHY ─────────────────────────────────────────────────────── */}
        {tab === 'geo' && !dashLoading && !dashError && dash && (
          <div>
            {getInsights('geo', s, dash).length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <SectionTitle>Insights</SectionTitle>
                {getInsights('geo', s, dash).map((ins, i) => <InsightCard key={i} {...ins} />)}
              </div>
            )}
            <SectionTitle>Countries</SectionTitle>
            <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 16 }}>
              Based on church registrations. Where are your churches — and therefore your congregation users — located?
            </div>
            {countryDist.length === 0
              ? (
                <div style={{ background: T.white, border: `1px dashed ${T.line}`, borderRadius: 14, padding: '28px 20px', textAlign: 'center', color: T.inkMuted, fontFamily: T.serif, fontStyle: 'italic' }}>
                  No church location data yet. As churches are registered, countries will appear here.
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: 24 }}>
                    {countryDist.map((c) => {
                      const pct = countryTotal > 0 ? Math.round((c.count / countryTotal) * 100) : 0;
                      return <HorizBar key={c.country} label={c.country} count={c.count} pct={pct} color={T.gold} />;
                    })}
                  </div>
                  <Card label={`Top ${Math.min(countryDist.length, 10)} countries`}>
                    <BarChart data={countryDist.slice(0, 10)} color={T.gold} labelKey="country" />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: T.inkMuted }}>
                      <span>{countryDist[0]?.country ?? ''}</span>
                      <span>{countryDist[Math.min(9, countryDist.length - 1)]?.country ?? ''}</span>
                    </div>
                  </Card>
                </>
              )
            }
          </div>
        )}

        {/* ── CHURCHES ──────────────────────────────────────────────────────── */}
        {tab === 'churches' && !dashLoading && !dashError && dash && (
          <div>
            {getInsights('churches', s, dash).length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <SectionTitle>Insights</SectionTitle>
                {getInsights('churches', s, dash).map((ins, i) => <InsightCard key={i} {...ins} />)}
              </div>
            )}
            <SectionTitle>Top churches by member count</SectionTitle>
            {topChurches.length === 0
              ? <EmptyNote>No church data yet.</EmptyNote>
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 32 }}>
                  {topChurches.map((c) => (
                    <div key={c.id} style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 12, padding: '13px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{c.name}</div>
                        {c.city && <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 2 }}>{c.city}</div>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: T.goldDark }}>
                          {Number(c.member_count ?? 0).toLocaleString()} members
                        </span>
                        {c.status !== 'verified' && (
                          <span style={{
                            fontSize: 10, fontWeight: 600,
                            color: T.inkMuted,
                            background: T.parchment,
                            borderRadius: 999, padding: '2px 8px',
                            border: `1px solid ${T.line}`,
                          }}>
                            {c.status ?? 'pending'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            }

            <SectionTitle>Pending pastor applications</SectionTitle>
            {dash.pendingApps.length === 0
              ? <EmptyNote>No pending applications — all clear ✓</EmptyNote>
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {dash.pendingApps.map((a) => (
                    <div key={a.id} style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 12, padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: T.ink, marginBottom: 3 }}>{a.church_name}</div>
                      <div style={{ fontSize: 13, color: T.inkSoft, marginBottom: a.reason ? 8 : 0 }}>
                        {a.full_name}
                        {a.denomination && ` · ${a.denomination}`}
                        {(a.city || a.country) && ` · ${[a.city, a.country].filter(Boolean).join(', ')}`}
                      </div>
                      {a.reason && (
                        <div style={{ fontSize: 13, color: T.inkMuted, fontStyle: 'italic', background: T.parchment, borderRadius: 8, padding: '8px 12px', marginBottom: 8 }}>
                          "{a.reason.slice(0, 240)}{a.reason.length > 240 ? '…' : ''}"
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: T.inkMuted, marginBottom: 10 }}>
                        Applied {a.created_at ? new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => handlePastorApp(a.id, true)} disabled={approveBusy === a.id}
                          style={{ background: '#2e7a48', color: '#fff', border: 'none', borderRadius: 999, padding: '7px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: approveBusy === a.id ? 0.5 : 1 }}>
                          {approveBusy === a.id ? '…' : 'Approve ✓'}
                        </button>
                        <button onClick={() => handlePastorApp(a.id, false)} disabled={approveBusy === a.id}
                          style={{ background: 'transparent', color: '#b43c3c', border: '1px solid rgba(180,60,60,0.3)', borderRadius: 999, padding: '7px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: approveBusy === a.id ? 0.5 : 1 }}>
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        )}

        {/* ── CONTENT ───────────────────────────────────────────────────────── */}
        {tab === 'content' && !dashLoading && !dashError && dash && (
          <div>
            {getInsights('content', s, dash).length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <SectionTitle>Insights</SectionTitle>
                {getInsights('content', s, dash).map((ins, i) => <InsightCard key={i} {...ins} />)}
              </div>
            )}
            <SectionTitle>Most asked questions (by cache hits)</SectionTitle>
            <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 14 }}>
              Questions asked multiple times — use these for social posts, blog content, or FAQ pages.
            </div>
            {dash.topQuestions.length === 0
              ? <EmptyNote>No cached questions yet — will populate as the same questions get asked repeatedly.</EmptyNote>
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 32 }}>
                  {dash.topQuestions.map((q, i) => (
                    <div key={i} style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ fontSize: 14, color: T.ink, flex: 1, lineHeight: 1.45 }}>{q.question_raw}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.goldDark, flexShrink: 0 }}>{Number(q.hit_count ?? 0).toLocaleString()}×</div>
                    </div>
                  ))}
                </div>
              )
            }

            <SectionTitle>Recently shared conversations</SectionTitle>
            {dash.recentShared.length === 0
              ? <EmptyNote>No shared conversations yet.</EmptyNote>
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {dash.recentShared.map((conv) => (
                    <a key={conv.id} href={`/share/${conv.id}`} target="_blank" rel="noreferrer"
                      style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, textDecoration: 'none', color: 'inherit' }}>
                      <div style={{ fontSize: 14, color: T.ink, flex: 1, lineHeight: 1.4 }}>{conv.title ?? '(untitled)'}</div>
                      <div style={{ fontSize: 12, color: T.inkMuted, flexShrink: 0 }}>
                        {conv.created_at ? new Date(conv.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                      </div>
                    </a>
                  ))}
                </div>
              )
            }
          </div>
        )}

        {/* ── OPERATIONS ────────────────────────────────────────────────────── */}
        {tab === 'operations' && !dashLoading && !dashError && dash && (
          <div>
            {getInsights('operations', s, dash).length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <SectionTitle>Insights</SectionTitle>
                {getInsights('operations', s, dash).map((ins, i) => <InsightCard key={i} {...ins} />)}
              </div>
            )}

            {/* Reported posts (community content) */}
            <SectionTitle>Reported posts {openPostReports.length > 0 && <span style={{ background: '#a53f2b', color: '#fff', borderRadius: 999, fontSize: 10, padding: '1px 6px', marginLeft: 6, fontWeight: 700 }}>{openPostReports.length}</span>}</SectionTitle>
            <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 14 }}>
              Community posts members flagged via "Report post". Review the content, then remove it or dismiss the report.
            </div>
            {openPostReports.length === 0
              ? <EmptyNote style={{ marginBottom: 32 }}>No reported posts — all clear ✓</EmptyNote>
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
                  {openPostReports.map((rp) => (
                    <div key={rp.id} style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 12, padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(165,63,43,0.1)', color: '#a53f2b', borderRadius: 999, padding: '2px 9px', textTransform: 'capitalize' }}>{rp.type ?? 'report'}</span>
                        <span style={{ fontSize: 12, color: T.inkMuted }}>reported by {rp.reporter_name ?? 'Unknown'}</span>
                        <span style={{ fontSize: 11, color: T.inkMuted, marginLeft: 'auto' }}>
                          {rp.created_at ? new Date(rp.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                        </span>
                      </div>
                      {rp.note && <div style={{ fontSize: 12.5, color: T.inkSoft, fontStyle: 'italic', marginBottom: 8 }}>"{rp.note}"</div>}
                      <div style={{ background: T.parchment, border: `1px solid ${T.line}`, borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
                        <div style={{ fontSize: 11, color: T.inkMuted, marginBottom: 4 }}>
                          Post by {rp.posts?.profiles?.display_name ?? 'Unknown'}{!rp.posts && ' (post already deleted)'}
                        </div>
                        <div style={{ fontSize: 13.5, color: T.ink, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                          {String(rp.posts?.body ?? '').slice(0, 400) || '—'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => handlePostReport(rp.id, 'remove_post')} disabled={reportBusy === rp.id || !rp.posts}
                          style={{ background: 'rgba(165,63,43,0.1)', color: '#a53f2b', border: '1px solid rgba(165,63,43,0.25)', borderRadius: 999, padding: '5px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: reportBusy === rp.id || !rp.posts ? 0.5 : 1 }}>
                          {reportBusy === rp.id ? '…' : 'Remove post'}
                        </button>
                        <button onClick={() => handlePostReport(rp.id, 'dismiss')} disabled={reportBusy === rp.id}
                          style={{ background: 'transparent', color: T.inkMuted, border: `1px solid ${T.line}`, borderRadius: 999, padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: reportBusy === rp.id ? 0.5 : 1 }}>
                          Dismiss report
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            }

            {/* User Reports */}
            <SectionTitle>User reports {openReports.length > 0 && <span style={{ background: '#a53f2b', color: '#fff', borderRadius: 999, fontSize: 10, padding: '1px 6px', marginLeft: 6, fontWeight: 700 }}>{openReports.length}</span>}</SectionTitle>
            <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 14 }}>
              Submitted via "Report an issue" in the app menu. Resolve or dismiss once handled.
            </div>
            {openReports.length === 0
              ? <EmptyNote style={{ marginBottom: 32 }}>No open reports — all clear ✓</EmptyNote>
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
                  {openReports.map((rp) => {
                    const badge = REPORT_BADGE[rp.category] ?? REPORT_BADGE.other;
                    return (
                      <div key={rp.id} style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 12, padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, background: badge.bg, color: badge.color, borderRadius: 999, padding: '2px 9px' }}>{badge.label}</span>
                          {rp.profiles?.display_name && (
                            <span style={{ fontSize: 12, color: T.inkMuted }}>from {rp.profiles.display_name}</span>
                          )}
                          <span style={{ fontSize: 11, color: T.inkMuted, marginLeft: 'auto' }}>
                            {rp.created_at ? new Date(rp.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                          </span>
                        </div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: T.ink, marginBottom: 4 }}>{rp.subject}</div>
                        <div style={{ fontSize: 13, color: T.inkSoft, lineHeight: 1.55, marginBottom: 12 }}>{rp.body}</div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => handleReport(rp.id, 'resolved')} disabled={reportBusy === rp.id}
                            style={{ background: 'rgba(46,122,72,0.1)', color: '#2e7a48', border: '1px solid rgba(46,122,72,0.25)', borderRadius: 999, padding: '5px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: reportBusy === rp.id ? 0.5 : 1 }}>
                            {reportBusy === rp.id ? '…' : 'Resolve ✓'}
                          </button>
                          <button onClick={() => handleReport(rp.id, 'dismissed')} disabled={reportBusy === rp.id}
                            style={{ background: 'transparent', color: T.inkMuted, border: `1px solid ${T.line}`, borderRadius: 999, padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: reportBusy === rp.id ? 0.5 : 1 }}>
                            Dismiss
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            }

            {/* Promo codes */}
            <SectionTitle>Promo codes</SectionTitle>
            <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 14 }}>
              Redemptions land here (you also get an email each time). Uses count against each code's cap.
            </div>
            {(dash.promoCodes ?? []).length === 0
              ? <EmptyNote style={{ marginBottom: 16 }}>No promo codes configured.</EmptyNote>
              : (
                <div style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 12, padding: '6px 16px', marginBottom: 14 }}>
                  {(dash.promoCodes ?? []).map((c) => (
                    <div key={c.code} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${T.line}`, flexWrap: 'wrap' }}>
                      <code style={{ fontSize: 13, fontWeight: 700, color: T.ink, background: T.parchment, borderRadius: 6, padding: '3px 8px' }}>{c.code}</code>
                      <span style={{ fontSize: 12.5, color: T.inkSoft }}>{c.months} mo of {c.plan}</span>
                      {!c.active && <span style={{ fontSize: 11, fontWeight: 700, color: '#a53f2b' }}>INACTIVE</span>}
                      <span style={{ marginLeft: 'auto', fontSize: 12.5, fontWeight: 700, color: c.uses >= c.max_uses ? '#a53f2b' : T.goldDark }}>
                        {c.uses} / {c.max_uses} used
                      </span>
                    </div>
                  ))}
                </div>
              )
            }
            {(dash.promoRedemptions ?? []).length > 0 && (
              <div style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 12, padding: '6px 16px', marginBottom: 32 }}>
                <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.inkMuted, fontWeight: 700, padding: '10px 0 4px' }}>
                  Recent redemptions
                </div>
                {(dash.promoRedemptions ?? []).map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: `1px solid ${T.line}` }}>
                    <span style={{ fontSize: 13.5, color: T.ink, flex: 1 }}>{r.display_name ?? 'Unknown'}</span>
                    <span style={{ fontSize: 12, color: T.inkSoft }}>{r.plan}</span>
                    <span style={{ fontSize: 11.5, color: T.inkMuted }}>
                      {r.promo_redeemed_at ? new Date(r.promo_redeemed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* AI feedback */}
            <SectionTitle>AI feedback flags</SectionTitle>
            <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 14 }}>
              AI responses users flagged as inaccurate or unhelpful. Use these to catch edge cases in the prompt.
            </div>
            {dash.recentFeedback.length === 0
              ? <EmptyNote>No feedback flagged yet.</EmptyNote>
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 32 }}>
                  {dash.recentFeedback.map((f, i) => (
                    <div key={i} style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 12, padding: '13px 16px' }}>
                      <div style={{ fontSize: 14, color: T.ink, lineHeight: 1.55, marginBottom: 6 }}>{f.message_text}</div>
                      <div style={{ fontSize: 11, color: T.inkMuted }}>
                        {f.created_at ? new Date(f.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )
            }

            {/* Pending apps (duplicate from Churches for visibility) */}
            {dash.pendingApps.length > 0 && (
              <>
                <SectionTitle style={{ marginTop: 8 }}>Pending pastor applications</SectionTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {dash.pendingApps.map((a) => (
                    <div key={a.id} style={{ background: T.white, border: `1px solid rgba(232,115,26,0.3)`, borderRadius: 12, padding: '13px 16px' }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: T.ink, marginBottom: 2 }}>{a.church_name}</div>
                      <div style={{ fontSize: 13, color: T.inkSoft }}>
                        {a.full_name}{(a.city || a.country) && ` · ${[a.city, a.country].filter(Boolean).join(', ')}`}
                      </div>
                      <div style={{ fontSize: 11, color: T.inkMuted, marginTop: 4 }}>
                        Applied {a.created_at ? new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                      </div>
                    </div>
                  ))}
                  <div style={{ fontSize: 12, color: T.inkMuted }}>Go to Churches tab to approve or decline.</div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── SPONSORS ──────────────────────────────────────────────────────── */}
        {tab === 'users' && <UsersPanel />}

        {tab === 'sponsors' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12 }}>
              <div>
                <div style={{ fontFamily: T.display, fontSize: 16, fontWeight: 600, color: T.ink }}>Sponsored cards</div>
                <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 3, lineHeight: 1.5 }}>
                  {sponsors.filter((sp) => sp.is_active).length > 0
                    ? `${sponsors.filter((sp) => sp.is_active).length} live — shown in feed after every 10 posts (free users only).`
                    : 'No live sponsors yet — cards are hidden from the feed until you activate one.'}
                </div>
              </div>
              <button onClick={openNew} style={{ background: T.ink, color: T.cream, border: 'none', borderRadius: 999, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <Plus size={14} /> Add
              </button>
            </div>

            {sponsorsLoading ? (
              <div style={{ color: T.inkMuted, textAlign: 'center', padding: 48, fontFamily: T.serif }}>Loading…</div>
            ) : sponsors.length === 0 ? (
              <div style={{ background: T.white, border: `1px dashed ${T.line}`, borderRadius: 14, padding: '36px 20px', textAlign: 'center', color: T.inkMuted, fontFamily: T.serif, fontStyle: 'italic' }}>
                No sponsors yet.<br /><span style={{ fontSize: 13 }}>Add one above once you've made a deal.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sponsors.map((sp) => (
                  <div key={sp.id} style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 12, padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 10, opacity: sp.is_active ? 1 : 0.55 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: T.parchment, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                      {sp.emoji ?? '✦'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{sp.sponsor_name}</div>
                      {sp.title && <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sp.title}</div>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => toggleActive(sp.id, sp.is_active)} style={{ background: sp.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(0,0,0,0.05)', border: `1px solid ${sp.is_active ? 'rgba(34,197,94,0.35)' : T.line}`, borderRadius: 999, padding: '4px 11px', fontSize: 11, fontWeight: 700, letterSpacing: 0.4, color: sp.is_active ? '#16a34a' : T.inkMuted, cursor: 'pointer' }}>
                        {sp.is_active ? 'LIVE' : 'OFF'}
                      </button>
                      <button onClick={() => openEdit(sp)} title="Edit" style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.inkSoft, padding: 5, display: 'flex', borderRadius: 6 }}>
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => deleteSponsor(sp.id, sp.sponsor_name)} title="Delete" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b43c3c', padding: 5, display: 'flex', borderRadius: 6 }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sponsor add / edit sheet */}
      {formOpen && (
        <div onClick={closeForm} style={{ position: 'fixed', inset: 0, background: 'rgba(44,24,16,0.52)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxHeight: '92vh', overflowY: 'auto', background: T.cream, borderRadius: '20px 20px 0 0', padding: '24px 20px 48px', boxShadow: '0 -8px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
              <div style={{ fontFamily: T.display, fontSize: 18, fontWeight: 600, color: T.ink }}>{editingId ? 'Edit sponsor' : 'Add sponsor'}</div>
              <button onClick={closeForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.inkSoft, padding: 4, display: 'flex' }}><X size={20} /></button>
            </div>

            {[
              { key: 'sponsor_name', label: 'Sponsor name *', placeholder: 'e.g. Crossway Books' },
              { key: 'title',        label: 'Title',           placeholder: 'e.g. Deepen your study with the ESV Study Bible' },
              { key: 'body',         label: 'Body text',       placeholder: 'Short description…', multiline: true },
              { key: 'cta_text',     label: 'Button label',    placeholder: 'e.g. Shop now' },
              { key: 'cta_url',      label: 'Button URL',      placeholder: 'https://…' },
              { key: 'emoji',        label: 'Emoji / icon',    placeholder: '✦' },
            ].map(({ key, label, placeholder, multiline }) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: T.inkSoft, marginBottom: 5, letterSpacing: 0.2 }}>{label}</label>
                {multiline ? (
                  <textarea value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} rows={3}
                    style={{ width: '100%', border: `1px solid ${T.line}`, borderRadius: 10, padding: '10px 12px', fontSize: 14, background: T.white, color: T.ink, fontFamily: T.sans, resize: 'vertical', boxSizing: 'border-box', outline: 'none' }} />
                ) : (
                  <input type="text" value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} placeholder={placeholder}
                    style={{ width: '100%', border: `1px solid ${T.line}`, borderRadius: 10, padding: '10px 12px', fontSize: 14, background: T.white, color: T.ink, fontFamily: T.sans, boxSizing: 'border-box', outline: 'none' }} />
                )}
              </div>
            ))}

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: T.inkSoft, marginBottom: 5 }}>Sort order (lower = first)</label>
              <input type="number" value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                style={{ width: 100, border: `1px solid ${T.line}`, borderRadius: 10, padding: '10px 12px', fontSize: 14, background: T.white, color: T.ink, fontFamily: T.sans, outline: 'none' }} />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} style={{ width: 16, height: 16, cursor: 'pointer' }} />
              <span style={{ fontSize: 14, color: T.ink }}>Make live immediately <span style={{ color: T.inkMuted }}>(shows in feed for free users)</span></span>
            </label>

            {(form.sponsor_name || form.title) && (
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.inkMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6 }}>Preview</div>
                <SponsoredCard {...form} />
              </div>
            )}

            {sponsorError && (
              <div style={{ background: 'rgba(165,63,43,0.08)', border: '1px solid rgba(165,63,43,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#a53f2b', marginBottom: 14 }}>{sponsorError}</div>
            )}

            <button onClick={saveSponsor} disabled={!form.sponsor_name.trim() || saving} style={{ width: '100%', background: T.ink, color: T.cream, border: 'none', borderRadius: 999, padding: '14px 20px', fontSize: 15, fontWeight: 600, cursor: form.sponsor_name.trim() && !saving ? 'pointer' : 'not-allowed', opacity: form.sponsor_name.trim() && !saving ? 1 : 0.45, transition: 'opacity 0.15s' }}>
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add sponsor'}
            </button>
          </div>
        </div>
      )}

      {/* ── VOICE ─────────────────────────────────────────────────────────── */}
      {tab === 'voice' && (
        <div>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: T.display, fontSize: 16, fontWeight: 600, color: T.ink, marginBottom: 4 }}>kinwove Posts</div>
            <div style={{ fontSize: 13, color: T.inkMuted, lineHeight: 1.6 }}>
              Post to the community feed as kinwove. All members who follow kinwove see this in their feed.
              Keep it warm, short, and welcoming to people still figuring things out.
            </div>
          </div>

          <div style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 14, padding: 20, marginBottom: 24 }}>
            <textarea
              value={voiceDraft}
              onChange={(e) => setVoiceDraft(e.target.value)}
              placeholder="Write something as kinwove… a verse, a question, a grace moment."
              rows={5}
              style={{ width: '100%', border: `1px solid ${T.line}`, borderRadius: 10, padding: '12px 14px', fontSize: 15, fontFamily: T.display, lineHeight: 1.6, color: T.ink, background: T.parchment, resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
              <div style={{ fontSize: 13, color: voiceDraft.length > 400 ? '#c05' : T.inkMuted }}>{voiceDraft.length} chars</div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {voiceSuccess && <span style={{ fontSize: 13, color: '#4a7c59', fontWeight: 600 }}>Posted ✓</span>}
                {voiceError && <span style={{ fontSize: 13, color: '#a53f2b' }}>{voiceError}</span>}
                <button
                  onClick={postAsKinwove}
                  disabled={!voiceDraft.trim() || voicePosting}
                  style={{ background: T.ink, color: T.cream, border: 'none', borderRadius: 999, padding: '10px 22px', fontSize: 14, fontWeight: 600, cursor: voiceDraft.trim() && !voicePosting ? 'pointer' : 'not-allowed', opacity: voiceDraft.trim() && !voicePosting ? 1 : 0.45 }}
                >
                  {voicePosting ? 'Posting…' : 'Post as kinwove'}
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontFamily: T.display, fontSize: 14, fontWeight: 600, color: T.inkSoft }}>Recent posts</div>
            <button
              onClick={async () => {
                const { data: { session: s } } = await supabase.auth.getSession();
                const r = await fetch('/api/cron/daily-post', { method: 'POST', headers: { 'x-cron-secret': '', Authorization: `Bearer ${s?.access_token}` } });
                const d = await r.json();
                if (d.ok) { loadVoicePosts(); }
                else { setVoiceError(d.error ?? 'Failed'); }
              }}
              style={{ background: 'none', border: `1px solid ${T.line}`, borderRadius: 999, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: T.inkSoft, cursor: 'pointer' }}
            >
              Generate today's post
            </button>
          </div>
          {voiceLoading ? (
            <div style={{ color: T.inkMuted, textAlign: 'center', padding: 32, fontFamily: T.serif }}>Loading…</div>
          ) : voicePosts.length === 0 ? (
            <div style={{ background: T.white, border: `1px dashed ${T.line}`, borderRadius: 14, padding: '32px 20px', textAlign: 'center', color: T.inkMuted, fontFamily: T.serif, fontStyle: 'italic' }}>
              No kinwove posts yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {voicePosts.map((p) => (
                <div key={p.id} style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 12, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, fontSize: 14, color: T.ink, lineHeight: 1.6, fontFamily: T.display }}>{p.body}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: T.inkMuted }}>{new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    <button onClick={() => deleteVoicePost(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.inkMuted, padding: 2, display: 'flex', alignItems: 'center' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
